# travelrepo

가족 여행 일정을 모아보는 정적 웹사이트입니다. 여러 개의 여행을 목록에서 탐색하고, 각 여행의 일자별 일정과 상세 정보를 확인할 수 있습니다.

## 구조

```
index.html               여행 목록(첫 화면)
assets/trips-data.js     여행 목록에 표시되는 메타데이터 (제목, 기간, 링크 등)
assets/site.js           목록 페이지 렌더링/필터 로직
trips/kobe-arima-2026.html   고베-아리마 여행 상세 페이지
trips/TEMPLATE.html      새 여행 추가 시 복사해서 쓰는 템플릿
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

4. `main` 브랜치에 푸시하면 GitHub Pages가 자동으로 재배포합니다.

목록 페이지는 오늘 날짜를 기준으로 각 여행을 예정(D-day) / 진행중 / 완료 상태로 자동 분류합니다.

## 배포 (GitHub Pages)

이 저장소는 `.github/workflows/pages.yml`을 통해 `main` 브랜치에 푸시될 때마다 GitHub Pages로 자동 배포되도록 구성되어 있습니다.

최초 1회 설정이 필요합니다:

1. GitHub 저장소 **Settings → Pages**로 이동합니다.
2. **Build and deployment → Source**를 **GitHub Actions**로 선택합니다.
3. 이 브랜치를 `main`에 머지(또는 push)하면 워크플로우가 실행되고, 완료 후 `https://<계정명>.github.io/travelrepo/` 주소로 외부에서 접속할 수 있습니다.

별도 서버 운영 없이 정적 파일만으로 동작하며, 외부망에서도 위 URL로 항상 접근 가능합니다.
