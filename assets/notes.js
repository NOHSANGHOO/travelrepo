(function () {
    const TRIP_ID = document.body.dataset.tripId;
    const API_URL = typeof NOTES_API_URL !== "undefined" ? NOTES_API_URL : "";
    let notesCache = {};
    let currentItemId = null;

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
        const entry = notesCache[itemId];
        if (entry && entry.note) {
            display.innerHTML = linkify(entry.note);
            display.classList.remove("hidden");
            label.textContent = "메모 수정";
        } else {
            display.innerHTML = "";
            display.classList.add("hidden");
            label.textContent = "메모";
        }
    }

    function renderAllSlots() {
        document.querySelectorAll(".note-slot[data-item-id]").forEach((slot) => {
            renderSlot(slot.dataset.itemId);
        });
    }

    async function loadNotes() {
        if (!API_URL || !TRIP_ID) return;
        try {
            const res = await fetch(`${API_URL}?tripId=${encodeURIComponent(TRIP_ID)}`);
            notesCache = await res.json();
            renderAllSlots();
        } catch (err) {
            console.error("메모를 불러오지 못했습니다.", err);
        }
    }

    window.openNoteModal = function (btn) {
        const slot = btn.closest(".note-slot");
        currentItemId = slot.dataset.itemId;
        const title = slot.dataset.itemTitle || "";
        document.getElementById("note-modal-title").textContent = title ? `메모 · ${title}` : "메모";
        document.getElementById("note-modal-textarea").value = (notesCache[currentItemId] && notesCache[currentItemId].note) || "";
        document.getElementById("note-modal-status").textContent = API_URL ? "" : "메모 저장소가 아직 연결되지 않았습니다. README를 참고해 설정해주세요.";
        document.getElementById("note-modal").classList.remove("hidden");
    };

    window.closeNoteModal = function () {
        document.getElementById("note-modal").classList.add("hidden");
        currentItemId = null;
    };

    window.saveNote = async function () {
        if (!currentItemId) return;
        const statusEl = document.getElementById("note-modal-status");
        if (!API_URL) {
            statusEl.textContent = "메모 저장소가 아직 연결되지 않았습니다. README를 참고해 설정해주세요.";
            return;
        }
        const note = document.getElementById("note-modal-textarea").value;
        statusEl.textContent = "저장 중...";
        try {
            await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ tripId: TRIP_ID, itemId: currentItemId, note })
            });
            notesCache[currentItemId] = { note, updatedAt: new Date().toISOString() };
            renderSlot(currentItemId);
            statusEl.textContent = "저장됨";
            setTimeout(() => window.closeNoteModal(), 400);
        } catch (err) {
            statusEl.textContent = "저장 실패. 다시 시도해주세요.";
            console.error(err);
        }
    };

    document.addEventListener("DOMContentLoaded", loadNotes);
})();
