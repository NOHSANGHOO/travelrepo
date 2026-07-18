# travelrepo

가족 여행 일정을 모아보는 정적 웹사이트입니다. 여러 개의 여행을 목록에서 탐색하고, 각 여행의 일자별 일정과 상세 정보를 확인할 수 있습니다.

## 구조

```
index.html               여행 목록(첫 화면)
assets/trips-data.js     여행 목록에 표시되는 메타데이터 (제목, 기간, 링크 등)
assets/site.js           목록 페이지 렌더링/필터 로직
assets/notes-config.js   메모 기능이 사용할 Google Apps Script 웹앱 주소 설정
assets/notes.js          메모 모달 열기/저장/조회 로직 (모든 여행 상세 페이지 공용)
trips/kobe-arima-2026.html   고베-아리마 여행 상세 페이지
trips/TEMPLATE.html      새 여행 추가 시 복사해서 쓰는 템플릿
google-apps-script/Code.gs   메모 저장용 Google Apps Script 백엔드 (구글 시트에 붙여넣는 용도)
.github/workflows/pages.yml  GitHub Pages 자동 배포 워크플로우
```

## 새 여행 추가하는 법

1. `trips/TEMPLATE.html`을 `trips/새여행id.html`로 복사합니다.
2. 헤더 문구, 일차 탭, 타임라인 카드, 상세 정보(항공편/숙소 등) 내용을 채웁니다.
3. `assets/trips-data.js`의 `TRIPS` 배열에 새 여행 항목을 추가합니다.

   ```js
   {
       id: "jeju-2027",
       title: "제주",
       subtitle: "가족 여행",
       location: "대한민국 제주",
       startDate: "2027-01-10",
       endDate: "2027-01-13",
       duration: "2박 3일",
       icon: "fa-solid fa-umbrella-beach",
       gradient: "from-emerald-500 to-teal-500",
       url: "trips/jeju-2027.html"
   }
   ```

4. `<body data-trip-id="...">` 값을 3번에서 정한 `id`와 동일하게 맞춥니다 (일정 메모가 여행별로 구분되어 저장되는 기준입니다).
5. `main` 브랜치에 푸시하면 GitHub Pages가 자동으로 재배포합니다.

목록 페이지는 오늘 날짜를 기준으로 각 여행을 예정(D-day) / 진행중 / 완료 상태로 자동 분류합니다.

## 배포 (GitHub Pages)

이 저장소는 `.github/workflows/pages.yml`을 통해 `main` 브랜치에 푸시될 때마다 GitHub Pages로 자동 배포되도록 구성되어 있습니다.

최초 1회 설정이 필요합니다:

1. GitHub 저장소 **Settings → Pages**로 이동합니다.
2. **Build and deployment → Source**를 **GitHub Actions**로 선택합니다.
3. 이 브랜치를 `main`에 머지(또는 push)하면 워크플로우가 실행되고, 완료 후 `https://<계정명>.github.io/travelrepo/` 주소로 외부에서 접속할 수 있습니다.

별도 서버 운영 없이 정적 파일만으로 동작하며, 외부망에서도 위 URL로 항상 접근 가능합니다.

## 일정 메모 기능 설정 (Google Sheets)

각 일정 카드의 "메모" 버튼은 별도 DB 없이 Google 스프레드시트를 저장소로 사용합니다. 최초 1회만 아래 절차로 설정하면 됩니다.

1. [sheets.google.com](https://sheets.google.com)에서 새 스프레드시트를 만듭니다 (이름은 자유롭게, 예: "여행 메모").
2. 상단 메뉴 **확장 프로그램(Extensions) → Apps Script** 클릭.
3. 편집기에 기본으로 있는 코드를 모두 지우고, 이 저장소의 `google-apps-script/Code.gs` 내용을 전부 복사해서 붙여넣습니다.
4. 저장(디스크 아이콘) 후 우측 상단 **배포(Deploy) → 새 배포(New deployment)** 클릭.
5. 유형 선택에서 톱니바퀴 아이콘을 눌러 **웹 앱(Web app)** 선택.
6. 설정:
   - **실행 계정(Execute as)**: 나 (내 계정)
   - **액세스 권한(Who has access)**: 전체(Anyone)
   - 반드시 "Anyone"으로 설정해야 로그인 없이도 사이트에서 메모를 불러오고 저장할 수 있습니다.
7. **배포(Deploy)** 클릭 → 권한 승인 절차(구글 계정 로그인, "안전하지 않음" 경고 시 고급 → 이동) 진행.
8. 배포가 끝나면 나오는 **웹 앱 URL**(`https://script.google.com/macros/s/.../exec` 형태)을 복사합니다.
9. 이 저장소의 `assets/notes-config.js` 파일을 열어 `NOTES_API_URL` 값에 그 URL을 붙여넣습니다.

   ```js
   const NOTES_API_URL = "https://script.google.com/macros/s/여기에_복사한_주소/exec";
   ```

10. 커밋 후 `main`에 푸시하면 GitHub Pages가 재배포되고, 사이트에서 메모를 남기면 그 구글 시트에 자동으로 `notes`라는 탭이 생기며 기록됩니다.

**참고 / 한계**
- 이 방식은 인증이 따로 없어서, 배포된 웹 앱 주소를 아는 사람은 누구나 메모를 읽고 쓸 수 있습니다. 가족 여행 메모처럼 민감하지 않은 용도로는 충분하지만, 비밀번호로 보호되지는 않습니다.
- Apps Script 코드를 수정한 뒤에는 **배포 → 배포 관리 → 편집(연필 아이콘) → 새 버전(New version) → 배포**를 다시 해야 변경 사항이 반영됩니다 (URL은 그대로 유지됩니다).
- `NOTES_API_URL`이 비어 있으면 메모 버튼은 보이지만 저장 시 "메모 저장소가 아직 연결되지 않았습니다" 안내만 뜨고 실제 저장은 되지 않습니다.
