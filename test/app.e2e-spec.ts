import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { resetTestDatabase, startTestDatabase } from './postgres-container';

// 네트워크로 온 JSON에는 타입이 없다. supertest의 response.body는 any라서
// 그대로 .data를 꺼내 쓰면 타입스크립트가 아무것도 검사해주지 못한다
// (eslint의 no-unsafe-member-access가 이걸 막는다).
//
// 그래서 "응답이 이런 모양일 것"을 테스트 쪽에서 따로 선언한다.
// src의 ReadingRecordResponseDto를 import하지 않는 것은 의도적이다.
// e2e가 검증하려는 건 "코드가 스스로와 일치하는가"가 아니라
// "API가 약속한 모양대로 응답하는가"이기 때문이다. 소스의 타입을 그대로
// 가져다 쓰면 응답 모양이 바뀔 때 테스트도 같이 따라가 버려 아무도 못 잡는다.
interface ReadingRecordBody {
  id: number;
  title: string;
  author: string;
  status: string;
  rating: number | null;
}

interface PaginatedBody {
  data: ReadingRecordBody[];
  total: number;
  page: number;
  limit: number;
}

describe('AppController (e2e)', () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // 예전에는 테스트마다 앱을 새로 만들었다. 그때는 앱이 새로 뜰 때마다
  // 빈 메모리 DB가 따라 생겨서, 그게 곧 테스트 격리 수단이었다.
  //
  // 이제 DB는 컨테이너 하나로 고정이고 앱을 새로 만들어도 데이터가 그대로 남는다.
  // 그러니 앱도 한 번만 만들고, 격리는 아래 beforeEach에서 데이터를 비워 얻는다.
  beforeAll(async () => {
    // 반드시 앱을 만들기 전이어야 한다. PrismaService가 만들어지는 순간
    // DATABASE_URL을 읽어가기 때문이다.
    container = await startTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    // 테이블을 비우고 id 카운터도 1로 되돌린다.
    // 아래 테스트들이 "방금 만든 기록의 id는 1"이라고 기대하고 있다.
    await resetTestDatabase(prisma);
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('READLOG API is running!');
  });

  it('/reading-records (GET)', () => {
    // 목록 응답은 배열이 아니라 페이지 정보를 함께 담은 객체다.
    // 기록이 없어도 data만 비고 total/page/limit은 항상 들어 있다.
    return request(app.getHttpServer())
      .get('/reading-records')
      .expect(200)
      .expect({ data: [], total: 0, page: 1, limit: 10 });
  });

  it('/reading-records (POST)', async () => {
    await request(app.getHttpServer())
      .post('/reading-records')
      .send({
        title: '클린 코드',
        author: '로버트 C. 마틴',
      })
      .expect(201)
      .expect({
        id: 1,
        title: '클린 코드',
        author: '로버트 C. 마틴',
        // status와 rating을 보내지 않아도 응답에는 채워져 나와야 한다.
        status: 'want_to_read',
        rating: null,
      });

    await request(app.getHttpServer())
      .get('/reading-records')
      .expect(200)
      .expect({
        data: [
          {
            id: 1,
            title: '클린 코드',
            author: '로버트 C. 마틴',
            status: 'want_to_read',
            rating: null,
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      });
  });

  it('/reading-records (POST) accepts status and rating', async () => {
    await request(app.getHttpServer())
      .post('/reading-records')
      .send({
        title: '클린 코드',
        author: '로버트 C. 마틴',
        status: 'finished',
        rating: 5,
      })
      .expect(201)
      .expect({
        id: 1,
        title: '클린 코드',
        author: '로버트 C. 마틴',
        status: 'finished',
        rating: 5,
      });
  });

  it('/reading-records (POST) returns 400 for an unknown status', () => {
    return request(app.getHttpServer())
      .post('/reading-records')
      .send({
        title: '클린 코드',
        author: '로버트 C. 마틴',
        status: 'abandoned',
      })
      .expect(400);
  });

  it('/reading-records (POST) returns 400 for a rating out of range', () => {
    return request(app.getHttpServer())
      .post('/reading-records')
      .send({
        title: '클린 코드',
        author: '로버트 C. 마틴',
        rating: 6,
      })
      .expect(400);
  });

  // 아래 목록 조회 테스트들이 공통으로 쓰는 준비 작업.
  // status가 섞여 있어야 필터가 실제로 건수를 좁히는지 확인할 수 있다.
  const createRecords = async () => {
    const records = [
      { title: '책1', author: '저자', status: 'reading' },
      { title: '책2', author: '저자', status: 'reading' },
      { title: '책3', author: '저자', status: 'reading' },
      { title: '책4', author: '저자', status: 'finished' },
    ];

    for (const record of records) {
      await request(app.getHttpServer())
        .post('/reading-records')
        .send(record)
        .expect(201);
    }
  };

  // 목록을 조회하고 응답 본문을 위에서 선언한 모양으로 좁혀서 돌려준다.
  const getList = async (query: string): Promise<PaginatedBody> => {
    const response = await request(app.getHttpServer())
      .get(`/reading-records${query}`)
      .expect(200);

    return response.body as PaginatedBody;
  };

  it('/reading-records (GET) filters by status', async () => {
    await createRecords();

    const body = await getList('?status=reading');

    expect(body.data).toHaveLength(3);
    // total은 조건에 맞는 전체 건수다. 전체 테이블 건수(4)가 아니다.
    expect(body.total).toBe(3);
  });

  it('/reading-records (GET) slices the list with page and limit', async () => {
    await createRecords();

    const firstPage = await getList('?page=1&limit=2');

    expect(firstPage.data.map((record) => record.id)).toEqual([1, 2]);
    expect(firstPage.total).toBe(4);

    const secondPage = await getList('?page=2&limit=2');

    expect(secondPage.data.map((record) => record.id)).toEqual([3, 4]);
    // 페이지가 달라져도 total은 전체 건수로 그대로여야 한다.
    expect(secondPage.total).toBe(4);
  });

  // 여기가 e2e로만 확인할 수 있는 부분이다.
  // 단위 테스트는 findAll(status, 2, 2)처럼 숫자를 직접 넘기므로
  // "URL의 문자열 '2'가 숫자 2로 바뀌는가"를 검증하지 못한다.
  //
  // 이 테스트가 지키는 것은 특정 옵션이 아니라 겉으로 보이는 계약이다.
  // DTO에서 @Type(() => Number)를 떼면 여기서 깨진다.
  // (전역 ValidationPipe의 transform: true는 지금 설정에서는 없어도 변환이
  //  되므로, 그것만 떼서는 이 테스트가 깨지지 않는다 — app.module.ts 주석 참고.)
  it('/reading-records (GET) converts page and limit from strings to numbers', async () => {
    await createRecords();

    const body = await getList('?page=2&limit=2');

    // 변환이 안 되면 page가 문자열 "2"로 응답에 그대로 실려 나온다.
    // toBe는 타입까지 구분하므로 "2"는 여기서 걸린다.
    expect(body.page).toBe(2);
    expect(body.limit).toBe(2);
  });

  it('/reading-records (GET) combines the status filter with pagination', async () => {
    await createRecords();

    const body = await getList('?status=reading&page=2&limit=2');

    // reading은 3건이므로 2번째 페이지에는 1건만 남는다.
    expect(body.data).toHaveLength(1);
    expect(body.total).toBe(3);
  });

  it('/reading-records (GET) returns an empty page beyond the last one', async () => {
    await createRecords();

    const body = await getList('?page=99&limit=10');

    // 범위를 넘은 페이지는 오류가 아니라 빈 목록이다. total은 그대로 알려준다.
    expect(body.data).toEqual([]);
    expect(body.total).toBe(4);
  });

  it.each([
    ['status=abandoned', '정해지지 않은 status'],
    ['page=0', '1보다 작은 page'],
    ['page=abc', '숫자가 아닌 page'],
    ['page=1.5', '정수가 아닌 page'],
    ['limit=0', '1보다 작은 limit'],
    ['limit=101', '100을 넘는 limit'],
    ['sort=title', 'DTO에 없는 파라미터'],
  ])('/reading-records?%s (GET) returns 400 — %s', (query) => {
    return request(app.getHttpServer())
      .get(`/reading-records?${query}`)
      .expect(400);
  });

  it('/reading-records/:id (GET) returns a reading record', async () => {
    await request(app.getHttpServer())
      .post('/reading-records')
      .send({
        title: '클린 코드',
        author: '로버트 C. 마틴',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/reading-records/1')
      .expect(200)
      .expect({
        id: 1,
        title: '클린 코드',
        author: '로버트 C. 마틴',
        status: 'want_to_read',
        rating: null,
      });
  });

  it('/reading-records/:id (GET) returns 404 when not found', () => {
    return request(app.getHttpServer()).get('/reading-records/999').expect(404);
  });

  it('/reading-records/:id (GET) returns 400 for an invalid id', () => {
    return request(app.getHttpServer()).get('/reading-records/abc').expect(400);
  });

  it('/reading-records (POST) returns 400 when a required field is missing', () => {
    return request(app.getHttpServer())
      .post('/reading-records')
      .send({ title: '제목만' })
      .expect(400);
  });

  it('/reading-records (POST) returns 400 for an unknown field', () => {
    return request(app.getHttpServer())
      .post('/reading-records')
      .send({
        title: '클린 코드',
        author: '로버트 C. 마틴',
        titel: '오타',
      })
      .expect(400);
  });

  it('/reading-records/:id (PATCH) updates only the given fields', async () => {
    await request(app.getHttpServer())
      .post('/reading-records')
      .send({
        title: '클린 코드',
        author: '로버트 C. 마틴',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch('/reading-records/1')
      .send({ author: 'Robert C. Martin' })
      .expect(200)
      .expect({
        id: 1,
        title: '클린 코드',
        author: 'Robert C. Martin',
        status: 'want_to_read',
        rating: null,
      });
  });

  // HTTP 계약 수준에서 undefined와 null의 차이를 못박는다.
  // 서비스 단위 테스트에서는 DTO 객체로 확인했지만, 실제 클라이언트는 JSON을 보낸다.
  // "필드를 빼고 보낸 요청"과 "null을 담아 보낸 요청"이 여기서 진짜로 구분되는지 본다.
  it('/reading-records/:id (PATCH) keeps the rating when it is not sent', async () => {
    await request(app.getHttpServer())
      .post('/reading-records')
      .send({ title: '클린 코드', author: '로버트 C. 마틴', rating: 5 })
      .expect(201);

    await request(app.getHttpServer())
      .patch('/reading-records/1')
      .send({ status: 'finished' })
      .expect(200)
      .expect({
        id: 1,
        title: '클린 코드',
        author: '로버트 C. 마틴',
        status: 'finished',
        rating: 5,
      });
  });

  it('/reading-records/:id (PATCH) clears the rating when null is sent', async () => {
    await request(app.getHttpServer())
      .post('/reading-records')
      .send({ title: '클린 코드', author: '로버트 C. 마틴', rating: 5 })
      .expect(201);

    await request(app.getHttpServer())
      .patch('/reading-records/1')
      .send({ rating: null })
      .expect(200)
      .expect({
        id: 1,
        title: '클린 코드',
        author: '로버트 C. 마틴',
        status: 'want_to_read',
        rating: null,
      });

    // 응답만 맞고 DB는 안 바뀌었을 수 있으므로 다시 조회해 확인한다.
    await request(app.getHttpServer())
      .get('/reading-records/1')
      .expect(200)
      .expect({
        id: 1,
        title: '클린 코드',
        author: '로버트 C. 마틴',
        status: 'want_to_read',
        rating: null,
      });
  });

  it('/reading-records/:id (PATCH) returns 404 when not found', () => {
    return request(app.getHttpServer())
      .patch('/reading-records/999')
      .send({ author: 'Robert C. Martin' })
      .expect(404);
  });

  it('/reading-records/:id (PATCH) returns 400 for an empty title', async () => {
    await request(app.getHttpServer())
      .post('/reading-records')
      .send({
        title: '클린 코드',
        author: '로버트 C. 마틴',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch('/reading-records/1')
      .send({ title: '' })
      .expect(400);
  });

  it('/reading-records/:id (DELETE) removes the reading record', async () => {
    await request(app.getHttpServer())
      .post('/reading-records')
      .send({
        title: '클린 코드',
        author: '로버트 C. 마틴',
      })
      .expect(201);

    await request(app.getHttpServer()).delete('/reading-records/1').expect(204);

    await request(app.getHttpServer()).get('/reading-records/1').expect(404);
  });

  it('/reading-records/:id (DELETE) returns 404 when not found', () => {
    return request(app.getHttpServer())
      .delete('/reading-records/999')
      .expect(404);
  });

  afterAll(async () => {
    await app.close();
    await container.stop();
  });
});
