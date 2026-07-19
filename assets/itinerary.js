(function () {
    const TRIP_ID = document.body.dataset.tripId;
    let itineraryData = typeof DEFAULT_ITINERARY !== "undefined" ? DEFAULT_ITINERARY : {};
    let listenerStarted = false;
    let currentEditDayId = null;
    let currentEditItemId = null;

    const ICON_PRESETS = [
        { key: "flight", label: "✈️ 항공", icon: "fa-solid fa-plane", color: "bg-sky-500" },
        { key: "transport", label: "🚌 이동/교통", icon: "fa-solid fa-bus", color: "bg-indigo-500" },
        { key: "car", label: "🚗 차량", icon: "fa-solid fa-car", color: "bg-slate-700" },
        { key: "food", label: "🍽️ 식사", icon: "fa-solid fa-utensils", color: "bg-rose-500" },
        { key: "hotel", label: "🛏️ 숙소", icon: "fa-solid fa-bed", color: "bg-slate-700" },
        { key: "sight", label: "📸 관광/체험", icon: "fa-solid fa-camera", color: "bg-emerald-500" },
        { key: "shopping", label: "🛍️ 쇼핑", icon: "fa-solid fa-bag-shopping", color: "bg-purple-500" },
        { key: "onsen", label: "♨️ 온천/휴식", icon: "fa-solid fa-hot-tub-person", color: "bg-amber-600" },
        { key: "drink", label: "🍺 술집/야식", icon: "fa-solid fa-beer-mug-empty", color: "bg-orange-500" },
        { key: "etc", label: "📌 기타", icon: "fa-solid fa-location-dot", color: "bg-slate-500" }
    ];

    function presetByKey(key) {
        return ICON_PRESETS.find((p) => p.key === key) || ICON_PRESETS[ICON_PRESETS.length - 1];
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function linkify(str) {
        const escaped = escapeHtml(str);
        const urlRegex = /(https?:\/\/[^\s<]+)/g;
        return escaped
            .replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener" class="underline text-indigo-700 break-all">${url}</a>`)
            .replace(/\n/g, "<br>");
    }

    function newItemId(dayId) {
        return dayId + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }

    function getDayIds() {
        return Array.from(document.querySelectorAll('[id$="-items"]')).map(function (el) {
            return el.id.replace(/-items$/, "");
        });
    }

    function isUrl(str) {
        return /^https?:\/\//i.test(String(str).trim());
    }

    function mapHref(value) {
        const trimmed = String(value).trim();
        return isUrl(trimmed) ? trimmed : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;
    }

    function renderItemHtml(dayId, item) {
        const preset = presetByKey(item.presetKey);
        const admin = window.isAdmin && window.isAdmin();
        let mapBtn = "";
        if (item.mapQuery && item.mapQuery.trim()) {
            mapBtn = `<a href="${escapeHtml(mapHref(item.mapQuery))}" target="_blank" rel="noopener" class="map-btn"><i class="fa-solid fa-map-location-dot"></i>위치</a>`;
        } else if (admin) {
            mapBtn = `<button type="button" onclick="editItem('${dayId}','${item.id}')" class="map-btn opacity-60 border border-dashed border-indigo-300"><i class="fa-solid fa-map-location-dot"></i>위치 추가</button>`;
        }
        const desc = item.desc ? `<p class="text-sm text-slate-600 mt-1">${linkify(item.desc)}</p>` : "";
        const actions = admin
            ? `<div class="flex gap-3 shrink-0">
                 <button type="button" onclick="editItem('${dayId}','${item.id}')" class="text-slate-400 hover:text-slate-700"><i class="fa-solid fa-pen text-xs"></i></button>
                 <button type="button" onclick="deleteItem('${dayId}','${item.id}')" class="text-slate-400 hover:text-rose-600"><i class="fa-solid fa-trash text-xs"></i></button>
               </div>`
            : "";
        return `
            <div class="timeline-item relative z-10 mb-6">
                <div class="timeline-line"></div>
                <div class="flex gap-3">
                    <div class="w-10 h-10 rounded-full ${preset.color} text-white flex items-center justify-center shadow z-10 shrink-0">
                        <i class="${preset.icon}"></i>
                    </div>
                    <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex-1">
                        <div class="flex justify-between items-start gap-2">
                            <span class="text-xs font-bold text-slate-500 mb-1 block">${escapeHtml(item.time || "")}</span>
                            ${actions}
                        </div>
                        <h3 class="font-bold text-slate-800 flex items-center flex-wrap gap-y-1">
                            ${escapeHtml(item.title || "")}
                            ${mapBtn}
                        </h3>
                        ${desc}
                        <div class="note-slot mt-2" data-item-id="${item.id}" data-item-title="${escapeHtml(item.title || "")}">
                            <div class="note-display hidden text-xs bg-amber-50 text-amber-800 rounded-lg p-2 whitespace-pre-wrap break-words mb-1"></div>
                            <button type="button" class="note-btn text-xs text-amber-600 font-medium inline-flex items-center gap-1" onclick="openNoteModal(this)">
                                <i class="fa-regular fa-note-sticky"></i><span class="note-btn-label">메모</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    function renderDay(dayId) {
        const container = document.getElementById(dayId + "-items");
        if (!container) return;
        const items = (itineraryData[dayId] || []).slice().sort(function (a, b) {
            return (a.order || 0) - (b.order || 0);
        });
        container.innerHTML = items.map((item) => renderItemHtml(dayId, item)).join("");
    }

    function renderAllDays() {
        getDayIds().forEach(renderDay);
        const admin = window.isAdmin && window.isAdmin();
        document.querySelectorAll(".admin-add-btn").forEach(function (btn) {
            btn.classList.toggle("hidden", !admin);
        });
        if (typeof window.__renderNoteSlots === "function") {
            window.__renderNoteSlots();
        }
    }

    function populatePresetSelect() {
        const select = document.getElementById("item-modal-preset");
        if (!select || select.options.length) return;
        ICON_PRESETS.forEach(function (p) {
            const opt = document.createElement("option");
            opt.value = p.key;
            opt.textContent = p.label;
            select.appendChild(opt);
        });
    }

    function startItineraryListener() {
        if (listenerStarted || !TRIP_ID) return;
        listenerStarted = true;
        firebase
            .firestore()
            .collection("itineraries")
            .doc(TRIP_ID)
            .onSnapshot(
                function (doc) {
                    if (doc.exists) {
                        itineraryData = doc.data() || {};
                    } else {
                        itineraryData = typeof DEFAULT_ITINERARY !== "undefined" ? DEFAULT_ITINERARY : {};
                        maybeSeedDefaults();
                    }
                    renderAllDays();
                },
                function (err) {
                    console.error("일정을 불러오지 못했습니다.", err);
                }
            );
    }

    function maybeSeedDefaults() {
        if (!(window.isAdmin && window.isAdmin())) return;
        if (typeof DEFAULT_ITINERARY === "undefined") return;
        firebase
            .firestore()
            .collection("itineraries")
            .doc(TRIP_ID)
            .set(DEFAULT_ITINERARY)
            .catch(function (err) {
                console.error("초기 데이터를 저장하지 못했습니다.", err);
            });
    }

    // ---- Add / Edit modal ----
    window.openAddItemModal = function (dayId) {
        populatePresetSelect();
        currentEditDayId = dayId;
        currentEditItemId = null;
        document.getElementById("item-modal-title").textContent = "카드 추가";
        document.getElementById("item-modal-preset").value = "etc";
        document.getElementById("item-modal-time").value = "";
        document.getElementById("item-modal-title-input").value = "";
        document.getElementById("item-modal-desc").value = "";
        document.getElementById("item-modal-map").value = "";
        document.getElementById("item-modal-status").textContent = "";
        document.getElementById("item-modal-delete").classList.add("hidden");
        document.getElementById("item-modal").classList.remove("hidden");
    };

    window.editItem = function (dayId, itemId) {
        populatePresetSelect();
        const item = (itineraryData[dayId] || []).find(function (it) {
            return it.id === itemId;
        });
        if (!item) return;
        currentEditDayId = dayId;
        currentEditItemId = itemId;
        document.getElementById("item-modal-title").textContent = "카드 편집";
        document.getElementById("item-modal-preset").value = item.presetKey || "etc";
        document.getElementById("item-modal-time").value = item.time || "";
        document.getElementById("item-modal-title-input").value = item.title || "";
        document.getElementById("item-modal-desc").value = item.desc || "";
        document.getElementById("item-modal-map").value = item.mapQuery || "";
        document.getElementById("item-modal-status").textContent = "";
        document.getElementById("item-modal-delete").classList.remove("hidden");
        document.getElementById("item-modal").classList.remove("hidden");
    };

    window.closeItemModal = function () {
        document.getElementById("item-modal").classList.add("hidden");
        currentEditDayId = null;
        currentEditItemId = null;
    };

    window.saveItem = function () {
        if (!window.isAdmin || !window.isAdmin() || !currentEditDayId) return;
        const title = document.getElementById("item-modal-title-input").value.trim();
        const statusEl = document.getElementById("item-modal-status");
        if (!title) {
            statusEl.textContent = "제목을 입력해주세요.";
            return;
        }
        const list = (itineraryData[currentEditDayId] || []).slice();
        const fields = {
            presetKey: document.getElementById("item-modal-preset").value,
            time: document.getElementById("item-modal-time").value.trim(),
            title: title,
            desc: document.getElementById("item-modal-desc").value.trim(),
            mapQuery: document.getElementById("item-modal-map").value.trim()
        };
        if (currentEditItemId) {
            const idx = list.findIndex(function (it) {
                return it.id === currentEditItemId;
            });
            if (idx > -1) list[idx] = Object.assign({}, list[idx], fields);
        } else {
            list.push(Object.assign({ id: newItemId(currentEditDayId), order: list.length }, fields));
        }
        statusEl.textContent = "저장 중...";
        const update = {};
        update[currentEditDayId] = list;
        firebase
            .firestore()
            .collection("itineraries")
            .doc(TRIP_ID)
            .set(update, { merge: true })
            .then(function () {
                window.closeItemModal();
            })
            .catch(function (err) {
                statusEl.textContent = "저장 실패. 다시 시도해주세요.";
                console.error(err);
            });
    };

    window.deleteItemFromModal = function () {
        if (!currentEditDayId || !currentEditItemId) return;
        window.deleteItem(currentEditDayId, currentEditItemId, true);
    };

    window.deleteItem = function (dayId, itemId, skipConfirm) {
        if (!window.isAdmin || !window.isAdmin()) return;
        if (!skipConfirm && !confirm("이 카드를 삭제할까요?")) return;
        const list = (itineraryData[dayId] || []).filter(function (it) {
            return it.id !== itemId;
        });
        const update = {};
        update[dayId] = list;
        firebase
            .firestore()
            .collection("itineraries")
            .doc(TRIP_ID)
            .set(update, { merge: true })
            .then(function () {
                window.closeItemModal();
            })
            .catch(function (err) {
                alert("삭제 실패. 다시 시도해주세요.");
                console.error(err);
            });
    };

    document.addEventListener("DOMContentLoaded", function () {
        populatePresetSelect();
        renderAllDays();
        if (typeof window.onAuthChange !== "function") return;
        window.onAuthChange(function (user) {
            if (user) startItineraryListener();
            renderAllDays();
        });
    });
})();
