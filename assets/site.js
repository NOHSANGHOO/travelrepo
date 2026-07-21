const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
let currentFilter = "all";
let currentTrips = [];

function tripStatus(trip, today) {
    const start = new Date(trip.startDate + "T00:00:00");
    const end = new Date(trip.endDate + "T23:59:59");
    if (today < start) {
        const days = Math.ceil((start - today) / 86400000);
        return { key: "upcoming", label: `D-${days}`, class: "bg-teal-100 text-teal-700" };
    }
    if (today > end) {
        return { key: "past", label: "다녀옴", class: "bg-stone-200 text-stone-600" };
    }
    return { key: "ongoing", label: "여행 중", class: "bg-rose-100 text-rose-700" };
}

function formatDateRange(trip) {
    const fmt = (d) => {
        const [, m, day] = d.split("-");
        return `${parseInt(m, 10)}.${parseInt(day, 10)}`;
    };
    return `${trip.startDate.slice(0, 4)}.${fmt(trip.startDate)} - ${fmt(trip.endDate)}`;
}

function canViewTrip(trip) {
    if (window.isAdmin && window.isAdmin()) return true;
    const end = new Date(trip.endDate + "T23:59:59");
    return new Date() > end;
}

function renderTrips(filterKey) {
    const container = document.getElementById("trip-list");
    const empty = document.getElementById("empty-state");
    if (!container) return;
    const today = new Date();
    const withStatus = currentTrips
        .map((t) => ({ trip: t, status: tripStatus(t, today) }))
        .sort((a, b) => new Date(a.trip.startDate) - new Date(b.trip.startDate));

    const filtered = withStatus.filter(({ status }) => filterKey === "all" || status.key === filterKey);

    container.innerHTML = "";
    if (filtered.length === 0) {
        empty.classList.remove("hidden");
        return;
    }
    empty.classList.add("hidden");

    filtered.forEach(({ trip, status }) => {
        const viewable = canViewTrip(trip);
        const card = document.createElement(viewable ? "a" : "div");
        if (viewable) card.href = "trip.html?id=" + encodeURIComponent(trip.id);
        card.className = viewable
            ? "block bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden hover:shadow-md transition-shadow"
            : "block bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden opacity-70 cursor-not-allowed";
        const badge = viewable
            ? `<span class="text-xs font-bold px-2 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm">${trip.duration || ""}</span>`
            : `<span class="text-xs font-bold px-2 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm"><i class="fa-solid fa-lock mr-1"></i>비공개</span>`;
        card.innerHTML = `
            <div class="h-24 bg-gradient-to-r ${trip.gradient || "from-teal-500 to-sky-500"} flex items-center justify-between px-5">
                <i class="${trip.icon || "fa-solid fa-plane"} text-white text-3xl opacity-90"></i>
                ${badge}
            </div>
            <div class="p-4">
                <div class="flex justify-between items-start gap-2 mb-1">
                    <h3 class="font-bold text-stone-800 text-lg">${trip.title || ""}</h3>
                    <span class="shrink-0 text-xs font-bold px-2 py-1 rounded-full ${status.class}">${status.label}</span>
                </div>
                <p class="text-sm text-stone-500 mb-2">${trip.subtitle || ""}</p>
                <div class="flex items-center text-xs text-stone-400 gap-3">
                    <span><i class="fa-solid fa-location-dot mr-1"></i>${trip.location || ""}</span>
                    <span><i class="fa-regular fa-calendar mr-1"></i>${formatDateRange(trip)}</span>
                </div>
                ${viewable ? "" : `<p class="text-xs text-stone-400 mt-2"><i class="fa-solid fa-hourglass-half mr-1"></i>여행이 끝나면 볼 수 있어요</p>`}
            </div>
        `;
        container.appendChild(card);
    });
}

function switchFilter(key) {
    currentFilter = key;
    document.querySelectorAll(".filter-btn").forEach((btn) => {
        const active = btn.dataset.filter === key;
        btn.classList.toggle("bg-teal-600", active);
        btn.classList.toggle("text-white", active);
        btn.classList.toggle("bg-white", !active);
        btn.classList.toggle("text-stone-600", !active);
    });
    renderTrips(key);
}

