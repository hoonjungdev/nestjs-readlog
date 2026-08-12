import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ReadingRecordsModule } from './reading-records/reading-records.module';

@Module({
  imports: [ReadingRecordsModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      // 전역 ValidationPipe를 모듈에 등록한다.
      // main.ts의 useGlobalPipes()에 두면 main.ts를 실행하지 않는 e2e 테스트에는
      // 검증이 걸리지 않아 테스트 환경과 실제 환경이 갈라진다.
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    },
  ],
})
export class AppModule {}
