/// <reference types="vite/client" />

// Vite는 import.meta.env의 기본 타입(MODE, DEV 등)만 알고 있다.
// 우리가 .env에 추가한 VITE_ 변수는 여기에 타입을 직접 선언해줘야
// import.meta.env.VITE_API_BASE_URL을 쓸 때 타입 검사가 통과한다.
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
