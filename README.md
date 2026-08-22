# Readlog API

NestJS를 학습하며 만드는 독서 기록 CRUD API 프로젝트입니다.

단순히 완성된 API를 만드는 것보다 JavaScript와 TypeScript의 기초부터 NestJS의 구조, 데이터베이스, 테스트까지 단계적으로 이해하는 것을 목표로 합니다.

현재 독서 기록 CRUD API와 입력 검증이 구현되어 있고, 데이터는 도커로 띄운 PostgreSQL에 저장됩니다. ORM은 Prisma를 쓰며, 테이블 구조는 마이그레이션(migration)으로 관리합니다.

단계별로 배운 내용은 [학습 노트](./docs/learning/)에 정리하고 있습니다.

## 시작하기

### 요구 사항

- Node.js
- pnpm
- **Docker** — PostgreSQL과 테스트용 DB를 컨테이너로 띄웁니다

SQLite는 파일 하나였지만 PostgreSQL은 **따로 실행되는 서버 프로그램**입니다. 맥에 직접 설치하는 대신 도커로 띄우면 버전과 설정이 `docker-compose.yml`에 남아 다른 컴퓨터에서도 똑같이 재현됩니다.

### 의존성 설치

```bash
pnpm install
```

설치가 끝나면 `prisma generate`가 자동으로 실행되어 `src/generated/prisma`에 Prisma 클라이언트 코드가 만들어집니다. 이 폴더는 스키마에서 만들어지는 결과물이라 Git으로 관리하지 않습니다.

### 환경 변수 준비

```bash
cp .env.example .env
```

`DATABASE_URL` 하나만 있으면 됩니다. 기본값은 아래 `docker-compose.yml`의 설정과 짝이 맞습니다.

```text
postgresql://readlog:readlog@localhost:5432/readlog?schema=public
```

### 데이터베이스 실행

```bash
pnpm db:up      # docker compose up -d --wait
```

`--wait`는 "컨테이너가 떴다"가 아니라 "접속을 받을 준비가 됐다"까지 기다립니다. 이게 없으면 바로 다음 명령이 아직 준비 안 된 DB에 붙어 실패할 수 있습니다.

정지는 `pnpm db:down`입니다. 데이터는 남습니다. 데이터까지 지우려면 `docker compose down -v`를 씁니다.

### 테이블 만들기

테이블은 앱이 알아서 만들어주지 않습니다. 마이그레이션을 직접 실행해야 합니다.

```bash
pnpm migrate:deploy
```

이 단계를 건너뛰면 서버는 정상적으로 뜨지만 API를 호출할 때 `500 Internal server error`가 돌아옵니다. 응답만 봐서는 원인을 알 수 없고, 서버를 실행한 터미널에 찍힌 `relation "reading_records" does not exist`를 봐야 알 수 있습니다. 오류의 진짜 원인은 응답이 아니라 서버 로그에 있는 경우가 많습니다.

### 개발 서버 실행

```bash
pnpm start:dev
```

서버가 실행되면 새 터미널에서 다음 요청을 보냅니다.

```bash
curl http://localhost:3000
```

아래 응답이 나오면 기본 애플리케이션이 정상적으로 실행된 것입니다.

```text
READLOG API is running!
```

개발 서버는 파일 변경을 감지해 자동으로 다시 실행됩니다. 종료할 때는 서버를 실행한 터미널에서 `Ctrl+C`를 누릅니다.

개발 서버는 **하나만** 띄웁니다. 여러 개가 떠 있으면 파일을 저장할 때마다 각각 재시작하면서 3000번 포트를 두고 다툽니다.

## 기본 명령어

| 명령어 | 역할 |
| --- | --- |
| `pnpm db:up` | PostgreSQL 컨테이너 실행 (준비될 때까지 대기) |
| `pnpm db:down` | PostgreSQL 컨테이너 정지 (데이터는 유지) |
| `pnpm start:dev` | 개발 서버를 감시 모드로 실행 |
| `pnpm build` | TypeScript 코드를 배포용 JavaScript로 빌드 |
| `pnpm lint` | 코드 규칙 검사 및 자동 수정 |
| `pnpm test` | 단위 테스트 실행 |
| `pnpm test:e2e` | 실제 HTTP 요청에 가까운 e2e 테스트 실행 |
| `pnpm studio` | 브라우저로 DB 내용을 보고 고치는 Prisma Studio 실행 |

