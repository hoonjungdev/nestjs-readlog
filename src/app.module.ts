import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ReadingRecord } from './reading-records/reading-record.entity';
import { ReadingRecordsModule } from './reading-records/reading-records.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      // 평소에는 파일 DB를 쓰고, 테스트에서는 DATABASE_PATH로 인메모리 DB를 지정한다.
      // 그래야 테스트가 개발용 데이터를 건드리지 않는다.
      database: process.env.DATABASE_PATH ?? 'readlog.sqlite',
      entities: [ReadingRecord],
      // 엔티티 정의에 맞춰 테이블을 자동으로 만들고 바꾼다.
      // 편리하지만 컬럼을 지우면 데이터도 함께 사라지므로 개발 중에만 쓴다.
      // 이후 단계에서 마이그레이션으로 교체하며 끌 예정이다.
      synchronize: true,
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
