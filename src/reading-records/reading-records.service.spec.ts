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

  describe('update', () => {
    it('updates only the given fields and keeps the rest unchanged', () => {
      const createdRecord = service.create({
        title: '클린 코드',
        author: '로버트 C. 마틴',
      });

      const updatedRecord = service.update(createdRecord.id, {
        author: 'Robert C. Martin',
      });

      expect(updatedRecord.title).toBe('클린 코드');
      expect(updatedRecord.author).toBe('Robert C. Martin');
    });

    it('throws NotFoundException when the record does not exist', () => {
      expect(() => service.update(999, { title: '없는 책' })).toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('removes the record so it can no longer be found', () => {
      const createdRecord = service.create({
        title: '클린 코드',
        author: '로버트 C. 마틴',
      });

      service.remove(createdRecord.id);

      expect(() => service.findOne(createdRecord.id)).toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when the record does not exist', () => {
      expect(() => service.remove(999)).toThrow(NotFoundException);
    });
  });
});
