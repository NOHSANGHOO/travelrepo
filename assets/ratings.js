(function () {
    // Star ratings bound to a "target" string ("trip:xxx" / "recipe:xxx" / "misc:xxx").
    //
    // Two separate things are stored:
    //   1) 관리자 별점  — a field (`adminRating`) on the parent doc itself
    //                     (trips/{id} or recipes/{id}), admin-writable.
    //   2) 뷰어 별점    — one doc per user in the `ratings` collection
    //                     (id = "<target>__<uid>"), so each viewer can only
    //                     create/edit their own. Displayed as an average.
    const listeners = [];
    let all = {}; // ratingDocId -> data (whole collection cache)
    let started = false;
    let ctx = null; // { target, collection, docId, adminRating }
    let containerId = null;
    let hover = 0;

    function db() {
        return firebase.firestore();
    }

    function currentUser() {
        return typeof firebase !== "undefined" && firebase.apps && firebase.apps.length ? firebase.auth().currentUser : null;
    }

    function isAdmin() {
        return !!(window.isAdmin && window.isAdmin());
    }

    function round1(n) {
        return Math.round(n * 10) / 10;
    }

    function clampHalf(v) {
        const x = Math.max(0.5, Math.min(5, Math.round(v * 2) / 2));
        return x;
    }

    // ---- Aggregates (usable by list pages too) ----
    function summary(target) {
        let sum = 0;
        let count = 0;
        Object.keys(all).forEach(function (k) {
            const r = all[k];
            if (r && r.target === target && typeof r.value === "number") {
                sum += r.value;
                count += 1;
            }
        });
        return { count: count, avg: count ? round1(sum / count) : 0 };
    }

    function myRating(target) {
        const u = currentUser();
        if (!u) return 0;
        const r = all[target + "__" + u.uid];
        return r && typeof r.value === "number" ? r.value : 0;
    }

    // ---- Star markup ----
    // Read-only star strip: grey base with a gold overlay clipped to value/5.
    function starsHtml(value, size) {
        const pct = Math.max(0, Math.min(100, (value / 5) * 100));
        const fs = size || "1rem";
        const star = '<i class="fa-solid fa-star"></i>';
        const five = star + star + star + star + star;
        return `<span class="rt-stars" style="font-size:${fs}">
            <span class="rt-base">${five}</span>
            <span class="rt-fill" style="width:${pct}%">${five}</span>
        </span>`;
    }

    // Interactive strip: 10 half-star hit zones over the same visual.
    function pickerHtml(value) {
        let zones = "";
        for (let i = 1; i <= 10; i++) {
            const v = i / 2;
            zones += `<button type="button" class="rt-zone" data-val="${v}" style="left:${(i - 1) * 10}%" title="${v}점"></button>`;
        }
        return `<span class="rt-picker" id="rt-picker">${starsHtml(value, "1.5rem")}<span class="rt-zones">${zones}</span></span>`;
    }

    function root() {
        return containerId ? document.getElementById(containerId) : null;
    }

    function render() {
        const el = root();
        if (!el) return;
        if (!ctx) {
            el.innerHTML = "";
            return;
        }
        const u = currentUser();
        const admin = isAdmin();
        const s = summary(ctx.target);
        const adminVal = typeof ctx.adminRating === "number" ? ctx.adminRating : 0;
        const mine = myRating(ctx.target);
        // 관리자는 별점 위젯으로 "관리자 별점"을, 일반 로그인 사용자는 본인 별점을 남깁니다.
        const editing = admin ? adminVal : mine;
        const shown = hover || editing;

        let mineBlock;
        if (!u) {
            mineBlock = `<button type="button" onclick="gateSignIn()" class="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-500 text-sm font-medium transition"><i class="fa-brands fa-google mr-1"></i> 로그인하고 별점 남기기</button>`;
        } else {
            mineBlock = `
                <div class="flex items-center gap-3">
                    <span class="text-xs text-stone-500 shrink-0">${admin ? "관리자 별점" : "내 별점"}</span>
                    ${pickerHtml(shown)}
                    <span id="rt-myval" class="text-sm font-bold text-stone-700 tabular-nums">${shown ? shown.toFixed(1) : "-"}</span>
                    ${editing ? `<button type="button" onclick="Ratings.clear()" class="text-[11px] text-stone-400 hover:text-rose-500 ml-auto">지우기</button>` : ""}
                </div>`;
        }

        el.innerHTML = `
            <div class="bg-white rounded-2xl shadow-sm border border-stone-100 p-4">
                <h3 class="font-bold text-stone-800 mb-3 text-sm"><i class="fa-solid fa-star mr-1 text-amber-400"></i>별점</h3>
                <div class="flex flex-wrap items-center gap-x-5 gap-y-2 mb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-stone-500">관리자</span>
                        ${adminVal ? `${starsHtml(adminVal)}<span class="text-sm font-bold text-stone-700 tabular-nums">${adminVal.toFixed(1)}</span>` : `<span class="text-xs text-stone-400">아직 없어요</span>`}
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-stone-500">방문자 평균</span>
                        ${s.count ? `${starsHtml(s.avg)}<span class="text-sm font-bold text-stone-700 tabular-nums">${s.avg.toFixed(1)}</span><span class="text-[11px] text-stone-400">(${s.count}명)</span>` : `<span class="text-xs text-stone-400">아직 없어요</span>`}
                    </div>
                </div>
                <div class="border-t border-stone-100 pt-3">${mineBlock}</div>
            </div>`;

        bindPicker();
    }

    function bindPicker() {
        const p = document.getElementById("rt-picker");
        if (!p) return;
        p.querySelectorAll(".rt-zone").forEach(function (z) {
            const v = parseFloat(z.dataset.val);
            z.addEventListener("mouseenter", function () {
                hover = v;
                paint(v);
            });
            z.addEventListener("click", function (e) {
                e.preventDefault();
                hover = 0;
                window.Ratings.set(v);
            });
        });
        p.addEventListener("mouseleave", function () {
            hover = 0;
            render();
        });
    }

    // Repaint only the fill/label while hovering (avoids re-render flicker).
    function paint(v) {
        const p = document.getElementById("rt-picker");
        if (!p) return;
        const fill = p.querySelector(".rt-fill");
        if (fill) fill.style.width = (v / 5) * 100 + "%";
        const lab = document.getElementById("rt-myval");
        if (lab) lab.textContent = v.toFixed(1);
    }

    function startListener() {
        if (started || typeof firebase === "undefined") return;
        started = true;
        db()
            .collection("ratings")
            .onSnapshot(
                function (qs) {
                    all = {};
                    qs.forEach(function (d) {
                        all[d.id] = d.data();
                    });
                    render();
                    listeners.forEach(function (cb) {
                        cb();
                    });
                },
                function (err) {
                    console.error("별점을 불러오지 못했습니다.", err);
                }
            );
    }

    window.Ratings = {
        init: function (id) {
            containerId = id;
            startListener();
        },
        // ctxObj: { target, collection, docId, adminRating }
        setTarget: function (ctxObj) {
            ctx = ctxObj || null;
            hover = 0;
            startListener();
            render();
        },
        clearTarget: function () {
            ctx = null;
            render();
        },
        onChange: function (cb) {
            listeners.push(cb);
        },
        summary: summary,
        starsHtml: starsHtml,
        set: function (val) {
            const u = currentUser();
            if (!u || !ctx) return;
            const v = clampHalf(val);
            if (isAdmin()) {
                // 관리자 별점 → 원본 문서(recipes/trips)의 adminRating 필드
                db()
                    .collection(ctx.collection)
                    .doc(ctx.docId)
                    .set({ adminRating: v }, { merge: true })
                    .then(function () {
                        ctx.adminRating = v;
                        render();
                        window.showToast("관리자 별점 " + v.toFixed(1) + "점");
                    })
                    .catch(function (err) {
                        console.error(err);
                        window.showToast("별점 저장에 실패했어요.");
                    });
                return;
            }
            const id = ctx.target + "__" + u.uid;
            db()
                .collection("ratings")
                .doc(id)
                .set(
                    {
                        id: id,
                        target: ctx.target,
                        uid: u.uid,
                        email: u.email || "",
                        value: v,
                        updatedAt: new Date().toISOString()
                    },
                    { merge: true }
                )
                .then(function () {
                    window.showToast("별점 " + v.toFixed(1) + "점을 남겼어요");
                })
                .catch(function (err) {
                    console.error(err);
                    window.showToast("별점 저장에 실패했어요.");
                });
        },
        clear: function () {
            const u = currentUser();
            if (!u || !ctx) return;
            if (isAdmin()) {
                db()
                    .collection(ctx.collection)
                    .doc(ctx.docId)
                    .set({ adminRating: 0 }, { merge: true })
                    .then(function () {
                        ctx.adminRating = 0;
                        render();
                    })
                    .catch(function (err) {
                        console.error(err);
                    });
                return;
            }
            db()
                .collection("ratings")
                .doc(ctx.target + "__" + u.uid)
                .delete()
                .catch(function (err) {
                    console.error(err);
                });
        }
    };

    document.addEventListener("DOMContentLoaded", function () {
        if (document.getElementById("ratings-root")) window.Ratings.init("ratings-root");
        else startListener(); // 목록 페이지에서도 평균 표시를 위해 구독
        if (typeof window.onAuthChange === "function") {
            window.onAuthChange(function () {
                render();
                listeners.forEach(function (cb) {
                    cb();
                });
            });
        }
    });
})();
