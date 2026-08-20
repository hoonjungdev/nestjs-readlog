# 독서 기록 프론트엔드

백엔드(`reading-records` API)를 눈으로 확인하기 위한 Svelte + Vite 프론트엔드입니다.
빌드 도구 없이 컴포넌트 하나로 시작하는 가장 단순한 구성이며(SvelteKit 아님), 목록 조회·생성·상태/별점 수정·삭제를 지원합니다.

## 실행하기

백엔드가 먼저 떠 있어야 합니다 (저장소 루트에서 `pnpm start:dev`, 기본 `http://localhost:3000`).

```bash
pnpm install   # 저장소 루트에서 실행하면 워크스페이스 전체가 함께 설치됩니다
pnpm dev       # frontend/ 안에서 실행, 기본 http://localhost:5173
```

## 환경 변수

`.env.example`을 복사해 `.env`를 만듭니다.

```bash
cp .env.example .env
```

- `VITE_API_BASE_URL`: 백엔드 주소. 기본값은 `http://localhost:3000`.

## 구조

- `src/lib/types.ts` — 백엔드 응답 모양을 손으로 맞춰 적은 타입. `prisma/schema.prisma`의 `ReadingStatus`가 바뀌면 함께 고쳐야 합니다.
- `src/lib/api.ts` — 백엔드 REST API를 호출하는 fetch 래퍼.
- `src/lib/CreateRecordForm.svelte`, `src/lib/ReadingRecordRow.svelte` — 각각 생성 폼, 목록의 행(수정/삭제) 컴포넌트.
- `src/App.svelte` — 위 컴포넌트들을 조합하는 최상위 화면.
