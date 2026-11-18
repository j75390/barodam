<p align="center"><img src="docs/images/title.svg" alt="바로담 마켓" width="85%"></p>

국내 오픈마켓의 화면 구성과 쇼핑 흐름을 직접 분석해, 상품 탐색부터 주문·취소·적립금·리뷰까지 실제로 동작하도록 만든 종합 쇼핑몰입니다. 같은 서비스 안에 고객센터와 채용 사이트도 있습니다.

**https://barodam.kro.kr** · 고객센터 [/help](https://barodam.kro.kr/help) · 채용 [/careers](https://barodam.kro.kr/careers)

![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6%20strict-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white)
![Unit tests](https://img.shields.io/badge/unit%20tests-28%20passed-brightgreen)
![Server checks](https://img.shields.io/badge/server%20checks-20%20passed-brightgreen)
![Deploy](https://github.com/j75390/barodam/actions/workflows/deploy.yml/badge.svg)

<img src="docs/images/demo.gif" width="85%" alt="홈 → 검색 → 상품 → 주문서 → 주문 완료 → 주문 상세 → 마이페이지">

> 개인 포트폴리오 프로젝트입니다. 상품·브랜드·가격은 직접 만든 데이터이고 실제 판매·결제는 일어나지 않습니다.
> 회원·주문·리뷰·문의·채용 지원은 실제 서버(Supabase)에 저장되어 어느 기기에서나 같은 계정으로 이어집니다.

## 목차
1. [프로젝트 소개](#1-프로젝트-소개)
2. [주요 기능](#2-주요-기능)
3. [서비스 화면](#3-서비스-화면)
4. [기술 스택](#4-기술-스택)
5. [시스템 아키텍처](#5-시스템-아키텍처)
6. [ERD와 테이블 명세](#6-erd와-테이블-명세)
7. [서버 함수 명세](#7-서버-함수-명세)
8. [보안 설계: 금액은 서버가 다시 계산한다](#8-보안-설계-금액은-서버가-다시-계산한다)
9. [주문 상태와 금액 규칙](#9-주문-상태와-금액-규칙)
10. [테스트 결과](#10-테스트-결과)
11. [트러블슈팅](#11-트러블슈팅)
12. [향후 개선 계획](#12-향후-개선-계획)
13. [실행 방법](#13-실행-방법)

---

## 1. 프로젝트 소개

### 1.1 프로젝트 소개

바로담 마켓은 패션·신발·가방·디지털·리빙·뷰티·식품 7개 카테고리의 상품 536개, 브랜드 32개를 다루는 종합 쇼핑몰입니다.

- 홈에서 기획전 배너, 자정까지 카운트다운하는 오늘의 특가, 실시간 랭킹, 브랜드 위크, 카테고리별 추천을 봅니다.
- 검색은 자동완성과 최근·인기 검색어를 지원하고, 결과는 배송·혜택·브랜드·색상·가격으로 거르고 6가지 기준으로 정렬합니다. 필터 상태는 주소에 남아 그대로 공유할 수 있습니다.
- 상품 상세에서 옵션을 고르고, 오후 2시 마감 기준 도착 예정일과 판매처별 가격을 비교하고, 상품평과 상품 문의를 봅니다.
- 회원은 쿠폰과 적립금을 써서 주문하고, 시간이 지나며 결제완료 → 상품준비중 → 배송중 → 배송완료로 바뀌는 주문을 조회·취소·구매확정합니다. 비회원도 주문번호와 주문 비밀번호로 주문합니다.
- 고객센터(`/help`)와 채용 사이트(`/careers`)는 상단 바와 디자인이 다른 별도 사이트처럼 동작합니다.

### 1.2 프로젝트 배경

- 쇼핑몰 포트폴리오는 대부분 상품 목록과 장바구니에서 끝납니다. 실제 서비스의 어려움은 그 뒤, **돈이 오가는 흐름**(쿠폰 조건, 적립금 사용과 환원, 취소 가능 시점, 비회원 주문)에 있다고 보고 이 부분을 끝까지 구현하는 것을 목표로 했습니다.
- 쿠팡·지마켓·무신사의 화면을 직접 열어 화면 단위로 구성을 비교하고(상품 상세 탭 구성, 검색 필터, 로그인의 회원/비회원 탭, 고객센터와 채용 사이트의 구조), 같은 수준의 구성을 직접 만들었습니다. 글·사진·코드는 가져오지 않았습니다.
- 처음에는 바닐라 JS 단일 파일(약 300KB)로 시작했습니다. 기능이 늘면서 한 곳을 고치면 다른 곳이 깨지는 일이 잦아져, **React + TypeScript로 다시 설계**하고 저장소를 브라우저에서 **Supabase(PostgreSQL)** 로 옮겼습니다.

### 1.3 주요 구현 포인트

#### 금액이 걸린 변경은 서버 함수만 할 수 있다
적립금·쿠폰·주문 테이블에는 클라이언트가 직접 쓸 수 없습니다. 주문은 `place_order` 같은 PostgreSQL 함수가 받아 상품 금액 합계, 쿠폰 소유·만료·최소 금액, 적립금 잔액을 다시 검사한 뒤에만 저장합니다. 브라우저 코드를 고쳐 적립금을 늘리거나 금액을 바꾸는 시도는 서버가 거절하며, 이를 [서버 규칙 점검 20항목](#102-서버-규칙-점검-20항목)으로 확인합니다.

#### 저장소를 갈아 끼울 수 있는 `Backend` 인터페이스
화면은 `Backend` 인터페이스(가입, 주문, 리뷰 등 31개 메서드)만 사용합니다. 배포 버전은 Supabase 구현을, 단위 테스트와 오프라인 개발은 브라우저 저장소 구현을 씁니다. Supabase를 붙일 때 화면 코드는 고치지 않았습니다.

#### 시간에 따라 진행되는 주문 상태 머신
주문 상태는 저장된 값이 아니라 결제 시각으로부터 계산합니다(0분 결제완료 · 1분 상품준비중 · 3분 배송중 · 10분 배송완료). 같은 규칙이 TypeScript(`domain/orderState.ts`)와 SQL(`_order_step`)에 있어, 화면이 보여 주는 상태와 서버가 취소·구매확정을 허락하는 상태가 항상 같습니다.

#### 사진 1장 = 상품 1개, 결정론적 상품 데이터
상품 ID는 사진 파일 번호이고, 가격·할인율·옵션·재고·별점은 ID를 시드로 한 난수로 만듭니다. 사진을 추가해도 기존 상품의 ID와 가격이 바뀌지 않고, 어느 기기에서 열어도 같은 상품은 같은 값입니다.

#### 정적 호스팅에서도 깨끗한 주소와 링크 미리보기
GitHub Pages는 서버 라우팅이 없어서, 빌드 후 단계에서 상품 536개를 포함한 634개 경로마다 제목·설명·대표 사진(Open Graph)이 들어간 HTML을 만듭니다. `/products/25` 같은 주소가 바로 열리고, 공유하면 상품 사진과 이름이 미리보기로 나옵니다.

#### 별도 사이트처럼 동작하는 고객센터와 채용 사이트
같은 앱 안에서 레이아웃을 통째로 바꿔, 고객센터는 FAQ 카테고리·검색·공지를, 채용 사이트는 공고 목록·지원서 작성(임시 저장·미리보기)·지원 현황 조회·취소를 제공합니다. 채용 지원서도 서버에 저장됩니다.

---

## 2. 주요 기능

### 이용 흐름

```mermaid
flowchart LR
    A["홈<br/>특가 · 랭킹"] --> B["검색 · 카테고리<br/>필터 · 정렬"]
    B --> C["상품 상세<br/>옵션 · 도착일"]
    C --> D["장바구니"]
    C --> E["주문서<br/>쿠폰 · 적립금"]
    D --> E
    E --> F["결제완료"]
    F --> G["상품준비중"]
    G --> H["배송중"]
    H --> I["배송완료"]
    I --> J["구매확정<br/>적립금 적립"]
    J --> K["상품평 작성<br/>+500원"]
    F -.->|배송 전까지| X["주문 취소<br/>쿠폰·적립금 환원"]
    G -.-> X
```

<details>
<summary><b>1. 홈과 탐색</b></summary>

기획전 배너 4개, 자정까지 남은 시간이 줄어드는 오늘의 특가, 카테고리별로 바꿔 보는 실시간 랭킹, 브랜드 위크, 카테고리별 HOT 키워드와 추천 상품이 나옵니다. 상단의 카테고리 버튼은 메가 메뉴를 엽니다.

<img src="docs/images/home.jpg" width="96%">
</details>

<details>
<summary><b>2. 검색과 필터</b></summary>

검색창은 입력하는 동안 브랜드와 상품을 추천하고, 최근 검색어와 인기 검색어를 보여 줍니다. 결과 화면에서는 내일 도착·무료배송·별점·할인율, 세부 카테고리, 브랜드, 색상, 가격대로 거를 수 있고 항목마다 해당 상품 수가 표시됩니다. 필터와 정렬은 모두 주소(`?q=패딩&brand=...`)에 남습니다.

<img src="docs/images/search.jpg" width="96%">
</details>

<details>
<summary><b>3. 상품 상세</b></summary>

썸네일 갤러리와 확대, 색상·사이즈 옵션(품절 사이즈 표시), 오후 2시 마감 기준 도착 예정일, 판매처별 가격 비교, 신규가입 쿠폰 적용가를 보여 줍니다. 아래로 내리면 상품상세·상품평·상품문의·배송/교환 탭이 화면 위에 고정되고, 지금 보고 있는 구역이 탭에 표시됩니다. 상품평은 별점 분포, 별점 필터, 정렬, 검색을 지원합니다.

<img src="docs/images/product.jpg" width="96%">
</details>

<details>
<summary><b>4. 회원가입과 로그인</b></summary>

아이디 중복 확인, 비밀번호 규칙(영문+숫자 8~20자) 실시간 표시, 약관 전체 동의를 거쳐 가입하면 쿠폰 3장과 적립금(3,000원, 마케팅 동의 시 2,000원 추가)이 바로 지급됩니다. 로그인 화면은 회원/비회원 탭으로 나뉘고, 비회원 탭에서 주문번호와 주문 비밀번호로 주문을 조회합니다. 아이디 찾기, 비밀번호 재설정, 회원 탈퇴를 지원합니다.

<img src="docs/images/signup-welcome.jpg" width="96%">
</details>

<details>
<summary><b>5. 주문과 결제</b></summary>

배송지(기본 배송지 관리), 배송 요청사항, 쿠폰(조건을 만족하는 쿠폰만 선택 가능), 적립금(1,000원 이상 10원 단위), 결제 수단(카드·바로페이·무통장·휴대폰)을 고르면 오른쪽 결제 금액이 바로 다시 계산됩니다. 무통장 입금을 고르면 가상계좌가 발급됩니다. 결제는 데모입니다.

<img src="docs/images/checkout.jpg" width="96%">
</details>

<details>
<summary><b>6. 주문 조회, 취소, 구매확정</b></summary>

주문 상세는 진행 단계, 배송 조회 기록, 배송지, 결제 정보를 보여 줍니다. 배송이 시작되기 전까지 취소할 수 있고, 취소하면 쓴 쿠폰과 적립금이 돌아옵니다. 배송이 끝나면 구매확정으로 적립금(1%, 바로페이 1.5%)을 받고 상품평을 쓸 수 있습니다.

<img src="docs/images/order-detail.jpg" width="96%">
</details>

<details>
<summary><b>7. 마이페이지</b></summary>

주문·배송, 취소 내역, 찜, 최근 본 상품, 쿠폰(코드 등록 포함), 적립금 내역, 나의 리뷰, 1:1 문의, 배송지 관리, 회원정보·비밀번호 변경, 회원 탈퇴를 제공합니다. 회원 등급(일반·실버·골드)과 다음 등급까지 남은 금액이 표시됩니다.

<img src="docs/images/mypage.jpg" width="96%">
</details>

<details>
<summary><b>8. 고객센터</b></summary>

전역 상단 바, 카테고리 패널, 스크롤하면 고정되는 검색 헤더를 가진 별도 레이아웃입니다. FAQ는 8개 카테고리와 검색을 지원하고, 공지사항과 상담 안내가 있습니다.

<img src="docs/images/help.jpg" width="96%">
</details>

<details>
<summary><b>9. 채용 사이트</b></summary>

공고 10개를 직군과 검색어로 거르고, 마감일(D-day)을 보여 줍니다. 지원서는 파일 첨부, 작성 중 자동 임시 저장, 미리보기, 동의 항목을 거쳐 서버에 제출되고, 이메일과 지원번호로 현황을 조회하거나 서류 검토 전까지 취소할 수 있습니다. 조직문화 소개(Culture Deck), 구성원 이야기, FAQ와 1:1 문의가 있습니다.

<img src="docs/images/careers-apply.jpg" width="96%">
</details>

---

## 3. 서비스 화면

### 홈과 상품
<img src="docs/images/home.jpg" width="49%"> <img src="docs/images/product.jpg" width="49%">

### 검색, 랭킹, 브랜드
<img src="docs/images/search.jpg" width="32%"> <img src="docs/images/ranking.jpg" width="32%"> <img src="docs/images/brand.jpg" width="32%">

### 회원가입과 로그인
<img src="docs/images/signup.jpg" width="32%"> <img src="docs/images/signup-welcome.jpg" width="32%"> <img src="docs/images/login.jpg" width="32%">

### 주문
<img src="docs/images/checkout.jpg" width="32%"> <img src="docs/images/order-complete.jpg" width="32%"> <img src="docs/images/order-detail.jpg" width="32%">

### 마이페이지
<img src="docs/images/mypage.jpg" width="32%"> <img src="docs/images/mypage-coupons.jpg" width="32%"> <img src="docs/images/mypage-points.jpg" width="32%">

### 고객센터와 채용 사이트
<img src="docs/images/help.jpg" width="32%"> <img src="docs/images/careers.jpg" width="32%"> <img src="docs/images/careers-job.jpg" width="32%">

### 모바일
하단 탭 바, 화면 아래에 고정된 구매 버튼, 가로로 넘기는 카테고리 등 휴대폰 화면을 따로 설계했습니다. 375px 폭에서 주요 화면이 가로로 넘치지 않는지 확인했습니다.

<img src="docs/images/mobile.jpg" width="85%">

---

## 4. 기술 스택

### 프론트엔드
<img src="https://img.shields.io/badge/React--18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black"> <img src="https://img.shields.io/badge/TypeScript--5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white"> <img src="https://img.shields.io/badge/React%20Router--6.30-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white"> <img src="https://img.shields.io/badge/Vite--5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white">

### 백엔드
<img src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white"> <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white"> <img src="https://img.shields.io/badge/Row%20Level%20Security-333333?style=for-the-badge">

### 테스트·배포
<img src="https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white"> <img src="https://img.shields.io/badge/Testing%20Library-E33332?style=for-the-badge&logo=testinglibrary&logoColor=white"> <img src="https://img.shields.io/badge/GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white"> <img src="https://img.shields.io/badge/GitHub%20Pages-222222?style=for-the-badge&logo=githubpages&logoColor=white">

| 선택 | 이유 |
|---|---|
| React + TypeScript (strict) | 30여 개 화면과 주문·쿠폰 같은 도메인 타입을 컴파일 단계에서 맞춰 보기 위해 |
| 상태 관리 라이브러리 없이 `useSyncExternalStore` | 장바구니·찜·로그인 상태 정도라 작은 스토어로 충분하고, 의존성을 줄이기 위해 |
| Supabase | PostgreSQL을 그대로 쓰면서 인증·RLS·함수를 한곳에서 관리할 수 있어서. 주문처럼 관계가 분명한 데이터에 맞음 |
| 금액 로직을 SQL 함수로 | 클라이언트는 언제든 조작될 수 있으므로, 검증과 저장을 한 트랜잭션 안에서 처리하기 위해 |
| GitHub Pages + 사전 생성 HTML | 서버 없이도 깨끗한 주소, 200 응답, 링크 미리보기를 얻기 위해 |

---

## 5. 시스템 아키텍처

```mermaid
flowchart TB
    subgraph Browser["브라우저 (React SPA)"]
        P["pages/<br/>홈 · 상품 · 주문 · 마이페이지<br/>help/ · careers/"]
        S["state/<br/>장바구니 · 찜 · 토스트·다이얼로그"]
        D["domain/<br/>주문 상태 · 가격 · 쿠폰 · 배송일<br/>(순수 함수, 단위 테스트)"]
        B["services/Backend 인터페이스"]
        P --> S
        P --> D
        P --> B
        B --> SB["supabaseBackend.ts<br/>(배포)"]
        B --> LB["localBackend.ts<br/>(오프라인 개발 · 테스트)"]
    end
    SB -->|"HTTPS · anon key + 사용자 JWT"| API
    subgraph Supabase["Supabase (서울 리전)"]
        API["PostgREST API"] --> RLS{"Row Level Security"}
        RLS --> T[("테이블<br/>profiles · orders · coupons …")]
        API --> F["SQL 함수 (SECURITY DEFINER)<br/>place_order · cancel_order …"]
        F --> T
        AUTH["Supabase Auth"] -->|가입 트리거| F
    end
    GH["GitHub Actions<br/>타입 검사 → 테스트 → 빌드 → 경로별 HTML 생성"] --> PAGES["GitHub Pages<br/>barodam.kro.kr"]
    PAGES --> Browser
```

### 폴더 구조

```
src/
  types.ts              도메인 타입 (Product, Order, Coupon, User …)
  domain/               순수 비즈니스 로직 — 주문 상태, 가격·쿠폰·적립금, 배송 예정일, 리뷰 키워드
  data/                 상품 카탈로그(사진 1장 = 상품 1개), 브랜드 로고, 고객센터·채용 콘텐츠
  services/
    backend.ts          화면이 쓰는 Backend 인터페이스
    supabaseBackend.ts  Supabase 구현
    localBackend.ts     브라우저 저장소 구현
    careers.ts          채용 지원 서비스
  state/                장바구니·찜 스토어, 로그인 사용자, 토스트·다이얼로그
  components/           헤더·메가 메뉴, 푸터, 상품 카드, 장바구니 서랍, 주문 공통 UI
  pages/                홈, 상품, 검색, 랭킹, 브랜드, auth/, order/, mypage/, help/, careers/
  styles/               영역별 CSS
supabase/schema.sql     테이블 · RLS 정책 · 트리거 · SQL 함수
tools/
  spa-fallback.mjs      빌드 후 경로별 HTML(제목·Open Graph) 생성
  server-check.mjs      서버 규칙 점검 20항목
  build_photos.py       사진 목록 생성과 중복 사진 검사
```

---

## 6. ERD와 테이블 명세

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : "가입 트리거"
    PROFILES ||--o{ POINT_LOGS : "적립금 내역"
    PROFILES ||--o{ COUPONS : "보유 쿠폰"
    PROFILES ||--o{ ADDRESSES : "배송지"
    PROFILES ||--o{ ORDERS : "회원 주문"
    PROFILES ||--o{ REVIEWS : "상품평"
    PROFILES ||--o{ INQUIRIES : "문의"
    ORDERS ||--o{ REVIEWS : "주문 상품별 1개"

    PROFILES {
        uuid id PK "auth.users.id"
        text login_id UK "영문 소문자 시작 4~16자"
        text email UK "연락용 이메일"
        int points "0 이상"
        int_array recent "최근 본 상품"
        text_array used_codes "등록한 쿠폰 코드"
    }
    ORDERS {
        text no PK "YYMMDD-7자리"
        uuid uid FK "비회원이면 NULL"
        bigint at "결제 시각"
        jsonb body "상품 · 금액 · 결제 · 배송지"
        bigint cancelled_at
        bigint confirmed_at
        text guest_pw "bcrypt, 비회원만"
    }
    COUPONS {
        uuid id PK
        text type "rate · won · ship"
        int val
        int min "최소 주문 금액"
        int max "정률 최대 할인"
        text cat "카테고리 전용"
        bigint used "사용 시각"
    }
    POINT_LOGS {
        bigint id PK
        int amt "+적립 / -사용"
        text why
        int bal "변경 후 잔액"
    }
    REVIEWS {
        uuid id PK
        text oid "주문번호"
        int k "주문 내 상품 순번"
        int pid "상품 ID"
        int star "1~5"
    }
    APPLICATIONS {
        text no PK "BD + 8자리"
        text job_id
        text email
        jsonb body "지원서"
        bigint cancelled_at
    }
```

| 테이블 | 용도 | 주요 제약 |
|---|---|---|
| `profiles` | 회원 정보, 적립금 잔액, 최근 본 상품 | `login_id`·`email` 유니크, `points >= 0`, 아이디 형식 CHECK |
| `point_logs` | 적립금 변동 원장 (사유와 변경 후 잔액) | 함수로만 기록 |
| `coupons` | 회원별 쿠폰 | 종류 CHECK(`rate`/`won`/`ship`), 30일 만료 |
| `addresses` | 배송지 | 본인만 조회·추가·수정·삭제 |
| `orders` | 회원·비회원 주문 | 회원 주문이면 `guest_pw`가 없고, 비회원 주문이면 반드시 있음(CHECK) |
| `reviews` | 상품평 (누구나 조회) | `(oid, k)` 유니크 — 주문 상품당 1개, 별점 1~5 |
| `inquiries` | 상품·주문 문의 (누구나 조회) | 본인만 삭제 |
| `applications` | 채용 지원서 | 같은 공고에 같은 이메일로 중복 지원 불가 |
| `recruit_inquiries` | 채용 1:1 문의 | 함수로만 기록, 아무도 조회 불가 |

시각은 화면 타입과 맞추기 위해 모두 epoch 밀리초(`bigint`)로 저장합니다.

---

## 7. 서버 함수 명세

클라이언트는 아래 함수를 `supabase.rpc()`로 부릅니다. 모두 `SECURITY DEFINER`로 실행되고, 함수 안에서 `auth.uid()`로 본인 여부를 확인합니다.

| 함수 | 호출 | 하는 일과 검사 |
|---|---|---|
| `handle_new_user` (트리거) | 가입 시 자동 | 프로필 생성, 쿠폰 3장 발급, 가입 적립금(+마케팅 동의 적립금) |
| `is_id_taken` · `is_email_taken` | 누구나 | 아이디·이메일 중복 확인 (예약어 admin 등 포함) |
| `find_login_id` | 누구나 | 이름+이메일이 맞으면 가린 아이디(`tes****`)만 반환 |
| `verify_reset` · `reset_password` | 누구나 | 아이디+이메일 확인 후 비밀번호를 bcrypt로 변경, 규칙 재검사 |
| `update_profile` | 회원 | 이메일 중복 재검사 후 회원정보 변경 |
| `register_coupon` | 회원 | 코드 확인, 같은 코드 재등록 차단, 쿠폰 발급 |
| `place_order` | 회원 | 상품 금액 합계·배송비·쿠폰(소유, 미사용, 만료, 최소 금액, 할인 상한)·적립금 잔액 검사 → 주문 저장, 쿠폰 사용 처리, 적립금 차감을 한 트랜잭션으로 |
| `cancel_order` | 회원 | 배송 시작 전인지 확인 → 취소, 쿠폰·적립금 환원 |
| `confirm_order` | 회원 | 배송완료인지 확인 → 구매확정, 적립금 적립 |
| `write_review` | 회원 | 본인 주문·배송 완료·주문 상품당 1회 확인 → 상품평 저장, 500원 적립 |
| `ask` | 회원 | 문의 저장 (작성자 아이디는 가려서 저장) |
| `set_recent` | 회원 | 최근 본 상품 40개 저장 |
| `delete_account` | 회원 | 계정 삭제 (모든 데이터 연쇄 삭제) |
| `place_guest_order` · `lookup_guest_order` · `cancel_guest_order` | 누구나 | 비회원 주문 저장(주문 비밀번호 bcrypt), 비밀번호가 맞을 때만 조회·취소 |
| `submit_application` · `lookup_application` · `cancel_application` | 누구나 | 채용 지원 저장(중복 지원 차단), 이메일+지원번호가 맞을 때만 조회, 1시간 안에만 취소 |

---

## 8. 보안 설계: 금액은 서버가 다시 계산한다

### 누가 무엇을 할 수 있나 (Row Level Security)

| 테이블 | 비로그인 | 회원 본인 | 다른 회원 |
|---|---|---|---|
| `profiles` · `coupons` · `point_logs` · `orders` | ✗ | 읽기만 | ✗ |
| `addresses` | ✗ | 읽기·쓰기 | ✗ |
| `reviews` · `inquiries` | 읽기 | 읽기·삭제 | 읽기 |
| `applications` · `recruit_inquiries` | 함수로만 | 함수로만 | 함수로만 |

적립금이나 쿠폰을 바꾸는 `INSERT`·`UPDATE` 권한은 어떤 역할에도 주지 않았습니다. 바꾸는 길은 7장의 함수뿐입니다.

### 주문 한 건이 저장되기까지

```mermaid
sequenceDiagram
    participant C as 브라우저
    participant F as place_order (PostgreSQL)
    participant DB as 테이블
    C->>F: 상품 · 쿠폰 ID · 할인액 · 사용 적립금 · 결제 정보
    F->>DB: 회원 행 잠금 (SELECT … FOR UPDATE)
    F->>F: 상품 금액 합계 = sub 인가? 배송비가 0 또는 3,000인가?
    F->>DB: 쿠폰이 본인 것 · 미사용 · 미만료인가? (잠금)
    F->>F: 최소 주문 금액 · 할인 상한을 넘지 않는가?
    F->>F: 사용 적립금 ≤ 잔액인가?
    F->>F: 결제 금액 · 적립 예정액을 서버에서 계산
    F->>DB: 주문 저장 · 쿠폰 사용 처리 · 적립금 차감 (한 트랜잭션)
    F-->>C: 저장된 주문 (서버가 계산한 금액)
```

검사 중 하나라도 실패하면 예외가 발생해 트랜잭션 전체가 취소되고, 사용자에게는 "쓸 수 없는 쿠폰이에요." 같은 한국어 안내가 그대로 전달됩니다. 회원 행을 잠그기 때문에 같은 회원이 동시에 두 번 주문해도 적립금이 두 번 빠지지 않습니다.

> 한계: 상품 단가는 아직 앱 안에서 생성되므로, 서버는 상품 금액의 **합계 일관성**까지만 검사하고 단가 자체는 검증하지 않습니다. 상품을 서버 테이블로 옮기는 것이 다음 단계입니다([12장](#12-향후-개선-계획) 6번).

### 그 밖의 처리
- 회원 비밀번호는 Supabase Auth가, 비회원 주문 비밀번호는 `pgcrypto`의 bcrypt로 해시해 저장합니다.
- 로그인 후 돌아갈 주소(`?next=`)는 같은 사이트 경로만 허용해 오픈 리다이렉트를 막습니다(`//evil.example`, `/\evil.example` 차단).
- "로그인 상태 유지"를 끄면 세션을 `sessionStorage`에 두어 브라우저를 닫으면 로그아웃됩니다.

---

## 9. 주문 상태와 금액 규칙

### 주문 상태

```mermaid
stateDiagram-v2
    [*] --> 결제완료
    결제완료 --> 상품준비중: 1분
    상품준비중 --> 배송중: 3분
    배송중 --> 배송완료: 10분
    배송완료 --> 구매확정: 회원이 확정 (적립금 지급)
    결제완료 --> 주문취소: 취소
    상품준비중 --> 주문취소: 취소
    주문취소 --> [*]
    구매확정 --> [*]
```

실제 배송은 며칠이 걸리지만, 한 자리에서 전체 흐름을 확인할 수 있도록 분 단위로 줄였습니다. 상태는 저장하지 않고 결제 시각으로 계산하므로 상태를 바꾸는 배치 작업이 필요 없습니다.

### 금액 규칙

| 항목 | 규칙 |
|---|---|
| 배송비 | 19,800원 이상이거나 모든 상품이 무료배송이면 0원, 아니면 3,000원 |
| 정률 쿠폰 | 대상 금액 × 비율을 10원 단위로 내림, 최대 할인액까지 |
| 정액 쿠폰 | 쿠폰 금액과 대상 금액 중 작은 값 |
| 배송비 쿠폰 | 배송비만큼 |
| 카테고리 쿠폰 | 해당 카테고리 상품이 있어야 쓰고, 그 상품 금액에만 적용 |
| 적립금 사용 | 1,000원 이상, 10원 단위, 잔액과 결제 금액 이내 |
| 구매 적립 | 결제 금액의 1% (바로페이 1.5%), 구매확정 시 지급 |
| 상품평 적립 | 500원 |
| 회원 등급 | 누적 구매 30만 원 실버, 100만 원 골드 |
| 도착 예정일 | 빠른 배송 상품은 오후 2시 전 주문 시 다음 날, 이후 이틀 뒤. 그 외 상품은 3일 뒤 |

---

## 10. 테스트 결과

### 10.1 단위 테스트 28개 (Vitest)

```
✓ src/domain/domain.test.ts         (9)  주문 상태 진행 · 취소 가능 시점 · 배송 조회 기록
                                         배송비 · 정률 쿠폰 상한과 10원 내림 · 쿠폰 조건 · 적립금 범위 · 회원 등급
✓ src/services/localBackend.test.ts (6)  가입 혜택 · 중복 아이디/이메일 · 5회 실패 잠금
                                         쿠폰·적립금 사용과 취소 환원 · 비회원 주문 비밀번호 · 쿠폰 코드 1회 등록
✓ src/data/products.test.ts         (6)  사진 번호 → 상품 ID · 같은 사진은 같은 상품 · 할인가 일관성
                                         품절 사이즈 규칙 · 상품 ID·사진 중복 없음
✓ src/lib/routing.test.ts           (7)  옛 주소(#/p/105) → 새 주소 · 오픈 리다이렉트 차단 · 전화번호 형식 · 비밀번호 규칙

Tests  28 passed (28)
```

GitHub Actions가 푸시할 때마다 타입 검사 → 단위 테스트 → 빌드를 돌리고, 하나라도 실패하면 배포하지 않습니다.

### 10.2 서버 규칙 점검 20항목

`node tools/server-check.mjs`는 실제 Supabase에 임시 회원을 만들어 정상 흐름과 공격 시도를 차례로 보내고, 끝나면 계정을 지웁니다.

```
✓ 가입하면 바로 로그인된다
✓ 가입 적립금 3,000 + 마케팅 동의 2,000 = 5,000원
✓ 가입 쿠폰 3장이 발급된다
✓ 같은 아이디는 다시 쓸 수 없다
✓ 쿠폰·적립금 주문 금액 = 17,060 − 2,550 − 5,000 + 3,000
✓ 이미 쓴 쿠폰은 다시 쓸 수 없다
✓ 주문 취소 시 적립금이 돌아온다
✓ 주문 취소 시 쿠폰이 돌아온다
✓ 가진 것보다 많은 적립금은 쓸 수 없다
✓ 상품 금액을 조작한 주문은 거절된다
✓ 쿠폰 없이 할인 금액만 넣으면 거절된다
✓ 적립금을 테이블에서 직접 고칠 수 없다
✓ 쿠폰을 직접 만들 수 없다
✓ 로그인하지 않으면 회원 정보를 읽을 수 없다
✓ 로그인하지 않으면 주문을 볼 수 없다
✓ 로그인하지 않으면 회원 주문 함수를 부를 수 없다
✓ 같은 쿠폰 코드는 한 번만 등록된다
✓ 비회원 주문은 주문 비밀번호가 틀리면 조회되지 않는다
✓ 비회원 주문은 맞는 비밀번호로 취소된다
✓ 탈퇴하면 계정과 데이터가 지워진다

20/20 passed
```

### 10.3 화면 점검
- 가입 → 상품 선택 → 쿠폰·적립금 주문 → 주문 상세 → 취소(쿠폰·적립금 환원), 로그아웃 → 재로그인, 새로고침 후 로그인 유지, 채용 지원 → 조회 → 취소를 배포된 사이트에서 직접 진행했습니다.
- 375px 폭에서 주요 20개 화면이 가로로 넘치지 않는지 스크립트로 확인했습니다.

---

## 11. 트러블슈팅

<details>
<summary><b>1. 사진을 추가할 때마다 상품 ID와 가격이 바뀜</b></summary>

- **문제**: 상품 목록을 만든 순서대로 ID를 붙였더니, 사진을 중간에 추가하면 뒤쪽 상품의 ID가 밀려 공유한 링크와 장바구니가 다른 상품을 가리켰습니다.
- **해결**: 사진 파일 번호(`p025.jpg` → 25)를 ID로 고정하고, 가격·옵션은 ID를 시드로 한 난수로 만들었습니다. 이 성질은 단위 테스트("같은 사진은 같은 상품")로 지킵니다.
</details>

<details>
<summary><b>2. 중복 사진 검사가 정상 사진까지 지움</b></summary>

- **문제**: 비슷한 사진을 걸러 내려고 지각 해시(dHash)를 썼더니, 단색 배경의 생성 사진들이 서로 비슷하다고 판단되어 대량으로 빠졌습니다.
- **원인**: dHash는 밝기 변화만 보기 때문에 배경이 같으면 피사체가 달라도 거리가 가깝게 나옵니다.
- **해결**: 생성 사진끼리는 파일 해시(md5)로 완전히 같은 것만 거르고, dHash는 배경이 다양한 CC0 사진에만 적용했습니다.
</details>

<details>
<summary><b>3. 페이지 전환 시 "destroy is not a function"으로 화면이 멈춤</b></summary>

- **문제**: 일부 브라우저 환경에서 페이지를 바꿀 때 화면 전체가 하얗게 멈췄습니다.
- **원인**: `useEffect(() => window.scrollTo(0, 0))`처럼 화살표 함수가 값을 돌려주면 React는 그 값을 정리 함수로 부릅니다. `scrollTo`가 함수가 아닌 값을 돌려주는 환경에서 이 호출이 실패했습니다.
- **해결**: effect는 항상 중괄호 본문으로 쓰도록 고치고, 화면별 `ErrorBoundary`를 둬 한 화면의 오류가 사이트 전체를 멈추지 않게 했습니다.
</details>

<details>
<summary><b>4. 가입 직후 환영 화면 대신 다른 화면으로 넘어감</b></summary>

- **문제**: 가입하자마자 "이미 로그인했으면 이동" 처리가 먼저 실행되어 쿠폰 안내 화면이 보이지 않았습니다.
- **원인**: 로그인 상태는 `useSyncExternalStore`로 즉시 다시 렌더링되는데, "가입 중" 표시는 `useState`라 다음 렌더링에야 반영됐습니다.
- **해결**: 가입 중 표시를 렌더링과 무관하게 즉시 바뀌는 `useRef`로 옮겼습니다.
</details>

<details>
<summary><b>5. 새로고침하면 로그인한 회원이 로그인 화면으로 이동</b></summary>

- **문제**: Supabase로 옮긴 뒤 `/mypage`에서 새로고침하면 로그인 화면으로 이동할 수 있었습니다.
- **원인**: 저장된 세션을 복원하고 회원 정보를 불러오는 작업은 비동기인데, 그 전에 첫 화면이 "로그인 안 됨"으로 그려집니다.
- **해결**: `Backend.ready` 약속을 두고, 세션 복원이 끝난 뒤(최대 4초) 앱을 그리도록 했습니다.
</details>

<details>
<summary><b>6. 최근 본 상품이 서버에 저장되지 않음</b></summary>

- **문제**: 마이페이지의 최근 본 상품이 비어 있었습니다. README용 화면을 캡처하다 발견했습니다.
- **원인**: supabase-js의 요청 객체는 `then`이 호출될 때 비로소 전송되는 지연 실행 방식인데, 결과를 기다리지 않으려고 `void sb.rpc(...)`로 버려서 요청이 아예 나가지 않았습니다.
- **해결**: `.then()`으로 결과를 받아 실패 시 기록하도록 고쳤고, 같은 패턴이 남아 있지 않은지 전체를 확인했습니다.
</details>

<details>
<summary><b>7. GitHub Pages에서 상품 주소를 직접 열면 404</b></summary>

- **문제**: `/products/25`를 새 탭에서 열면 GitHub Pages가 404를 돌려줬고, 링크 미리보기에도 사이트 기본 정보만 나왔습니다.
- **해결**: 빌드 후 `tools/spa-fallback.mjs`가 634개 경로마다 제목과 Open Graph 태그를 넣은 `index.html`을 만들고, 나머지 경로는 `404.html`로 앱을 띄웁니다. 예전 주소(`#/p/105`)는 앱이 시작할 때 새 주소로 바꿉니다.
</details>

<details>
<summary><b>8. 휴대폰에서 홈 화면이 옆으로 넘침</b></summary>

- **문제**: 375px 폭에서 홈 화면에 가로 스크롤이 생겼습니다.
- **원인**: 그리드 안의 브랜드 카드가 기본값 `min-width: auto` 때문에 내용 폭 아래로 줄어들지 않았습니다.
- **해결**: 그리드 칸을 `minmax(0, 1fr)`로, 자식을 `min-width: 0`으로 바꿨습니다.
</details>

---

## 12. 향후 개선 계획

1. **결제 연동** — 토스페이먼츠 테스트 결제를 붙여 실제 결제창과 승인 과정을 처리합니다.
2. **관리자 화면** — 주문 상태 변경, 문의 답변, 채용 지원서 검토를 위한 관리자 역할과 RLS 정책을 추가합니다.
3. **비밀번호 재설정 강화** — 지금은 아이디+이메일 확인 방식입니다. 이메일 인증 링크 방식으로 바꿉니다.
4. **지원서 파일 저장** — 채용 지원서 첨부 파일을 Supabase Storage에 저장합니다(지금은 파일 이름과 크기만 저장).
5. **재고 관리** — 주문 시 재고를 차감하고, 동시에 같은 재고를 사는 경우를 처리합니다.
6. **상품 데이터 서버 이전** — 지금은 상품을 앱 안에서 생성합니다. 상품 테이블로 옮겨 서버가 상품 가격 자체를 검증하게 합니다.

---

## 13. 실행 방법

```bash
npm install
npm run dev                      # http://localhost:5173 (배포와 같은 Supabase 사용)
VITE_BACKEND=local npm run dev   # 서버 없이 브라우저 저장소로 실행
npm test                         # 단위 테스트 28개
node tools/server-check.mjs      # 서버 규칙 점검 20항목
npm run build                    # dist/ 생성 (경로별 HTML 포함)
```

데이터베이스를 새로 만들 때는 Supabase SQL Editor에서 `supabase/schema.sql`을 실행하고, Authentication 설정에서 "Confirm email"을 끕니다(아이디로 가입하는 방식).

## 사진 출처
- `public/img/gen/` — 이미지 생성 모델로 만든 상품 사진 243장
- `public/img/cc/`, `public/img/careers/` — Openverse의 CC0(퍼블릭 도메인) 사진, 출처는 [CREDITS.md](CREDITS.md)
