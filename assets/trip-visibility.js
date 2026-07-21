(function () {
    function isTripOver(trip) {
        if (!trip || !trip.endDate) return false; // meta not loaded yet → treat as not-over (admin-gated below)
        const end = new Date(trip.endDate + "T23:59:59");
        return new Date() > end;
    }

    window.__applyTripVisibility = function () {
        const overlay = document.getElementById("trip-lock");
        if (!overlay) return;
        const trip = window.__tripMeta || null;
        const admin = window.isAdmin && window.isAdmin();
        // Until meta loads, keep locked for non-admins to avoid flashing private content.
        const allowed = admin || (trip && isTripOver(trip));
        overlay.style.display = allowed ? "none" : "";
        document.body.style.overflow = allowed ? "" : "hidden";
    };

    document.addEventListener("DOMContentLoaded", function () {
        if (typeof window.onAuthChange !== "function") return;
        window.onAuthChange(function () {
            window.__applyTripVisibility();
        });
    });
})();
