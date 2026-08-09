import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ReadingRecordsModule } from './reading-records/reading-records.module';

@Module({
  imports: [ReadingRecordsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
