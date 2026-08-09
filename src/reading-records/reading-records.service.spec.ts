import { Test, TestingModule } from '@nestjs/testing';
import { ReadingRecordsService } from './reading-records.service';
import { NotFoundException } from '@nestjs/common';

describe('ReadingRecordsService', () => {
  let service: ReadingRecordsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReadingRecordsService],
    }).compile();

    service = module.get<ReadingRecordsService>(ReadingRecordsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('returns a reading record with the given id', () => {
      const createdRecord = service.create({
        title: '클린 코드',
        author: '로버트 C. 마틴',
      });

      const foundRecord = service.findOne(createdRecord.id);

      expect(foundRecord).toEqual(createdRecord);
    });

    it('throws NotFoundException when the record does not exist', () => {
      expect(() => service.findOne(999)).toThrow(NotFoundException);
    });
  });
});
