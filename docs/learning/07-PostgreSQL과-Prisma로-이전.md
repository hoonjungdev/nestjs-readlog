# 07. SQLite + TypeORM → PostgreSQL + Prisma

- 날짜: 2026-08-18
- 관련 커밋: (작업 중)

## 무엇을 만들었나

저장 계층을 통째로 갈아끼웠다.

| | 이전 | 이후 |
| --- | --- | --- |
| DB | SQLite (파일 하나) | PostgreSQL (도커 컨테이너) |
| ORM | TypeORM | Prisma 7 |
| 모델 정의 | 엔티티 클래스 + 데코레이터 | `prisma/schema.prisma` |
| 질의 객체 | `Repository<ReadingRecord>` | `prisma.readingRecord` |
| 마이그레이션 | TypeScript 클래스 (`up`/`down`) | 순수 SQL 파일 |
| 테스트 격리 | `:memory:` | Testcontainers |

**API는 한 글자도 안 바뀌었다.** 경로, 요청 형태, 응답 JSON, 상태 코드 전부 그대로다. 테스트 파일이 거의 그대로 살아남은 게 그 증거다. 바꾼 건 "어디에 어떻게 저장하느냐"뿐이다.

## 왜 필요했나

SQLite는 학습 시작점으로는 훌륭했다. 설치가 없고 파일 하나라 **데이터베이스라는 개념 자체**에 집중할 수 있었다. 5·6단계에서 배운 것들(마이그레이션, 제약조건, `NOT NULL`, 기본값)은 전부 SQLite 위에서 익혔다.

그런데 SQLite가 감춰준 것들이 있었다.

- **DB 서버라는 게 뭔지 몰랐다.** SQLite는 서버가 아니라 라이브러리다. 접속 주소도, 포트도, 사용자도, 비밀번호도 없었다.
- **테스트 격리를 공짜로 받고 있었다.** `:memory:` 덕분이었지, 내가 설계한 게 아니었다.
- **enum이 없었다.** SQLite에는 enum 타입이 없어서 "문자열 + CHECK 제약"으로 흉내 냈다.

실무에서 훨씬 흔한 조합으로 옮기면서 이것들을 직접 마주하는 게 목적이었다.

## 핵심 개념 — 내 말로 다시 쓰기

### 1. 방향이 반대다 — 코드가 원본인가, 스키마가 원본인가

이게 TypeORM과 Prisma의 가장 큰 차이다.

**TypeORM**: 내가 쓴 클래스가 원본이다.

```ts
@Entity('reading_records')
export class ReadingRecord {
  @PrimaryGeneratedColumn()
  id: number;
  // ...
}
```

이 클래스는 세 가지를 동시에 한다 — TypeScript 타입이고, 테이블 구조이고, 질의 결과의 모양이다. 데코레이터가 실행 중에 메타데이터를 남기고 TypeORM이 그걸 읽는다.

**Prisma**: TypeScript가 아닌 파일이 원본이고, 코드는 **거기서 만들어진다.**

```prisma
model ReadingRecord {
  id     Int           @id @default(autoincrement())
  title  String
  status ReadingStatus @default(want_to_read)
  rating Int?
  @@map("reading_records")
}
```

`prisma generate`를 돌리면 `src/generated/prisma/`에 타입과 질의 함수가 쏟아져 나온다. 내가 손으로 쓰는 엔티티 클래스는 **없다.**

> 이걸 **코드 제너레이션(code generation)** 이라고 한다. 사람이 짧게 적은 정의에서 기계가 긴 코드를 만들어내는 방식이다.

처음엔 이상했다. 내가 안 쓴 코드가 `src/` 안에 생기고, 그게 gitignore 대상이라니. 그런데 규칙은 단순하다.

