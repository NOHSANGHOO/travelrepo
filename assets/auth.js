(function () {
    const ADMIN_EMAILS = ["setario87@gmail.com", "hd3311@gmail.com"];
    const authListeners = [];
    let auth = null;
    let analytics = null;
    let ready = false;

    function emailPrefix(email) {
        return (email || "").split("@")[0];
    }

    function initFirebase() {
        if (typeof firebase === "undefined" || typeof firebaseConfig === "undefined" || !firebaseConfig.apiKey) {
            console.warn("Firebase 설정이 아직 연결되지 않았습니다. assets/firebase-config.js를 확인하세요.");
            return;
        }
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        auth = firebase.auth();
        try {
            auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        } catch (err) {
            console.warn("로그인 지속성 설정에 실패했습니다.", err);
        }
        if (typeof firebase.analytics === "function") {
            try {
                analytics = firebase.analytics();
            } catch (err) {
                console.warn("Analytics를 초기화하지 못했습니다.", err);
            }
        }
        ready = true;
        auth.onAuthStateChanged(handleAuthState);
    }

    function handleAuthState(user) {
        const gate = document.getElementById("access-gate");
        if (user) {
            if (gate) gate.style.display = "none";
            document.body.style.overflow = "";
            if (analytics) {
                analytics.setUserId(emailPrefix(user.email));
                analytics.logEvent("login", { user_prefix: emailPrefix(user.email) });
            }
        } else {
            if (gate) gate.style.display = "";
            document.body.style.overflow = "hidden";
        }
        updateLoginUI(user);
        authListeners.forEach(function (cb) {
            cb(user);
        });
    }

    function updateLoginUI(user) {
        const icon = document.getElementById("admin-login-icon");
        if (icon) {
            const btn = icon.closest("button");
            if (user) {
                icon.classList.remove("fa-lock");
                icon.classList.add("fa-circle-user");
                if (btn) btn.title = emailPrefix(user.email) + " (클릭하여 계정 정보)";
            } else {
                icon.classList.remove("fa-circle-user");
                icon.classList.add("fa-lock");
                if (btn) btn.title = "로그인 필요";
            }
        }
        const emailEl = document.getElementById("profile-email");
        if (emailEl && user) emailEl.textContent = user.email || "";
        const roleEl = document.getElementById("profile-role");
        if (roleEl && user) roleEl.textContent = window.isAdmin() ? "관리자 · 편집 가능" : "뷰어 · 읽기 전용";
        if (!user) hideProfile();
    }

    function hideProfile() {
        const pop = document.getElementById("profile-popover");
        if (pop) pop.classList.add("hidden");
    }

    window.onProfileClick = function (e) {
        if (e) e.stopPropagation();
        if (auth && auth.currentUser) {
            const pop = document.getElementById("profile-popover");
            if (pop) pop.classList.toggle("hidden");
        } else {
            window.gateSignIn();
        }
    };

    window.doSignOut = function () {
        hideProfile();
        if (auth) auth.signOut();
    };

    // close popover when tapping elsewhere
    document.addEventListener("click", function (e) {
        const pop = document.getElementById("profile-popover");
        if (!pop || pop.classList.contains("hidden")) return;
        if (e.target.closest("#profile-popover") || e.target.closest("#profile-btn")) return;
        hideProfile();
    });

    window.isAdmin = function () {
        return !!(auth && auth.currentUser && ADMIN_EMAILS.indexOf(auth.currentUser.email) !== -1);
    };

    window.onAuthChange = function (cb) {
        authListeners.push(cb);
    };

    window.gateSignIn = function () {
        if (!ready) {
            alert("Firebase 설정이 아직 연결되지 않았습니다. assets/firebase-config.js를 확인하세요.");
            return;
        }
        const errorEl = document.getElementById("access-gate-error");
        if (errorEl) errorEl.textContent = "";
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(function (err) {
            console.error(err);
            if (errorEl) errorEl.textContent = "로그인에 실패했습니다. 다시 시도해주세요.";
        });
    };

    window.toggleLogin = function () {
        if (auth && auth.currentUser) {
            if (confirm("로그아웃 하시겠습니까?")) {
                auth.signOut();
            }
        } else {
            window.gateSignIn();
        }
    };

    document.addEventListener("DOMContentLoaded", initFirebase);
})();
