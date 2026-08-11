# 02. 메모리 기반 CRUD

- 날짜: 2026-08-09 ~ 2026-08-11
- 관련 커밋: `252f2fb`(생성/조회), `7ae9598`(수정/삭제)

## 무엇을 만들었나

`reading-records` 기능 모듈을 만들고, 데이터를 **메모리 배열**에 저장하는 CRUD API 5개를 구현했다.

| 기능 | 메서드 | 경로 | 성공 상태 코드 |
| --- | --- | --- | --- |
| 생성 | `POST` | `/reading-records` | 201 |
| 목록 조회 | `GET` | `/reading-records` | 200 |
| 상세 조회 | `GET` | `/reading-records/:id` | 200 |
| 수정 | `PATCH` | `/reading-records/:id` | 200 |
| 삭제 | `DELETE` | `/reading-records/:id` | 204 |

## 왜 필요했나

데이터베이스를 먼저 붙이면 **배울 게 두 개 겹친다** — CRUD 설계와 DB/ORM 사용법.
메모리 배열로 먼저 만들면 API 설계에만 집중할 수 있고, 나중에 저장소만 갈아끼우면 된다.
서비스가 저장 방식을 감추고 있기 때문에 컨트롤러는 바꿀 필요가 없다.

## 핵심 개념 — 내 말로 다시 쓰기

### 기능 모듈로 나누기

`AppModule`에 전부 때려넣지 않고 `ReadingRecordsModule`을 따로 만들어 `imports`에 등록했다.
독서 기록과 상관없는 코드가 섞이지 않고, 나중에 `books` 같은 형제 모듈을 추가하기 쉽다.

### DTO와 인터페이스는 다른 개념

지금은 필드가 똑같지만 **일부러 따로 뒀다.**

| | 역할 |
| --- | --- |
| `CreateReadingRecordDto` | 클라이언트가 **보내는** 데이터의 모양 (입력 계약) |
| `ReadingRecord` | 서버가 **저장하고 응답하는** 데이터의 모양 |

왜 나누나? `id`는 서버가 만드는 값이라 클라이언트가 보내면 안 된다.
나중에 `createdAt` 같은 필드가 생기면 차이가 더 벌어진다.
지금 합쳐두면 그때 되돌리기 어렵다.

### `ParseIntPipe` — URL은 항상 문자열이다

```ts
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) { ... }
```

`/reading-records/1`에서 `1`은 **문자열 `"1"`** 로 들어온다.
`ParseIntPipe`가 숫자로 바꿔주고, 바꿀 수 없으면(`/reading-records/abc`) 알아서 400을 던진다.

**파이프(pipe)** 는 컨트롤러 메서드가 실행되기 **직전**에 값을 가로채는 장치다.
하는 일은 두 가지 — **변환(transform)** 과 **검증(validation)**.
`ParseIntPipe`는 둘 다 한다: 문자열을 숫자로 바꾸고, 못 바꾸면 거부한다.

### `NotFoundException` — 도메인 오류를 HTTP로 번역하기

```ts
if (!readingRecord) {
  throw new NotFoundException(`Reading record with ID ${id} not found`);
}
```

서비스에서 그냥 `throw`하면 Nest가 알아서 404 JSON 응답으로 만들어준다.
컨트롤러에서 `try/catch`로 받아 상태 코드를 정할 필요가 없다.

### `PATCH` vs `PUT`

- `PUT` = 리소스를 **통째로 교체**. 안 보낸 필드는 없어지는 게 맞다.
- `PATCH` = **일부만 수정**. 안 보낸 필드는 그대로 둬야 한다.

저자만 고치려는데 제목까지 다시 보내야 한다면 불편하다. 그래서 `PATCH`를 골랐다.
DTO도 그에 맞춰 모든 필드를 선택적(`title?: string`)으로 만들었다.

### 삭제는 왜 204인가

삭제 후에는 돌려줄 데이터가 없다. 그래서 "성공했고 본문은 없다"는 뜻의 `204 No Content`를 쓴다.
NestJS의 `@Delete` 기본값은 200이라 명시적으로 바꿔야 한다.

```ts
@Delete(':id')
@HttpCode(204)     // 데코레이터는 여러 개 겹쳐 쓸 수 있다
remove(@Param('id', ParseIntPipe) id: number): void { ... }
```

### 검증 로직을 한 곳에만 두기

`update`와 `remove` 모두 "없는 id면 404"를 처리해야 한다.
각자 `find`해서 확인하는 대신 **`findOne(id)`을 재사용**했다.

```ts
update(id: number, dto: UpdateReadingRecordDto): ReadingRecord {
  const readingRecord = this.findOne(id);   // 없으면 여기서 알아서 404
  // ...
}
```