- `schema.prisma`만 고친다.
- `src/generated/`는 **절대 손대지 않는다.** 다음 generate 때 덮어써진다.
- 그래서 git에 넣지 않고, `pnpm install`이 끝날 때 자동으로 만들어지게 해뒀다(`postinstall`).

얻는 것: **값 목록이 흩어지지 않는다.** 6단계에서 계속 부딪혔던 그 문제다. 예전엔 `ReadingStatus` enum을 손으로 쓰고, 그걸 엔티티에도 쓰고 DTO에도 썼다. 이제 `schema.prisma`의 enum 정의 한 곳에서 DB 타입과 TypeScript 타입이 **함께** 나온다. 어긋날 수가 없다.

### 2. PostgreSQL은 서버다

SQLite에서 "DB에 연결한다"는 건 파일을 여는 것이었다.

```ts
database: 'readlog.sqlite'
```

PostgreSQL은 **따로 돌아가는 프로그램**이라 주소가 필요하다.

```text
postgresql://readlog:readlog@localhost:5432/readlog?schema=public
             └사용자┘ └비번┘  └─호스트─┘ └포트┘ └─DB이름─┘
```

그래서 새로 생긴 것들:

- **`docker-compose.yml`** — 그 서버를 어떻게 띄울지 적어둔 파일. 맥에 직접 설치하는 대신 컨테이너로 띄우면 버전과 설정이 파일에 남는다.
- **`.env`** — 접속 URL. 비밀번호가 들어가므로 git에 올리지 않고, 빈 껍데기인 `.env.example`만 올린다.

`pnpm db:up`이 `docker compose up -d --wait`인데, `--wait`가 중요하다. "컨테이너가 떴다"와 "접속을 받을 준비가 됐다"는 다른 이야기다. PostgreSQL은 시작하고도 몇 초간 초기화를 한다.

### 3. `undefined`와 `null` — 이번엔 ORM이 해준다

6단계에서 제일 오래 붙잡았던 주제다. PATCH에서

- 필드가 없으면 (`undefined`) → 건드리지 마라
- `null`이면 → 비워라

TypeORM에서는 이걸 **내가 직접** 구현했다.

```ts
if (dto.rating !== undefined) {
  readingRecord.rating = dto.rating;
}
// title, author, status에 대해 똑같은 걸 세 번 더
```

Prisma의 `update`는 이 규칙을 이미 갖고 있다.

```ts
return this.prisma.readingRecord.update({
  where: { id },
  data: {
    title: dto.title,
    author: dto.author,
    status: dto.status,
    rating: dto.rating,   // undefined면 UPDATE문에서 빠지고, null이면 NULL로 들어간다
  },
});
```

`if` 네 개가 통째로 사라졌다.

**그래도 테스트는 그대로 남겼다.** 이게 중요하다고 생각했다. 그 테스트들은 "내 if문이 잘 도는가"를 확인하는 게 아니라 **"이 API는 이렇게 동작하기로 했다"는 약속**을 못박는 것이다. 구현이 라이브러리 안으로 들어갔다고 약속이 사라지는 건 아니다. 나중에 또 뭔가를 바꿔도 이 테스트가 지켜준다.

덤으로 하나 더 좋아졌다. TypeORM의 `save()`는 **내가 넘긴 객체**를 돌려줬다. 그래서 그 객체가 `undefined`로 오염돼 있으면 응답까지 오염됐다(그게 바로 6단계에서 `Object.assign`을 못 쓴 이유였다). Prisma의 `update`는 **DB에서 다시 읽은 행**을 돌려준다. 그 사고가 구조적으로 안 난다.

### 4. `:memory:`가 사라진 자리 — Testcontainers

가장 손이 많이 간 부분이다.

SQLite 시절 테스트 격리는 이 한 줄이었다.

```ts
database: ':memory:'
```

테스트마다 앱을 새로 만들면 빈 DB가 딸려 왔다. 공짜였다. **PostgreSQL에는 이런 게 없다.**

선택지를 셋 놓고 골랐다.

