import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReadingRecordsController } from './reading-records.controller';
import { ReadingRecordsService } from './reading-records.service';

@Module({
  // TypeOrmModule.forFeature([ReadingRecord]) 자리다.
  // Prisma는 테이블별 등록이라는 개념이 없고, 클라이언트 하나를 통째로 주입받는다.
  // 그래서 PrismaService를 export하는 PrismaModule을 import하기만 하면 된다.
  imports: [PrismaModule],
  controllers: [ReadingRecordsController],
  providers: [ReadingRecordsService],
})
export class ReadingRecordsModule {}
