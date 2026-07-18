# travelrepo

가족 여행 일정을 모아보는 정적 웹사이트입니다. 여러 개의 여행을 목록에서 탐색하고, 각 여행의 일자별 일정과 상세 정보를 확인할 수 있습니다. 일정 카드마다 메모를 남길 수 있고, 사이트 열람에는 구글 로그인이 필요합니다.

## 구조

```
index.html               여행 목록(첫 화면)
assets/trips-data.js     여행 목록에 표시되는 메타데이터 (제목, 기간, 링크 등)
assets/site.js           목록 페이지 렌더링/필터 로직
assets/firebase-config.js   Firebase 프로젝트 연결 정보
assets/auth.js           사이트 열람용 구글 로그인 게이트 + 로그인 상태/관리자 판별 (모든 페이지 공용)
assets/notes.js          메모 모달 열기/저장/조회 로직 (모든 여행 상세 페이지 공용)
assets/itinerary.js      일정 카드 렌더링 + 추가/수정/삭제 로직 (모든 여행 상세 페이지 공용)
trips/kobe-arima-2026.html      고베-아리마 여행 상세 페이지
trips/kobe-arima-2026-data.js   고베-아리마 여행의 초기 일정 데이터 (Firestore 시드값)
trips/TEMPLATE.html      새 여행 추가 시 복사해서 쓰는 템플릿
trips/TEMPLATE-data.js   새 여행의 초기 일정 데이터 템플릿
.github/workflows/pages.yml  GitHub Pages 자동 배포 워크플로우
```

## 새 여행 추가하는 법

1. `trips/TEMPLATE.html`을 `trips/새여행id.html`로 복사합니다.
2. `trips/TEMPLATE-data.js`를 `trips/새여행id-data.js`로 복사하고, `새여행id.html` 맨 아래 `<script>` 태그의 파일명도 함께 바꿔줍니다.
3. 헤더 문구, 일차 탭 개수, 상세 정보(항공편/숙소 등) 내용을 채웁니다. (일정 카드 자체는 HTML을 직접 안 건드려도 됩니다 — 아래 "일정 카드 추가/수정/삭제" 참고)
4. `assets/trips-data.js`의 `TRIPS` 배열에 새 여행 항목을 추가합니다.

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

5. `<body data-trip-id="...">` 값을 4번에서 정한 `id`와 동일하게 맞춥니다 (일정/메모가 여행별로 구분되어 저장되는 기준입니다).
6. `main` 브랜치에 푸시하면 GitHub Pages가 자동으로 재배포합니다.

목록 페이지는 오늘 날짜를 기준으로 각 여행을 예정(D-day) / 진행중 / 완료 상태로 자동 분류합니다.

## 배포 (GitHub Pages)

이 저장소는 `.github/workflows/pages.yml`을 통해 `main` 브랜치에 푸시될 때마다 GitHub Pages로 자동 배포되도록 구성되어 있습니다.

최초 1회 설정이 필요합니다:

1. GitHub 저장소 **Settings → Pages**로 이동합니다.
2. **Build and deployment → Source**를 **GitHub Actions**로 선택합니다.
3. 이 브랜치를 `main`에 머지(또는 push)하면 워크플로우가 실행되고, 완료 후 `https://<계정명>.github.io/travelrepo/` 주소로 외부에서 접속할 수 있습니다.

별도 서버 운영 없이 정적 파일만으로 동작하며, 외부망에서도 위 URL로 항상 접근 가능합니다.

## 사이트 열람 (구글 로그인 게이트)

사이트의 모든 페이지는 처음 들어오면 **구글 계정 로그인**을 요구합니다. **이메일 제한은 없어서 구글 계정만 있으면 누구나 로그인해서 열람할 수 있습니다.** 로그인은 브라우저에 유지되어 다음 방문 때는 다시 로그인할 필요가 없습니다.

**중요한 한계**: 이건 정적 사이트에서 구현 가능한 수준의 가림막입니다. 로그인 여부와 무관하게 페이지의 HTML 자체는 이미 브라우저에 내려가 있는 상태라, 개발자도구(F12)나 페이지 소스 보기로는 로그인 없이도 내용을 볼 수 있습니다. "링크만 안다고 바로 들어오지는 못하게" 하는 캐주얼한 방어 수준이며, 진짜 비공개가 필요하면 저장소를 비공개로 돌리고 유료 GitHub Pages(Pro)를 쓰는 방법을 고려해야 합니다.

## 일정 메모 기능 (Firebase)

각 일정 카드의 "메모" 버튼은 무료 DB인 **Firebase(Firestore + Authentication)**를 사용합니다. 사이트 열람용 구글 로그인과 같은 로그인 세션을 공유합니다.

- **읽기**: 로그인한 사람이면 누구나 메모를 볼 수 있습니다. 여러 기기에서 실시간으로 반영됩니다.
- **쓰기**: 로그인한 계정이 관리자 목록(`setario87@gmail.com`, `hd3311@gmail.com`)에 포함된 경우에만 메모를 새로 쓰거나 수정할 수 있습니다. 그 외 계정은 읽기 전용으로 보입니다.

### 최초 1회 설정

