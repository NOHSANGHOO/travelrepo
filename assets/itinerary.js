(function () {
    const TRIP_ID = document.body.dataset.tripId;

    function seedItinerary() {
        if (window.TRIP_SEEDS && window.TRIP_SEEDS[TRIP_ID] && window.TRIP_SEEDS[TRIP_ID].itinerary) {
            return window.TRIP_SEEDS[TRIP_ID].itinerary;
        }
        if (typeof DEFAULT_ITINERARY !== "undefined") return DEFAULT_ITINERARY;
        return null;
    }
    function hasAnyItems(d) {
        return d && Object.keys(d).some(function (k) {
            return Array.isArray(d[k]) && d[k].length > 0;
        });
    }

    let itineraryData = seedItinerary() || {};
    let listenerStarted = false;
    let currentEditDayId = null;
    let currentEditItemId = null;

    // 따뜻한 아날로그 파스텔 팔레트 (조화로운 톤, 과채도 지양)
    const ICON_PRESETS = [
        { key: "flight", label: "✈️ 항공", icon: "fa-solid fa-plane", color: "bg-[#6f97b3]" },
        { key: "transport", label: "🚌 이동/교통", icon: "fa-solid fa-bus", color: "bg-[#7ba394]" },
        { key: "car", label: "🚗 차량", icon: "fa-solid fa-car", color: "bg-[#948777]" },
        { key: "food", label: "🍽️ 식사", icon: "fa-solid fa-utensils", color: "bg-[#cc7c5e]" },
        { key: "hotel", label: "🛏️ 숙소", icon: "fa-solid fa-bed", color: "bg-[#a08b74]" },
        { key: "sight", label: "📸 관광/체험", icon: "fa-solid fa-camera", color: "bg-[#84a56d]" },
        { key: "shopping", label: "🛍️ 쇼핑", icon: "fa-solid fa-bag-shopping", color: "bg-[#b783a0]" },
        { key: "onsen", label: "♨️ 온천/휴식", icon: "fa-solid fa-hot-tub-person", color: "bg-[#d29a63]" },
        { key: "drink", label: "🍺 술집/야식", icon: "fa-solid fa-beer-mug-empty", color: "bg-[#cc9152]" },
        { key: "etc", label: "📌 기타", icon: "fa-solid fa-location-dot", color: "bg-[#9c9288]" }
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
            .replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener" class="underline text-teal-700 break-all">${url}</a>`)
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

    function sortedItems(dayId) {
        return (itineraryData[dayId] || []).slice().sort(function (a, b) {
            return (a.order || 0) - (b.order || 0);
        });
    }

    function isUrl(str) {
        return /^https?:\/\//i.test(String(str).trim());
    }

    function mapHref(value) {
        const trimmed = String(value).trim();
        return isUrl(trimmed) ? trimmed : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;
    }

    function saveDay(dayId, list) {
        itineraryData[dayId] = list;
        const update = {};
        update[dayId] = list;
        return firebase.firestore().collection("itineraries").doc(TRIP_ID).set(update, { merge: true });
    }

    function isAdmin() {
        return !!(window.isAdmin && window.isAdmin());
    }

    // ---- Day route (하루 동선 지도) ----
    function routePoints(dayId) {
        return sortedItems(dayId)
            .map(function (it) {
                return (it.mapQuery || "").trim();
            })
            .filter(function (q) {
                return q && !isUrl(q);
            });
    }

    // Places for a day, in visit order, that have any map link (place-name or URL).
    function dayPlaces(dayId) {
        return sortedItems(dayId)
            .filter(function (it) {
                return (it.mapQuery || "").trim();
            })
            .map(function (it) {
                const q = (it.mapQuery || "").trim();
                return { title: (it.title || "").trim(), query: q, href: mapHref(q), isUrl: isUrl(q) };
            });
    }

    let routeDayId = null;

    window.openRouteModal = function (dayId) {
        routeDayId = dayId;
        const places = dayPlaces(dayId);
        const list = document.getElementById("route-list");
        list.innerHTML = places
            .map(function (p, i) {
                return `<li class="flex items-center gap-3">
                    <span class="w-6 h-6 shrink-0 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">${i + 1}</span>
                    <span class="flex-1 text-sm text-stone-700 truncate">${escapeHtml(p.title || p.query)}</span>
                    <a href="${escapeHtml(p.href)}" target="_blank" rel="noopener" class="map-btn"><i class="fa-solid fa-map-location-dot"></i>지도</a>
                </li>`;
            })
            .join("");
        const routeable = places.filter(function (p) {
            return !p.isUrl;
        });
        const btn = document.getElementById("route-drive-btn");
        const hint = document.getElementById("route-hint");
        if (routeable.length >= 2) {
            btn.classList.remove("hidden");
            hint.textContent = "";
        } else {
            btn.classList.add("hidden");
            hint.textContent = "운전 경로를 그리려면 장소명(구글지도 검색어)이 2곳 이상 필요해요. URL로 넣은 장소는 목록에서 하나씩 열 수 있어요.";
        }
        document.getElementById("route-modal").classList.remove("hidden");
    };

    window.closeRouteModal = function () {
        document.getElementById("route-modal").classList.add("hidden");
    };

    window.openRouteDriving = function () {
        if (!routeDayId) return;
        const pts = dayPlaces(routeDayId)
            .filter(function (p) {
                return !p.isUrl;
            })
            .map(function (p) {
                return p.query;
            });
        if (pts.length < 2) return;
        const origin = encodeURIComponent(pts[0]);
        const destination = encodeURIComponent(pts[pts.length - 1]);
        const mids = pts.slice(1, -1).map(encodeURIComponent).join("|");
        let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`;
        if (mids) url += `&waypoints=${mids}`;
        window.open(url, "_blank");
    };

    function renderItemHtml(dayId, item) {
        const preset = presetByKey(item.presetKey);
        const admin = isAdmin();
        let mapBtn = "";
        if (item.mapQuery && item.mapQuery.trim()) {
            mapBtn = `<a href="${escapeHtml(mapHref(item.mapQuery))}" target="_blank" rel="noopener" class="map-btn"><i class="fa-solid fa-map-location-dot"></i>위치</a>`;
        } else if (admin) {
            mapBtn = `<button type="button" onclick="editItem('${dayId}','${item.id}')" class="map-btn opacity-60 border border-dashed border-teal-300"><i class="fa-solid fa-map-location-dot"></i>위치 추가</button>`;
        }
        const desc = item.desc ? `<p class="text-sm text-stone-600 mt-1">${linkify(item.desc)}</p>` : "";
        const actions = admin
            ? `<div class="flex items-center gap-3 shrink-0">
                 <button type="button" class="drag-handle text-stone-300 hover:text-stone-500 cursor-grab" style="touch-action:none;" data-day-id="${dayId}" data-item-id="${item.id}" title="드래그하여 순서 변경"><i class="fa-solid fa-grip-vertical"></i></button>
                 <button type="button" onclick="editItem('${dayId}','${item.id}')" class="text-stone-400 hover:text-stone-700"><i class="fa-solid fa-pen text-xs"></i></button>
                 <button type="button" onclick="deleteItem('${dayId}','${item.id}')" class="text-stone-400 hover:text-rose-600"><i class="fa-solid fa-trash text-xs"></i></button>
               </div>`
            : "";
        return `
            <div class="timeline-item relative z-10 mb-6" data-day-id="${dayId}" data-item-id="${item.id}">
                <div class="timeline-line"></div>
                <div class="flex gap-3">
                    <div class="w-10 h-10 rounded-full ${preset.color} text-white flex items-center justify-center shadow z-10 shrink-0">
                        <i class="${preset.icon}"></i>
                    </div>
                    <div class="item-card bg-white p-4 rounded-2xl shadow-sm shadow-stone-200/40 border border-stone-100 flex-1 transition-shadow">
                        <div class="flex justify-between items-start gap-2">
                            <span class="text-xs font-bold text-stone-500 mb-1 block">${escapeHtml(item.time || "")}</span>
                            ${actions}
                        </div>
                        <h3 class="font-bold text-stone-800 flex items-center flex-wrap gap-y-1">
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
        const items = sortedItems(dayId);
        let html = "";
        if (dayPlaces(dayId).length >= 2) {
            html += `<button type="button" onclick="openRouteModal('${dayId}')" class="w-full mb-4 py-2.5 rounded-xl bg-teal-50 text-teal-700 text-sm font-semibold flex items-center justify-center gap-2 transition active:scale-95 hover:bg-teal-100">
                        <i class="fa-solid fa-route"></i> 하루 동선 보기
                     </button>`;
        }
        html += items.map((item) => renderItemHtml(dayId, item)).join("");
        container.innerHTML = html;
    }

    function renderAllDays() {
        getDayIds().forEach(renderDay);
        const admin = isAdmin();
        document.querySelectorAll(".admin-add-btn, .admin-only").forEach(function (el) {
            el.classList.toggle("hidden", !admin);
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

    // ---- Drag & drop reorder (pointer-based, mobile + desktop) ----
    let drag = null;

    function applyDragVisual() {
        if (!drag) return;
        const wrapper = document.querySelector(`.timeline-item[data-item-id="${drag.itemId}"]`);
        if (!wrapper) return;
        wrapper.classList.add("dragging");
        const card = wrapper.querySelector(".item-card");
        if (card) card.classList.add("ring-2", "ring-teal-400");
    }

    function targetIdUnderPointer(dayId, clientY) {
        const container = document.getElementById(dayId + "-items");
        if (!container) return null;
        const cards = Array.from(container.querySelectorAll(".timeline-item"));
        for (let i = 0; i < cards.length; i++) {
            const rect = cards[i].getBoundingClientRect();
            if (clientY < rect.top + rect.height / 2) return cards[i].dataset.itemId;
        }
        return null; // after the last card
    }

    function onPointerMove(e) {
        if (!drag) return;
        e.preventDefault();
        const targetId = targetIdUnderPointer(drag.dayId, e.clientY);
        const list = sortedItems(drag.dayId);
        const fromIdx = list.findIndex((it) => it.id === drag.itemId);
        if (fromIdx < 0) return;
        let toIdx;
        if (targetId === null) {
            toIdx = list.length - 1;
        } else {
            toIdx = list.findIndex((it) => it.id === targetId);
            if (toIdx > fromIdx) toIdx -= 1; // account for removal shift
        }
        if (toIdx === fromIdx || toIdx < 0) return;
        const [moved] = list.splice(fromIdx, 1);
        list.splice(toIdx, 0, moved);
        list.forEach((it, i) => (it.order = i));
        itineraryData[drag.dayId] = list;
        renderAllDays();
        applyDragVisual();
    }

    function onPointerUp() {
        if (!drag) return;
        const dayId = drag.dayId;
        const list = sortedItems(dayId);
        drag = null;
        document.removeEventListener("pointermove", onPointerMove, { passive: false });
        document.removeEventListener("pointerup", onPointerUp);
        document.removeEventListener("pointercancel", onPointerUp);
        document.body.style.userSelect = "";
        document.body.classList.remove("dragging-active");
        saveDay(dayId, list).catch(function (err) {
            alert("순서 저장에 실패했어요. 다시 시도해주세요.");
            console.error(err);
        });
        renderAllDays();
    }

    document.addEventListener("pointerdown", function (e) {
        const handle = e.target.closest && e.target.closest(".drag-handle");
        if (!handle || !isAdmin()) return;
        e.preventDefault();
        drag = { dayId: handle.dataset.dayId, itemId: handle.dataset.itemId };
        document.body.style.userSelect = "none";
        document.body.classList.add("dragging-active");
        document.addEventListener("pointermove", onPointerMove, { passive: false });
        document.addEventListener("pointerup", onPointerUp);
        document.addEventListener("pointercancel", onPointerUp);
        applyDragVisual();
    });

    function startItineraryListener() {
        if (listenerStarted || !TRIP_ID) return;
        listenerStarted = true;
        firebase
            .firestore()
            .collection("itineraries")
            .doc(TRIP_ID)
            .onSnapshot(
                function (doc) {
                    if (drag) return; // don't clobber an in-progress drag
                    const data = doc.exists ? doc.data() : null;
                    if (hasAnyItems(data)) {
                        itineraryData = data;
                    } else {
                        // Firestore가 없거나 비어 있으면 시드값으로 복구 (시드가 있는 여행만)
                        const seed = seedItinerary();
                        if (seed && hasAnyItems(seed)) {
                            itineraryData = seed;
                            maybeSeedDefaults(seed);
                        } else {
                            itineraryData = data || {};
                        }
                    }
                    renderAllDays();
                },
                function (err) {
                    console.error("일정을 불러오지 못했습니다.", err);
                }
            );
    }

    function maybeSeedDefaults(seed) {
        if (!isAdmin() || !seed) return;
        firebase
            .firestore()
            .collection("itineraries")
            .doc(TRIP_ID)
            .set(seed)
            .catch(function (err) {
                console.error("초기 데이터를 저장하지 못했습니다.", err);
            });
    }

    // ---- Add / Edit modal ----
    window.openAddItemModal = function (dayId) {
        populatePresetSelect();
        currentEditDayId = dayId;
        currentEditItemId = null;
        document.getElementById("item-modal-title").textContent = "일정카드 추가";
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
        document.getElementById("item-modal-title").textContent = "일정카드 편집";
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
        if (!isAdmin() || !currentEditDayId) return;
        const title = document.getElementById("item-modal-title-input").value.trim();
        const statusEl = document.getElementById("item-modal-status");
        if (!title) {
            statusEl.textContent = "제목을 입력해주세요.";
            return;
        }
        const list = sortedItems(currentEditDayId);
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
        list.forEach((it, i) => (it.order = i));
        statusEl.textContent = "저장 중...";
        saveDay(currentEditDayId, list)
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
        if (!isAdmin()) return;
        if (!skipConfirm && !confirm("이 카드를 삭제할까요?")) return;
        const list = sortedItems(dayId).filter(function (it) {
            return it.id !== itemId;
        });
        list.forEach((it, i) => (it.order = i));
        saveDay(dayId, list)
            .then(function () {
                window.closeItemModal();
            })
            .catch(function (err) {
                alert("삭제 실패. 다시 시도해주세요.");
                console.error(err);
            });
    };

    // ---- Hooks for trip-page.js / trip-io.js ----
    window.__renderItinerary = renderAllDays;
    window.__deleteItineraryDay = function (dayId) {
        if (!itineraryData[dayId]) return Promise.resolve();
        const next = Object.assign({}, itineraryData);
        delete next[dayId];
        itineraryData = next;
        return firebase.firestore().collection("itineraries").doc(TRIP_ID).set(next);
    };
    window.__itineraryApi = {
        getDayIds: getDayIds,
        getData: function () {
            return itineraryData;
        },
        replaceAll: function (data) {
            return firebase.firestore().collection("itineraries").doc(TRIP_ID).set(data);
        }
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
