// 고베-아리마 여행 "상세 정보" 탭의 초기(시드) 데이터.
// Firestore(tripinfo/kobe-arima-2026)에 데이터가 없을 때 보여주는 기본값이며,
// 관리자가 처음 로그인하면 자동으로 Firestore에 저장됩니다.
// 각 섹션: { id, icon(프리셋 키), title, rows:[{label, value}] }
//  - label이 있으면 "항목: 값" 형태, label이 비어있으면 불릿 텍스트 줄로 표시됩니다.
//  - value가 URL이면 자동으로 링크 처리됩니다.
const DEFAULT_TRIPINFO = {
    sections: [
        {
            id: "links",
            icon: "link",
            title: "참고 링크 및 예약 웹사이트",
            rows: [
                { label: "몬토레 고베", value: "https://www.hotelmonterey.co.jp/kr/kobe/" },
                { label: "라코떼 아리마", value: "https://relohotels.com/list_of_hotels/raconter-arima/" },
                { label: "스마 씨월드 참고", value: "https://cafe.naver.com/worldtravelcafe/1070900" },
                { label: "호빵맨 박물관", value: "https://www.kobe-anpanman.jp/kr/#shop" },
                { label: "동물왕국 팁/입장권", value: "https://m.blog.naver.com/wuouw1/224266589561" },
                { label: "고베-간사이 비교", value: "https://cafe.naver.com/20daelee/928131" },
                { label: "간사이공항→고베 버스", value: "https://blog.naver.com/xmffutwl808/224258149172" },
                { label: "고베→아리마 버스", value: "https://blog.naver.com/xmffutwl808/224264236555" },
                { label: "고베→간사이공항 버스", value: "https://blog.naver.com/bloomingjeju/224305910103" }
            ]
        },
        {
            id: "flight",
            icon: "plane",
            title: "항공편 정보 (피치항공)",
            rows: [
                { label: "가는편 MM712", value: "07:30 인천(T1) → 09:20 간사이(T2)" },
                { label: "상후", value: "좌석 21D / 위탁수하물 1개" },
                { label: "성은/하린", value: "좌석 21E / 좌석 21F" },
                { label: "오는편 MM711", value: "19:40 간사이(T2) → 21:35 인천(T1)" },
                { label: "상후", value: "좌석 22A / 위탁수하물 1개" },
                { label: "성은/하린", value: "좌석 22B / 좌석 22C" }
            ]
        },
        {
            id: "parking",
            icon: "parking",
            title: "인천공항 발렛파킹",
            rows: [
                { label: "업체명", value: "M-Parking (일반 주차대행)" },
                { label: "차량번호", value: "192무5604 (X3/X4)" },
                { label: "예약번호", value: "358633720656" },
                { label: "인도/수령", value: "인천공항 단기주차 B1층 A구역15" },
                { label: "인도시간", value: "7/26 (일) 05:15" },
                { label: "고객센터", value: "032-743-0124" }
            ]
        },
        {
            id: "hotel",
            icon: "hotel",
            title: "숙소 상세 정보",
            rows: [
                { label: "몬토레 이용시간", value: "IN 15:00 / OUT 11:00" },
                { label: "몬토레 식사/시설", value: "이탈리안 조식 / 2층 사우나(온욕) 시설" },
                { label: "몬토레 연락처", value: "+81-78-392-7111" },
                { label: "라코떼 이용시간", value: "IN 15:00 / OUT 10:00" },
                { label: "라코떼 특징", value: "전 14실 소규모 료칸 (셔틀없음, 택시권장)" },
                { label: "라코떼 온천/식사", value: "공동욕장/노천탕 (가족탕 없음), 석식(가이세키)+조식(화식 뷔페) 포함" },
                { label: "라코떼 연락처", value: "078-903-4315" }
            ]
        },
        {
            id: "strategy",
            icon: "suitcase",
            title: "이동 및 수하물 전략",
            rows: [
                { label: "", value: "수하물 원칙: 모든 캐리어를 항상 통틀어 이동 (분리하지 않음)" },
                { label: "", value: "1일차 체크인: 짐 보관 후 일정 진행 → 이자카야 저녁 후 레이트 체크인(21:00~) 사전 고지 필수" },
                { label: "", value: "3일차 짐 보관: 체크아웃 후 프론트에 무료 보관, 점심 식사 이후 수령" },
                { label: "", value: "폭염 대응: 7월 하순 34~36℃, 10분 이상 도보는 택시/버스로 무조건 대체" }
            ]
        },
        {
            id: "kitano",
            icon: "camera",
            title: "기타노 이진칸 주요 스팟",
            rows: [
                { label: "", value: "우로코노이에: 외벽이 천연석 비늘 모양. 정원 멧돼지 동상 코를 만지면 행운." },
                { label: "", value: "야마테 8번관: '새턴의 의자' 소원 스팟 (여자 오른쪽, 남자 왼쪽)." },
                { label: "", value: "영국관: 셜록 홈즈의 방 재현. 망토/모자 착용 인증샷 가능." },
                { label: "", value: "스타벅스 기타노이진칸점: 1907년 목조 저택 통째 매장. 레트로 인증샷 필수." }
            ]
        }
    ]
};
