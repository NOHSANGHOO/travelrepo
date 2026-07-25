// 기존 여행의 초기 데이터 복구/시딩용 번들.
// Firebase 개편 후 개별 여행 시드 파일을 없앴기 때문에, 이미 만들어져 있던
// 여행(예: 고베)의 상세정보/일정이 Firestore에 없을 때 이 값으로 자동 복구합니다.
// 새 여행은 화면에서 직접 만들고 편집하므로 여기에 추가할 필요가 없습니다.
window.TRIP_SEEDS = {
    "kobe-arima-2026": {
        tripinfo: {
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
        },
        itinerary: {
            day1: [
                { id: "day1-1", order: 0, presetKey: "car", time: "~ 05:00", title: "인천공항 발렛파킹 인도", desc: "M-Parking (B1층 A구역15)\n차량: X3 (192무5604)\n예약번호: 358633720656", mapQuery: "" },
                { id: "day1-2", order: 1, presetKey: "flight", time: "07:30 ~ 09:20", title: "인천 출발 → 간사이 도착", desc: "피치항공 MM712 (약 1시간 50분)\n좌석: 21D, 21E, 21F", mapQuery: "" },
                { id: "day1-3", order: 2, presetKey: "transport", time: "09:20 ~ 12:00", title: "고베 산노미야로 이동", desc: "간사이 T2 승차장 → 산노미야 직행 리무진", mapQuery: "" },
                { id: "day1-4", order: 3, presetKey: "food", time: "12:30 ~ 13:30", title: "점심: 스테이크랜드", desc: "고베 규 스테이크 런치\n* 호텔에 짐 먼저 맡기고 이동", mapQuery: "Steakland Kobe" },
                { id: "day1-5", order: 4, presetKey: "sight", time: "14:00 ~ 16:00", title: "기타노 이진칸 거리", desc: "스타벅스, 풍향계의 집 등\n오르막은 시티루프버스(260엔)나 택시 이용!", mapQuery: "Kitano Ijinkan-gai" },
                { id: "day1-6", order: 5, presetKey: "hotel", time: "16:10 ~", title: "호텔 몬토레 고베 체크인", desc: "", mapQuery: "Hotel Monterey Kobe" },
                { id: "day1-7", order: 6, presetKey: "drink", time: "19:00 ~ 21:00", title: "저녁: 산노미야 이자카야", desc: "", mapQuery: "" }
            ],
            day2: [
                { id: "day2-1", order: 0, presetKey: "food", time: "08:30 ~ 09:30", title: "호텔 조식", desc: "", mapQuery: "" },
                { id: "day2-2", order: 1, presetKey: "sight", time: "10:00 ~ 13:00", title: "고베 스마 씨월드", desc: "서일본 유일 범고래 쇼 & 돌고래 쇼 (우비 필참)", mapQuery: "Kobe Suma Sea World" },
                { id: "day2-3", order: 2, presetKey: "food", time: "13:10 ~ 14:30", title: "원조평양냉면본점", desc: "", mapQuery: "원조평양냉면본점 고베" },
                { id: "day2-4", order: 3, presetKey: "shopping", time: "15:00 ~ 18:00", title: "산노미야 아케이드 쇼핑", desc: "칼디 커피팜, 한큐백화점 등 실내 쇼핑", mapQuery: "Sannomiya Center Gai" },
                { id: "day2-5", order: 4, presetKey: "drink", time: "18:00 ~ 20:30", title: "저녁 식사 & 호텔 복귀", desc: "", mapQuery: "" }
            ],
            day3: [
                { id: "day3-1", order: 0, presetKey: "hotel", time: "08:30 ~ 09:30", title: "조식 및 체크아웃", desc: "프론트에 캐리어 보관", mapQuery: "" },
                { id: "day3-2", order: 1, presetKey: "sight", time: "10:00 ~ 13:30", title: "동물 왕국 & 호빵맨 박물관", desc: "호빵맨 박물관, umie MOSAIC 구경", mapQuery: "Kobe Animal Kingdom" },
                { id: "day3-3", order: 2, presetKey: "food", time: "14:00 ~ 15:00", title: "점심: 스시 (우오베이 등)", desc: "식사 후 호텔 짐 찾기(15:30)", mapQuery: "Uobei Sannomiya" },
                { id: "day3-4", order: 3, presetKey: "onsen", time: "16:45 ~ 18:30", title: "라코떼 아리마 & 마을 산책", desc: "킨노유 무료족욕탕, 탄산센베 구경", mapQuery: "Raconter Arima" },
                { id: "day3-5", order: 4, presetKey: "food", time: "18:30 ~", title: "석식 (가이세키) & 온천욕", desc: "", mapQuery: "" }
            ],
            day4: [
                { id: "day4-1", order: 0, presetKey: "onsen", time: "06:00 ~ 09:30", title: "아침 온천 및 조식", desc: "화식 뷔페 조식 후 09:30 체크아웃", mapQuery: "" },
                { id: "day4-2", order: 1, presetKey: "sight", time: "10:00 ~ 12:00", title: "아리마 완구 박물관", desc: "", mapQuery: "Arima Toys and Automata Museum" },
                { id: "day4-3", order: 2, presetKey: "food", time: "13:30 ~ 15:30", title: "이치란 라멘 & 막판 쇼핑", desc: "산노미야 복귀 후 점심 및 드럭스토어 쇼핑 완료하기 (T2 면세점 작음)", mapQuery: "Ichiran Sannomiya" },
                { id: "day4-4", order: 3, presetKey: "flight", time: "19:40 ~ 21:35", title: "간사이 출발 → 인천 귀국", desc: "피치항공 MM711", mapQuery: "" },
                { id: "day4-5", order: 4, presetKey: "car", time: "22:00 ~", title: "차량 수령 및 귀가", desc: "B1층 A구역15 (M-Parking 발렛)", mapQuery: "" }
            ]
        }
    }
};
