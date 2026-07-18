// 고베-아리마 여행의 초기(시드) 일정 데이터.
// Firestore(itineraries/kobe-arima-2026)에 아직 데이터가 없을 때 화면에 보여주는 기본값이며,
// 관리자가 처음 로그인하면 이 내용이 자동으로 Firestore에 저장되어 이후에는 Firestore가 기준이 됩니다.
const DEFAULT_ITINERARY = {
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
};
