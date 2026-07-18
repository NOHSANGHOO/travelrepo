(function () {
    const TRIP_ID = document.body.dataset.tripId;
    let currentItemId = null;
    let notesData = {};
    let db = null;
    let auth = null;
    let isReady = false;

    function escapeHtml(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function linkify(str) {
        const escaped = escapeHtml(str);
        const urlRegex = /(https?:\/\/[^\s<]+)/g;
        return escaped
            .replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener" class="underline text-indigo-700 break-all">${url}</a>`)
            .replace(/\n/g, "<br>");
    }

    function isAdmin() {
        return !!(auth && auth.currentUser);
    }

    function renderSlot(itemId) {
        const slot = document.querySelector(`.note-slot[data-item-id="${itemId}"]`);
        if (!slot) return;
        const display = slot.querySelector(".note-display");
        const label = slot.querySelector(".note-btn-label");
        const entry = notesData[itemId];
        if (entry && entry.note) {
            display.innerHTML = linkify(entry.note);
            display.classList.remove("hidden");
            label.textContent = isAdmin() ? "메모 수정" : "메모 보기";
        } else {
            display.innerHTML = "";
            display.classList.add("hidden");
            label.textContent = isAdmin() ? "메모" : "메모 보기";
        }
    }

    function renderAllSlots() {
        document.querySelectorAll(".note-slot[data-item-id]").forEach((slot) => {
            renderSlot(slot.dataset.itemId);
        });
    }

    function updateAdminUI() {
        const icon = document.getElementById("admin-login-icon");
        if (!icon) return;
        if (isAdmin()) {
            icon.classList.remove("fa-lock");
            icon.classList.add("fa-unlock");
            icon.closest("button").title = "로그인됨 (클릭하여 로그아웃)";
        } else {
            icon.classList.remove("fa-unlock");
            icon.classList.add("fa-lock");
            icon.closest("button").title = "관리자 로그인 (메모 편집)";
        }
    }

    function initFirebase() {
        if (typeof firebase === "undefined" || typeof firebaseConfig === "undefined" || !firebaseConfig.apiKey) {
            console.warn("Firebase 설정이 아직 연결되지 않았습니다. assets/firebase-config.js를 확인하세요.");
            return;
        }
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        auth = firebase.auth();
        isReady = true;

        auth.onAuthStateChanged(function () {
            updateAdminUI();
            renderAllSlots();
        });

        if (TRIP_ID) {
            db.collection("notes")
                .doc(TRIP_ID)
                .onSnapshot(
                    function (doc) {
                        notesData = doc.exists ? doc.data() : {};
                        renderAllSlots();
                    },
                    function (err) {
                        console.error("메모를 불러오지 못했습니다.", err);
                    }
                );
        }
    }

    // ---- Admin login ----
    window.toggleAdminLogin = function () {
        if (isAdmin()) {
            if (confirm("로그아웃 하시겠습니까?")) {
                auth.signOut();
            }
            return;
        }
        if (!isReady) {
            alert("Firebase 설정이 아직 연결되지 않았습니다. assets/firebase-config.js를 확인하세요.");
            return;
        }
        document.getElementById("admin-login-email").value = "";
        document.getElementById("admin-login-password").value = "";
        document.getElementById("admin-login-status").textContent = "";
        document.getElementById("admin-login-modal").classList.remove("hidden");
        document.getElementById("admin-login-email").focus();
    };

    window.closeAdminLoginModal = function () {
        document.getElementById("admin-login-modal").classList.add("hidden");
    };

    window.submitAdminLogin = function () {
        const email = document.getElementById("admin-login-email").value.trim();
        const password = document.getElementById("admin-login-password").value;
        const statusEl = document.getElementById("admin-login-status");
        statusEl.textContent = "로그인 중...";
        auth.signInWithEmailAndPassword(email, password)
            .then(function () {
                window.closeAdminLoginModal();
            })
            .catch(function (err) {
                statusEl.textContent = "로그인 실패: 이메일 또는 비밀번호를 확인하세요.";
                console.error(err);
            });
    };

    // ---- Note modal ----
    window.openNoteModal = function (btn) {
        const slot = btn.closest(".note-slot");
        currentItemId = slot.dataset.itemId;
        const title = slot.dataset.itemTitle || "";
        document.getElementById("note-modal-title").textContent = title ? `메모 · ${title}` : "메모";

        const textarea = document.getElementById("note-modal-textarea");
        textarea.value = (notesData[currentItemId] && notesData[currentItemId].note) || "";

        const saveBtn = document.getElementById("note-modal-save");
        const statusEl = document.getElementById("note-modal-status");
        if (isAdmin()) {
            textarea.disabled = false;
            saveBtn.classList.remove("hidden");
            statusEl.textContent = "";
        } else {
            textarea.disabled = true;
            saveBtn.classList.add("hidden");
            statusEl.textContent = "보기 전용입니다. 편집하려면 오른쪽 위 자물쇠 아이콘으로 로그인하세요.";
        }
        document.getElementById("note-modal").classList.remove("hidden");
    };

    window.closeNoteModal = function () {
        document.getElementById("note-modal").classList.add("hidden");
        currentItemId = null;
    };

    window.saveNote = function () {
        if (!currentItemId || !isAdmin() || !db) return;
        const statusEl = document.getElementById("note-modal-status");
        const note = document.getElementById("note-modal-textarea").value;
        statusEl.textContent = "저장 중...";
        db.collection("notes")
            .doc(TRIP_ID)
            .set({ [currentItemId]: { note: note, updatedAt: new Date().toISOString() } }, { merge: true })
            .then(function () {
                statusEl.textContent = "저장됨";
                setTimeout(function () {
                    window.closeNoteModal();
                }, 400);
            })
            .catch(function (err) {
                statusEl.textContent = "저장 실패. 다시 시도해주세요.";
                console.error(err);
            });
    };

    document.addEventListener("DOMContentLoaded", initFirebase);
})();
