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

    // 레시피 전용: 상단 수평 탭바로 카테고리(한식/양식/중식/기타)를 전환하고,
    // 카드를 탭 위로 드래그해 카테고리를 옮깁니다.
    const IS_RECIPE = type === "recipe";
    const RECIPE_CATS = [
        { key: "korean", label: "한식", icon: "🍚", color: "#b4553f" },
        { key: "western", label: "양식", icon: "🍝", color: "#6f97b3" },
        { key: "chinese", label: "중식", icon: "🥢", color: "#c98a3e" },
        { key: "etc", label: "기타", icon: "🍽️", color: "#7d8a7a" }
    ];
    const CAT_KEYS = RECIPE_CATS.map(function (c) { return c.key; });
    const CAT_STORE_KEY = "teo.recipeCat";

    function catKeyOf(d) {
        const k = d && d.category;
        return CAT_KEYS.indexOf(k) >= 0 ? k : "etc";
    }
    function catLabel(key) {
        const c = RECIPE_CATS.find(function (x) { return x.key === key; });
        return c ? c.label : "기타";
    }
    function catOf(key) {
        return RECIPE_CATS.find(function (x) { return x.key === key; }) || RECIPE_CATS[3];
    }

    // 선택된 탭: URL(?cat=) → sessionStorage → 기본값(한식) 순으로 복원.
    // 덕분에 레시피를 보다가 뒤로 나와도 보던 카테고리가 그대로 열려 있습니다.
    function initialCat() {
        const q = new URLSearchParams(location.search).get("cat");
        if (CAT_KEYS.indexOf(q) >= 0) return q;
        try {
            const s = sessionStorage.getItem(CAT_STORE_KEY);
            if (CAT_KEYS.indexOf(s) >= 0) return s;
        } catch (e) {
            /* sessionStorage 사용 불가 환경 */
        }
        return "korean";
    }

    let docs = [];
    let listenerStarted = false;
    let currentId = null;
    let query = "";
    let currentCat = initialCat();
    let pendingDocId = new URLSearchParams(location.search).get("doc") || null;

    function rememberCat() {
        try {
            sessionStorage.setItem(CAT_STORE_KEY, currentCat);
        } catch (e) {
            /* ignore */
        }
    }

    function buildUrl(id) {
        let url = "docs.html?type=" + type;
        if (IS_RECIPE) url += "&cat=" + encodeURIComponent(currentCat);
        if (id) url += "&doc=" + encodeURIComponent(id);
        return url;
    }

    function shareUrl(id) {
        return new URL(buildUrl(id), location.href).href;
    }

    // push=true 이면 히스토리에 항목을 남겨 브라우저 뒤로가기로 목록에 돌아올 수 있게 합니다.
    function setUrl(id, push) {
        try {
            const url = buildUrl(id);
            if (push) history.pushState({ doc: id || null }, "", url);
            else history.replaceState({ doc: id || null }, "", url);
        } catch (e) {
            /* ignore */
        }
    }

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

    function ratingLine(d) {
        if (!window.Ratings) return "";
        const s = window.Ratings.summary(type + ":" + d.id);
        const admin = typeof d.adminRating === "number" ? d.adminRating : 0;
        if (!admin && !s.count) return "";
        const parts = [];
        if (admin) parts.push(`${window.Ratings.starsHtml(admin, "0.75rem")}<span class="text-[11px] text-stone-500 tabular-nums">${admin.toFixed(1)}</span>`);
        if (s.count) parts.push(`<span class="text-[11px] text-stone-400">방문자 ${s.avg.toFixed(1)} (${s.count})</span>`);
        return `<div class="flex items-center gap-2 mt-1">${parts.join("")}</div>`;
    }

    function cardHtml(d, showCatChip) {
        const key = catKeyOf(d);
        const grip = IS_RECIPE && isAdmin()
            ? `<span class="doc-grip shrink-0 text-stone-300 hover:text-stone-500 px-1 -ml-1 cursor-grab" data-id="${d.id}" title="위 탭으로 드래그하여 카테고리 이동"><i class="fa-solid fa-grip-vertical"></i></span>`
            : "";
        const chip = showCatChip
            ? `<span class="cat-chip" style="--cat:${catOf(key).color}">${catOf(key).icon} ${catLabel(key)}</span>`
            : "";
        return `<div class="doc-card bg-white rounded-2xl shadow-sm border border-stone-100 p-4 hover:shadow-md" data-id="${d.id}" data-cat="${key}">
            <div class="flex items-center gap-2">
                ${grip}
                <button type="button" onclick="openDoc('${d.id}')" class="flex-1 min-w-0 text-left">
                    <h3 class="font-bold text-stone-800 truncate">${escapeHtml(docTitle(d))}</h3>
                    ${chip}
                    ${ratingLine(d)}
                </button>
                <span class="text-[11px] text-stone-400 shrink-0">${fmtDate(d.updatedAt)}</span>
                <button type="button" onclick="copyShareLink('${shareUrl(d.id)}', event)" class="text-stone-400 hover:text-teal-600 shrink-0" title="공유 링크 복사"><i class="fa-solid fa-share-nodes text-sm"></i></button>
            </div>
        </div>`;
    }

    function renderTabs(counts, searching) {
        const wrap = document.getElementById("cat-tabs");
        if (!wrap) return;
        if (!IS_RECIPE) {
            wrap.innerHTML = "";
            return;
        }
        wrap.innerHTML = `<div class="cat-tabbar">${RECIPE_CATS.map(function (c) {
            const active = !searching && c.key === currentCat;
            return `<button type="button" class="cat-tab${active ? " active" : ""}" data-cat="${c.key}" style="--cat:${c.color}" onclick="selectCat('${c.key}')">
                <span class="cat-tab-label">${c.icon} ${c.label}</span>
                <span class="cat-tab-count">${counts[c.key] || 0}</span>
            </button>`;
        }).join("")}</div>`;
    }

    function renderList() {
        const container = document.getElementById("doc-list");
        const empty = document.getElementById("doc-empty");
        if (!container) return;
        const q = query.trim().toLowerCase();
        const searching = q.length > 0;
        const matched = docs
            .filter(function (d) {
                return !q || docTitle(d).toLowerCase().indexOf(q) !== -1;
            })
            .sort(function (a, b) {
                return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
            });
        const addBtn = document.getElementById("doc-add-btn");
        if (addBtn) addBtn.classList.toggle("hidden", !isAdmin());

        // 기타(메모): 카테고리 없이 평평한 목록
        if (!IS_RECIPE) {
            container.innerHTML = matched.map(function (d) { return cardHtml(d, false); }).join("");
            empty.classList.toggle("hidden", matched.length > 0);
            empty.textContent = docs.length === 0 ? `아직 ${CFG.singular}가 없어요.` : "검색 결과가 없어요.";
            return;
        }

        // 레시피: 상단 탭으로 카테고리 전환. 검색 중에는 카테고리를 가리지 않고
        // 전체에서 찾아 보여줍니다(카드에 카테고리 칩 표시).
        const counts = {};
        CAT_KEYS.forEach(function (k) { counts[k] = 0; });
        docs.forEach(function (d) { counts[catKeyOf(d)] += 1; });
        renderTabs(counts, searching);

        const shown = searching ? matched : matched.filter(function (d) { return catKeyOf(d) === currentCat; });
        container.innerHTML = shown.map(function (d) { return cardHtml(d, searching); }).join("");
        container.classList.toggle("cat-anim", !searching);

        empty.classList.toggle("hidden", shown.length > 0);
        if (searching) empty.textContent = "검색 결과가 없어요.";
        else if (docs.length === 0) empty.textContent = `아직 ${CFG.singular}가 없어요.`;
        else empty.textContent = catLabel(currentCat) + " 레시피가 아직 없어요.";
    }

    window.selectCat = function (key) {
        if (CAT_KEYS.indexOf(key) < 0 || key === currentCat) return;
        currentCat = key;
        rememberCat();
        setUrl(null); // 목록 URL에 선택 탭 반영 (뒤로가기 복원용)
        renderList();
        const list = document.getElementById("doc-list");
        if (list) {
            list.classList.remove("cat-anim");
            void list.offsetWidth; // 재생을 위해 리플로우 강제
            list.classList.add("cat-anim");
        }
    };

    window.filterDocs = function (v) {
        query = v;
        renderList();
    };

    // fromHistory=true 이면 브라우저 뒤로/앞으로에 의한 이동이라 URL을 다시 건드리지 않습니다.
    function toList(fromHistory) {
        currentId = null;
        pendingDocId = null;
        window.__currentDocId = null;
        if (!fromHistory) setUrl(null);
        if (window.Comments) window.Comments.clear();
        if (window.Ratings) window.Ratings.clearTarget();
        renderList(); // 돌아왔을 때 보던 카테고리 탭이 그대로 열려 있도록 다시 그림
        showView("doc-list-view");
    }

    window.showDocList = function () {
        toList(false);
    };

    window.shareCurrentDoc = function (e) {
        if (currentId) window.copyShareLink(shareUrl(currentId), e);
    };

    window.openDoc = function (id, fromHistory) {
        const d = docs.find(function (x) {
            return x.id === id;
        });
        if (!d) return;
        const isNew = currentId !== id;
        currentId = id;
        window.__currentDocId = id;
        // 레시피를 열면 그 레시피의 카테고리를 현재 탭으로 기억 → 뒤로 나왔을 때 그대로 복원
        if (IS_RECIPE) {
            const k = catKeyOf(d);
            if (k !== currentCat) {
                currentCat = k;
                rememberCat();
            }
        }
        if (!fromHistory) setUrl(id, isNew);
        document.getElementById("doc-detail-title").textContent = docTitle(d);
        document.getElementById("doc-detail-meta").textContent = d.updatedAt ? "수정: " + fmtDate(d.updatedAt) : "";
        document.getElementById("doc-detail-body").innerHTML = renderMarkdown(d.body);
        document.getElementById("doc-detail-admin").classList.toggle("hidden", !isAdmin());
        showView("doc-detail-view");
        if (window.Comments) window.Comments.setTarget(type + ":" + id);
        if (window.Ratings) {
            window.Ratings.setTarget({
                target: type + ":" + id,
                collection: COL,
                docId: id,
                adminRating: typeof d.adminRating === "number" ? d.adminRating : 0
            });
        }
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
            if (IS_RECIPE) {
                const catSel = document.getElementById("doc-editor-cat");
                if (catSel) catSel.value = catKeyOf(d);
            }
        } else {
            titleEl.value = "";
            bodyEl.value = ""; // 골격은 실제 텍스트가 아니라 회색 placeholder로만 보여줍니다
            if (IS_RECIPE) {
                const catSel = document.getElementById("doc-editor-cat");
                if (catSel) catSel.value = "korean";
            }
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
        if (IS_RECIPE) {
            const catSel = document.getElementById("doc-editor-cat");
            data.category = catSel && catSel.value ? catSel.value : "etc";
        }
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

    // ---- Drag a recipe card between categories (mouse + touch via pointer events) ----
    let drag = null;

    function startClone() {
        const c = drag.card.cloneNode(true);
        c.classList.add("doc-drag-clone");
        c.style.width = drag.width + "px";
        c.style.left = drag.startX - drag.offX + "px";
        c.style.top = drag.startY - drag.offY + "px";
        document.body.appendChild(c);
        drag.clone = c;
    }

    function clearHover() {
        document.querySelectorAll(".cat-tab.drop-hover").forEach(function (s) {
            s.classList.remove("drop-hover");
        });
    }

    function pointerDown(e) {
        if (!IS_RECIPE || !isAdmin()) return;
        const grip = e.target.closest && e.target.closest(".doc-grip");
        if (!grip) return;
        const card = grip.closest(".doc-card");
        if (!card) return;
        e.preventDefault();
        const rect = card.getBoundingClientRect();
        drag = {
            id: card.dataset.id,
            fromCat: card.dataset.cat,
            card: card,
            startX: e.clientX,
            startY: e.clientY,
            offX: e.clientX - rect.left,
            offY: e.clientY - rect.top,
            width: rect.width,
            clone: null,
            moved: false,
            overCat: null
        };
        window.addEventListener("pointermove", pointerMove, { passive: false });
        window.addEventListener("pointerup", pointerUp);
        window.addEventListener("pointercancel", pointerUp);
    }

    function pointerMove(e) {
        if (!drag) return;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (!drag.moved) {
            if (Math.abs(dx) + Math.abs(dy) < 6) return;
            drag.moved = true;
            startClone();
            document.body.classList.add("doc-dragging-active");
            drag.card.classList.add("doc-card-ghost");
        }
        e.preventDefault();
        drag.clone.style.left = e.clientX - drag.offX + "px";
        drag.clone.style.top = e.clientY - drag.offY + "px";
        // 클론을 잠깐 숨겨 아래 요소(탭)를 정확히 감지
        drag.clone.style.display = "none";
        const under = document.elementFromPoint(e.clientX, e.clientY);
        drag.clone.style.display = "";
        const tab = under && under.closest ? under.closest(".cat-tab") : null;
        const cat = tab ? tab.dataset.cat : null;
        if (cat !== drag.overCat) {
            clearHover();
            drag.overCat = cat;
            if (cat && cat !== drag.fromCat && tab) tab.classList.add("drop-hover");
        }
    }

    function pointerUp() {
        window.removeEventListener("pointermove", pointerMove);
        window.removeEventListener("pointerup", pointerUp);
        window.removeEventListener("pointercancel", pointerUp);
        if (!drag) return;
        const d = drag;
        drag = null;
        document.body.classList.remove("doc-dragging-active");
        clearHover();
        if (d.clone && d.clone.parentNode) d.clone.parentNode.removeChild(d.clone);
        if (d.card) d.card.classList.remove("doc-card-ghost");
        if (d.moved && d.overCat && d.overCat !== d.fromCat) {
            firebase
                .firestore()
                .collection(COL)
                .doc(d.id)
                .set({ category: d.overCat }, { merge: true })
                .then(function () {
                    window.showToast(catLabel(d.overCat) + "(으)로 옮겼어요");
                })
                .catch(function (err) {
                    console.error(err);
                    window.showToast("이동에 실패했어요.");
                });
        }
    }

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
                    // deep link: ?doc=id → open that document once data is available
                    if (pendingDocId && docs.some(function (x) { return x.id === pendingDocId; })) {
                        const target = pendingDocId;
                        pendingDocId = null;
                        window.openDoc(target, true); // 첫 진입이므로 히스토리를 쌓지 않음
                        return;
                    }
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
        if (IS_RECIPE) {
            const catWrap = document.getElementById("doc-editor-cat-wrap");
            const catSel = document.getElementById("doc-editor-cat");
            if (catWrap) catWrap.classList.remove("hidden");
            if (catSel) catSel.innerHTML = RECIPE_CATS.map(function (c) { return `<option value="${c.key}">${c.icon} ${c.label}</option>`; }).join("");
        }
        document.getElementById("doc-search").placeholder = CFG.singular + " 제목 검색";
        const titleInput = document.getElementById("doc-editor-title");
        if (titleInput) titleInput.placeholder = CFG.singular + " 제목";
        const bodyInput = document.getElementById("doc-editor-body");
        if (bodyInput) bodyInput.placeholder = CFG.placeholder;
        const listEl = document.getElementById("doc-list");
        if (listEl && IS_RECIPE) listEl.addEventListener("pointerdown", pointerDown);
        if (window.Ratings) window.Ratings.onChange(renderList);

        // 브라우저 뒤로/앞으로: URL을 보고 목록(선택 탭 유지) 또는 상세로 복원
        window.addEventListener("popstate", function () {
            const p = new URLSearchParams(location.search);
            const c = p.get("cat");
            if (CAT_KEYS.indexOf(c) >= 0) currentCat = c;
            const d = p.get("doc");
            if (d && docs.some(function (x) { return x.id === d; })) window.openDoc(d, true);
            else toList(true);
        });

        setUrl(pendingDocId || null); // 초기 URL에 현재 탭을 기록
        renderList();
        startListener(); // 열람은 로그인 없이도 가능
        if (typeof window.onAuthChange !== "function") return;
        window.onAuthChange(function () {
            startListener();
            renderList();
            document.getElementById("doc-detail-admin").classList.toggle("hidden", !isAdmin());
        });
    });
})();
