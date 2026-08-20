// .env 파일의 값을 process.env로 읽어들인다. 반드시 다른 import보다 먼저다.
// (AppModule을 먼저 불러오면 PrismaService가 만들어지는 시점에 DATABASE_URL이 비어 있다.)
// Prisma 6까지는 Prisma가 .env를 알아서 읽어줬지만 7부터는 직접 해야 한다.
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // 전역 ValidationPipe는 AppModule에 APP_PIPE로 등록되어 있다.
  const app = await NestFactory.create(AppModule);

  // 브라우저는 "다른 origin(프로토콜+호스트+포트)"으로의 요청을 기본적으로 막는다.
  // 프론트엔드는 http://localhost:5173(Vite 개발 서버), 백엔드는 http://localhost:3000이라
  // 포트가 다르므로 서로 다른 origin이다 — 서버가 명시적으로 허용해야 브라우저가 응답을 통과시킨다.
  // ValidationPipe와 달리 CORS는 실제 브라우저가 보내는 요청에만 적용되는 HTTP 계층의 정책이라
  // (supertest로 보내는 e2e 테스트에는 영향이 없다) AppModule이 아니라 main.ts에 둔다.
  app.enableCors({ origin: 'http://localhost:5173' });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
