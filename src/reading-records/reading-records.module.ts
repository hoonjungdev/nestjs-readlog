import { Module } from '@nestjs/common';
import { ReadingRecordsController } from './reading-records.controller';
import { ReadingRecordsService } from './reading-records.service';

@Module({
  controllers: [ReadingRecordsController],
  providers: [ReadingRecordsService],
})
export class ReadingRecordsModule {}
