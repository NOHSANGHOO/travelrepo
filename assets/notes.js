(function () {
    const TRIP_ID = document.body.dataset.tripId;
    let currentItemId = null;
    let notesData = {};
    let listenerStarted = false;

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

    function renderSlot(itemId) {
        const slot = document.querySelector(`.note-slot[data-item-id="${itemId}"]`);
        if (!slot) return;
        const display = slot.querySelector(".note-display");
        const label = slot.querySelector(".note-btn-label");
        const entry = notesData[itemId];
        const admin = window.isAdmin && window.isAdmin();
        if (entry && entry.note) {
            display.innerHTML = linkify(entry.note);
            display.classList.remove("hidden");
            label.textContent = admin ? "메모 수정" : "메모 보기";
        } else {
            display.innerHTML = "";
            display.classList.add("hidden");
            label.textContent = admin ? "메모" : "메모 보기";
        }
    }

    function renderAllSlots() {
        document.querySelectorAll(".note-slot[data-item-id]").forEach((slot) => {
            renderSlot(slot.dataset.itemId);
        });
    }
    window.__renderNoteSlots = renderAllSlots;

    function startNotesListener() {
        if (listenerStarted || !TRIP_ID) return;
        listenerStarted = true;
        firebase
            .firestore()
            .collection("notes")
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
        if (window.isAdmin && window.isAdmin()) {
            textarea.disabled = false;
            saveBtn.classList.remove("hidden");
            statusEl.textContent = "";
        } else {
            textarea.disabled = true;
            saveBtn.classList.add("hidden");
            statusEl.textContent = "보기 전용입니다. 관리자 계정으로 로그인해야 편집할 수 있습니다.";
        }
        document.getElementById("note-modal").classList.remove("hidden");
    };

    window.closeNoteModal = function () {
        document.getElementById("note-modal").classList.add("hidden");
        currentItemId = null;
    };

    window.saveNote = function () {
        if (!currentItemId || !window.isAdmin || !window.isAdmin()) return;
        const statusEl = document.getElementById("note-modal-status");
        const note = document.getElementById("note-modal-textarea").value;
        statusEl.textContent = "저장 중...";
        firebase
            .firestore()
            .collection("notes")
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

    document.addEventListener("DOMContentLoaded", function () {
        if (typeof window.onAuthChange !== "function") return;
        window.onAuthChange(function (user) {
            if (user) startNotesListener();
            renderAllSlots();
        });
    });
})();