// ---- New trip creation (admin) ----
function computeDays(startDate, count) {
    const days = [];
    const base = startDate ? new Date(startDate + "T00:00:00") : null;
    for (let i = 0; i < count; i++) {
        let label = i + 1 + "일차";
        if (base) {
            const d = new Date(base);
            d.setDate(base.getDate() + i);
            label = `${i + 1}일차 (${d.getMonth() + 1}/${d.getDate()}, ${WEEKDAYS[d.getDay()]})`;
        }
        days.push({ id: "day" + (i + 1), label: label });
    }
    return days;
}

function dateLabelOf(startDate, endDate) {
    const s = new Date(startDate + "T00:00:00");
    const e = new Date(endDate + "T00:00:00");
    const p = (n) => String(n).padStart(2, "0");
    return `${s.getFullYear()}.${p(s.getMonth() + 1)}.${p(s.getDate())}(${WEEKDAYS[s.getDay()]}) - ${p(e.getMonth() + 1)}.${p(e.getDate())}(${WEEKDAYS[e.getDay()]})`;
}

window.openNewTrip = function () {
    ["nt-title", "nt-location", "nt-start", "nt-end"].forEach((id) => (document.getElementById(id).value = ""));
    document.getElementById("nt-status").textContent = "";
    document.getElementById("new-trip-modal").classList.remove("hidden");
};

window.closeNewTrip = function () {
    document.getElementById("new-trip-modal").classList.add("hidden");
};

window.createTrip = function () {
    if (!(window.isAdmin && window.isAdmin())) return;
    const statusEl = document.getElementById("nt-status");
    const title = document.getElementById("nt-title").value.trim();
    const locationVal = document.getElementById("nt-location").value.trim();
    const startDate = document.getElementById("nt-start").value;
    const endDate = document.getElementById("nt-end").value;
    if (!title || !startDate || !endDate) {
        statusEl.textContent = "이름과 시작/종료일을 입력해주세요.";
        return;
    }
    if (endDate < startDate) {
        statusEl.textContent = "종료일이 시작일보다 빠릅니다.";
        return;
    }
    const nights = Math.round((new Date(endDate) - new Date(startDate)) / 86400000);
    const count = nights + 1;
    const gradients = ["from-teal-500 to-sky-500", "from-rose-400 to-orange-400", "from-indigo-500 to-purple-500", "from-emerald-500 to-teal-500", "from-amber-400 to-rose-400"];
    const meta = {
        id: "trip-" + Date.now().toString(36),
        title: title,
        subtitle: "",
        headerTitle: title + " ✈️",
        location: locationVal,
        locationLabel: locationVal,
        startDate: startDate,
        endDate: endDate,
        duration: nights > 0 ? `${nights}박 ${count}일` : "당일",
        dateLabel: dateLabelOf(startDate, endDate),
        icon: "fa-solid fa-plane",
        gradient: gradients[Math.floor(Math.random() * gradients.length)],
        order: currentTrips.length,
        days: computeDays(startDate, count)
    };
    statusEl.textContent = "만드는 중...";
    window.TripsStore.create(meta)
        .then(function () {
            window.location.href = "trip.html?id=" + encodeURIComponent(meta.id);
        })
        .catch(function (err) {
            statusEl.textContent = "생성 실패. 다시 시도해주세요.";
            console.error(err);
        });
};

function updateAdminUI() {
    const btn = document.getElementById("new-trip-btn");
    if (btn) btn.classList.toggle("hidden", !(window.isAdmin && window.isAdmin()));
}

document.addEventListener("DOMContentLoaded", () => {
    if (typeof DEFAULT_TRIPS !== "undefined") currentTrips = DEFAULT_TRIPS.slice();
    switchFilter("all");
    if (typeof window.onAuthChange === "function") {
        window.onAuthChange(function (user) {
            updateAdminUI();
            if (user && window.TripsStore) window.TripsStore.start();
        });
    }
    if (window.TripsStore) {
        window.TripsStore.onChange(function (list) {
            currentTrips = list;
            updateAdminUI();
            renderTrips(currentFilter);
        });
    }
});