| 방법 | 장점 | 단점 |
| --- | --- | --- |
| 테스트용 DB를 따로 만들어 쓰기 | 단순함 | 개발자마다 DB를 미리 만들어둬야 함 |
| Prisma를 가짜 객체로 바꾸기 | 빠름 | 실제 SQL과 제약조건을 검증 못 함 |
| **Testcontainers** | 격리 확실, 준비 불필요 | 도커 필수, 몇 초 느림 |

Testcontainers를 골랐다. 하는 일은 이렇다.

1. 테스트 시작할 때 PostgreSQL 컨테이너를 띄우고
2. **남는 포트를 아무거나** 잡아 연결하고 (개발용 5432와 안 겹친다)
3. 준비될 때까지 기다렸다가
4. 끝나면 컨테이너째 지운다

```ts
const container = await new PostgreSqlContainer('postgres:18-alpine').start();
process.env.DATABASE_URL = container.getConnectionUri();
```

순서가 중요하다. `PrismaService`는 **생성자에서** `process.env.DATABASE_URL`을 읽는다. 그러니 Nest 앱을 만들기 **전에** 바꿔치기해야 한다.

그리고 컨테이너는 띄우는 데 몇 초 걸리니 공짜가 아니다. 그래서 전략을 바꿨다.

| | SQLite 시절 | 지금 |
| --- | --- | --- |
| 컨테이너/DB | 테스트마다 새로 | **파일당 하나** (`beforeAll`) |
| 테스트 간 격리 | DB가 새로 생겨서 자동 | **`TRUNCATE`** (`beforeEach`) |

## 이번 단계에 쓴 문법 — 빠른 참조

| 문법 | 하는 일 | 예시 |
| --- | --- | --- |
| `@id` | 기본 키 | `id Int @id` |
| `@default(autoincrement())` | DB가 값을 자동으로 매김 | `id Int @id @default(autoincrement())` |
| `타입?` | nullable (DB와 TS 양쪽 동시에) | `rating Int?` |
| `@map("이름")` | 필드/enum값의 **DB 이름**만 바꿈 | `@map("reading_status")` |
| `@@map("이름")` | 모델의 **테이블 이름**을 바꿈 | `@@map("reading_records")` |
| `findUnique` | 유니크 컬럼으로 하나 찾기 (없으면 `null`) | `findUnique({ where: { id } })` |
| `findMany` | 여러 개 찾기 | `findMany({ orderBy: { id: 'asc' } })` |
| `$executeRawUnsafe` | 생 SQL 실행 | `$executeRawUnsafe('TRUNCATE ...')` |

## 막혔던 지점 ⭐

### 1. 인터넷 자료의 90%가 안 맞는다 — Prisma 7의 변경

제일 먼저 부딪힌 문제다. Prisma는 7에서 설정 방식이 크게 바뀌었는데, 검색해서 나오는 글은 대부분 v5/v6 기준이다.

| | 예전 자료 (v5/v6) | 실제 (v7) |
| --- | --- | --- |
| 접속 URL | `schema.prisma`의 `url = env("DATABASE_URL")` | **`prisma.config.ts`** |
| 생성기 | `provider = "prisma-client-js"` | **`"prisma-client"`** (`output` 필수) |
| import | `from '@prisma/client'` | **생성된 폴더에서** |
| 드라이버 | 내장 엔진이 알아서 | **`@prisma/adapter-pg`를 직접 넘김** |
| `.env` | 자동으로 읽힘 | **안 읽힘** (`import 'dotenv/config'`) |

교훈: **버전이 크게 바뀐 라이브러리는 검색보다 공식 문서를 먼저 본다.** 특히 "블로그 글의 코드를 그대로 붙였는데 안 된다"면 버전을 의심한다.

### 2. `import.meta`는 CommonJS에서 못 쓴다

`prisma generate`를 처음 돌렸더니 생성된 코드가 이렇게 나왔다.

