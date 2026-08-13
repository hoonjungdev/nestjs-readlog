import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReadingRecord } from './reading-record.entity';
import { ReadingRecordsController } from './reading-records.controller';
import { ReadingRecordsService } from './reading-records.service';

@Module({
  // forFeature는 이 모듈 안에서 쓸 저장소(Repository)를 등록한다.
  // 이걸 해야 서비스에서 @InjectRepository(ReadingRecord)를 주입받을 수 있다.
  imports: [TypeOrmModule.forFeature([ReadingRecord])],
  controllers: [ReadingRecordsController],
  providers: [ReadingRecordsService],
})
export class ReadingRecordsModule {}
