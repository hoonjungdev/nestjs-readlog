import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { dataSourceOptions, isInMemoryDatabase } from './data-source';
import { ReadingRecordsModule } from './reading-records/reading-records.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      // DB 접속 설정은 data-source.ts 한 곳에만 둔다.
      // 앱과 TypeORM CLI가 같은 설정을 보게 하기 위해서다.
      ...dataSourceOptions,
      // 앱이 시작할 때 아직 실행되지 않은 마이그레이션을 자동으로 실행할지 여부.
      //
      // 메모리 DB(테스트)에서만 켠다. 테스트는 앱이 뜰 때마다 빈 DB를 새로 받으므로
      // 자동 실행이 없으면 테이블 자체가 없다.
      //
      // 파일 DB(개발/운영)에서는 끈다. 앱이 여러 개 떠 있으면 각자 재시작하면서
      // 같은 마이그레이션을 중복 실행하는데, TypeORM은 이력 테이블만 보고 판단하므로
      // 거의 동시에 시작하면 둘 다 "아직 안 돌았다"고 오판한다.
      // 이번 단계에서 실제로 겪었다 — 이력에 같은 마이그레이션이 두 번 기록됐고,
      // SQLite의 컬럼 추가는 "테이블 재생성 + 복사"라 중복 실행되면 새 컬럼 값이 날아간다.
      // 파일 DB에는 `pnpm migration:run`으로 직접 실행한다.
      migrationsRun: isInMemoryDatabase,
    }),
    ReadingRecordsModule,
  ],
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
