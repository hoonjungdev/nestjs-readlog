// .env 파일의 값을 process.env로 읽어들인다. 반드시 다른 import보다 먼저다.
// (AppModule을 먼저 불러오면 PrismaService가 만들어지는 시점에 DATABASE_URL이 비어 있다.)
// Prisma 6까지는 Prisma가 .env를 알아서 읽어줬지만 7부터는 직접 해야 한다.
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // 전역 ValidationPipe는 AppModule에 APP_PIPE로 등록되어 있다.
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
