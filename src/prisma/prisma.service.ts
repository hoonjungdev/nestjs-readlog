import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

// PrismaClient는 Prisma가 만들어준, DB에 질의를 보내는 객체다.
// TypeORM의 Repository가 테이블 하나씩을 담당했다면
// PrismaClient는 모든 테이블을 한 객체가 담당한다 (prisma.readingRecord.findMany() 처럼).
//
// 그 PrismaClient를 상속해서 Nest가 관리하는 프로바이더로 만든다.
// 이렇게 해야 서비스에서 생성자 주입으로 받아 쓸 수 있고,
// 앱 하나에 연결도 하나만 유지된다(요청마다 new로 만들면 커넥션이 계속 늘어난다).
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // Prisma 7부터는 실제 DB 통신을 담당하는 "드라이버 어댑터"를 직접 넘겨야 한다.
    // PostgreSQL용은 @prisma/adapter-pg의 PrismaPg다.
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      // 없는 채로 두면 나중에 첫 쿼리에서야 알기 어려운 형태로 터진다.
      // 앱이 뜨는 시점에 분명한 메시지로 멈추는 편이 낫다.
      throw new Error(
        'DATABASE_URL 환경 변수가 없습니다. .env.example을 복사해 .env를 만드세요.',
      );
    }

    super({ adapter: new PrismaPg({ connectionString }) });
  }

  // Nest가 모듈을 다 준비한 직후 불러주는 약속된 이름의 메서드다.
  // 여기서 미리 접속해두면 첫 요청이 접속을 기다리지 않는다.
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  // 앱이 닫힐 때 커넥션을 정리한다.
  // 이게 없으면 테스트가 끝나도 프로세스가 살아남는다
  // (TypeORM에서 module.close()를 꼭 불러야 했던 것과 같은 이유다).
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