## 마이그레이션 명령어

스키마를 바꿀 때 쓰는 명령어입니다. 모두 `prisma.config.ts`의 설정(스키마 위치, `DATABASE_URL`)을 기준으로 동작합니다.

| 명령어 | 역할 |
| --- | --- |
| `pnpm migrate:dev` | `schema.prisma`를 바꾼 뒤 실행. 차이를 SQL 파일로 만들고 **바로 적용**까지 함 |
| `pnpm migrate:deploy` | 이미 만들어진 마이그레이션 중 아직 실행되지 않은 것을 적용 |
| `pnpm migrate:status` | 어떤 마이그레이션이 적용됐는지 확인 |
| `pnpm migrate:reset` | DB를 통째로 비우고 처음부터 다시 적용 (**데이터가 전부 사라집니다**) |
| `pnpm prisma:generate` | 스키마를 보고 타입스크립트 클라이언트 코드를 다시 생성 |

작업 순서는 이렇습니다.

1. `prisma/schema.prisma`를 고친다.
2. `pnpm migrate:dev --name 이름` 을 실행한다.
3. `prisma/migrations/<타임스탬프>_이름/migration.sql` 이 생기고, 곧바로 DB에 적용된다.
4. 클라이언트 코드도 함께 다시 생성되므로 타입이 바로 따라온다.

TypeORM과 달라진 점 두 가지입니다.

- 새 마이그레이션을 **어딘가에 등록할 필요가 없습니다.** TypeORM에서는 `data-source.ts`의 `migrations` 배열에 클래스를 손으로 추가해야 했지만, Prisma는 `prisma/migrations` 폴더를 이름순으로 읽습니다.
- 마이그레이션이 TypeScript 클래스가 아니라 **순수 SQL 파일**입니다. 되돌리는 `down()`이 없어서, 잘못 적용했으면 되돌리는 마이그레이션을 새로 만들거나 `migrate:reset`으로 처음부터 다시 쌓아야 합니다.

## 요청 흐름

### 가장 단순한 흐름 — `GET /`

```text
src/main.ts
  → AppModule
  → AppController.getHello()
  → AppService.getHello()
  → "READLOG API is running!"
```

- `main.ts`: NestJS 애플리케이션을 생성하고 3000번 포트에서 실행합니다.
- `app.module.ts`: 기능 모듈과 DB 연결, 전역 `ValidationPipe`를 등록하는 루트 모듈입니다.
- `app.controller.ts`: HTTP 요청을 받아 적절한 서비스 메서드를 호출합니다.
- `app.service.ts`: 컨트롤러가 사용할 동작을 제공합니다.

### 실제 기능의 흐름 — `GET /reading-records/:id`

```text
src/main.ts
  → AppModule
  → ReadingRecordsModule
  → ReadingRecordsController   HTTP 계층 (경로, 파라미터, 상태 코드)
  → ReadingRecordsService      비즈니스 로직 (없으면 404 던지기)
  → PrismaService              Prisma 클라이언트 (SQL 생성과 실행)
  → PostgreSQL (도커 컨테이너)
```

계층을 나눈 이유는 각자 아는 것을 제한하기 위해서입니다. 컨트롤러는 SQL을 모르고, 서비스는 HTTP를 모릅니다. 서비스는 `NotFoundException`을 던질 뿐이고 그것이 404 응답이 되는 일은 NestJS가 처리합니다.

### 파일이 하는 일

| 파일 | 역할 |
| --- | --- |
| `src/reading-records/reading-records.controller.ts` | 경로와 HTTP 메서드 연결, 상태 코드 지정 |
| `src/reading-records/reading-records.service.ts` | 저장·조회·수정·삭제 로직, 없는 기록 처리 |
| `src/reading-records/dto/` | API로 들어오는 입력의 형태와 검증 규칙 |
| `prisma/schema.prisma` | 테이블 구조와 독서 상태 값 목록 — 타입의 원본 |
| `prisma.config.ts` | Prisma CLI 설정 (스키마 위치, 접속 URL) |
| `prisma/migrations/` | 테이블 생성·변경 이력 (SQL 파일) |
| `src/prisma/prisma.service.ts` | Prisma 클라이언트를 Nest 프로바이더로 감싼 것 |
| `src/generated/prisma/` | 스키마에서 자동 생성된 코드 (직접 고치지 않음) |

