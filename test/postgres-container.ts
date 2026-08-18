import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { PrismaService } from '../src/prisma/prisma.service';

// SQLite에는 ':memory:'라는 공짜 격리 수단이 있었다. 테스트마다 빈 DB가 새로 생겼다.
// PostgreSQL에는 그런 게 없어서, 테스트 전용 PostgreSQL을 실제로 하나 띄운다.
//
// Testcontainers가 하는 일:
//   1) 도커 컨테이너로 PostgreSQL을 띄우고
//   2) 남는 포트를 아무거나 골라 연결해주고 (개발용 5432와 겹치지 않는다)
//   3) 접속을 받을 준비가 될 때까지 기다렸다가
//   4) 테스트가 끝나면 컨테이너째로 지운다
//
// 개발용 DB를 건드리지 않으니 안전하고, 격리도 확실하다.
// 대신 도커가 실행 중이어야 하고 컨테이너를 띄우는 데 몇 초가 걸린다.

// 개발용과 같은 이미지를 쓴다. 버전이 다르면 테스트는 통과하는데 운영에서 깨질 수 있다.
const POSTGRES_IMAGE = 'postgres:18-alpine';

const PRISMA_CLI = join(__dirname, '..', 'node_modules', '.bin', 'prisma');

export async function startTestDatabase(): Promise<StartedPostgreSqlContainer> {
  const container = await new PostgreSqlContainer(POSTGRES_IMAGE).start();

  // 컨테이너가 실제로 잡은 주소와 포트가 여기 들어 있다.
  const databaseUrl = container.getConnectionUri();

  // PrismaService는 생성자에서 process.env.DATABASE_URL을 읽는다.
  // 그러니 Nest 모듈을 만들기 "전에" 여기서 바꿔치기해야 한다.
  process.env.DATABASE_URL = databaseUrl;

  // 방금 만들어진 DB는 완전히 비어 있어서 테이블조차 없다.
  // 마이그레이션을 실행해 스키마를 만든다.
  //
  // prisma db push(스키마를 그대로 밀어넣기)가 아니라 migrate deploy를 쓰는 이유:
  // 이렇게 해야 "우리가 커밋한 마이그레이션 파일이 정말 올바른가"까지 테스트가 검증한다.
  // db push를 쓰면 마이그레이션이 잘못돼 있어도 테스트는 통과해버린다.
  execFileSync(PRISMA_CLI, ['migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'ignore',
  });

  return container;
}

// 테스트끼리 데이터가 섞이지 않게 매 테스트 전에 테이블을 비운다.
//
// DELETE가 아니라 TRUNCATE ... RESTART IDENTITY를 쓰는 이유:
// DELETE는 행만 지우고 "다음 id는 몇 번" 카운터는 그대로 둔다.
// 그러면 두 번째 테스트에서 만든 기록의 id가 1이 아니라 2가 되어,
// id를 1로 기대하는 테스트들이 깨진다.
export async function resetTestDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "reading_records" RESTART IDENTITY CASCADE',
  );
}
