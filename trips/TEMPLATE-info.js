// 새 여행 "상세 정보" 탭의 초기(시드) 데이터 템플릿.
// 이 파일을 trips/새여행id-info.js 로 복사하고, HTML 맨 아래 <script> 태그 파일명도 바꿔주세요.
// Firestore(tripinfo/새여행id)에 데이터가 없을 때 보여주는 기본값입니다.
// 배포 후에는 사이트에서 관리자로 로그인해 "정보 카드 추가"/편집/삭제로 관리하면 됩니다.
// icon으로 쓸 수 있는 프리셋: link, plane, parking, hotel, suitcase, camera, ticket, info
const DEFAULT_TRIPINFO = {
    sections: [
        {
            id: "flight",
            icon: "plane",
            title: "항공편 정보",
            rows: [
                { label: "편명", value: "내용" },
                { label: "좌석", value: "내용" }
            ]
        },
        {
            id: "hotel",
            icon: "hotel",
            title: "숙소 정보",
            rows: [
                { label: "이용시간", value: "IN / OUT" },
                { label: "연락처", value: "내용" }
            ]
        }
    ]
};