## 학습 목표

- JavaScript와 TypeScript의 기본 문법 이해
- HTTP 요청과 응답, REST API 이해
- NestJS의 모듈, 컨트롤러, 서비스 이해
- 의존성 주입(Dependency Injection) 이해
- DTO와 입력값 검증 사용
- 데이터베이스를 이용한 CRUD 구현
- 예외 처리와 일관된 오류 응답 구현
- 단위 테스트와 e2e 테스트 작성

## API 목록

독서 기록을 생성하고 조회하고 수정하고 삭제하는 기능이 모두 구현되어 있습니다.

| 기능 | HTTP 메서드 | 경로 | 성공 상태 코드 |
| --- | --- | --- | --- |
| 독서 기록 생성 | `POST` | `/reading-records` | `201 Created` |
| 독서 기록 목록 조회 | `GET` | `/reading-records` | `200 OK` |
| ↳ 필터·페이지네이션·정렬 | `GET` | `/reading-records?status=&page=&limit=&sort=&order=` | `200 OK` |
| 독서 기록 상세 조회 | `GET` | `/reading-records/:id` | `200 OK` |
| 독서 기록 수정 | `PATCH` | `/reading-records/:id` | `200 OK` |
| 독서 기록 삭제 | `DELETE` | `/reading-records/:id` | `204 No Content` |

수정에 `PUT` 대신 `PATCH`를 쓴 이유는 이 API가 "보낸 필드만 바꾸는" 부분 수정이기 때문입니다. `PUT`은 리소스 전체를 보낸 값으로 교체한다는 뜻입니다.

데이터는 도커 컨테이너 안의 PostgreSQL에 저장되며, 서버는 물론 컨테이너를 껐다 켜도 남아 있습니다(도커 볼륨에 보관됩니다). 데이터까지 완전히 지우려면 `docker compose down -v`를 실행합니다.

## 독서 기록 데이터

현재 확정되어 테이블에 존재하는 필드입니다.

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | number | 자동 | DB가 매기는 기본 키 |
| `title` | string | 필수 | 책 제목. 빈 문자열 불가 |
| `author` | string | 필수 | 저자. 빈 문자열 불가 |
| `status` | `want_to_read` \| `reading` \| `finished` | 선택 | 생략하면 `want_to_read` |
| `rating` | number \| null | 선택 | 1~5 정수. 없으면 `null` |

지금은 이 다섯 필드가 그대로 응답에도 나가지만, **테이블의 모양과 응답의 모양은 별개로 관리합니다.** 응답에 나갈 필드는 `src/reading-records/dto/reading-record-response.dto.ts`에 따로 선언되어 있어서, 테이블에 컬럼을 추가해도 이 파일에 적지 않으면 응답에 나가지 않습니다. 반대로 말하면 **공개할 필드를 새로 추가할 때는 `schema.prisma`와 이 응답 DTO를 함께 고쳐야 합니다.**

아직 도입하지 않은 필드는 다음과 같습니다. 필요해지는 시점에 마이그레이션과 함께 추가합니다.

- 읽기 시작일, 읽기 완료일 (날짜 타입과 시간대 처리를 함께 결정해야 함)
- 감상 또는 메모

## API 사용 예시

서버를 실행한 뒤 아래 요청으로 직접 확인할 수 있습니다.

### 생성 — `POST /reading-records`

```bash
curl -X POST http://localhost:3000/reading-records \
  -H "Content-Type: application/json" \
  -d '{"title": "객체지향의 사실과 오해", "author": "조영호", "status": "reading"}'
```

```json
{
  "id": 1,
  "title": "객체지향의 사실과 오해",
  "author": "조영호",
  "status": "reading",
  "rating": null
}
```

### 목록 조회 — `GET /reading-records`

쿼리 파라미터로 거르고 나눠 받을 수 있습니다. 셋 다 생략할 수 있습니다.

