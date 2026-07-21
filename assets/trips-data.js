// 여행 목록의 기본(시드) 데이터.
// 실제 데이터는 Firestore `trips` 컬렉션에서 읽어오며, 컬렉션이 비어 있을 때
// 이 값이 화면에 표시되고 관리자가 처음 로그인하면 Firestore로 자동 저장됩니다.
// 새 여행은 파일을 만들 필요 없이 사이트의 "새 여행 만들기"로 추가합니다.
const DEFAULT_TRIPS = [
    {
        id: "kobe-arima-2026",
        title: "고베 · 아리마 온천",
        subtitle: "상후 님의 가족여행",
        headerTitle: "상후 님의 가족여행 ✈️",
        location: "일본 고베 · 아리마 온천",
        locationLabel: "고베 - 아리마 온천",
        startDate: "2026-07-26",
        endDate: "2026-07-29",
        duration: "3박 4일",
        dateLabel: "2026.07.26(일) - 07.29(수)",
        icon: "fa-solid fa-hot-tub-person",
        gradient: "from-teal-500 to-sky-500",
        order: 0,
        days: [
            { id: "day1", label: "1일차 (7/26, 일)" },
            { id: "day2", label: "2일차 (7/27, 월)" },
            { id: "day3", label: "3일차 (7/28, 화)" },
            { id: "day4", label: "4일차 (7/29, 수)" }
        ]
    }
];
