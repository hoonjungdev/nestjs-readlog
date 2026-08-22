import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import {
  resetTestDatabase,
  startTestDatabase,
} from '../../test/postgres-container';
import { ReadingStatus } from '../generated/prisma/client';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateReadingRecordDto } from './dto/update-reading-record.dto';
import { ReadingRecordsService } from './reading-records.service';

describe('ReadingRecordsService', () => {
  let container: StartedPostgreSqlContainer;
  let module: TestingModule;
  let service: ReadingRecordsService;
  let prisma: PrismaService;

  // 예전에는 beforeEach마다 새 메모리 DB를 만들었다. 공짜였기 때문이다.
  // 컨테이너는 띄우는 데 몇 초가 걸리므로 이 파일 전체에서 하나만 쓰고(beforeAll),
  // 테스트 사이의 격리는 데이터를 비우는 방식으로 얻는다(beforeEach).
  beforeAll(async () => {
    container = await startTestDatabase();

    module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [ReadingRecordsService],
    }).compile();

    // compile()은 프로바이더를 만들 뿐이고, init()을 불러야 onModuleInit이 실행된다.
    await module.init();

    service = module.get<ReadingRecordsService>(ReadingRecordsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await resetTestDatabase(prisma);
  });

  afterAll(async () => {
    // 연결을 닫지 않으면 테스트가 끝나도 프로세스가 남는다.
    await module.close();
    await container.stop();
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
      expect(createdRecord.status).toBe(ReadingStatus.want_to_read);
      expect(createdRecord.rating).toBeNull();

      const reloadedRecord = await service.findOne(createdRecord.id);

      expect(reloadedRecord.status).toBe(ReadingStatus.want_to_read);
      expect(reloadedRecord.rating).toBeNull();
    });

    it('stores the given status and rating', async () => {
      const createdRecord = await service.create({
        title: '클린 코드',
        author: '로버트 C. 마틴',
        status: ReadingStatus.finished,
        rating: 5,
      });

      expect(createdRecord.status).toBe(ReadingStatus.finished);
      expect(createdRecord.rating).toBe(5);

      const reloadedRecord = await service.findOne(createdRecord.id);

      expect(reloadedRecord.status).toBe(ReadingStatus.finished);
      expect(reloadedRecord.rating).toBe(5);
    });
  });

  // 응답에 어떤 키가 나가는지를 못박는 테스트.
  //
  // 타입만으로는 이걸 지킬 수 없다. toResponse()를 `return { ...record }`로 바꾸면
  // 모든 컬럼이 응답에 새어 나가는데도 tsc는 오류를 내지 않는다
  // (초과 속성 검사는 객체 리터럴에 직접 적은 속성에만 걸린다).
  // 그래서 "무엇이 공개되는가"라는 약속은 런타임 테스트로 따로 지킨다.
  describe('응답에 나가는 필드', () => {
    it('exposes exactly the fields declared in the response dto', async () => {
      const createdRecord = await service.create({
        title: '클린 코드',
        author: '로버트 C. 마틴',
      });

      expect(Object.keys(createdRecord).sort()).toEqual([
        'author',
        'id',
        'rating',
        'status',
        'title',
      ]);

      // create뿐 아니라 나머지 경로도 같은 모양이어야 한다.
      const foundRecord = await service.findOne(createdRecord.id);
      const updatedRecord = await service.update(createdRecord.id, {
        title: '클린 아키텍처',
      });
      const listed = await service.findAll();

      expect(Object.keys(foundRecord).sort()).toEqual(
        Object.keys(createdRecord).sort(),
      );
      expect(Object.keys(updatedRecord).sort()).toEqual(
        Object.keys(createdRecord).sort(),
      );
      expect(Object.keys(listed.data[0]).sort()).toEqual(
        Object.keys(createdRecord).sort(),
      );
    });
  });

  describe('findAll', () => {
    it('returns default pagination metadata when none is given', async () => {
      await service.create({ title: '책1', author: '저자' });
      await service.create({ title: '책2', author: '저자' });

      const result = await service.findAll();

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('slices the result according to page and limit, while total counts everything', async () => {
      for (let i = 1; i <= 5; i++) {
        await service.create({ title: `책${i}`, author: '저자' });
      }

      const firstPage = await service.findAll({ page: 1, limit: 2 });
      const secondPage = await service.findAll({ page: 2, limit: 2 });

      expect(firstPage.data).toHaveLength(2);
      expect(firstPage.total).toBe(5);
      expect(secondPage.data).toHaveLength(2);
      // 페이지가 다르면 서로 다른 행을 받아야 한다 (같은 행이 중복되면 안 됨).
      expect(firstPage.data[0].id).not.toBe(secondPage.data[0].id);
    });

    it('sorts by the given field and order', async () => {
      await service.create({ title: '나', author: '저자' });
      await service.create({ title: '가', author: '저자' });
      await service.create({ title: '다', author: '저자' });

      const ascending = await service.findAll({ sort: 'title', order: 'asc' });
      const descending = await service.findAll({
        sort: 'title',
        order: 'desc',
      });

      expect(ascending.data.map((record) => record.title)).toEqual([
        '가',
        '나',
        '다',
      ]);
      expect(descending.data.map((record) => record.title)).toEqual([
        '다',
        '나',
        '가',
      ]);
    });

    it('sorts by id ascending by default', async () => {
      await service.create({ title: '나', author: '저자' });
      await service.create({ title: '가', author: '저자' });

      const result = await service.findAll();

      expect(result.data.map((record) => record.title)).toEqual(['나', '가']);
    });

    // rating은 null이 될 수 있는 컬럼이라 정렬 결과가 직관과 다를 수 있다.
    // PostgreSQL은 ORDER BY에서 NULL을 "가장 큰 값"으로 취급하므로
    // DESC로 정렬하면 별점 없는 책이 5점짜리보다 앞에 온다.
    // 지금은 이 동작을 그대로 두되, 무엇이 일어나는지는 못박아 둔다.
    it('puts records without a rating first when sorting by rating desc', async () => {
      await service.create({ title: '별점 있음', author: '저자', rating: 5 });
      await service.create({ title: '별점 없음', author: '저자' });

      const result = await service.findAll({ sort: 'rating', order: 'desc' });

      expect(result.data.map((record) => record.rating)).toEqual([null, 5]);
    });

    it('counts total within the filtered status, not the whole table', async () => {
      await service.create({
        title: '읽는 중',
        author: '저자',
        status: ReadingStatus.reading,
      });
      await service.create({
        title: '다 읽음',
        author: '저자',
        status: ReadingStatus.finished,
      });

      const result = await service.findAll({ status: ReadingStatus.reading });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe(ReadingStatus.reading);
      expect(result.total).toBe(1);
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
        status: ReadingStatus.reading,
      });

      expect(returnedRecord.status).toBe(ReadingStatus.reading);

      const reloadedRecord = await service.findOne(createdRecord.id);

      expect(reloadedRecord.status).toBe(ReadingStatus.reading);
    });

    // undefined와 null이 서로 다른 뜻이라는 것을 못박는 두 테스트.
    // 이제 이 구분은 우리 코드가 아니라 Prisma가 해주지만, 그래도 테스트는 남긴다.
    // 이건 "구현이 이렇게 돼 있다"가 아니라 "API가 이렇게 동작하기로 했다"는 약속이라,
    // 나중에 ORM을 또 바꾸더라도 계속 지켜져야 하기 때문이다.
    it('keeps the rating when it is not included in the request', async () => {
      const createdRecord = await service.create({
        title: '클린 코드',
        author: '로버트 C. 마틴',
        rating: 5,
      });

      // rating 없이 다른 필드만 보낸다 (= undefined)
      const returnedRecord = await service.update(createdRecord.id, {
        status: ReadingStatus.finished,
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

      // 응답만 맞고 DB는 안 바뀌었을 수 있으므로 다시 꺼내 본다.
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
