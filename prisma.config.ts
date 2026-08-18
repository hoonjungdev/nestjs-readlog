// Prisma 7부터 CLI 설정은 이 파일에 모인다.
// 예전에는 schema.prisma의 datasource 블록에 url = env("DATABASE_URL")을 적었지만,
// 이제는 접속 URL과 마이그레이션 경로를 여기서 정한다.

// Prisma 7은 .env를 자동으로 읽어주지 않는다. 직접 읽어들여야 한다.
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // env()는 "지금 이 값을 읽어라"가 아니라
    // "실행할 때 이 이름의 환경 변수를 보라"는 뜻이다.
    // 덕분에 테스트에서 DATABASE_URL만 바꿔치기하면 다른 DB를 보게 만들 수 있다.
    url: env('DATABASE_URL'),
  },
});
