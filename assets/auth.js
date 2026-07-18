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
        if (!icon) return;
        const btn = icon.closest("button");
        if (user) {
            icon.classList.remove("fa-lock");
            icon.classList.add("fa-unlock");
            if (btn) btn.title = emailPrefix(user.email) + " 로그인됨 (클릭하여 로그아웃)";
        } else {
            icon.classList.remove("fa-unlock");
            icon.classList.add("fa-lock");
            if (btn) btn.title = "로그인 필요";
        }
    }

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
