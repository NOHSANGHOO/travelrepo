(function () {
    // Reusable comment thread bound to a "target" string (e.g. "trip:kobe-arima-2026"
    // or "recipe:recipe-abc"). Anyone can read; logged-in users can post and edit
    // their own comments; admins can delete any.
    let containerId = null;
    let target = null;
    let comments = [];
    let unsub = null;
    let editingId = null;

    function db() {
        return firebase.firestore();
    }

    function currentUser() {
        return typeof firebase !== "undefined" && firebase.apps && firebase.apps.length ? firebase.auth().currentUser : null;
    }

    function isAdmin() {
        return !!(window.isAdmin && window.isAdmin());
    }

    function esc(str) {
        return String(str == null ? "" : str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function linkify(escaped) {
        return escaped.replace(/(https?:\/\/[^\s<]+)/g, function (m) {
            return '<a href="' + m + '" target="_blank" rel="noopener" class="text-teal-700 underline break-all">' + m + "</a>";
        });
    }

    function fmt(iso) {
        if (!iso) return "";
        const d = new Date(iso);
        if (isNaN(d)) return "";
        const p = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    }

    function nameOf(u) {
        return u.displayName || (u.email ? u.email.split("@")[0] : "익명");
    }

    function root() {
        return containerId ? document.getElementById(containerId) : null;
    }

    function skeleton() {
        const el = root();
        if (!el) return;
        el.innerHTML = `
            <div class="bg-white rounded-2xl shadow-sm border border-stone-100 p-4">
                <h3 class="font-bold text-stone-800 mb-3 text-sm"><i class="fa-regular fa-comments mr-1 text-teal-600"></i>의견 <span id="cm-count" class="text-stone-400 font-normal"></span></h3>
                <div id="cm-list" class="space-y-3 mb-3"></div>
                <div id="cm-compose"></div>
            </div>`;
        renderList();
        renderCompose();
    }

    function renderCompose() {
        const el = document.getElementById("cm-compose");
        if (!el) return;
        const u = currentUser();
        if (!u) {
            el.innerHTML = `<button type="button" onclick="gateSignIn()" class="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-500 text-sm font-medium transition"><i class="fa-brands fa-google mr-1"></i> 로그인하고 의견 남기기</button>`;
            return;
        }
        el.innerHTML = `
            <textarea id="cm-input" rows="2" class="w-full border border-stone-200 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-300" placeholder="${esc(nameOf(u))}님, 의견을 남겨보세요"></textarea>
            <div class="flex justify-end mt-2">
                <button type="button" onclick="Comments.post()" class="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition active:scale-95">등록</button>
            </div>`;
    }

    function renderList() {
        const listEl = document.getElementById("cm-list");
        if (!listEl) return;
        const u = currentUser();
        const admin = isAdmin();
        const sorted = comments.slice().sort(function (a, b) {
            return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
        });
        const countEl = document.getElementById("cm-count");
        if (countEl) countEl.textContent = sorted.length ? "(" + sorted.length + ")" : "";
        if (!sorted.length) {
            listEl.innerHTML = `<p class="text-xs text-stone-400 py-1">아직 의견이 없어요. 처음으로 남겨보세요!</p>`;
            return;
        }
        listEl.innerHTML = sorted
            .map(function (c) {
                const mine = u && c.uid === u.uid;
                const canEdit = mine;
                const canDelete = mine || admin;
                if (editingId === c.id) {
                    return `<div class="border border-stone-100 rounded-xl p-3 bg-stone-50">
                        <textarea id="cm-edit-input" rows="2" class="w-full border border-stone-200 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-300">${esc(c.text)}</textarea>
                        <div class="flex justify-end gap-2 mt-2">
                            <button type="button" onclick="Comments.cancelEdit()" class="text-xs text-stone-500 px-2 py-1">취소</button>
                            <button type="button" onclick="Comments.saveEdit('${c.id}')" class="text-xs bg-teal-600 hover:bg-teal-700 text-white rounded px-3 py-1">저장</button>
                        </div>
                    </div>`;
                }
                return `<div class="border border-stone-100 rounded-xl p-3">
                    <div class="flex items-center justify-between gap-2 mb-1">
                        <span class="text-xs font-semibold text-stone-700 truncate">${esc(c.name || "익명")}</span>
                        <div class="flex items-center gap-2 shrink-0">
                            <span class="text-[11px] text-stone-400">${fmt(c.updatedAt || c.createdAt)}${c.edited ? " · 수정됨" : ""}</span>
                            ${canEdit ? `<button type="button" onclick="Comments.startEdit('${c.id}')" class="text-stone-400 hover:text-stone-700" title="수정"><i class="fa-solid fa-pen text-[11px]"></i></button>` : ""}
                            ${canDelete ? `<button type="button" onclick="Comments.remove('${c.id}')" class="text-stone-400 hover:text-rose-600" title="삭제"><i class="fa-solid fa-trash text-[11px]"></i></button>` : ""}
                        </div>
                    </div>
                    <p class="text-sm text-stone-700 whitespace-pre-wrap break-words">${linkify(esc(c.text))}</p>
                </div>`;
            })
            .join("");
    }

    function subscribe() {
        if (unsub) {
            unsub();
            unsub = null;
        }
        comments = [];
        renderList();
        if (!target || typeof firebase === "undefined") return;
        try {
            unsub = db()
                .collection("comments")
                .where("target", "==", target)
                .onSnapshot(
                    function (qs) {
                        comments = [];
                        qs.forEach(function (d) {
                            comments.push(Object.assign({ id: d.id }, d.data()));
                        });
                        renderList();
                    },
                    function (err) {
                        console.error("의견을 불러오지 못했습니다.", err);
                    }
                );
        } catch (e) {
            console.error(e);
        }
    }

    window.Comments = {
        init: function (id) {
            containerId = id;
            skeleton();
        },
        setTarget: function (t) {
            target = t;
            editingId = null;
            const el = root();
            if (el && !document.getElementById("cm-list")) skeleton();
            subscribe();
        },
        clear: function () {
            target = null;
            editingId = null;
            if (unsub) {
                unsub();
                unsub = null;
            }
            comments = [];
        },
        post: function () {
            const u = currentUser();
            if (!u || !target) return;
            const inp = document.getElementById("cm-input");
            if (!inp) return;
            const text = (inp.value || "").trim();
            if (!text) return;
            const id = "cm-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
            const now = new Date().toISOString();
            inp.value = "";
            db()
                .collection("comments")
                .doc(id)
                .set({ id: id, target: target, uid: u.uid, name: nameOf(u), email: u.email || "", text: text, createdAt: now, updatedAt: now })
                .catch(function (err) {
                    console.error(err);
                    window.showToast("등록에 실패했어요.");
                });
        },
        startEdit: function (id) {
            editingId = id;
            renderList();
            const ta = document.getElementById("cm-edit-input");
            if (ta) {
                ta.focus();
                ta.setSelectionRange(ta.value.length, ta.value.length);
            }
        },
        cancelEdit: function () {
            editingId = null;
            renderList();
        },
        saveEdit: function (id) {
            const ta = document.getElementById("cm-edit-input");
            if (!ta) return;
            const text = (ta.value || "").trim();
            if (!text) return;
            editingId = null;
            db()
                .collection("comments")
                .doc(id)
                .set({ text: text, updatedAt: new Date().toISOString(), edited: true }, { merge: true })
                .catch(function (err) {
                    console.error(err);
                    window.showToast("수정에 실패했어요.");
                });
        },
        remove: function (id) {
            if (!confirm("이 의견을 삭제할까요?")) return;
            db()
                .collection("comments")
                .doc(id)
                .delete()
                .catch(function (err) {
                    console.error(err);
                    window.showToast("삭제에 실패했어요.");
                });
        }
    };

    document.addEventListener("DOMContentLoaded", function () {
        if (document.getElementById("comments-root")) window.Comments.init("comments-root");
        if (typeof window.onAuthChange === "function") {
            window.onAuthChange(function () {
                renderCompose();
                renderList();
            });
        }
    });
})();
