import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { dataSourceOptions } from './data-source';
import { ReadingRecordsModule } from './reading-records/reading-records.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      // DB 접속 설정은 data-source.ts 한 곳에만 둔다.
      // 앱과 TypeORM CLI가 같은 설정을 보게 하기 위해서다.
      ...dataSourceOptions,
      // 앱이 시작할 때 아직 실행되지 않은 마이그레이션을 자동으로 실행한다.
      // 개발과 테스트에서는 편하지만, 운영에서는 배포 과정에서 따로 실행하는 편이 안전하다.
      migrationsRun: true,
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
