(function () {
    const TRIP_ID = document.body.dataset.tripId;
    const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
    // CSV columns: `date` is the actual travel date (YYYY-MM-DD), not an internal day id.
    const COLUMNS = ["date", "order", "presetKey", "time", "title", "desc", "mapQuery"];

    function csvCell(v) {
        v = v == null ? "" : String(v);
        if (/[",\n\r]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
        return v;
    }

    function toCsv(rows) {
        return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
    }

    function parseCsv(text) {
        const rows = [];
        let row = [];
        let cur = "";
        let inQ = false;
        let i = 0;
        text = text.replace(/^﻿/, "");
        while (i < text.length) {
            const c = text[i];
            if (inQ) {
                if (c === '"') {
                    if (text[i + 1] === '"') { cur += '"'; i += 2; continue; }
                    inQ = false; i++; continue;
                }
                cur += c; i++; continue;
            }
            if (c === '"') { inQ = true; i++; continue; }
            if (c === ",") { row.push(cur); cur = ""; i++; continue; }
            if (c === "\r") { i++; continue; }
            if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; i++; continue; }
            cur += c; i++;
        }
        if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
        return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0].trim() !== ""));
    }

    function download(filename, content) {
        const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function tripDays() {
        if (typeof window.__tripDays === "function") return window.__tripDays();
        // fallback: derive from DOM day containers
        return (window.__itineraryApi ? window.__itineraryApi.getDayIds() : []).map(function (id, i) {
            return { id: id, date: "day" + (i + 1), label: id };
        });
    }

    function labelFromDate(dateStr) {
        const d = new Date(dateStr + "T00:00:00");
        if (isNaN(d)) return dateStr;
        return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAYS[d.getDay()]})`;
    }

    function nextDayId(existing) {
        let max = 0;
        existing.forEach(function (d) {
            const m = /^day(\d+)$/.exec(d.id || "");
            if (m) max = Math.max(max, parseInt(m[1], 10));
        });
        return "day" + (max + 1);
    }

    window.exportTripCsv = function () {
        const api = window.__itineraryApi;
        if (!api) return;
        const data = api.getData();
        const days = tripDays();
        const rows = [COLUMNS.slice()];
        days.forEach(function (day) {
            const items = (data[day.id] || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
            items.forEach(function (it, idx) {
                rows.push([day.date, idx, it.presetKey || "etc", it.time || "", it.title || "", it.desc || "", it.mapQuery || ""]);
            });
        });
        download(`${TRIP_ID}.csv`, toCsv(rows));
    };

    window.downloadCsvTemplate = function () {
        const days = tripDays();
        const d1 = (days[0] && days[0].date) || "2026-07-26";
        const d2 = (days[1] && days[1].date) || "2026-07-27";
        const rows = [
            COLUMNS.slice(),
            [d1, "0", "flight", "07:30 ~ 09:20", "인천 → 간사이", "피치항공 MM712", ""],
            [d1, "1", "food", "12:30 ~ 13:30", "점심: 스테이크랜드", "고베 규 스테이크", "Steakland Kobe"],
            [d2, "0", "sight", "10:00 ~ 13:00", "관광지 이름", "설명 (URL도 가능)", "장소명 또는 https://지도링크"]
        ];
        download("travel-template.csv", toCsv(rows));
    };

    window.importTripCsv = function (event) {
        const file = event.target.files && event.target.files[0];
        event.target.value = "";
        if (!file) return;
        if (!(window.isAdmin && window.isAdmin())) {
            alert("관리자만 업로드할 수 있습니다.");
            return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const rows = parseCsv(e.target.result);
                if (rows.length < 2) {
                    alert("데이터가 없는 CSV예요.");
                    return;
                }
                const header = rows[0].map((h) => h.trim());
                const col = {};
                COLUMNS.forEach((name) => (col[name] = header.indexOf(name)));
                // accept legacy `day` column as an alias for `date`
                if (col.date < 0) col.date = header.indexOf("day");
                if (col.date < 0 || col.title < 0) {
                    alert("CSV에 최소한 'date'(날짜)와 'title' 열이 필요해요. 양식을 내려받아 확인해주세요.");
                    return;
                }

                const days = tripDays();
                const dateToId = {};
                days.forEach((d) => (dateToId[d.date] = d.id));
                const newDays = [];
                const data = {};
                const counters = {};

                for (let r = 1; r < rows.length; r++) {
                    const cells = rows[r];
                    const dateStr = (cells[col.date] || "").trim();
                    const title = (cells[col.title] || "").trim();
                    if (!dateStr || !title) continue;
                    let dayId = dateToId[dateStr];
                    if (!dayId) {
                        dayId = nextDayId(days.concat(newDays));
                        newDays.push({ id: dayId, date: dateStr, label: labelFromDate(dateStr) });
                        dateToId[dateStr] = dayId;
                    }
                    data[dayId] = data[dayId] || [];
                    counters[dayId] = counters[dayId] || 0;
                    const orderVal = col.order >= 0 ? parseInt(cells[col.order], 10) : NaN;
                    data[dayId].push({
                        id: dayId + "-" + Date.now().toString(36) + counters[dayId] + Math.random().toString(36).slice(2, 5),
                        order: isNaN(orderVal) ? counters[dayId] : orderVal,
                        presetKey: col.presetKey >= 0 ? (cells[col.presetKey] || "etc").trim() : "etc",
                        time: col.time >= 0 ? (cells[col.time] || "").trim() : "",
                        title: title,
                        desc: col.desc >= 0 ? cells[col.desc] || "" : "",
                        mapQuery: col.mapQuery >= 0 ? (cells[col.mapQuery] || "").trim() : ""
                    });
                    counters[dayId]++;
                }
                Object.keys(data).forEach(function (dayId) {
                    data[dayId].sort((a, b) => a.order - b.order).forEach((it, i) => (it.order = i));
                });

                const dateList = Object.keys(dateToId).filter((d) => data[dateToId[d]]).join(", ");
                if (!confirm(`CSV의 내용으로 일정을 덮어씁니다.\n대상 날짜: ${dateList}\n계속할까요?`)) return;

                const tasks = [window.__itineraryApi.replaceAll(data)];
                if (newDays.length && window.TripsStore) {
                    // append newly-seen dates as new days, sorted by date
                    const merged = days.concat(newDays).sort((a, b) => String(a.date).localeCompare(String(b.date)));
                    tasks.push(window.TripsStore.update(TRIP_ID, { days: merged }));
                }
                Promise.all(tasks)
                    .then(function () {
                        alert("업로드 완료! 일정이 업데이트되었어요." + (newDays.length ? `\n새 일차 ${newDays.length}개가 추가되었습니다.` : ""));
                    })
                    .catch(function (err) {
                        alert("업로드에 실패했어요. 로그인 상태와 권한을 확인해주세요.");
                        console.error(err);
                    });
            } catch (err) {
                alert("CSV를 읽는 중 오류가 발생했어요.");
                console.error(err);
            }
        };
        reader.readAsText(file, "utf-8");
    };

    // ===== 상세 정보(tripinfo) CSV =====
    // 한 행 = 정보 카드의 한 줄. 같은 `section` 값이 하나의 카드로 묶입니다.
    // `icon`은 카드의 첫 행에만 적으면 되고, `label`을 비우면 불릿(•) 줄이 됩니다.
    const INFO_COLUMNS = ["section", "icon", "label", "value"];

    window.exportInfoCsv = function () {
        const api = window.__tripInfoApi;
        if (!api) return;
        const sections = api.getSections();
        const rows = [INFO_COLUMNS.slice()];
        sections.forEach(function (s) {
            const list = s.rows || [];
            if (!list.length) {
                rows.push([s.title || "", s.icon || "info", "", ""]);
                return;
            }
            list.forEach(function (r, i) {
                rows.push([s.title || "", i === 0 ? s.icon || "info" : "", r.label || "", r.value || ""]);
            });
        });
        download(`${TRIP_ID}-info.csv`, toCsv(rows));
    };

    window.downloadInfoCsvTemplate = function () {
        const rows = [
            INFO_COLUMNS.slice(),
            ["항공편 정보", "plane", "가는 편", "7/26 07:30 인천 → 09:20 간사이 (MM712)"],
            ["항공편 정보", "", "오는 편", "7/29 10:40 간사이 → 12:40 인천"],
            ["항공편 정보", "", "예약번호", "ABC1234567"],
            ["숙소 정보", "hotel", "숙소명", "고베 ○○호텔"],
            ["숙소 정보", "", "주소", "Kobe, Chuo Ward, ..."],
            ["숙소 정보", "", "", "체크인 15:00 / 체크아웃 11:00 (항목을 비우면 불릿 줄)"],
            ["참고 링크", "link", "블로그 후기", "https://example.com/post"]
        ];
        download("travel-info-template.csv", toCsv(rows));
    };

    window.importInfoCsv = function (event) {
        const file = event.target.files && event.target.files[0];
        event.target.value = "";
        if (!file) return;
        if (!(window.isAdmin && window.isAdmin())) {
            alert("관리자만 업로드할 수 있습니다.");
            return;
        }
        const api = window.__tripInfoApi;
        if (!api) {
            alert("상세 정보를 아직 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
            return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const rows = parseCsv(e.target.result);
                if (rows.length < 2) {
                    alert("데이터가 없는 CSV예요.");
                    return;
                }
                const header = rows[0].map((h) => h.trim());
                const col = {};
                INFO_COLUMNS.forEach((name) => (col[name] = header.indexOf(name)));
                if (col.section < 0) {
                    alert("CSV에 최소한 'section'(카드 제목) 열이 필요해요. 양식을 내려받아 확인해주세요.");
                    return;
                }

                const presetKeys = api.getPresetKeys();
                const order = [];
                const byTitle = {};
                for (let r = 1; r < rows.length; r++) {
                    const cells = rows[r];
                    const title = (cells[col.section] || "").trim();
                    if (!title) continue;
                    if (!byTitle[title]) {
                        byTitle[title] = { id: api.newSectionId(), icon: "", title: title, rows: [] };
                        order.push(title);
                    }
                    const sec = byTitle[title];
                    const icon = col.icon >= 0 ? (cells[col.icon] || "").trim() : "";
                    if (!sec.icon && icon) sec.icon = presetKeys.indexOf(icon) >= 0 ? icon : "info";
                    const label = col.label >= 0 ? (cells[col.label] || "").trim() : "";
                    const value = col.value >= 0 ? cells[col.value] || "" : "";
                    if (label || value.trim()) sec.rows.push({ label: label, value: value });
                }
                const sections = order.map(function (t) {
                    const s = byTitle[t];
                    if (!s.icon) s.icon = "info";
                    return s;
                });
                if (!sections.length) {
                    alert("업로드할 카드가 없어요. 'section' 열에 카드 제목을 채워주세요.");
                    return;
                }
                if (!confirm(`CSV의 내용으로 상세 정보를 덮어씁니다.\n카드 ${sections.length}개: ${order.join(", ")}\n계속할까요?`)) return;
                api.replaceAll(sections)
                    .then(function () {
                        alert("업로드 완료! 상세 정보가 업데이트되었어요.");
                    })
                    .catch(function (err) {
                        alert("업로드에 실패했어요. 로그인 상태와 권한을 확인해주세요.");
                        console.error(err);
                    });
            } catch (err) {
                alert("CSV를 읽는 중 오류가 발생했어요.");
                console.error(err);
            }
        };
        reader.readAsText(file, "utf-8");
    };
})();
