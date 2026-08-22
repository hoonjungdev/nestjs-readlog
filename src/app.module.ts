import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ReadingRecordsModule } from './reading-records/reading-records.module';

@Module({
  // TypeOrmModule.forRoot(...)가 있던 자리다.
  // Prisma에는 "루트에서 DB 연결을 설정하는 모듈"이라는 개념이 없다.
  // 접속 정보는 PrismaService가 DATABASE_URL에서 직접 읽고,
  // DB가 필요한 기능 모듈이 각자 PrismaModule을 import한다.
  // 그래서 AppModule은 DB에 대해 아무것도 알 필요가 없어졌다.
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
        // 쿼리 파라미터(page, limit)의 @Type(() => Number) 변환 결과가
        // 컨트롤러까지 전달되게 하려는 의도를 명시한 것이다.
        //
        // 사실 이 옵션이 없어도 지금은 변환이 된다. ValidationPipe는 transform이
        // 꺼져 있어도 validatorOptions의 키가 1개보다 많으면 classToPlain(entity)를
        // 반환하는데, 생성자가 forbidUnknownValues를 항상 끼워 넣기 때문에
        // whitelist 하나만 있어도 이 조건이 성립한다.
        // 하지만 그건 Nest 내부의 휴리스틱이지 우리가 기대는 계약이 아니다.
        // 의도를 코드로 남겨서 그 우연에 의존하지 않는다.
        transform: true,
      }),
    },
  ],
})
export class AppModule {}
