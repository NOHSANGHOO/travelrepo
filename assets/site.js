function tripStatus(trip, today) {
    const start = new Date(trip.startDate + "T00:00:00");
    const end = new Date(trip.endDate + "T23:59:59");
    if (today < start) {
        const days = Math.ceil((start - today) / 86400000);
        return { key: "upcoming", label: `D-${days}`, class: "bg-indigo-100 text-indigo-700" };
    }
    if (today > end) {
        return { key: "past", label: "다녀옴", class: "bg-slate-200 text-slate-600" };
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

function renderTrips(filterKey) {
    const container = document.getElementById("trip-list");
    const empty = document.getElementById("empty-state");
    const today = new Date();
    const withStatus = TRIPS.map((t) => ({ trip: t, status: tripStatus(t, today) }))
        .sort((a, b) => new Date(a.trip.startDate) - new Date(b.trip.startDate));

    const filtered = withStatus.filter(({ status }) => filterKey === "all" || status.key === filterKey);

    container.innerHTML = "";
    if (filtered.length === 0) {
        empty.classList.remove("hidden");
        return;
    }
    empty.classList.add("hidden");

    filtered.forEach(({ trip, status }) => {
        const card = document.createElement("a");
        card.href = trip.url;
        card.className = "block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow";
        card.innerHTML = `
            <div class="h-24 bg-gradient-to-r ${trip.gradient} flex items-center justify-between px-5">
                <i class="${trip.icon} text-white text-3xl opacity-90"></i>
                <span class="text-xs font-bold px-2 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm">${trip.duration}</span>
            </div>
            <div class="p-4">
                <div class="flex justify-between items-start gap-2 mb-1">
                    <h3 class="font-bold text-slate-800 text-lg">${trip.title}</h3>
                    <span class="shrink-0 text-xs font-bold px-2 py-1 rounded-full ${status.class}">${status.label}</span>
                </div>
                <p class="text-sm text-slate-500 mb-2">${trip.subtitle}</p>
                <div class="flex items-center text-xs text-slate-400 gap-3">
                    <span><i class="fa-solid fa-location-dot mr-1"></i>${trip.location}</span>
                    <span><i class="fa-regular fa-calendar mr-1"></i>${formatDateRange(trip)}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function switchFilter(key) {
    document.querySelectorAll(".filter-btn").forEach((btn) => {
        const active = btn.dataset.filter === key;
        btn.classList.toggle("bg-slate-800", active);
        btn.classList.toggle("text-white", active);
        btn.classList.toggle("bg-white", !active);
        btn.classList.toggle("text-slate-600", !active);
    });
    renderTrips(key);
}

document.addEventListener("DOMContentLoaded", () => switchFilter("all"));