```ts
globalThis['__dirname'] = path.dirname(fileURLToPath(import.meta.url))
import * as $Enums from "./enums.js"
```

`import.meta.url`과 `.js` 확장자는 **ESM(ES 모듈)** 문법이다. 그런데 이 프로젝트는 NestJS 기본값인 **CommonJS**로 돌아간다. 그대로 두면 컴파일이 깨진다.

> **모듈 시스템**: JS 파일이 서로를 불러오는 방식. 오래된 CommonJS(`require`)와 새 ESM(`import`) 두 갈래가 있고, 둘은 섞이지 않는다. `import.meta`는 ESM에만 있는 문법이다.

Prisma가 프로젝트 설정을 보고 ESM이라고 잘못 짐작한 것이다. 생성기에 못을 박아 해결했다.

```prisma
generator client {
  provider            = "prisma-client"
  output              = "../src/generated/prisma"
  moduleFormat        = "cjs"   // ← 이것
  importFileExtension = ""      // ← 그리고 이것
}
```

### 3. DB 없이 첫 마이그레이션 만들기

도커를 아직 못 띄운 상태였는데, `prisma migrate dev`는 **DB에 붙어야** 동작한다. 스키마와 실제 DB를 비교해서 차이를 SQL로 만들기 때문이다(TypeORM의 `migration:generate`와 같은 성질이었다).

DB 없이 SQL만 뽑는 명령이 따로 있었다.

```bash
pnpm prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
```

"빈 상태에서(`--from-empty`) 이 스키마까지(`--to-schema`) 가려면 어떤 SQL이 필요한가"를 계산한다. 그 결과를 `prisma/migrations/<타임스탬프>_init/migration.sql`로 저장했다.

여기서도 한 번 걸렸다. 처음엔 `--to-schema-datamodel`로 썼는데(옛 자료에 그렇게 나온다) 이렇게 나왔다.

```text
Error: `--to-schema-datamodel` was removed. Please use `--[from/to]-schema` instead.
```

**오류 메시지가 답까지 알려주는 좋은 예다.** 검색하지 않고 메시지만 읽어서 고쳤다.

### 4. pnpm이 Prisma의 설치 스크립트를 막았다

```text
[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: @prisma/engines@7.9.1, prisma@7.9.1, ...
```

pnpm은 보안상 의존성의 `postinstall` 스크립트를 **기본으로 차단한다.** 악성 패키지가 설치만으로 코드를 실행하는 걸 막기 위해서다. 그런데 Prisma는 마이그레이션을 실행하는 네이티브 엔진 바이너리를 그 스크립트로 내려받는다. 막히면 `migrate`가 동작하지 않는다.

`pnpm-workspace.yaml`에서 필요한 것만 열어줬다. (예전에 `better-sqlite3`를 열어줬던 그 자리다.)

```yaml
allowBuilds:
  '@prisma/engines': true
  prisma: true
  cpu-features: false   # testcontainers의 선택적 가속 모듈 — 없어도 됨
  protobufjs: false
  ssh2: false
```

### 5. enum 멤버 이름이 곧 API 응답 값이다

Prisma 스키마에 enum을 이렇게 쓰고 싶었다. TypeScript 관례에 맞으니까.

```prisma
enum ReadingStatus {
  WantToRead @map("want_to_read")
  Reading    @map("reading")
  Finished   @map("finished")
}
```

**이러면 API가 깨진다.** `@map`은 **DB에 저장되는 값**만 바꾼다. JS 쪽에서 Prisma가 돌려주는 값은 여전히 `"WantToRead"`이고, 그게 그대로 JSON 응답이 된다.

```json
{ "status": "WantToRead" }   ← 기존 클라이언트와의 약속이 깨진다
```

그래서 관례를 포기하고 멤버 이름 자체를 소문자로 뒀다.

