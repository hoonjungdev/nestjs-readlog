import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('READLOG API is running!');
  });

  it('/reading-records (GET)', () => {
    return request(app.getHttpServer())
      .get('/reading-records')
      .expect(200)
      .expect([]);
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
      .expect([
        {
          id: 1,
          title: '클린 코드',
          author: '로버트 C. 마틴',
          status: 'want_to_read',
          rating: null,
        },
      ]);
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

  afterEach(async () => {
    await app.close();
  });
});
