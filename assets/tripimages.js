(function () {
    // 상세 정보 탭의 "여행 정보 이미지" (최대 2장).
    // Firebase Storage(유료 전환 필요) 대신, 브라우저에서 이미지를 압축한 뒤
    // Firestore `tripimages/{tripId}` 문서에 data URL로 저장합니다.
    const TRIP_ID = document.body.dataset.tripId;
    const MAX_IMAGES = 2;
    const MAX_EDGE = 1600; // 긴 변 최대 픽셀
    const MAX_CHARS = 420000; // 이미지 1장당 data URL 길이 상한 (문서 1MiB 제한 대비)

    let images = [];
    let started = false;
    let busy = false;

    function isAdmin() {
        return !!(window.isAdmin && window.isAdmin());
    }

    function esc(s) {
        return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function db() {
        return firebase.firestore().collection("tripimages").doc(TRIP_ID);
    }

    // ---- 압축 ----
    function loadImage(file) {
        return new Promise(function (resolve, reject) {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = function () {
                URL.revokeObjectURL(url);
                resolve(img);
            };
            img.onerror = function () {
                URL.revokeObjectURL(url);
                reject(new Error("이미지를 읽을 수 없어요."));
            };
            img.src = url;
        });
    }

    function compress(file) {
        return loadImage(file).then(function (img) {
            let edge = MAX_EDGE;
            let quality = 0.85;
            for (let i = 0; i < 8; i++) {
                const scale = Math.min(1, edge / Math.max(img.width, img.height));
                const c = document.createElement("canvas");
                c.width = Math.max(1, Math.round(img.width * scale));
                c.height = Math.max(1, Math.round(img.height * scale));
                const ctx = c.getContext("2d");
                ctx.fillStyle = "#fff"; // 투명 PNG → 흰 배경
                ctx.fillRect(0, 0, c.width, c.height);
                ctx.drawImage(img, 0, 0, c.width, c.height);
                const data = c.toDataURL("image/jpeg", quality);
                if (data.length <= MAX_CHARS) return data;
                quality = Math.max(0.5, quality - 0.1);
                edge = Math.round(edge * 0.85);
            }
            throw new Error("이미지가 너무 커서 줄일 수 없어요. 다른 이미지를 써주세요.");
        });
    }

    // ---- 렌더 ----
    function render() {
        const root = document.getElementById("info-images");
        if (!root) return;
        const admin = isAdmin();
        if (!images.length && !admin) {
            root.innerHTML = "";
            return;
        }
        const thumbs = images
            .map(function (im, i) {
                return `<div class="ti-item">
                    <button type="button" class="ti-thumb" onclick="TripImages.open(${i})" title="눌러서 확대">
                        <img src="${im.data}" alt="${esc(im.name || "여행 정보 이미지 " + (i + 1))}" loading="lazy">
                        <span class="ti-zoom"><i class="fa-solid fa-magnifying-glass-plus"></i></span>
                    </button>
                    ${admin ? `<button type="button" class="ti-del" onclick="TripImages.remove(${i})" title="삭제"><i class="fa-solid fa-xmark"></i></button>` : ""}
                </div>`;
            })
            .join("");
        const canAdd = admin && images.length < MAX_IMAGES;
        const addBtn = canAdd
            ? `<label class="ti-add${busy ? " busy" : ""}"><i class="fa-solid fa-image"></i><span>${busy ? "올리는 중..." : "이미지 추가"}</span><input type="file" accept="image/*" class="hidden" onchange="TripImages.add(event)"></label>`
            : "";
        root.innerHTML = `<div class="info-card">
            <div class="info-card-header"><i class="fa-solid fa-images text-[#8a7560]"></i><span>정보 이미지</span>
                <span class="ml-auto text-[11px] font-normal text-stone-400">${images.length}/${MAX_IMAGES}</span></div>
            ${images.length || canAdd ? `<div class="ti-grid">${thumbs}${addBtn}</div>` : ""}
            ${admin ? `<p class="text-[11px] text-stone-400 mt-2">예약 확인서, 지도, 일정표 같은 이미지를 최대 ${MAX_IMAGES}장까지 올릴 수 있어요. 자동으로 압축됩니다.</p>` : ""}
        </div>`;
    }

    // ---- 저장 ----
    function save(next) {
        return db().set({ images: next, updatedAt: new Date().toISOString() });
    }

    function startListener() {
        if (started || !TRIP_ID || typeof firebase === "undefined") return;
        started = true;
        db().onSnapshot(
            function (doc) {
                const d = doc.exists ? doc.data() : null;
                images = d && Array.isArray(d.images) ? d.images : [];
                render();
            },
            function (err) {
                console.error("이미지를 불러오지 못했습니다.", err);
            }
        );
    }

    // ---- 라이트박스 (확대/축소/이동) ----
    let lb = null;
    const view = { s: 1, x: 0, y: 0 };
    const pointers = {};
    let pinchStart = null;
    let dragStart = null;

    function applyView() {
        const img = lb && lb.querySelector("img");
        if (img) img.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`;
        if (lb) lb.classList.toggle("zoomed", view.s > 1.01);
    }

    function setScale(s, cx, cy) {
        if (!lb) return;
        const ns = Math.max(1, Math.min(6, s));
        // 기준점(cx, cy) 아래의 픽셀이 고정되도록 이동량 보정
        const r = lb.querySelector(".lb-stage").getBoundingClientRect();
        const px = cx - (r.left + r.width / 2);
        const py = cy - (r.top + r.height / 2);
        view.x = px - ((px - view.x) / view.s) * ns;
        view.y = py - ((py - view.y) / view.s) * ns;
        view.s = ns;
        if (view.s === 1) { view.x = 0; view.y = 0; }
        applyView();
    }

    function onKey(e) {
        if (!lb) return;
        if (e.key === "Escape") close();
        else if (e.key === "ArrowRight") nav(1);
        else if (e.key === "ArrowLeft") nav(-1);
    }

    let index = 0;
    function show(i) {
        index = (i + images.length) % images.length;
        view.s = 1; view.x = 0; view.y = 0;
        const img = lb.querySelector("img");
        img.src = images[index].data;
        lb.querySelector(".lb-count").textContent = images.length > 1 ? `${index + 1} / ${images.length}` : "";
        lb.querySelectorAll(".lb-nav").forEach(function (b) { b.style.display = images.length > 1 ? "" : "none"; });
        applyView();
    }

    function nav(d) {
        if (images.length > 1) show(index + d);
    }

    function open(i) {
        if (!images.length) return;
        close();
        lb = document.createElement("div");
        lb.className = "lb-overlay";
        lb.innerHTML = `
            <div class="lb-top"><span class="lb-count"></span><button type="button" class="lb-close" aria-label="닫기"><i class="fa-solid fa-xmark"></i></button></div>
            <div class="lb-stage"><img alt="" draggable="false"></div>
            <button type="button" class="lb-nav lb-prev" aria-label="이전"><i class="fa-solid fa-chevron-left"></i></button>
            <button type="button" class="lb-nav lb-next" aria-label="다음"><i class="fa-solid fa-chevron-right"></i></button>
            <div class="lb-hint">두 번 탭하거나 휠/핀치로 확대</div>`;
        document.body.appendChild(lb);
        document.body.style.overflow = "hidden";
        requestAnimationFrame(function () { lb && lb.classList.add("in"); });

        const stage = lb.querySelector(".lb-stage");
        lb.querySelector(".lb-close").onclick = close;
        lb.querySelector(".lb-prev").onclick = function () { nav(-1); };
        lb.querySelector(".lb-next").onclick = function () { nav(1); };
        // 확대 전에 빈 배경을 누르면 닫기
        // (포인터 캡처 때문에 e.target 은 항상 stage 이므로 클릭 좌표가 이미지 밖인지로 판단)
        stage.addEventListener("click", function (e) {
            if (view.s > 1.01 || (dragStart && dragStart.moved)) return;
            const r = stage.querySelector("img").getBoundingClientRect();
            const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
            if (!inside) close();
        });
        stage.addEventListener("wheel", function (e) {
            e.preventDefault();
            setScale(view.s * (e.deltaY < 0 ? 1.18 : 1 / 1.18), e.clientX, e.clientY);
        }, { passive: false });
        stage.addEventListener("dblclick", function (e) {
            setScale(view.s > 1.01 ? 1 : 2.5, e.clientX, e.clientY);
        });
        stage.addEventListener("pointerdown", function (e) {
            stage.setPointerCapture(e.pointerId);
            pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
            const ids = Object.keys(pointers);
            if (ids.length === 2) {
                const a = pointers[ids[0]], b = pointers[ids[1]];
                pinchStart = { d: Math.hypot(a.x - b.x, a.y - b.y), s: view.s };
                dragStart = null;
            } else if (ids.length === 1) {
                dragStart = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, t: Date.now(), moved: false };
            }
        });
        stage.addEventListener("pointermove", function (e) {
            if (!pointers[e.pointerId]) return;
            pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
            const ids = Object.keys(pointers);
            if (ids.length === 2 && pinchStart) {
                const a = pointers[ids[0]], b = pointers[ids[1]];
                const d = Math.hypot(a.x - b.x, a.y - b.y);
                setScale(pinchStart.s * (d / pinchStart.d), (a.x + b.x) / 2, (a.y + b.y) / 2);
            } else if (ids.length === 1 && dragStart && view.s > 1.01) {
                view.x = dragStart.vx + (e.clientX - dragStart.x);
                view.y = dragStart.vy + (e.clientY - dragStart.y);
                dragStart.moved = true;
                applyView();
            }
        });
        function up(e) {
            const wasSingle = Object.keys(pointers).length === 1;
            // 확대 안 된 상태에서 좌우로 쓸어넘기면 이전/다음
            if (wasSingle && dragStart && view.s <= 1.01) {
                const dx = e.clientX - dragStart.x;
                if (Math.abs(dx) > 60 && Math.abs(e.clientY - dragStart.y) < 80) nav(dx < 0 ? 1 : -1);
            }
            delete pointers[e.pointerId];
            if (Object.keys(pointers).length < 2) pinchStart = null;
            if (!Object.keys(pointers).length) dragStart = null;
        }
        stage.addEventListener("pointerup", up);
        stage.addEventListener("pointercancel", up);
        document.addEventListener("keydown", onKey);
        show(i || 0);
    }

    function close() {
        if (!lb) return;
        document.removeEventListener("keydown", onKey);
        const el = lb;
        lb = null;
        el.classList.remove("in");
        document.body.style.overflow = "";
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 200);
        Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
        pinchStart = dragStart = null;
    }

    window.TripImages = {
        open: open,
        close: close,
        add: function (event) {
            const file = event.target.files && event.target.files[0];
            event.target.value = "";
            if (!file || !isAdmin() || busy) return;
            if (images.length >= MAX_IMAGES) {
                window.showToast("이미지는 최대 " + MAX_IMAGES + "장까지예요.");
                return;
            }
            if (!/^image\//.test(file.type)) {
                window.showToast("이미지 파일만 올릴 수 있어요.");
                return;
            }
            busy = true;
            render();
            compress(file)
                .then(function (data) {
                    return save(images.concat([{ data: data, name: file.name, addedAt: new Date().toISOString() }]));
                })
                .then(function () {
                    window.showToast("이미지를 추가했어요");
                })
                .catch(function (err) {
                    console.error(err);
                    window.showToast(err && err.message ? err.message : "이미지 저장에 실패했어요.");
                })
                .then(function () {
                    busy = false;
                    render();
                });
        },
        remove: function (i) {
            if (!isAdmin() || !images[i]) return;
            if (!confirm("이 이미지를 삭제할까요?")) return;
            const next = images.filter(function (_, k) { return k !== i; });
            save(next).catch(function (err) {
                console.error(err);
                window.showToast("삭제에 실패했어요.");
            });
        },
        _count: function () { return images.length; }
    };

    document.addEventListener("DOMContentLoaded", function () {
        startListener();
        render();
        if (typeof window.onAuthChange === "function") {
            window.onAuthChange(function () {
                startListener();
                render();
            });
        }
    });
})();