| 파라미터 | 기본값 | 설명 |
| --- | --- | --- |
| `status` | 없음 (전체) | `want_to_read` \| `reading` \| `finished` 중 하나로 거릅니다 |
| `page` | `1` | 몇 번째 페이지인지. 1 이상의 정수 |
| `limit` | `10` | 한 페이지에 몇 건인지. 1~100 사이의 정수 |
| `sort` | `id` | 정렬 기준 컬럼. `id` \| `title` \| `author` \| `status` \| `rating` 중 하나 |
| `order` | `asc` | 정렬 방향. `asc` \| `desc` |

```bash
curl "http://localhost:3000/reading-records?status=reading&page=1&limit=2&sort=title&order=desc"
```

응답은 배열이 아니라 목록과 함께 페이지 정보를 담은 객체입니다.

```json
{
  "data": [
    {
      "id": 1,
      "title": "객체지향의 사실과 오해",
      "author": "조영호",
      "status": "reading",
      "rating": null
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 2
}
```

`total`은 **`status` 조건에 맞는 전체 건수**입니다(현재 페이지의 건수가 아닙니다). 마지막 페이지인지 판단하려면 이 값을 씁니다 — `page * limit >= total`이면 마지막 페이지입니다.

정렬은 페이지를 나누기 **전에** 전체에 적용됩니다. 즉 `?sort=title&order=desc&page=1`은 "전체를 제목 내림차순으로 세운 뒤 앞에서 자른 것"입니다.

`sort`에 위 목록 밖의 값을 보내면 `400`입니다. 정렬 가능한 컬럼을 목록으로 제한하는 이유는, `sort`가 다른 파라미터와 달리 **데이터가 아니라 쿼리의 구조(컬럼 이름)** 를 정하기 때문입니다. 제한하지 않으면 의도하지 않은 컬럼으로 정렬되거나, 없는 컬럼 이름이 그대로 넘어가 `500`이 됩니다.

`rating`으로 내림차순 정렬하면 **별점이 없는(`null`) 기록이 가장 앞에 옵니다.** PostgreSQL이 `ORDER BY`에서 `NULL`을 가장 큰 값으로 취급하기 때문입니다.

### 수정 — `PATCH /reading-records/:id`

보낸 필드만 바뀝니다. 아래 요청은 `title`과 `author`를 건드리지 않습니다.

```bash
curl -X PATCH http://localhost:3000/reading-records/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "finished", "rating": 5}'
```

별점을 지우려면 필드를 빼는 것이 아니라 `null`을 명시해서 보냅니다.

```bash
curl -X PATCH http://localhost:3000/reading-records/1 \
  -H "Content-Type: application/json" \
  -d '{"rating": null}'
```

필드를 아예 보내지 않는 것(`undefined`)과 `null`을 보내는 것은 뜻이 다릅니다. 전자는 "건드리지 마라", 후자는 "비워라"입니다.

### 삭제 — `DELETE /reading-records/:id`

성공하면 본문 없이 `204 No Content`를 반환합니다.

```bash
curl -i -X DELETE http://localhost:3000/reading-records/1
```

### 오류 응답

| 상황 | 상태 코드 |
| --- | --- |
| 필수 필드 누락, 타입 불일치, 범위를 벗어난 `rating` | `400 Bad Request` |
| DTO에 없는 필드를 보냄 (`whitelist` + `forbidNonWhitelisted`) | `400 Bad Request` |
| `:id`가 숫자가 아님 (`ParseIntPipe`) | `400 Bad Request` |
| 목록 조회의 `status`가 정해진 값이 아니거나, `page`·`limit`이 정수가 아니거나 범위를 벗어남 | `400 Bad Request` |
| 목록 조회의 `sort`가 정렬 가능한 컬럼이 아니거나, `order`가 `asc`/`desc`가 아님 | `400 Bad Request` |
| 존재하지 않는 `id` 조회·수정·삭제 | `404 Not Found` |

검증에 실패하면 어떤 필드가 왜 잘못됐는지 메시지로 함께 돌려줍니다.

```bash
curl -X POST http://localhost:3000/reading-records \
  -H "Content-Type: application/json" \
  -d '{"title": "", "author": "조영호", "rating": 9}'
```

