# travelrepo

가족 여행 일정을 모아보는 정적 웹사이트입니다. 여러 개의 여행을 목록에서 탐색하고, 각 여행의 일자별 일정과 상세 정보를 확인할 수 있습니다. 일정 카드마다 메모를 남길 수 있고, 사이트 열람에는 간단한 비밀번호가 걸려 있습니다.

## 구조

```
index.html               여행 목록(첫 화면)
assets/trips-data.js     여행 목록에 표시되는 메타데이터 (제목, 기간, 링크 등)
assets/site.js           목록 페이지 렌더링/필터 로직
assets/access-gate.js    사이트 열람 비밀번호 게이트
assets/firebase-config.js   Firebase 프로젝트 연결 정보 (메모 저장용 DB)
assets/notes.js          메모 모달 열기/저장/조회 + 관리자 로그인 로직 (모든 여행 상세 페이지 공용)
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

## 일정 메모 기능 (Firebase)

각 일정 카드의 "메모" 버튼은 무료 DB인 **Firebase(Firestore + Authentication)**를 사용합니다.

- **읽기**: 누구나(비밀번호만 통과하면) 메모를 볼 수 있습니다. 로그인 불필요, 여러 기기에서 실시간으로 반영됩니다.
- **쓰기**: 헤더 오른쪽 위 자물쇠 아이콘으로 이메일/비밀번호 로그인을 해야만 메모를 새로 쓰거나 수정할 수 있습니다.

### 최초 1회 설정

1. **[console.firebase.google.com](https://console.firebase.google.com)** 접속 → 구글 계정으로 로그인 → **프로젝트 만들기** (이름 자유, Google Analytics는 꺼도 무방)
2. 왼쪽 메뉴 **빌드(Build) → Firestore Database → 데이터베이스 만들기** → 위치는 `asia-northeast3 (Seoul)` 권장 → 생성 (보안 규칙은 일단 아무 값이나 선택하고 진행, 3번에서 교체합니다)
3. Firestore 화면의 **규칙(Rules)** 탭을 열고 아래 규칙으로 교체 후 **게시(Publish)**:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /notes/{tripId} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

   (읽기는 누구나 허용, 쓰기는 로그인한 사용자만 허용 — 실제 접근 제어는 여기서 이루어집니다.)

4. 왼쪽 메뉴 **빌드(Build) → Authentication → 시작하기 → Sign-in method** 탭 → **이메일/비밀번호** 사용 설정
5. **Users** 탭 → **사용자 추가** → 본인 이메일 + 사이트 로그인용 비밀번호로 관리자 계정 1개 생성 (이 계정으로 사이트에 로그인해서 메모를 씁니다)
6. 왼쪽 상단 **⚙️ → 프로젝트 설정** → 맨 아래 **내 앱 → `</>`(웹 앱 추가)** → 아무 닉네임으로 등록 → 나오는 `firebaseConfig` 객체를 복사
7. 이 저장소의 `assets/firebase-config.js`를 열어 복사한 값을 그대로 채워넣습니다.

   ```js
   const firebaseConfig = {
       apiKey: "...",
       authDomain: "...",
       projectId: "...",
       storageBucket: "...",
       messagingSenderId: "...",
       appId: "..."
   };
   ```

8. 커밋 후 `main`에 푸시하면 재배포되고, 사이트 헤더의 자물쇠 아이콘으로 5번에서 만든 계정으로 로그인해 메모를 남길 수 있습니다.

로그아웃하려면 자물쇠(열림) 아이콘을 다시 눌러 확인하면 됩니다.

**참고 / 한계**
- `firebaseConfig`의 값들(apiKey 등)은 비밀값이 아니라 공개 식별자라서 사이트 코드에 그대로 있어도 안전합니다. 실제 쓰기 권한은 3번의 Firestore 규칙과 5번의 로그인 계정으로 통제됩니다.
- 무료(Spark) 요금제 기준 하루 약 5만 회 읽기 / 2만 회 쓰기까지 무료라 가족 여행 메모 용도로는 충분합니다.
- 로그인 세션은 브라우저에 저장되어 다음 방문 때도 유지되며, 다른 기기/브라우저에서는 각자 다시 로그인해야 합니다.
