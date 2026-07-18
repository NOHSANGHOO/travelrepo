# travelrepo

가족 여행 일정을 모아보는 정적 웹사이트입니다. 여러 개의 여행을 목록에서 탐색하고, 각 여행의 일자별 일정과 상세 정보를 확인할 수 있습니다. 일정 카드마다 메모를 남길 수 있고, 사이트 열람에는 간단한 비밀번호가 걸려 있습니다.

## 구조

```
index.html               여행 목록(첫 화면)
assets/trips-data.js     여행 목록에 표시되는 메타데이터 (제목, 기간, 링크 등)
assets/site.js           목록 페이지 렌더링/필터 로직
assets/access-gate.js    사이트 열람 비밀번호 게이트
assets/notes-config.js   메모 데이터가 저장될 GitHub 저장소 정보 설정
assets/notes.js          메모 모달 열기/저장/조회 + 관리자 로그인 로직 (모든 여행 상세 페이지 공용)
data/notes.json          모든 여행의 메모가 실제로 저장되는 파일 (커밋으로 갱신됨)
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

## 사이트 열람 비밀번호

사이트에 처음 들어오면 4자리 비밀번호(`0262`, `assets/access-gate.js`에서 변경 가능)를 입력해야 내용이 보입니다. 한 번 맞추면 그 브라우저에는 계속 기억됩니다(localStorage).

**중요한 한계**: 이 방식은 정적 사이트에서 구현 가능한 "최소한의" 가림막일 뿐, 실제 보안이 아닙니다.
- 비밀번호 값 자체가 `assets/access-gate.js` 파일 안에 평문으로 들어 있어서, 그 파일을 열어보면 누구나 알 수 있습니다.
- 브라우저 개발자도구(F12) → Elements/페이지 소스 보기를 하면 비밀번호를 몰라도 이미 로드된 내용이 그대로 보입니다.
- 즉 "링크를 몰라서 못 들어오는" 수준의 캐주얼한 방문자만 막을 수 있고, 작정하고 보려는 사람은 막을 수 없습니다. 진짜로 비공개가 필요하면 저장소를 다시 비공개로 돌리고 유료 GitHub Pages(Pro)를 쓰는 방법을 고려해야 합니다.

## 일정 메모 기능

각 일정 카드의 "메모" 버튼은 별도 DB나 외부 서비스 없이, 이 저장소 안의 `data/notes.json` 파일에 직접 커밋되는 방식으로 동작합니다.

- **읽기**: 누구나(비밀번호만 통과하면) 메모를 볼 수 있습니다. GitHub 로그인 불필요.
- **쓰기**: 헤더 오른쪽 위 자물쇠 아이콘으로 "관리자 로그인"을 해야만 메모를 새로 쓰거나 수정할 수 있습니다.

### 관리자 로그인(쓰기 권한) 설정 방법

1. GitHub 우측 상단 프로필 아이콘 → **Settings**
2. 왼쪽 맨 아래 **Developer settings** 클릭
3. **Personal access tokens → Fine-grained tokens** → **Generate new token**
4. 설정:
   - **Token name**: 아무 이름 (예: `travelrepo-notes`)
   - **Expiration**: 원하는 기간 (예: 90일 — 만료되면 다시 발급해서 재로그인하면 됩니다)
   - **Repository access**: **Only select repositories** → `travelrepo` 선택
   - **Permissions → Repository permissions → Contents**: **Read and write**로 변경 (다른 권한은 전부 그대로 No access 유지)
5. **Generate token** 클릭 → 생성된 토큰 값을 복사합니다 (`github_pat_...`로 시작). **이 화면을 벗어나면 다시 볼 수 없으니 즉시 복사하세요.**
6. 사이트의 여행 상세 페이지에서 헤더 오른쪽 위 **자물쇠 아이콘** 클릭 → 뜨는 입력창에 방금 복사한 토큰 붙여넣기
7. 이제 자물쇠 아이콘이 열린 자물쇠로 바뀌고, 메모 버튼을 누르면 편집 및 저장이 가능합니다. 저장하면 이 저장소의 `data/notes.json`에 실제 커밋이 생깁니다.

로그아웃하려면 자물쇠(열림) 아이콘을 다시 눌러 확인하면 이 기기에서 토큰이 삭제됩니다.

**참고 / 한계**
- 토큰은 로그인한 사람의 브라우저(localStorage)에만 저장되고, 코드나 저장소에는 절대 커밋되지 않습니다.
- 토큰을 발급할 때 **Contents: Read and write 권한만, 이 저장소 하나에만** 부여하면 다른 저장소나 계정 전체에는 영향이 없습니다. 더 이상 필요 없으면 GitHub 설정에서 언제든 즉시 폐기(revoke)할 수 있습니다.
- 저장소가 Public이므로, 메모 저장 시 생기는 커밋도 다른 커밋들처럼 공개적으로 보입니다.
- 메모를 읽어오는 쪽은 `raw.githubusercontent.com`의 캐시를 거치기 때문에, 저장 직후 자신의 화면은 바로 갱신되지만 다른 사람 화면에는 반영까지 짧은 지연(보통 1분 이내)이 있을 수 있습니다.
