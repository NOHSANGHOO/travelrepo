(function () {
    const TRIP_ID = document.body.dataset.tripId;

    function getTrip() {
        if (typeof TRIPS === "undefined") return null;
        return (
            TRIPS.find(function (t) {
                return t.id === TRIP_ID;
            }) || null
        );
    }

    function isTripOver(trip) {
        if (!trip || !trip.endDate) return true;
        const end = new Date(trip.endDate + "T23:59:59");
        return new Date() > end;
    }

    function applyVisibility() {
        const overlay = document.getElementById("trip-lock");
        if (!overlay) return;
        const trip = getTrip();
        const admin = window.isAdmin && window.isAdmin();
        const allowed = admin || isTripOver(trip);
        overlay.style.display = allowed ? "none" : "";
        document.body.style.overflow = allowed ? "" : "hidden";
    }

    document.addEventListener("DOMContentLoaded", function () {
        if (typeof window.onAuthChange !== "function") return;
        window.onAuthChange(function (user) {
            if (user) applyVisibility();
        });
    });
})();
