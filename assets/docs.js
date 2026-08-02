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

    // 레시피 전용: 카테고리(한식/양식/중식/기타)로 그룹화 + 접기/펼치기 + 드래그 이동
    const IS_RECIPE = type === "recipe";
    const RECIPE_CATS = [
        { key: "korean", label: "한식", icon: "🍚", color: "#b4553f" },
        { key: "western", label: "양식", icon: "🍝", color: "#6f97b3" },
        { key: "chinese", label: "중식", icon: "🥢", color: "#c98a3e" },
        { key: "etc", label: "기타", icon: "🍽️", color: "#7d8a7a" }
    ];
    // 처음에는 모두 접혀있고 한식만 펼쳐진 상태
    const catCollapsed = { korean: false, western: true, chinese: true, etc: true };
    function catKeyOf(d) {
        const k = d && d.category;
        return RECIPE_CATS.some(function (c) { return c.key === k; }) ? k : "etc";
    }
    function catLabel(key) {
        const c = RECIPE_CATS.find(function (x) { return x.key === key; });
        return c ? c.label : "기타";
    }

    let docs = [];
    let listenerStarted = false;
    let currentId = null;
    let query = "";
    let pendingDocId = new URLSearchParams(location.search).get("doc") || null;

    function shareUrl(id) {
        return new URL("docs.html?type=" + type + "&doc=" + encodeURIComponent(id), location.href).href;
    }

    function setUrl(id) {
        const url = id ? "docs.html?type=" + type + "&doc=" + encodeURIComponent(id) : "docs.html?type=" + type;
        try {
            history.replaceState(null, "", url);
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

    function cardHtml(d) {
        const grip = IS_RECIPE && isAdmin()
            ? `<span class="doc-grip shrink-0 text-stone-300 hover:text-stone-500 px-1 -ml-1 cursor-grab" data-id="${d.id}" title="드래그하여 카테고리 이동"><i class="fa-solid fa-grip-vertical"></i></span>`
            : "";
        return `<div class="doc-card bg-white rounded-2xl shadow-sm border border-stone-100 p-4 hover:shadow-md" data-id="${d.id}" data-cat="${catKeyOf(d)}">
            <div class="flex items-center gap-2">
                ${grip}
                <button type="button" onclick="openDoc('${d.id}')" class="flex-1 min-w-0 text-left">
                    <h3 class="font-bold text-stone-800 truncate">${escapeHtml(docTitle(d))}</h3>
                    ${ratingLine(d)}
                </button>
                <span class="text-[11px] text-stone-400 shrink-0">${fmtDate(d.updatedAt)}</span>
                <button type="button" onclick="copyShareLink('${shareUrl(d.id)}', event)" class="text-stone-400 hover:text-teal-600 shrink-0" title="공유 링크 복사"><i class="fa-solid fa-share-nodes text-sm"></i></button>
            </div>
        </div>`;
    }

    function renderList() {
        const container = document.getElementById("doc-list");
        const empty = document.getElementById("doc-empty");
        if (!container) return;
        const q = query.trim().toLowerCase();
        const filtered = docs
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
            container.innerHTML = filtered.map(cardHtml).join("");
            empty.classList.toggle("hidden", filtered.length > 0);
            empty.textContent = docs.length === 0 ? `아직 ${CFG.singular}가 없어요.` : "검색 결과가 없어요.";
            return;
        }

        // 레시피: 카테고리별 그룹 + 접기/펼치기
        const searching = q.length > 0;
        const byCat = {};
        RECIPE_CATS.forEach(function (c) { byCat[c.key] = []; });
        filtered.forEach(function (d) { byCat[catKeyOf(d)].push(d); });

        container.innerHTML = RECIPE_CATS.map(function (c) {
            const items = byCat[c.key];
            if (searching && items.length === 0) return ""; // 검색 중 빈 카테고리는 숨김
            const open = searching ? true : !catCollapsed[c.key];
            const cards = items.length
                ? items.map(cardHtml).join("")
                : `<p class="doc-cat-empty text-xs text-stone-400 py-4 text-center">${isAdmin() ? "여기로 드래그해 옮겨보세요" : "레시피가 없어요"}</p>`;
            return `<section class="doc-cat${open ? " open" : ""}" data-cat="${c.key}" style="--cat:${c.color}">
                <button type="button" class="cat-header w-full flex items-center justify-between gap-2 px-4 py-3.5" onclick="toggleCat('${c.key}')">
                    <span class="flex items-center gap-2.5 min-w-0">
                        <i class="cat-chevron fa-solid fa-chevron-right text-sm ${open ? "open" : ""}"></i>
                        <span class="cat-title">${c.icon} ${c.label}</span>
                    </span>
                    <span class="cat-count">${items.length}</span>
                </button>
                <div class="cat-body" id="cat-body-${c.key}">
                    <div class="cat-list" data-cat="${c.key}">${cards}</div>
                </div>
            </section>`;
        }).join("");

        applyCatHeights();
        const noResults = searching && filtered.length === 0;
        empty.classList.toggle("hidden", !noResults);
        empty.textContent = docs.length === 0 ? `아직 ${CFG.singular}가 없어요.` : "검색 결과가 없어요.";
        if (docs.length === 0 && !searching) empty.classList.remove("hidden");
    }

    function isCatOpen(key) {
        return query.trim() ? true : !catCollapsed[key];
    }

    function applyCatHeights() {
        RECIPE_CATS.forEach(function (c) {
            const body = document.getElementById("cat-body-" + c.key);
            if (!body) return;
            if (isCatOpen(c.key)) {
                body.style.maxHeight = body.scrollHeight + "px";
                body.style.opacity = "1";
            } else {
                body.style.maxHeight = "0px";
                body.style.opacity = "0";
            }
        });
    }

    window.toggleCat = function (key) {
        if (query.trim()) return; // 검색 중에는 모두 펼쳐진 상태 유지
        catCollapsed[key] = !catCollapsed[key];
        const sec = document.querySelector('.doc-cat[data-cat="' + key + '"]');
        if (sec) {
            sec.classList.toggle("open", !catCollapsed[key]);
            const chev = sec.querySelector(".cat-chevron");
            if (chev) chev.classList.toggle("open", !catCollapsed[key]);
        }
        applyCatHeights();
    };

    window.filterDocs = function (v) {
        query = v;
        renderList();
    };

    window.showDocList = function () {
        currentId = null;
        pendingDocId = null;
        window.__currentDocId = null;
        setUrl(null);
        if (window.Comments) window.Comments.clear();
        if (window.Ratings) window.Ratings.clearTarget();
        showView("doc-list-view");
    };

    window.shareCurrentDoc = function (e) {
        if (currentId) window.copyShareLink(shareUrl(currentId), e);
    };

    window.openDoc = function (id) {
        const d = docs.find(function (x) {
            return x.id === id;
        });
        if (!d) return;
        currentId = id;
        window.__currentDocId = id;
        setUrl(id);
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
            bodyEl.value = CFG.placeholder;
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
        document.querySelectorAll(".doc-cat.drop-hover").forEach(function (s) {
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
        // 클론을 잠깐 숨겨 아래 카테고리를 정확히 감지
        drag.clone.style.display = "none";
        const under = document.elementFromPoint(e.clientX, e.clientY);
        drag.clone.style.display = "";
        const sec = under && under.closest ? under.closest(".doc-cat") : null;
        const cat = sec ? sec.dataset.cat : null;
        if (cat !== drag.overCat) {
            clearHover();
            drag.overCat = cat;
            if (cat && cat !== drag.fromCat && sec) {
                sec.classList.add("drop-hover");
                // 접혀있는 목적지는 펼쳐 드롭 영역을 보여줌
                if (!query.trim() && catCollapsed[cat]) {
                    catCollapsed[cat] = false;
                    sec.classList.add("open");
                    const chev = sec.querySelector(".cat-chevron");
                    if (chev) chev.classList.add("open");
                    applyCatHeights();
                }
            }
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
                        window.openDoc(target);
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
        const listEl = document.getElementById("doc-list");
        if (listEl && IS_RECIPE) listEl.addEventListener("pointerdown", pointerDown);
        if (window.Ratings) window.Ratings.onChange(renderList);
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
