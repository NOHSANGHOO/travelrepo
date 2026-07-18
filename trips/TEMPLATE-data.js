// 새 여행의 초기(시드) 일정 데이터 예시.
// 이 파일을 trips/새여행id-data.js로 복사해서 내용을 채우고,
// 해당 HTML 파일 맨 아래 <script> 태그의 파일명도 함께 바꿔주세요.
// Firestore(itineraries/새여행id)에 아직 데이터가 없을 때 보여주는 기본값이며,
// 관리자가 처음 로그인하면 자동으로 Firestore에 저장되어 이후에는 Firestore가 기준이 됩니다.
// presetKey로 쓸 수 있는 값은 assets/itinerary.js의 ICON_PRESETS를 참고하세요.
// (flight, transport, car, food, hotel, sight, shopping, onsen, drink, etc)
const DEFAULT_ITINERARY = {
    day1: [
        { id: "day1-1", order: 0, presetKey: "flight", time: "HH:MM ~ HH:MM", title: "일정 제목", desc: "일정 설명", mapQuery: "" },
        { id: "day1-2", order: 1, presetKey: "hotel", time: "HH:MM ~", title: "숙소 체크인", desc: "", mapQuery: "" }
    ],
    day2: [
        { id: "day2-1", order: 0, presetKey: "flight", time: "HH:MM ~ HH:MM", title: "귀국", desc: "", mapQuery: "" }
    ]
};
