(function () {
    const TRIP_ID = document.body.dataset.tripId;
    const COLUMNS = ["day", "order", "presetKey", "time", "title", "desc", "mapQuery"];

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
                    if (text[i + 1] === '"') {
                        cur += '"';
                        i += 2;
                        continue;
                    }
                    inQ = false;
                    i++;
                    continue;
                }
                cur += c;
                i++;
                continue;
            }
            if (c === '"') {
                inQ = true;
                i++;
                continue;
            }
            if (c === ",") {
                row.push(cur);
                cur = "";
                i++;
                continue;
            }
            if (c === "\r") {
                i++;
                continue;
            }
            if (c === "\n") {
                row.push(cur);
                rows.push(row);
                row = [];
                cur = "";
                i++;
                continue;
            }
            cur += c;
            i++;
        }
        if (cur !== "" || row.length) {
            row.push(cur);
            rows.push(row);
        }
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

    window.exportTripCsv = function () {
        const api = window.__itineraryApi;
        if (!api) return;
        const data = api.getData();
        const rows = [COLUMNS.slice()];
        api.getDayIds().forEach(function (dayId) {
            const items = (data[dayId] || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
            items.forEach(function (it, idx) {
                rows.push([dayId, idx, it.presetKey || "etc", it.time || "", it.title || "", it.desc || "", it.mapQuery || ""]);
            });
        });
        download(`${TRIP_ID}.csv`, toCsv(rows));
    };

    window.downloadCsvTemplate = function () {
        const rows = [
            COLUMNS.slice(),
            ["day1", "0", "flight", "07:30 ~ 09:20", "인천 → 간사이", "피치항공 MM712", ""],
            ["day1", "1", "food", "12:30 ~ 13:30", "점심: 스테이크랜드", "고베 규 스테이크", "Steakland Kobe"],
            ["day2", "0", "sight", "10:00 ~ 13:00", "관광지 이름", "설명 (URL도 가능)", "장소명 또는 https://지도링크"]
        ];
        download("travel-template.csv", toCsv(rows));
    };

    window.importTripCsv = function (event) {
        const file = event.target.files && event.target.files[0];
        event.target.value = "";
        if (!file) return;
        if (!(window.isAdmin && window.isAdmin())) {
            alert("관리자만 가져올 수 있습니다.");
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
                if (col.day < 0 || col.title < 0) {
                    alert("CSV에 최소한 'day'와 'title' 열이 필요해요. 양식을 내려받아 확인해주세요.");
                    return;
                }
                const data = {};
                const counters = {};
                for (let r = 1; r < rows.length; r++) {
                    const cells = rows[r];
                    const dayId = (cells[col.day] || "").trim();
                    if (!dayId) continue;
                    const title = (cells[col.title] || "").trim();
                    if (!title) continue;
                    data[dayId] = data[dayId] || [];
                    counters[dayId] = (counters[dayId] || 0);
                    const orderVal = col.order >= 0 ? parseInt(cells[col.order], 10) : NaN;
                    data[dayId].push({
                        id: dayId + "-" + Date.now().toString(36) + counters[dayId] + Math.random().toString(36).slice(2, 5),
                        order: isNaN(orderVal) ? counters[dayId] : orderVal,
                        presetKey: col.presetKey >= 0 ? (cells[col.presetKey] || "etc").trim() : "etc",
                        time: col.time >= 0 ? (cells[col.time] || "").trim() : "",
                        title: title,
                        desc: col.desc >= 0 ? (cells[col.desc] || "") : "",
                        mapQuery: col.mapQuery >= 0 ? (cells[col.mapQuery] || "").trim() : ""
                    });
                    counters[dayId]++;
                }
                Object.keys(data).forEach(function (dayId) {
                    data[dayId].sort((a, b) => a.order - b.order).forEach((it, i) => (it.order = i));
                });
                const dayList = Object.keys(data).join(", ");
                if (!confirm(`CSV의 내용으로 일정을 덮어씁니다.\n대상 일차: ${dayList}\n계속할까요?`)) return;
                window.__itineraryApi
                    .replaceAll(data)
                    .then(function () {
                        alert("가져오기 완료! 일정이 업데이트되었어요.");
                    })
                    .catch(function (err) {
                        alert("가져오기에 실패했어요. 로그인 상태와 권한을 확인해주세요.");
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
