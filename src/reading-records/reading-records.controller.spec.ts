import { Test, TestingModule } from '@nestjs/testing';
import { ReadingRecordsController } from './reading-records.controller';
import { ReadingRecordsService } from './reading-records.service';

describe('ReadingRecordsController', () => {
  let controller: ReadingRecordsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReadingRecordsController],
      providers: [ReadingRecordsService],
    }).compile();

    controller = module.get<ReadingRecordsController>(ReadingRecordsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