에러 메시지가 저절로 일관돼지고, 나중에 404 처리 방식을 바꿀 때 한 군데만 고치면 된다.

## 이번 단계에 쓴 문법 — 빠른 참조

### 라우팅

| 문법 | 하는 일 | 예시 |
| --- | --- | --- |
| `@Post()` | POST 요청 처리. 성공 시 기본 응답이 **201** | `@Post()` → `POST /reading-records` |
| `@Get(':id')` | URL의 한 조각을 변수로 받음 | `@Get(':id')` → `/reading-records/1` |
| `@Patch(':id')` | PATCH 요청 처리 (부분 수정) | `@Patch(':id')` |
| `@Delete(':id')` | DELETE 요청 처리 | `@Delete(':id')` |
| `@HttpCode(204)` | 성공 시 상태 코드를 직접 지정 | `@Delete(':id') @HttpCode(204)` |

### 요청에서 값 꺼내기

| 문법 | 하는 일 | 예시 |
| --- | --- | --- |
| `@Body()` | 요청 본문(JSON)을 통째로 받음 | `create(@Body() dto: CreateReadingRecordDto)` |
| `@Param('id')` | URL의 `:id` 자리 값을 받음. **항상 문자열** | `findOne(@Param('id') id: string)` |
| `ParseIntPipe` | 문자열을 숫자로 바꾸고, 못 바꾸면 400 | `@Param('id', ParseIntPipe) id: number` |

### 예외

| 문법 | 하는 일 | 결과 상태 코드 |
| --- | --- | --- |
| `throw new NotFoundException('메시지')` | 리소스를 못 찾았을 때 | 404 |
| `throw new BadRequestException('메시지')` | 요청이 잘못됐을 때 | 400 |

`@nestjs/common`에서 가져온다. 서비스에서 그냥 `throw`하면 Nest가 알아서 JSON 응답으로 바꿔준다.

### 배열 다루기 (JavaScript 기본)

| 문법 | 하는 일 | 예시 |
| --- | --- | --- |
| `arr.find(fn)` | 조건에 **맞는 첫 항목**을 반환. 없으면 `undefined` | `records.find((r) => r.id === id)` |
| `arr.push(x)` | 배열 끝에 추가 | `records.push(newRecord)` |
| `arr.indexOf(x)` | 그 항목의 위치(번호)를 반환. 없으면 `-1` | `records.indexOf(record)` |
| `arr.splice(i, n)` | `i`번째부터 `n`개를 **원본에서 제거** | `records.splice(index, 1)` |

> `find`는 **조건 함수**를 받는다. `(r) => r.id === id`는 "항목 하나를 받아서 id가 같은지 판단하는 함수"라는 뜻이다.
> `===`는 타입까지 같은지 비교한다 (`==`와 달리 `1`과 `"1"`을 다르게 봄).

## 막혔던 지점 ⭐

> 이 단계에서 특별히 막힌 지점은 기록되지 않았다.
> 다만 여기서 작성한 `update()`의 `Object.assign` 코드가
> **3단계에서 버그로 터졌다.** [03-입력-검증.md](./03-입력-검증.md)의 "막혔던 지점" 참고.
>
> 교훈: 지금 잘 도는 코드가 **영원히 잘 돈다는 뜻은 아니다.**
> 주변 환경(이 경우 `@Body()`가 주는 값의 성질)이 바뀌면 멀쩡하던 코드가 깨질 수 있다.

## 어떻게 확인했나

```bash
pnpm test                # 단위 테스트
pnpm start:dev

# 생성
curl -X POST localhost:3000/reading-records \
  -H 'Content-Type: application/json' \
  -d '{"title":"클린 코드","author":"로버트 C. 마틴"}'

# 조회 / 수정 / 삭제
curl localhost:3000/reading-records/1
curl -X PATCH localhost:3000/reading-records/1 \
  -H 'Content-Type: application/json' -d '{"author":"Robert C. Martin"}'
curl -i -X DELETE localhost:3000/reading-records/1     # -i 로 상태 코드 확인
```

## 아직 모르는 것

- 메모리 배열은 서버를 끄면 사라진다. DB로 바꿀 때 서비스 코드가 얼마나 바뀔까?
- `nextId`를 1씩 증가시키는 방식은 DB의 자동 증가 ID와 어떻게 달라지나?
- 목록 조회에서 `return this.readingRecords`는 **배열 원본**을 그대로 넘긴다.
  받는 쪽이 배열을 수정하면 저장소가 오염되지 않을까? (복사본을 줘야 하나?)