```json
{
  "message": [
    "title should not be empty",
    "rating must not be greater than 5"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

## 테스트

두 종류의 테스트가 있고, 확인하는 대상이 다릅니다.

```bash
pnpm test        # 단위 테스트 — 서비스의 로직
pnpm test:e2e    # e2e 테스트 — 실제 HTTP 요청과 응답
```

- 단위 테스트는 `src/**/*.spec.ts`이고, 서비스 로직을 확인합니다.
- e2e 테스트는 `test/*.e2e-spec.ts`이고, 앱을 실제로 띄워 `supertest`로 요청을 보냅니다. 상태 코드와 응답 본문까지 확인합니다.

**두 테스트 모두 도커가 실행 중이어야 합니다.**

SQLite를 쓸 때는 `:memory:`라는 공짜 격리 수단이 있었습니다. 테스트마다 빈 DB가 새로 생겼습니다. PostgreSQL에는 인메모리 모드가 없어서, 대신 **Testcontainers**로 테스트 전용 PostgreSQL 컨테이너를 실제로 하나 띄웁니다 (`test/postgres-container.ts`).

| | SQLite 시절 | 지금 |
| --- | --- | --- |
| 테스트용 DB | `:memory:` (공짜, 즉시) | 도커 컨테이너 (몇 초 소요) |
| 격리 단위 | 테스트마다 새 DB | 파일마다 컨테이너 1개, 테스트마다 `TRUNCATE` |
| 개발용 DB 오염 | 없음 | 없음 (컨테이너는 남는 포트를 따로 잡습니다) |

테이블은 `prisma db push`가 아니라 `prisma migrate deploy`로 만듭니다. 이렇게 해야 "우리가 커밋한 마이그레이션 파일이 정말 올바른가"까지 테스트가 검증합니다.

컨테이너를 처음 띄울 때는 PostgreSQL 이미지를 내려받느라 오래 걸릴 수 있습니다. 그래서 테스트 제한 시간을 180초로 늘려두었습니다.

테스트 스크립트에 `NODE_OPTIONS=--experimental-vm-modules`가 붙어 있습니다. Prisma 7은 SQL을 만들어내는 쿼리 컴파일러를 WebAssembly 모듈로 갖고 있고 그걸 동적 `import()`로 불러오는데, Jest의 기본 실행 환경은 이를 지원하지 않기 때문입니다. 이 플래그가 없으면 Prisma가 시작하는 순간(`$connect()`) 테스트가 전부 깨집니다. 실행할 때 뜨는 `ExperimentalWarning`은 정상입니다.

전역 `ValidationPipe`는 `main.ts`가 아니라 `AppModule`에 등록되어 있습니다. `main.ts`에 두면 그 파일을 실행하지 않는 e2e 테스트에는 검증이 걸리지 않아, 테스트는 통과하는데 실제 서버는 다르게 동작하는 상황이 생깁니다 ([04번 노트](./docs/learning/04-e2e-테스트.md) 참고).

## 학습 로드맵

각 단계에서 실제로 겪은 내용은 [학습 노트](./docs/learning/)에 기록합니다.

### 1. 개발 환경과 프로젝트 구조

- Node.js와 패키지 매니저 확인
- NestJS 프로젝트 초기화
- 생성된 파일과 실행 흐름 살펴보기
- 첫 번째 API 실행하기

### 2. 메모리 기반 CRUD

- 독서 기록 모듈 만들기
- 컨트롤러와 서비스의 책임 나누기
- DTO와 TypeScript 타입 정의하기
- 배열에 데이터를 저장하는 CRUD 구현하기

### 3. 입력 검증과 예외 처리

- ValidationPipe 적용하기
- 잘못된 요청 검증하기
- 존재하지 않는 기록에 대한 오류 처리하기
- HTTP 상태 코드 이해하기

### 4. 테스트 기반 다지기

- 서비스 단위 테스트 작성하기
- API e2e 테스트 작성하기
- 테스트 환경과 실제 서버의 설정 일치시키기

### 5. 데이터베이스 연결

- 사용할 데이터베이스와 ORM 선택하기
- 테이블과 제약조건 설계하기
- 마이그레이션 적용하기
- 메모리 저장소를 데이터베이스로 교체하기

### 6. 스키마 변경하기

- 이미 데이터가 있는 테이블에 필드 추가하기
- 엔티티의 `default`와 DB의 `DEFAULT`가 각각 언제 일하는지 이해하기
- `undefined`와 `null`을 구분해 처리하기

### 7. PostgreSQL과 Prisma로 이전

- 도커 컴포즈로 데이터베이스 서버 띄우기
- 엔티티 클래스 대신 스키마 파일로 모델 정의하기
- 생성된 코드(코드 제너레이션)라는 방식 이해하기
- 인메모리 DB 없이 테스트 격리하기 (Testcontainers)

### 8. 정리와 개선

- 필터링, 정렬, 페이지네이션 검토하기
- 응답 전용 타입을 엔티티와 분리할지 판단하기
- 문서와 코드 정리하기

## 학습 진행 방식

각 단계는 다음 순서로 진행합니다.

1. 이번 단계의 목표와 필요한 개념을 확인합니다.
2. 기능을 실행 가능한 작은 단위로 구현합니다.
3. 테스트 또는 실제 HTTP 요청으로 동작을 확인합니다.
4. 오류가 발생하면 메시지와 실행 흐름을 함께 분석합니다.
5. 배운 내용을 정리한 뒤 다음 단계로 이동합니다.

이 프로젝트에서 에이전트는 NestJS 시니어 개발자이자 학습 멘토 역할을 합니다. 자세한 협업 원칙은 [CLAUDE.md](./CLAUDE.md)에서 확인할 수 있습니다.

## 기술 스택

현재 확정된 기술은 다음과 같습니다.

- TypeScript
- NestJS
- pnpm
- PostgreSQL (도커 컨테이너, `@prisma/adapter-pg` 드라이버)
- Prisma 7
- Jest, supertest, Testcontainers

처음에는 SQLite와 TypeORM으로 시작했습니다. 별도 설치 없이 파일 하나로 동작해 데이터베이스 개념 자체에 집중하기 좋았기 때문입니다. 기본기가 잡힌 뒤 실무에서 더 흔히 쓰이는 조합으로 옮겼습니다 ([07번 노트](./docs/learning/07-PostgreSQL과-Prisma로-이전.md) 참고).

## 현재 진행 상태

- [x] 학습 목표와 협업 방식 정의
- [x] 프로젝트 README 작성
- [x] NestJS 프로젝트 초기화
- [x] 첫 번째 기본 API 작성
- [x] 기본 API 실행 및 요청 확인
- [x] 독서 기록 CRUD 구현 (메모리 저장소)
- [x] 입력 검증과 예외 처리
- [x] 테스트 작성
  - [x] 서비스 단위 테스트
  - [x] e2e 테스트에 전역 `ValidationPipe` 적용 ([04번 노트](./docs/learning/04-e2e-테스트.md) 참고)
  - [x] 수정/삭제 e2e 테스트
- [x] 데이터베이스 연결 ([05번 노트](./docs/learning/05-데이터베이스-연결.md) 참고)
  - [x] SQLite와 TypeORM 선택
  - [x] 엔티티 정의와 저장소(Repository) 교체
  - [x] 테스트용 인메모리 DB 분리
  - [x] 마이그레이션 도입 (`synchronize: true` 제거)
- [x] 스키마 변경 — `status`, `rating` 필드 추가 ([06번 노트](./docs/learning/06-필드-추가와-마이그레이션.md) 참고)
- [x] PostgreSQL + Prisma로 이전 ([07번 노트](./docs/learning/07-PostgreSQL과-Prisma로-이전.md) 참고)
  - [x] 도커 컴포즈로 PostgreSQL 실행
  - [x] 엔티티 클래스를 `schema.prisma`로 대체
  - [x] 저장소(Repository)를 Prisma 클라이언트로 교체
  - [x] Testcontainers로 테스트 격리
- [ ] 정리와 개선 ([08번 노트](./docs/learning/08-목록-필터링.md) 참고)
  - [x] 목록 조회에 `status` 필터 추가
  - [x] 목록 조회에 페이지네이션 추가 (`page`, `limit`)
  - [x] 응답 전용 타입 분리 여부 판단 → 분리하기로 결정 (`ReadingRecordResponseDto`)
  - [x] 필터·페이지네이션 e2e 테스트
  - [x] 목록 조회에 정렬 추가 (`sort`, `order` — 허용 목록으로 제한)
  - [ ] 읽기 시작일·완료일, 메모 필드 추가 검토
