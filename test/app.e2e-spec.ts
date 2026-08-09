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
      });

    await request(app.getHttpServer())
      .get('/reading-records')
      .expect(200)
      .expect([
        {
          id: 1,
          title: '클린 코드',
          author: '로버트 C. 마틴',
        },
      ]);
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
      });
  });

  it('/reading-records/:id (GET) returns 404 when not found', () => {
    return request(app.getHttpServer()).get('/reading-records/999').expect(404);
  });

  it('/reading-records/:id (GET) returns 400 for an invalid id', () => {
    return request(app.getHttpServer()).get('/reading-records/abc').expect(400);
  });

  afterEach(async () => {
    await app.close();
  });
});