1. **[console.firebase.google.com](https://console.firebase.google.com)** 접속 → 구글 계정으로 로그인 → **프로젝트 만들기**
2. 왼쪽 메뉴에서 **데이터베이스 및 스토리지 → Firestore Database → 데이터베이스 만들기** → 위치는 `asia-northeast3 (Seoul)` 권장 → 생성 (보안 규칙은 일단 아무 값이나 선택하고 진행, 3번에서 교체합니다)
3. Firestore 화면의 **규칙(Rules)** 탭을 열고 아래 규칙으로 교체 후 **게시(Publish)**:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /notes/{tripId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null
                       && request.auth.token.email in [
                            'setario87@gmail.com',
                            'hd3311@gmail.com'
                          ];
       }
       match /itineraries/{tripId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null
                       && request.auth.token.email in [
                            'setario87@gmail.com',
                            'hd3311@gmail.com'
                          ];
       }
     }
   }
   ```

   (읽기는 로그인한 사람 전체 허용, 쓰기는 관리자 이메일 2개만 허용 — 실제 접근 제어는 여기서 이루어집니다. `notes`는 메모, `itineraries`는 일정 카드 데이터입니다.)

4. 왼쪽 메뉴에서 **보안 → Authentication → 시작하기 → Sign-in method** 탭 → **Google** 사용 설정
5. 같은 화면(Authentication) → **Settings 탭 → Authorized domains** → **도메인 추가** → `nohsanghoo.github.io` 입력하고 추가 (이 목록에 없는 도메인에서는 구글 로그인 팝업이 차단되어 실패합니다)
6. 왼쪽 상단 **⚙️ → 프로젝트 설정** → 맨 아래 **내 앱 → `</>`(웹 앱 추가)** → 아무 닉네임으로 등록 → 나오는 `firebaseConfig` 객체를 복사 (Analytics를 함께 켰다면 `measurementId`도 포함됩니다)
7. 이 저장소의 `assets/firebase-config.js`를 열어 복사한 값을 그대로 채워넣습니다.

   ```js
   const firebaseConfig = {
       apiKey: "...",
       authDomain: "...",
       projectId: "...",
       storageBucket: "...",
       messagingSenderId: "...",
       appId: "...",
       measurementId: "..."
   };
   ```

8. 커밋 후 `main`에 푸시하면 재배포되고, 사이트에 들어가면 바로 구글 로그인 화면이 뜹니다. `setario87@gmail.com` 또는 `hd3311@gmail.com`으로 로그인하면 메모 편집까지 가능하고, 그 외 계정은 열람만 가능합니다.

로그아웃하려면 헤더의 자물쇠(열림) 아이콘을 눌러 확인하면 됩니다.

**참고 / 한계**
- `firebaseConfig`의 값들(apiKey 등)은 비밀값이 아니라 공개 식별자라서 사이트 코드에 그대로 있어도 안전합니다. 실제 쓰기 권한은 3번의 Firestore 규칙(허용 이메일 검사)이 서버 쪽에서 최종적으로 통제합니다.
- 관리자 계정을 추가/변경하려면 `assets/auth.js`의 `ADMIN_EMAILS` 배열과 Firestore 규칙의 이메일 목록을 **둘 다** 같이 바꿔야 합니다 (하나만 바꾸면 어긋납니다).
- 무료(Spark) 요금제 기준 하루 약 5만 회 읽기 / 2만 회 쓰기까지 무료라 가족 여행 메모 용도로는 충분합니다.

## 일정 카드 추가/수정/삭제 (Firebase)

각 일차 탭의 일정 카드도 메모와 같은 방식(Firestore, `itineraries` 컬렉션)으로 저장됩니다.

- **읽기**: 로그인한 사람이면 누구나 볼 수 있습니다.
- **쓰기**: 관리자 이메일(`setario87@gmail.com`, `hd3311@gmail.com`)로 로그인한 경우, 각 일차 탭 하단에 "카드 추가" 버튼이 보이고, 카드마다 편집(연필)/삭제(휴지통) 아이콘이 함께 보입니다.
- 카드 추가/편집 시 입력하는 값: **종류**(아이콘·색상이 자동으로 정해지는 프리셋 — 항공/이동/차량/식사/숙소/관광/쇼핑/온천/술집/기타), **시간**, **제목**, **설명**(선택, URL 링크 자동 인식), **지도 검색어**(선택, 입력하면 카드에 "위치" 버튼이 생겨 구글 지도로 연결됩니다).
- 관리자가 그 여행 페이지에 처음 로그인하면, `trips/여행id-data.js`에 있는 초기 데이터가 Firestore로 자동 저장되고, 이후부터는 Firestore 쪽 데이터가 화면에 표시되는 기준이 됩니다 (그 전까지 방문자에게는 초기 데이터가 그대로 보입니다).
- 일차(1일차/2일차 등) 자체를 추가/삭제하는 기능은 아직 없습니다 — 일차를 늘리거나 줄이려면 HTML의 tab 버튼/`-items` div와 `-data.js`의 해당 키를 함께 수정해야 합니다.

## Google Analytics(GA4) 로그인 이벤트

로그인에 성공할 때마다 GA4로 `login` 이벤트가 전송되어, Firebase 콘솔이나 연결된 GA4 속성에서 누가 언제 접속했는지 확인할 수 있습니다.

- 개인정보 보호를 위해 **이메일 전체가 아니라 `@` 앞부분만** (`setario87@gmail.com` → `setario87`) `user_prefix` 파라미터로 전송하고, 같은 값을 GA4 사용자 ID로도 설정합니다.
- 이메일 원문은 GA4로 전송되지 않습니다 (구글 애널리틱스 약관상 개인식별정보 전송이 금지되어 있어, 이를 피하기 위한 조치입니다).
