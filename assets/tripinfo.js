(function () {
    const TRIP_ID = document.body.dataset.tripId;
    let infoData = typeof DEFAULT_TRIPINFO !== "undefined" ? DEFAULT_TRIPINFO : { sections: [] };
    let listenerStarted = false;
    let currentEditId = null;

    // 따뜻한 아날로그 파스텔 팔레트 (아이콘 프리셋과 톤 통일)
    const INFO_PRESETS = [
        { key: "link", label: "🔗 링크/예약", icon: "fa-solid fa-link", text: "text-[#4d8a7a]" },
        { key: "plane", label: "✈️ 항공편", icon: "fa-solid fa-plane", text: "text-[#5a83a0]" },
        { key: "parking", label: "🅿️ 주차/발렛", icon: "fa-solid fa-square-parking", text: "text-[#7e7264]" },
        { key: "hotel", label: "🏨 숙소", icon: "fa-solid fa-hotel", text: "text-[#8a7560]" },
        { key: "suitcase", label: "🧳 수하물/전략", icon: "fa-solid fa-suitcase", text: "text-[#6d9256]" },
        { key: "camera", label: "📷 관광 정보", icon: "fa-solid fa-camera-retro", text: "text-[#c26a4d]" },
        { key: "ticket", label: "🎫 예매/티켓", icon: "fa-solid fa-ticket", text: "text-[#c08535]" },
        { key: "info", label: "ℹ️ 기타 정보", icon: "fa-solid fa-circle-info", text: "text-[#8a8078]" }
    ];

    function infoPreset(key) {
        return INFO_PRESETS.find((p) => p.key === key) || INFO_PRESETS[INFO_PRESETS.length - 1];
    }

    function isAdmin() {
        return !!(window.isAdmin && window.isAdmin());
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function isPureUrl(str) {
        return /^https?:\/\/\S+$/i.test(String(str).trim());
    }

    function linkify(str) {
        const escaped = escapeHtml(str);
        const urlRegex = /(https?:\/\/[^\s<]+)/g;
        return escaped
            .replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener" class="underline text-teal-700 break-all">${url}</a>`)
            .replace(/\n/g, "<br>");
    }

    function newSectionId() {
        return "sec-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }

    function getSections() {
        return (infoData && infoData.sections) || [];
    }

    function renderRow(row) {
        const label = (row.label || "").trim();
        const value = row.value || "";
        if (!label) {
            return `<div class="text-sm text-stone-600 mb-2 flex gap-2"><span class="text-teal-500 mt-0.5">•</span><span class="flex-1">${linkify(value)}</span></div>`;
        }
        if (isPureUrl(value)) {
            return `<div class="data-row"><div class="data-label">${escapeHtml(label)}</div><div class="data-value"><a href="${escapeHtml(value.trim())}" target="_blank" rel="noopener" class="text-teal-600 font-medium">바로가기 <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i></a></div></div>`;
        }
        return `<div class="data-row"><div class="data-label">${escapeHtml(label)}</div><div class="data-value">${linkify(value)}</div></div>`;
    }

    function renderSection(section) {
        const preset = infoPreset(section.icon);
        const admin = isAdmin();
        const actions = admin
            ? `<div class="ml-auto flex gap-3">
                 <button type="button" onclick="editInfoSection('${section.id}')" class="text-stone-400 hover:text-stone-700"><i class="fa-solid fa-pen text-xs"></i></button>
                 <button type="button" onclick="deleteInfoSection('${section.id}')" class="text-stone-400 hover:text-rose-600"><i class="fa-solid fa-trash text-xs"></i></button>
               </div>`
            : "";
        const rowsHtml = (section.rows || []).map(renderRow).join("");
        return `<div class="info-card">
                    <div class="info-card-header ${preset.text}">
                        <i class="${preset.icon}"></i> ${escapeHtml(section.title || "")}${actions}
                    </div>
                    ${rowsHtml}
                </div>`;
    }

    function renderInfo() {
        const container = document.getElementById("info-sections");
        if (!container) return;
        container.innerHTML = getSections().map(renderSection).join("");
        const addBtn = document.getElementById("info-add-btn");
        if (addBtn) addBtn.classList.toggle("hidden", !isAdmin());
    }
    window.__renderTripInfo = renderInfo;

    function populateIconSelect() {
        const select = document.getElementById("info-modal-icon");
        if (!select || select.options.length) return;
        INFO_PRESETS.forEach(function (p) {
            const opt = document.createElement("option");
            opt.value = p.key;
            opt.textContent = p.label;
            select.appendChild(opt);
        });
    }

    // ---- Row editor ----
    function addRowEditor(label, value) {
        const wrap = document.getElementById("info-modal-rows");
        const div = document.createElement("div");
        div.className = "info-row-editor flex gap-2 mb-2 items-start";
        div.innerHTML = `
            <input type="text" class="row-label w-24 shrink-0 border border-stone-200 rounded-lg p-2 text-sm" placeholder="항목(선택)" value="${escapeHtml(label || "")}">
            <textarea class="row-value flex-1 border border-stone-200 rounded-lg p-2 text-sm h-10" placeholder="내용 / URL">${escapeHtml(value || "")}</textarea>
            <button type="button" class="row-remove text-stone-400 hover:text-rose-600 p-2"><i class="fa-solid fa-xmark"></i></button>`;
        div.querySelector(".row-remove").addEventListener("click", function () {
            div.remove();
        });
        wrap.appendChild(div);
    }

    window.addInfoRow = function () {
        addRowEditor("", "");
    };

    window.openAddInfoSection = function () {
        populateIconSelect();
        currentEditId = null;
        document.getElementById("info-modal-heading").textContent = "정보 카드 추가";
        document.getElementById("info-modal-icon").value = "info";
        document.getElementById("info-modal-title-input").value = "";
        document.getElementById("info-modal-rows").innerHTML = "";
        addRowEditor("", "");
        document.getElementById("info-modal-status").textContent = "";
        document.getElementById("info-modal-delete").classList.add("hidden");
        document.getElementById("info-modal").classList.remove("hidden");
    };

    window.editInfoSection = function (id) {
        populateIconSelect();
        const section = getSections().find((s) => s.id === id);
        if (!section) return;
        currentEditId = id;
        document.getElementById("info-modal-heading").textContent = "정보 카드 편집";
        document.getElementById("info-modal-icon").value = section.icon || "info";
        document.getElementById("info-modal-title-input").value = section.title || "";
        document.getElementById("info-modal-rows").innerHTML = "";
        (section.rows || []).forEach((r) => addRowEditor(r.label, r.value));
        if (!(section.rows || []).length) addRowEditor("", "");
        document.getElementById("info-modal-status").textContent = "";
        document.getElementById("info-modal-delete").classList.remove("hidden");
        document.getElementById("info-modal").classList.remove("hidden");
    };

    window.closeInfoModal = function () {
        document.getElementById("info-modal").classList.add("hidden");
        currentEditId = null;
    };

    function collectRows() {
        const rows = [];
        document.querySelectorAll("#info-modal-rows .info-row-editor").forEach(function (div) {
            const label = div.querySelector(".row-label").value.trim();
            const value = div.querySelector(".row-value").value;
            if (label || (value && value.trim())) rows.push({ label: label, value: value });
        });
        return rows;
    }

    function persist(sections) {
        infoData = { sections: sections };
        return firebase.firestore().collection("tripinfo").doc(TRIP_ID).set(infoData);
    }

    window.saveInfoSection = function () {
        if (!isAdmin()) return;
        const title = document.getElementById("info-modal-title-input").value.trim();
        const statusEl = document.getElementById("info-modal-status");
        if (!title) {
            statusEl.textContent = "제목을 입력해주세요.";
            return;
        }
        const section = {
            id: currentEditId || newSectionId(),
            icon: document.getElementById("info-modal-icon").value,
            title: title,
            rows: collectRows()
        };
        const sections = getSections().slice();
        if (currentEditId) {
            const idx = sections.findIndex((s) => s.id === currentEditId);
            if (idx > -1) sections[idx] = section;
            else sections.push(section);
        } else {
            sections.push(section);
        }
        statusEl.textContent = "저장 중...";
        persist(sections)
            .then(function () {
                window.closeInfoModal();
            })
            .catch(function (err) {
                statusEl.textContent = "저장 실패. 다시 시도해주세요.";
                console.error(err);
            });
    };

    window.deleteInfoSection = function (id) {
        if (!isAdmin()) return;
        const target = id || currentEditId;
        if (!target) return;
        if (!confirm("이 정보 카드를 삭제할까요?")) return;
        const sections = getSections().filter((s) => s.id !== target);
        persist(sections)
            .then(function () {
                window.closeInfoModal();
            })
            .catch(function (err) {
                alert("삭제 실패. 다시 시도해주세요.");
                console.error(err);
            });
    };

    function startInfoListener() {
        if (listenerStarted || !TRIP_ID) return;
        listenerStarted = true;
        firebase
            .firestore()
            .collection("tripinfo")
            .doc(TRIP_ID)
            .onSnapshot(
                function (doc) {
                    if (doc.exists) {
                        infoData = doc.data() || { sections: [] };
                    } else {
                        infoData = typeof DEFAULT_TRIPINFO !== "undefined" ? DEFAULT_TRIPINFO : { sections: [] };
                        maybeSeed();
                    }
                    renderInfo();
                },
                function (err) {
                    console.error("상세 정보를 불러오지 못했습니다.", err);
                }
            );
    }

    function maybeSeed() {
        if (!isAdmin() || typeof DEFAULT_TRIPINFO === "undefined") return;
        firebase.firestore().collection("tripinfo").doc(TRIP_ID).set(DEFAULT_TRIPINFO).catch(function (err) {
            console.error("초기 상세 정보를 저장하지 못했습니다.", err);
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        populateIconSelect();
        renderInfo();
        if (typeof window.onAuthChange !== "function") return;
        window.onAuthChange(function (user) {
            if (user) startInfoListener();
            renderInfo();
        });
    });
})();
