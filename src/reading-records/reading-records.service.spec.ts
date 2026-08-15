import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { dataSourceOptions } from '../data-source';
import { ReadingRecord } from './reading-record.entity';
import { ReadingRecordsService } from './reading-records.service';
import { UpdateReadingRecordDto } from './dto/update-reading-record.dto';
import { ReadingStatus } from './reading-status.enum';

describe('ReadingRecordsService', () => {
  let module: TestingModule;
  let service: ReadingRecordsService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          // 앱이 쓰는 설정을 그대로 가져온다. 여기에 DB 설정을 따로 적으면
          // 앱과 테스트가 서로 다른 스키마를 보게 된다.
          // 예전에는 synchronize: true로 엔티티에서 테이블을 만들었는데,
          // 그러면 마이그레이션이 잘못돼 있어도 이 테스트는 통과해버렸다.
          ...dataSourceOptions,
          // 메모리에만 존재하는 DB를 쓴다. 테스트마다 새로 만들어지므로
          // 이전 테스트가 남긴 데이터가 다음 테스트에 영향을 주지 않는다.
          // 여기서 못을 박아두지 않으면 실수로 개발용 파일 DB에 테스트가 붙는다.
          database: ':memory:',
          // 빈 메모리 DB라 테이블이 없다. 마이그레이션이 만들어야 한다.
          migrationsRun: true,
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

  describe('create', () => {
    it('starts as want_to_read with no rating when they are not given', async () => {
      const createdRecord = await service.create({
        title: '클린 코드',
        author: '로버트 C. 마틴',
      });

      // 반환값이 그대로 응답이 되므로 여기에 기본값이 채워져 있어야 한다.
      // DB에만 들어가고 반환값이 비어 있으면 클라이언트는 status를 못 받는다.
      expect(createdRecord.status).toBe(ReadingStatus.WantToRead);
      expect(createdRecord.rating).toBeNull();

      const reloadedRecord = await service.findOne(createdRecord.id);

      expect(reloadedRecord.status).toBe(ReadingStatus.WantToRead);
      expect(reloadedRecord.rating).toBeNull();
    });

    it('stores the given status and rating', async () => {
      const createdRecord = await service.create({
        title: '클린 코드',
        author: '로버트 C. 마틴',
        status: ReadingStatus.Finished,
        rating: 5,
      });

      expect(createdRecord.status).toBe(ReadingStatus.Finished);
      expect(createdRecord.rating).toBe(5);

      const reloadedRecord = await service.findOne(createdRecord.id);

      expect(reloadedRecord.status).toBe(ReadingStatus.Finished);
      expect(reloadedRecord.rating).toBe(5);
    });
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

    it('changes the status', async () => {
      const createdRecord = await service.create({
        title: '클린 코드',
        author: '로버트 C. 마틴',
      });

      const returnedRecord = await service.update(createdRecord.id, {
        status: ReadingStatus.Reading,
      });

      expect(returnedRecord.status).toBe(ReadingStatus.Reading);

      const reloadedRecord = await service.findOne(createdRecord.id);

      expect(reloadedRecord.status).toBe(ReadingStatus.Reading);
    });

    // undefined와 null이 서로 다른 뜻이라는 것을 못박는 두 테스트.
    // 이 둘이 함께 있어야 "안 보냄"과 "지워라"가 구분된다는 주장이 성립한다.
    it('keeps the rating when it is not included in the request', async () => {
      const createdRecord = await service.create({
        title: '클린 코드',
        author: '로버트 C. 마틴',
        rating: 5,
      });

      // rating 없이 다른 필드만 보낸다 (= undefined)
      const returnedRecord = await service.update(createdRecord.id, {
        status: ReadingStatus.Finished,
      });

      expect(returnedRecord.rating).toBe(5);

      const reloadedRecord = await service.findOne(createdRecord.id);

      expect(reloadedRecord.rating).toBe(5);
    });

    it('clears the rating when null is sent explicitly', async () => {
      const createdRecord = await service.create({
        title: '클린 코드',
        author: '로버트 C. 마틴',
        rating: 5,
      });

      // null을 명시적으로 보낸다 (= 지워라)
      const returnedRecord = await service.update(createdRecord.id, {
        rating: null,
      });

      expect(returnedRecord.rating).toBeNull();

      // save()가 undefined를 UPDATE에서 제외한다는 건 이미 알고 있다.
      // null도 그렇게 무시된다면 DB에는 5가 그대로 남는다. 그래서 반드시 다시 꺼내 본다.
      const reloadedRecord = await service.findOne(createdRecord.id);

      expect(reloadedRecord.rating).toBeNull();
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
