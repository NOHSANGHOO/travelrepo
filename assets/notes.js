(function () {
    const TRIP_ID = document.body.dataset.tripId;
    const TOKEN_KEY = "gh_admin_token";
    let notesData = {};
    let currentItemId = null;

    function getToken() {
        return localStorage.getItem(TOKEN_KEY) || "";
    }

    function isAdmin() {
        return !!getToken();
    }

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

    function utf8ToBase64(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }

    function base64ToUtf8(b64) {
        return decodeURIComponent(escape(atob(b64.replace(/\n/g, ""))));
    }

    function tripNotes() {
        return (notesData && notesData[TRIP_ID]) || {};
    }

    function renderSlot(itemId) {
        const slot = document.querySelector(`.note-slot[data-item-id="${itemId}"]`);
        if (!slot) return;
        const display = slot.querySelector(".note-display");
        const label = slot.querySelector(".note-btn-label");
        const entry = tripNotes()[itemId];
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
            icon.closest("button").title = "관리자 로그인 상태 (클릭하여 로그아웃)";
        } else {
            icon.classList.remove("fa-unlock");
            icon.classList.add("fa-lock");
            icon.closest("button").title = "관리자 로그인 (메모 편집)";
        }
    }

    async function loadNotes() {
        if (!TRIP_ID) return;
        try {
            const url = `https://raw.githubusercontent.com/${NOTES_REPO_OWNER}/${NOTES_REPO_NAME}/${NOTES_REPO_BRANCH}/${NOTES_FILE_PATH}?_=${Date.now()}`;
            const res = await fetch(url, { cache: "no-store" });
            notesData = res.ok ? await res.json() : {};
        } catch (err) {
            console.error("메모를 불러오지 못했습니다.", err);
            notesData = {};
        }
        renderAllSlots();
    }

    window.toggleAdminLogin = function () {
        if (isAdmin()) {
            if (confirm("관리자 로그인을 해제할까요? (이 기기에서 메모 저장이 비활성화됩니다)")) {
                localStorage.removeItem(TOKEN_KEY);
                updateAdminUI();
                renderAllSlots();
            }
            return;
        }
        const token = window.prompt(
            "GitHub 개인 액세스 토큰(Fine-grained PAT)을 입력하세요.\n이 저장소 Contents 읽기/쓰기 권한만 있는 토큰을 권장합니다.\n토큰은 이 기기의 브라우저에만 저장됩니다."
        );
        if (token && token.trim()) {
            localStorage.setItem(TOKEN_KEY, token.trim());
            updateAdminUI();
            renderAllSlots();
        }
    };

    window.openNoteModal = function (btn) {
        const slot = btn.closest(".note-slot");
        currentItemId = slot.dataset.itemId;
        const title = slot.dataset.itemTitle || "";
        document.getElementById("note-modal-title").textContent = title ? `메모 · ${title}` : "메모";

        const textarea = document.getElementById("note-modal-textarea");
        textarea.value = (tripNotes()[currentItemId] && tripNotes()[currentItemId].note) || "";

        const saveBtn = document.getElementById("note-modal-save");
        const statusEl = document.getElementById("note-modal-status");
        if (isAdmin()) {
            textarea.disabled = false;
            saveBtn.classList.remove("hidden");
            statusEl.textContent = "";
        } else {
            textarea.disabled = true;
            saveBtn.classList.add("hidden");
            statusEl.textContent = "보기 전용입니다. 편집하려면 오른쪽 위 자물쇠 아이콘으로 관리자 로그인하세요.";
        }
        document.getElementById("note-modal").classList.remove("hidden");
    };

    window.closeNoteModal = function () {
        document.getElementById("note-modal").classList.add("hidden");
        currentItemId = null;
    };

    window.saveNote = async function () {
        if (!currentItemId || !isAdmin()) return;
        const statusEl = document.getElementById("note-modal-status");
        const note = document.getElementById("note-modal-textarea").value;
        const token = getToken();
        const apiBase = `https://api.github.com/repos/${NOTES_REPO_OWNER}/${NOTES_REPO_NAME}/contents/${NOTES_FILE_PATH}`;

        statusEl.textContent = "저장 중...";
        try {
            const getRes = await fetch(`${apiBase}?ref=${NOTES_REPO_BRANCH}`, {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }
            });
            if (!getRes.ok) {
                throw new Error(getRes.status === 401 || getRes.status === 403 ? "토큰이 유효하지 않거나 권한이 없습니다" : "현재 파일을 불러오지 못했습니다");
            }
            const fileInfo = await getRes.json();
            const latest = JSON.parse(base64ToUtf8(fileInfo.content));

            latest[TRIP_ID] = latest[TRIP_ID] || {};
            latest[TRIP_ID][currentItemId] = { note: note, updatedAt: new Date().toISOString() };

            const putRes = await fetch(apiBase, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
                body: JSON.stringify({
                    message: `메모 업데이트: ${TRIP_ID}/${currentItemId}`,
                    content: utf8ToBase64(JSON.stringify(latest, null, 2)),
                    sha: fileInfo.sha,
                    branch: NOTES_REPO_BRANCH
                })
            });
            if (!putRes.ok) {
                const errBody = await putRes.json().catch(() => ({}));
                throw new Error(errBody.message || "저장 실패");
            }

            notesData = latest;
            renderSlot(currentItemId);
            statusEl.textContent = "저장됨";
            setTimeout(() => window.closeNoteModal(), 500);
        } catch (err) {
            statusEl.textContent = `저장 실패: ${err.message}`;
            console.error(err);
        }
    };

    document.addEventListener("DOMContentLoaded", function () {
        updateAdminUI();
        loadNotes();
    });
})();
