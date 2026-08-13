import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ReadingRecord } from './reading-record.entity';
import { ReadingRecordsService } from './reading-records.service';
import { UpdateReadingRecordDto } from './dto/update-reading-record.dto';

describe('ReadingRecordsService', () => {
  let module: TestingModule;
  let service: ReadingRecordsService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        // 메모리에만 존재하는 DB를 쓴다. 테스트마다 새로 만들어지므로
        // 이전 테스트가 남긴 데이터가 다음 테스트에 영향을 주지 않는다.
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [ReadingRecord],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([ReadingRecord]),
      ],
      providers: [ReadingRecordsService],
    }).compile();

    service = module.get<ReadingRecordsService>(ReadingRecordsService);
  });

  afterEach(async () => {
    // 연결을 닫지 않으면 테스트가 끝나도 프로세스가 남는다.
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('returns a reading record with the given id', async () => {
      const createdRecord = await service.create({
        title: '클린 코드',
        author: '로버트 C. 마틴',
      });

      const foundRecord = await service.findOne(createdRecord.id);

      expect(foundRecord).toEqual(createdRecord);
    });

    it('throws NotFoundException when the record does not exist', async () => {
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates only the given fields and keeps the rest unchanged', async () => {
      const createdRecord = await service.create({
        title: '클린 코드',
        author: '로버트 C. 마틴',
      });

      // ValidationPipe를 거친 DTO와 동일한 모양을 만든다.
      // 보내지 않은 title은 undefined 값을 가진 채로 남아 있다.
      const updateDto = new UpdateReadingRecordDto();
      updateDto.author = 'Robert C. Martin';

      const returnedRecord = await service.update(createdRecord.id, updateDto);

      // 반환값은 그대로 API 응답이 되므로 반드시 확인해야 한다.
      // save()가 undefined인 속성을 UPDATE에서 제외하기 때문에
      // DB만 확인하면 반환값이 오염된 것을 놓친다.
      expect(returnedRecord.title).toBe('클린 코드');
      expect(returnedRecord.author).toBe('Robert C. Martin');

      // DB에도 제대로 저장됐는지 따로 확인한다.
      const reloadedRecord = await service.findOne(createdRecord.id);

      expect(reloadedRecord.title).toBe('클린 코드');
      expect(reloadedRecord.author).toBe('Robert C. Martin');
    });

    it('keeps every field unchanged when the dto is empty', async () => {
      const createdRecord = await service.create({
        title: '클린 코드',
        author: '로버트 C. 마틴',
      });

      const returnedRecord = await service.update(
        createdRecord.id,
        new UpdateReadingRecordDto(),
      );

      expect(returnedRecord.title).toBe('클린 코드');
      expect(returnedRecord.author).toBe('로버트 C. 마틴');

      const reloadedRecord = await service.findOne(createdRecord.id);

      expect(reloadedRecord.title).toBe('클린 코드');
      expect(reloadedRecord.author).toBe('로버트 C. 마틴');
    });

    it('throws NotFoundException when the record does not exist', async () => {
      await expect(service.update(999, { title: '없는 책' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('removes the record so it can no longer be found', async () => {
      const createdRecord = await service.create({
        title: '클린 코드',
        author: '로버트 C. 마틴',
      });

      await service.remove(createdRecord.id);

      await expect(service.findOne(createdRecord.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when the record does not exist', async () => {
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