```prisma
enum ReadingStatus {
  want_to_read
  reading
  finished
}
```

코드에서는 `ReadingStatus.want_to_read`로 쓴다. TypeScript 관례에는 안 맞지만, **바깥과의 약속이 안쪽 취향보다 우선한다.**

### 6. `TRUNCATE`만으로는 부족하다 — id 카운터

테스트 사이에 테이블을 비울 때 처음엔 이렇게 생각했다.

```sql
TRUNCATE TABLE reading_records
```

그런데 e2e 테스트들이 **"방금 만든 기록의 id는 1"** 이라고 기대하고 있다. `TRUNCATE`는 행만 지우고 "다음 id는 몇 번"이라는 카운터는 그대로 둔다. 그러면 두 번째 테스트에서 만든 기록의 id는 2가 되고 테스트가 깨진다.

```sql
TRUNCATE TABLE "reading_records" RESTART IDENTITY CASCADE
```

`RESTART IDENTITY`가 카운터까지 1로 되돌린다. SQLite에서는 DB 자체가 새로 생겼으니 생각할 필요가 없던 문제였다. **격리를 공짜로 받고 있었다는 걸 잃고 나서야 알았다.**

### 7. 없는 id를 지우면 404가 아니라 500

Prisma의 `update`와 `delete`는 대상이 없으면 `P2025`라는 자체 오류를 던진다. 이건 NestJS가 모르는 오류라 그대로 500이 된다.

그래서 서비스에서 먼저 `findOne`을 부른다.

```ts
async remove(id: number): Promise<void> {
  await this.findOne(id);   // 없으면 여기서 NotFoundException
  await this.prisma.readingRecord.delete({ where: { id } });
}
```

질의가 두 번 나가서 아깝긴 하다. 나중에 예외 필터를 배우면 `P2025`를 404로 바꿔주는 방법으로 정리할 수 있을 것 같다.

## 어떻게 확인했나

도커를 아직 설치하지 못해서, 확인은 두 단계로 나뉘었다.

**도커 없이 확인한 것:**

```bash
pnpm exec tsc --noEmit    # 타입 검사 — 통과
pnpm lint                 # 린트 — 통과
pnpm build                # 빌드 — 통과
```

**도커 설치 후 확인할 것:**

```bash
pnpm db:up
pnpm migrate:deploy
pnpm test          # 단위 테스트
pnpm test:e2e      # e2e 테스트
pnpm start:dev     # 실제 요청으로 CRUD 확인
```

타입 검사가 통과했다는 건 "코드가 문법적으로 맞물린다"까지만 뜻한다. **SQL이 실제로 도는지는 별개다.** 이 구분은 3단계에서 배운 그것과 같다 — 타입은 컴파일 시점, 실행은 런타임.

## 아직 모르는 것

- **커넥션 풀.** SQLite에는 없던 개념이다. PostgreSQL은 접속 하나하나가 서버의 자원이라 개수를 관리해야 한다고 한다. `PrismaService`가 지금 몇 개를 쓰고 있는지 모른다.
- **트랜잭션.** 지금은 질의가 전부 한 개씩이라 필요가 없었다. `remove`에서 `findOne` + `delete`가 두 번 나가는 게 사실 트랜잭션이 필요한 모양 아닌가?
- **`P2025` 같은 Prisma 오류를 예외 필터로 한 번에 처리하기.** 지금은 `findOne`을 먼저 부르는 방식으로 피해 갔다.
- **테스트가 느려지면 어떻게 하나.** 지금은 파일이 둘뿐이라 컨테이너를 두 번 띄우면 되지만, 파일이 열 개가 되면 어떻게 하지?
- **운영에서는 마이그레이션을 언제 실행하나.** 앱 시작 시 자동 실행이 위험하다는 건 6단계에서 겪었는데, 그럼 배포 파이프라인 어디에 넣는 게 맞는지 모르겠다.
