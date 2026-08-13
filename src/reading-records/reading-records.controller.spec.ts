import { Test, TestingModule } from '@nestjs/testing';
import { ReadingRecordsController } from './reading-records.controller';
import { ReadingRecordsService } from './reading-records.service';

describe('ReadingRecordsController', () => {
  let controller: ReadingRecordsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReadingRecordsController],
      providers: [
        {
          // 컨트롤러만 확인하는 테스트라 진짜 서비스(=DB 연결)가 필요 없다.
          // 자리만 채우는 가짜 객체를 주입한다.
          provide: ReadingRecordsService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<ReadingRecordsController>(ReadingRecordsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
