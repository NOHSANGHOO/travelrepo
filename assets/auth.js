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
        // 열람은 로그인 없이도 가능합니다. 게이트로 화면을 막지 않습니다.
        const gate = document.getElementById("access-gate");
        if (gate) gate.style.display = "none";
        if (user && analytics) {
            analytics.setUserId(emailPrefix(user.email));
            analytics.logEvent("login", { user_prefix: emailPrefix(user.email) });
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
                icon.classList.remove("fa-lock", "fa-arrow-right-to-bracket", "text-stone-300");
                icon.classList.add("fa-circle-user", "text-emerald-300");
                if (btn) {
                    btn.title = emailPrefix(user.email) + " (계정 정보)";
                    btn.classList.add("ring-1", "ring-emerald-400/50", "bg-white/5");
                }
            } else {
                icon.classList.remove("fa-circle-user", "fa-lock", "text-emerald-300");
                icon.classList.add("fa-arrow-right-to-bracket");
                if (btn) {
                    btn.title = "로그인";
                    btn.classList.remove("ring-1", "ring-emerald-400/50", "bg-white/5");
                }
            }
        }
        const emailEl = document.getElementById("profile-email");
        if (emailEl && user) emailEl.textContent = user.email || "";
        const roleEl = document.getElementById("profile-role");
        if (roleEl && user) roleEl.textContent = window.isAdmin() ? "관리자 · 편집 가능" : "뷰어 · 읽기/댓글 가능";
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
            window.showToast("로그인에 실패했어요. 다시 시도해주세요.");
        });
    };

    // ---- Shared toast + copy-to-clipboard helpers (available on all pages) ----
    window.showToast = function (msg) {
        let t = document.getElementById("app-toast");
        if (!t) {
            t = document.createElement("div");
            t.id = "app-toast";
            t.style.cssText =
                "position:fixed;left:50%;bottom:32px;transform:translateX(-50%) translateY(20px);background:#292524;color:#fff;padding:10px 18px;border-radius:9999px;font-size:13px;font-weight:500;z-index:200;opacity:0;transition:opacity .2s ease,transform .2s ease;box-shadow:0 6px 22px rgba(0,0,0,.28);pointer-events:none;max-width:90vw;text-align:center;";
            document.body.appendChild(t);
        }
        t.textContent = msg;
        requestAnimationFrame(function () {
            t.style.opacity = "1";
            t.style.transform = "translateX(-50%) translateY(0)";
        });
        clearTimeout(t._timer);
        t._timer = setTimeout(function () {
            t.style.opacity = "0";
            t.style.transform = "translateX(-50%) translateY(20px)";
        }, 1800);
    };

    window.copyShareLink = function (url, e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const done = function () {
            window.showToast("URL이 복사되었습니다");
        };
        const fallback = function () {
            try {
                const ta = document.createElement("textarea");
                ta.value = url;
                ta.style.position = "fixed";
                ta.style.opacity = "0";
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
                done();
            } catch (err) {
                console.error(err);
                window.showToast("복사에 실패했어요");
            }
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(done).catch(fallback);
        } else {
            fallback();
        }
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
