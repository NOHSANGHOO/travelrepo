(function () {
    const TYPES = {
        recipe: {
            collection: "recipes",
            title: "레시피",
            singular: "레시피",
            icon: "fa-solid fa-utensils",
            placeholder: "# 레시피 이름\n\n## 재료\n- 재료 1\n- 재료 2\n\n## 만드는 법\n1. 첫 번째 단계\n2. 두 번째 단계\n\n> 팁: 메모를 남겨보세요."
        },
        misc: {
            collection: "memos",
            title: "기타 메모",
            singular: "메모",
            icon: "fa-solid fa-note-sticky",
            placeholder: "# 메모 제목\n\n여기에 마크다운으로 자유롭게 적어요.\n\n- 목록\n- **굵게**, *기울임*, [링크](https://example.com)"
        }
    };

    const type = new URLSearchParams(location.search).get("type") === "misc" ? "misc" : "recipe";
    const CFG = TYPES[type];
    const COL = CFG.collection;

    let docs = [];
    let listenerStarted = false;
    let currentId = null;
    let query = "";

    function isAdmin() {
        return !!(window.isAdmin && window.isAdmin());
    }

    function escapeHtml(str) {
        return String(str == null ? "" : str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function renderMarkdown(md) {
        if (window.marked && window.DOMPurify) {
            try {
                const html = window.marked.parse(md || "", { breaks: true, gfm: true });
                return window.DOMPurify.sanitize(html);
            } catch (e) {
                console.error(e);
            }
        }
        // fallback: plain text
        return "<pre class='whitespace-pre-wrap'>" + escapeHtml(md || "") + "</pre>";
    }

    function fmtDate(iso) {
        if (!iso) return "";
        const d = new Date(iso);
        if (isNaN(d)) return "";
        const p = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
    }

    function firstHeading(body) {
        const m = /^#{1,6}\s+(.+)$/m.exec(body || "");
        return m ? m[1].trim() : "";
    }

    function docTitle(d) {
        return (d.title && d.title.trim()) || firstHeading(d.body) || "(제목 없음)";
    }

    // ---- Views ----
    function showView(name) {
        ["doc-list-view", "doc-detail-view", "doc-editor-view"].forEach(function (id) {
            const el = document.getElementById(id);
            if (el) el.classList.toggle("hidden", id !== name);
        });
    }

    function renderList() {
        const container = document.getElementById("doc-list");
        const empty = document.getElementById("doc-empty");
        const q = query.trim().toLowerCase();
        const filtered = docs
            .filter(function (d) {
                return !q || docTitle(d).toLowerCase().indexOf(q) !== -1;
            })
            .sort(function (a, b) {
                return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
            });
        container.innerHTML = filtered
            .map(function (d) {
                return `<button type="button" onclick="openDoc('${d.id}')" class="w-full text-left bg-white rounded-2xl shadow-sm border border-stone-100 p-4 hover:shadow-md transition-shadow active:scale-[0.99]">
                    <div class="flex items-center justify-between gap-2">
                        <h3 class="font-bold text-stone-800 truncate">${escapeHtml(docTitle(d))}</h3>
                        <span class="text-[11px] text-stone-400 shrink-0">${fmtDate(d.updatedAt)}</span>
                    </div>
                </button>`;
            })
            .join("");
        empty.classList.toggle("hidden", filtered.length > 0);
        empty.textContent = docs.length === 0 ? `아직 ${CFG.singular}가 없어요.` : "검색 결과가 없어요.";
        const addBtn = document.getElementById("doc-add-btn");
        if (addBtn) addBtn.classList.toggle("hidden", !isAdmin());
    }

    window.filterDocs = function (v) {
        query = v;
        renderList();
    };

    window.showDocList = function () {
        currentId = null;
        showView("doc-list-view");
    };

    window.openDoc = function (id) {
        const d = docs.find(function (x) {
            return x.id === id;
        });
        if (!d) return;
        currentId = id;
        window.__currentDocId = id;
        document.getElementById("doc-detail-title").textContent = docTitle(d);
        document.getElementById("doc-detail-meta").textContent = d.updatedAt ? "수정: " + fmtDate(d.updatedAt) : "";
        document.getElementById("doc-detail-body").innerHTML = renderMarkdown(d.body);
        document.getElementById("doc-detail-admin").classList.toggle("hidden", !isAdmin());
        showView("doc-detail-view");
        window.scrollTo(0, 0);
    };

    // ---- Editor ----
    window.openDocEditor = function (id) {
        if (!isAdmin()) return;
        const editing = !!id;
        currentId = id || null;
        document.getElementById("doc-editor-heading").textContent = editing ? CFG.singular + " 편집" : "새 " + CFG.singular;
        const titleEl = document.getElementById("doc-editor-title");
        const bodyEl = document.getElementById("doc-editor-body");
        if (editing) {
            const d = docs.find(function (x) {
                return x.id === id;
            });
            titleEl.value = (d && d.title) || "";
            bodyEl.value = (d && d.body) || "";
        } else {
            titleEl.value = "";
            bodyEl.value = CFG.placeholder;
        }
        document.getElementById("doc-editor-status").textContent = "";
        document.getElementById("doc-editor-delete").classList.toggle("hidden", !editing);
        document.getElementById("doc-preview").innerHTML = "";
        document.getElementById("doc-preview-wrap").classList.add("hidden");
        showView("doc-editor-view");
        window.scrollTo(0, 0);
    };

    window.toggleDocPreview = function () {
        const wrap = document.getElementById("doc-preview-wrap");
        const hidden = wrap.classList.contains("hidden");
        if (hidden) {
            document.getElementById("doc-preview").innerHTML = renderMarkdown(document.getElementById("doc-editor-body").value);
        }
        wrap.classList.toggle("hidden");
    };

    window.saveDoc = function () {
        if (!isAdmin()) return;
        const title = document.getElementById("doc-editor-title").value.trim();
        const body = document.getElementById("doc-editor-body").value;
        const statusEl = document.getElementById("doc-editor-status");
        if (!title && !firstHeading(body)) {
            statusEl.textContent = "제목을 입력해주세요.";
            return;
        }
        const id = currentId || CFG.collection + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const data = { id: id, title: title, body: body, updatedAt: new Date().toISOString() };
        statusEl.textContent = "저장 중...";
        firebase
            .firestore()
            .collection(COL)
            .doc(id)
            .set(data, { merge: true })
            .then(function () {
                currentId = id;
                window.openDoc(id);
            })
            .catch(function (err) {
                statusEl.textContent = "저장 실패. 다시 시도해주세요.";
                console.error(err);
            });
    };

    window.deleteDoc = function () {
        if (!isAdmin() || !currentId) return;
        if (!confirm("이 " + CFG.singular + "를 삭제할까요?")) return;
        firebase
            .firestore()
            .collection(COL)
            .doc(currentId)
            .delete()
            .then(function () {
                window.showDocList();
            })
            .catch(function (err) {
                alert("삭제 실패. 다시 시도해주세요.");
                console.error(err);
            });
    };

    function startListener() {
        if (listenerStarted) return;
        listenerStarted = true;
        firebase
            .firestore()
            .collection(COL)
            .onSnapshot(
                function (qs) {
                    docs = [];
                    qs.forEach(function (d) {
                        docs.push(d.data());
                    });
                    renderList();
                    // if a detail is open, refresh it
                    if (currentId && !document.getElementById("doc-detail-view").classList.contains("hidden")) {
                        const still = docs.find(function (x) {
                            return x.id === currentId;
                        });
                        if (still) window.openDoc(currentId);
                    }
                },
                function (err) {
                    console.error("문서를 불러오지 못했습니다.", err);
                }
            );
    }

    document.addEventListener("DOMContentLoaded", function () {
        document.title = CFG.title + " · Teo's space";
        const h = document.getElementById("doc-page-title");
        if (h) h.innerHTML = `<i class="${CFG.icon} mr-2"></i>${CFG.title}`;
        const addBtn = document.getElementById("doc-add-btn");
        if (addBtn) addBtn.innerHTML = `<i class="fa-solid fa-plus"></i> 새 ${CFG.singular}`;
        document.getElementById("doc-search").placeholder = CFG.singular + " 제목 검색";
        renderList();
        if (typeof window.onAuthChange !== "function") return;
        window.onAuthChange(function (user) {
            if (user) startListener();
            renderList();
            document.getElementById("doc-detail-admin").classList.toggle("hidden", !isAdmin());
        });
    });
})();
