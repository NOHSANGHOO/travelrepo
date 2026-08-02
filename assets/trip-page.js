(function () {
    const TRIP_ID = document.body.dataset.tripId;
    const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
    let meta = null;
    let currentTab = null;

    function esc(str) {
        return String(str == null ? "" : str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function isAdmin() {
        return !!(window.isAdmin && window.isAdmin());
    }

    function dayShort(label) {
        return String(label || "").split(" (")[0];
    }

    function addDaysISO(iso, n) {
        const d = new Date(iso + "T00:00:00");
        if (isNaN(d)) return "";
        d.setDate(d.getDate() + n);
        const p = (x) => String(x).padStart(2, "0");
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    }

    // Normalized days, each guaranteed to have a `date` (derived from startDate if missing).
    window.__tripDays = function () {
        return normalizeDays(meta && meta.days).map(function (d, i) {
            return {
                id: d.id,
                label: d.label,
                date: d.date || (meta && meta.startDate ? addDaysISO(meta.startDate, i) : "day" + (i + 1))
            };
        });
    };

    // ---- Build page structure from meta ----
    function activateTab() {
        const ids = normalizeDays(meta && meta.days).map((d) => d.id).concat(["info"]);
        if (ids.indexOf(currentTab) < 0) currentTab = ids[0] || "info";
        document.querySelectorAll(".tab-content").forEach((el) => el.classList.remove("active"));
        document.querySelectorAll(".tab-btn").forEach((el) => {
            el.classList.remove("active", "text-stone-900", "border-b-2", "border-teal-600");
            el.classList.add("text-stone-500");
        });
        const content = document.getElementById(currentTab);
        if (content) content.classList.add("active");
        const btn = document.getElementById("tab-" + currentTab);
        if (btn) {
            btn.classList.remove("text-stone-500");
            btn.classList.add("active", "text-stone-900", "border-b-2", "border-teal-600");
        }
    }

    window.switchTab = function (tabId) {
        currentTab = tabId;
        activateTab();
    };

    // Firestore console mistakes (or old data) can leave `days` as a map like
    // {0: {...}, 1: {...}} instead of a real array — tolerate that instead of crashing.
    function normalizeDays(rawDays) {
        if (Array.isArray(rawDays)) return rawDays.filter((d) => d && d.id);
        if (rawDays && typeof rawDays === "object") {
            return Object.keys(rawDays)
                .sort((a, b) => Number(a) - Number(b))
                .map((k) => rawDays[k])
                .filter((d) => d && d.id);
        }
        return [];
    }

    function buildStructure() {
        try {
            document.title = (meta.title || "여행") + " · 여행 상세";
            document.getElementById("trip-header-body").innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <h1 class="text-xl font-bold">${esc(meta.headerTitle || meta.title || "")}</h1>
                    <span class="text-xs bg-white/10 px-2 py-1 rounded-full text-stone-100">${esc(meta.duration || "")}</span>
                </div>
                <p class="text-sm text-stone-300"><i class="fa-solid fa-location-dot mr-1"></i> ${esc(meta.locationLabel || meta.location || "")}</p>
                <p class="text-sm text-stone-300 mt-1"><i class="fa-regular fa-calendar mr-1"></i> ${esc(meta.dateLabel || "")}</p>`;

            const days = normalizeDays(meta.days);
            let tabsHtml = days
                .map((d) => `<button onclick="switchTab('${esc(d.id)}')" id="tab-${esc(d.id)}" class="tab-btn px-4 py-3 hover:text-stone-900 transition-colors">${esc(dayShort(d.label))}</button>`)
                .join("");
            tabsHtml += `<button onclick="switchTab('info')" id="tab-info" class="tab-btn px-4 py-3 hover:text-stone-900 transition-colors">상세 정보</button>`;
            document.getElementById("trip-tabs").innerHTML = tabsHtml;

            if (!days.length) {
                document.getElementById("trip-days").innerHTML = `<p class="text-sm text-stone-500 text-center py-8">아직 일차가 없어요. 헤더의 ⚙️ 아이콘에서 일차를 추가해주세요.</p>`;
            } else {
                document.getElementById("trip-days").innerHTML = days
                    .map(
                        (d) => `
                <div id="${esc(d.id)}" class="tab-content">
                    <h2 class="text-lg font-bold text-stone-800 mb-4 ml-1">${esc(d.label)}</h2>
                    <div id="${esc(d.id)}-items"></div>
                    <button type="button" class="admin-add-btn hidden w-full py-2.5 rounded-lg border border-dashed border-stone-300 text-stone-500 text-sm font-medium mt-2" onclick="openAddItemModal('${esc(d.id)}')">
                        <i class="fa-solid fa-plus mr-1"></i> 일정카드 추가
                    </button>
                </div>`
                    )
                    .join("");
            }

            activateTab();
            if (typeof window.__renderItinerary === "function") window.__renderItinerary();
            if (typeof window.__renderTripInfo === "function") window.__renderTripInfo();
            if (typeof window.__applyTripVisibility === "function") window.__applyTripVisibility();
        } catch (err) {
            console.error("여행 페이지를 구성하는 중 오류가 발생했습니다.", err);
            document.getElementById("trip-header-body").innerHTML = `<h1 class="text-xl font-bold">화면을 불러오지 못했어요</h1>`;
            document.getElementById("trip-days").innerHTML = `<p class="text-sm text-rose-500 text-center py-8">데이터 형식에 문제가 있는 것 같아요.<br>개발자 도구 콘솔 오류 메시지를 확인해주세요.</p>`;
        }
    }

    function showNotFound() {
        document.getElementById("trip-header-body").innerHTML = `<h1 class="text-xl font-bold">여행을 찾을 수 없어요</h1>`;
        document.getElementById("trip-days").innerHTML = `<p class="text-sm text-stone-500 mt-6 text-center">주소가 잘못되었거나 삭제된 여행입니다. <a href="trips.html" class="text-teal-600 underline">목록으로</a></p>`;
    }

    function onTrips(list) {
        const found = list.find((t) => t.id === TRIP_ID) || null;
        if (!found) {
            // Before Firestore finishes loading, a valid new trip may not be in the
            // default seed yet — only show not-found once real data has loaded.
            meta = null;
            window.__tripMeta = null;
            if (window.TripsStore && window.TripsStore.isLoaded && window.TripsStore.isLoaded()) {
                showNotFound();
            }
            return;
        }
        meta = found;
        window.__tripMeta = found;
        buildStructure();
    }

    // ---- Trip settings (admin) ----
    function addSettingsDayRow(day) {
        const wrap = document.getElementById("ts-days");
        const div = document.createElement("div");
        div.className = "ts-day-row flex gap-2 mb-2 items-center";
        div.dataset.dayId = day ? day.id : "";
        div.innerHTML = `
            <input type="text" class="ts-day-label flex-1 border border-stone-200 rounded-lg p-2 text-sm" value="${esc(day ? day.label : "")}" placeholder="예: 1일차 (7/26, 일)">
            <button type="button" class="ts-day-remove text-stone-400 hover:text-rose-600 p-2"><i class="fa-solid fa-xmark"></i></button>`;
        div.querySelector(".ts-day-remove").addEventListener("click", function () {
            div.remove();
        });
        wrap.appendChild(div);
    }

    window.addSettingsDay = function () {
        addSettingsDayRow(null);
    };

    window.openTripSettings = function () {
        if (!meta || !isAdmin()) return;
        document.getElementById("ts-header").value = meta.headerTitle || "";
        document.getElementById("ts-title").value = meta.title || "";
        document.getElementById("ts-subtitle").value = meta.subtitle || "";
        document.getElementById("ts-location").value = meta.locationLabel || meta.location || "";
        document.getElementById("ts-start").value = meta.startDate || "";
        document.getElementById("ts-end").value = meta.endDate || "";
        document.getElementById("ts-days").innerHTML = "";
        normalizeDays(meta.days).forEach(addSettingsDayRow);
        document.getElementById("ts-status").textContent = "";
        document.getElementById("trip-settings-modal").classList.remove("hidden");
    };

    window.closeTripSettings = function () {
        document.getElementById("trip-settings-modal").classList.add("hidden");
    };

    function nextDayId(existing) {
        let max = 0;
        existing.forEach(function (d) {
            const m = /^day(\d+)$/.exec(d.id || "");
            if (m) max = Math.max(max, parseInt(m[1], 10));
        });
        return "day" + (max + 1);
    }

    window.saveTripSettings = function () {
        if (!meta || !isAdmin()) return;
        const statusEl = document.getElementById("ts-status");
        const startDate = document.getElementById("ts-start").value;
        const endDate = document.getElementById("ts-end").value;
        if (!startDate || !endDate || endDate < startDate) {
            statusEl.textContent = "시작/종료일을 확인해주세요.";
            return;
        }
        // rebuild days: keep existing ids, assign new ids to new rows
        const existing = normalizeDays(meta.days);
        const usedIds = existing.map((d) => d.id);
        const days = [];
        const kept = [];
        document.querySelectorAll("#ts-days .ts-day-row").forEach(function (row) {
            const label = row.querySelector(".ts-day-label").value.trim() || "일차";
            let id = row.dataset.dayId;
            if (!id) {
                id = nextDayId(existing.concat(days.map((d) => ({ id: d.id }))));
            }
            // date is assigned by position from the start date (consecutive days)
            days.push({ id: id, date: addDaysISO(startDate, days.length), label: label });
            kept.push(id);
        });
        if (!days.length) {
            statusEl.textContent = "최소 1개의 일차가 필요합니다.";
            return;
        }
        const removed = usedIds.filter((id) => kept.indexOf(id) < 0);
        const nights = Math.round((new Date(endDate) - new Date(startDate)) / 86400000);
        const s = new Date(startDate + "T00:00:00");
        const e = new Date(endDate + "T00:00:00");
        const p = (n) => String(n).padStart(2, "0");
        const locationVal = document.getElementById("ts-location").value.trim();
        const patch = {
            headerTitle: document.getElementById("ts-header").value.trim(),
            title: document.getElementById("ts-title").value.trim(),
            subtitle: document.getElementById("ts-subtitle").value.trim(),
            location: locationVal,
            locationLabel: locationVal,
            startDate: startDate,
            endDate: endDate,
            duration: nights > 0 ? `${nights}박 ${nights + 1}일` : "당일",
            dateLabel: `${s.getFullYear()}.${p(s.getMonth() + 1)}.${p(s.getDate())}(${WEEKDAYS[s.getDay()]}) - ${p(e.getMonth() + 1)}.${p(e.getDate())}(${WEEKDAYS[e.getDay()]})`,
            days: days
        };
        statusEl.textContent = "저장 중...";
        const removals = removed.map((id) => (typeof window.__deleteItineraryDay === "function" ? window.__deleteItineraryDay(id) : Promise.resolve()));
        Promise.all(removals)
            .then(() => window.TripsStore.update(TRIP_ID, patch))
            .then(function () {
                window.closeTripSettings();
            })
            .catch(function (err) {
                statusEl.textContent = "저장 실패. 다시 시도해주세요.";
                console.error(err);
            });
    };

    window.deleteTrip = function () {
        if (!meta || !isAdmin()) return;
        if (!confirm("이 여행 전체(일정·메모·상세정보 포함)를 삭제할까요? 되돌릴 수 없습니다.")) return;
        window.TripsStore.remove(TRIP_ID)
            .then(function () {
                window.location.href = "trips.html";
            })
            .catch(function (err) {
                alert("삭제 실패. 다시 시도해주세요.");
                console.error(err);
            });
    };

    document.addEventListener("DOMContentLoaded", function () {
        if (typeof window.onAuthChange === "function") {
            window.onAuthChange(function (user) {
                if (user && window.TripsStore) window.TripsStore.start();
                if (meta) buildStructure();
            });
        }
        if (window.TripsStore) window.TripsStore.onChange(onTrips);
    });
})();
