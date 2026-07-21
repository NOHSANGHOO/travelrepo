(function () {
    const listeners = [];
    let trips = null; // null = not loaded from Firestore yet
    let started = false;
    let loaded = false;

    function db() {
        return firebase.firestore();
    }

    function byOrder(a, b) {
        return (a.order || 0) - (b.order || 0) || String(a.startDate || "").localeCompare(String(b.startDate || ""));
    }

    function effective() {
        if (trips && trips.length) return trips.slice().sort(byOrder);
        return (typeof DEFAULT_TRIPS !== "undefined" ? DEFAULT_TRIPS : []).slice().sort(byOrder);
    }

    function emit() {
        const list = effective();
        listeners.forEach(function (cb) {
            cb(list);
        });
    }

    function start() {
        if (started || typeof firebase === "undefined") return;
        started = true;
        db()
            .collection("trips")
            .onSnapshot(
                function (qs) {
                    const arr = [];
                    qs.forEach(function (d) {
                        arr.push(d.data());
                    });
                    trips = arr;
                    loaded = true;
                    if (!arr.length && window.isAdmin && window.isAdmin() && typeof DEFAULT_TRIPS !== "undefined") {
                        DEFAULT_TRIPS.forEach(function (t) {
                            db().collection("trips").doc(t.id).set(t).catch(function (e) {
                                console.error(e);
                            });
                        });
                    }
                    emit();
                },
                function (err) {
                    console.error("여행 목록을 불러오지 못했습니다.", err);
                }
            );
    }

    window.TripsStore = {
        start: start,
        isLoaded: function () {
            return loaded;
        },
        onChange: function (cb) {
            listeners.push(cb);
            if (trips !== null || typeof DEFAULT_TRIPS !== "undefined") cb(effective());
        },
        all: function () {
            return effective();
        },
        get: function (id) {
            return effective().find(function (t) {
                return t.id === id;
            }) || null;
        },
        create: function (meta) {
            return db().collection("trips").doc(meta.id).set(meta);
        },
        update: function (id, meta) {
            return db().collection("trips").doc(id).set(meta, { merge: true });
        },
        remove: function (id) {
            const b = db();
            return Promise.all([
                b.collection("trips").doc(id).delete(),
                b.collection("itineraries").doc(id).delete().catch(function () {}),
                b.collection("tripinfo").doc(id).delete().catch(function () {}),
                b.collection("notes").doc(id).delete().catch(function () {})
            ]);
        }
    };
})();
