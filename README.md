# Readlog API

NestJS를 학습하며 만드는 독서 기록 CRUD API 프로젝트입니다.

단순히 완성된 API를 만드는 것보다 JavaScript와 TypeScript의 기초부터 NestJS의 구조, 데이터베이스, 테스트까지 단계적으로 이해하는 것을 목표로 합니다.

현재 독서 기록 CRUD API와 입력 검증이 구현되어 있고, 데이터는 SQLite에 저장됩니다. 테이블 구조는 `synchronize`가 아니라 마이그레이션(migration)으로 관리합니다.

단계별로 배운 내용은 [학습 노트](./docs/learning/)에 정리하고 있습니다.

## 시작하기

### 요구 사항

- Node.js
- pnpm

### 의존성 설치

```bash
pnpm install
```

### 데이터베이스 준비

테이블은 앱이 알아서 만들어주지 않습니다. 마이그레이션을 직접 실행해야 합니다.

```bash
pnpm migration:run
```

프로젝트 루트에 `readlog.sqlite` 파일이 만들어지고 `reading_records` 테이블이 생깁니다.

이 단계를 건너뛰면 서버는 정상적으로 뜨지만 API를 호출할 때 `500 Internal server error`가 돌아옵니다. 응답만 봐서는 원인을 알 수 없고, 서버를 실행한 터미널에 찍힌 `no such table: reading_records`를 봐야 알 수 있습니다. 오류의 진짜 원인은 응답이 아니라 서버 로그에 있는 경우가 많습니다.

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

개발 서버는 **하나만** 띄웁니다. 여러 개가 떠 있으면 파일을 저장할 때마다 각각 재시작하면서 서로 같은 DB 파일을 건드립니다.

## 기본 명령어

| 명령어 | 역할 |
| --- | --- |
| `pnpm start:dev` | 개발 서버를 감시 모드로 실행 |
| `pnpm build` | TypeScript 코드를 배포용 JavaScript로 빌드 |
| `pnpm lint` | 코드 규칙 검사 및 자동 수정 |
| `pnpm test` | 단위 테스트 실행 |
| `pnpm test:e2e` | 실제 HTTP 요청에 가까운 e2e 테스트 실행 |

## 마이그레이션 명령어

스키마를 바꿀 때 쓰는 명령어입니다. 모두 `src/data-source.ts`의 설정을 기준으로 동작합니다.

| 명령어 | 역할 |
| --- | --- |
| `pnpm migration:run` | 아직 실행되지 않은 마이그레이션을 실행 |
| `pnpm migration:show` | 실행 여부 확인 (`[X]` 실행됨 / `[ ]` 대기중) |
| `pnpm migration:revert` | 마지막 마이그레이션의 `down()`을 실행해 되돌리기 |
| `pnpm migration:generate src/migrations/이름` | 엔티티와 DB의 차이를 SQL로 만들어 파일 생성 |

두 가지를 기억해야 합니다.

- `generate`는 엔티티 정의만 보고 SQL을 만드는 것이 아니라 **연결된 DB와 비교해 차이를 만듭니다.** 그래서 이미 데이터가 든 DB에 붙어 있으면 "추가된 컬럼"만 나옵니다.
- 새로 만든 마이그레이션 클래스는 `src/data-source.ts`의 `migrations` 배열에 **직접 import해서 추가**해야 합니다. 파일 경로 패턴(glob)을 쓰지 않기 때문입니다.

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
  → Repository<ReadingRecord>  TypeORM
  → SQLite (readlog.sqlite)
```

계층을 나눈 이유는 각자 아는 것을 제한하기 위해서입니다. 컨트롤러는 SQL을 모르고, 서비스는 HTTP를 모릅니다. 서비스는 `NotFoundException`을 던질 뿐이고 그것이 404 응답이 되는 일은 NestJS가 처리합니다.

### 파일이 하는 일

| 파일 | 역할 |
| --- | --- |
| `src/reading-records/reading-records.controller.ts` | 경로와 HTTP 메서드 연결, 상태 코드 지정 |
| `src/reading-records/reading-records.service.ts` | 저장·조회·수정·삭제 로직, 없는 기록 처리 |
| `src/reading-records/reading-record.entity.ts` | `reading_records` 테이블 구조 |
| `src/reading-records/dto/` | API로 들어오는 입력의 형태와 검증 규칙 |
| `src/reading-records/reading-status.enum.ts` | 허용되는 독서 상태 값 목록 |
| `src/data-source.ts` | DB 접속 설정과 마이그레이션 목록 (앱과 CLI가 공유) |
| `src/migrations/` | 테이블 생성·변경 이력 |

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
| 독서 기록 상세 조회 | `GET` | `/reading-records/:id` | `200 OK` |
| 독서 기록 수정 | `PATCH` | `/reading-records/:id` | `200 OK` |
| 독서 기록 삭제 | `DELETE` | `/reading-records/:id` | `204 No Content` |

수정에 `PUT` 대신 `PATCH`를 쓴 이유는 이 API가 "보낸 필드만 바꾸는" 부분 수정이기 때문입니다. `PUT`은 리소스 전체를 보낸 값으로 교체한다는 뜻입니다.

데이터는 프로젝트 루트의 `readlog.sqlite` 파일에 저장되며, 서버를 재시작해도 남아 있습니다. 이 파일은 로컬 개발용이라 Git으로 관리하지 않습니다.

## 독서 기록 데이터

현재 확정되어 테이블에 존재하는 필드입니다.

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `id` | number | 자동 | DB가 매기는 기본 키 |
| `title` | string | 필수 | 책 제목. 빈 문자열 불가 |
| `author` | string | 필수 | 저자. 빈 문자열 불가 |
| `status` | `want_to_read` \| `reading` \| `finished` | 선택 | 생략하면 `want_to_read` |
| `rating` | number \| null | 선택 | 1~5 정수. 없으면 `null` |

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

```bash
curl http://localhost:3000/reading-records
```

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

- 단위 테스트는 `src/**/*.spec.ts`이고, 저장소(Repository)를 가짜 객체로 바꿔 서비스 로직만 확인합니다.
- e2e 테스트는 `test/*.e2e-spec.ts`이고, 앱을 실제로 띄워 `supertest`로 요청을 보냅니다. 상태 코드와 응답 본문까지 확인합니다.

e2e 테스트는 개발용 `readlog.sqlite`를 건드리지 않습니다. `test/setup-e2e.ts`가 `DATABASE_PATH=:memory:`를 지정해 메모리에만 존재하는 DB를 쓰기 때문에, 테스트가 끝나면 데이터가 함께 사라집니다.

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

### 7. 정리와 개선

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
- SQLite (`better-sqlite3` 드라이버)
- TypeORM
- Jest, supertest

SQLite는 별도 설치 없이 파일 하나로 동작해 학습에 집중하기 좋아 선택했습니다. 나중에 PostgreSQL로 옮기더라도 주로 연결 설정만 바뀝니다.

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
- [ ] 정리와 개선
  - [ ] 목록 조회에 필터링·정렬 추가 검토
  - [ ] 읽기 시작일·완료일, 메모 필드 추가 검토
  - [ ] 응답 전용 타입 분리 여부 판단
