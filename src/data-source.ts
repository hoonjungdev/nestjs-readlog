// TypeORM CLI(마이그레이션 생성/실행 명령)는 Nest 앱을 거치지 않고 직접 DB에 붙는다.
// 그래서 CLI가 읽을 수 있는 독립적인 DataSource 파일이 따로 필요하다.
// AppModule은 여기서 만든 dataSourceOptions를 그대로 가져다 쓰므로
// 앱과 CLI가 서로 다른 설정을 보는 일이 생기지 않는다.
import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { CreateReadingRecords1786716743353 } from './migrations/1786716743353-CreateReadingRecords';
import { AddStatusAndRating1786800197352 } from './migrations/1786800197352-AddStatusAndRating';
import { ReadingRecord } from './reading-records/reading-record.entity';

// 평소에는 파일 DB를 쓰고, 테스트에서는 DATABASE_PATH로 인메모리 DB를 지정한다.
const databasePath = process.env.DATABASE_PATH ?? 'readlog.sqlite';

// 메모리 DB는 프로세스가 끝나면 사라지므로, 앱이 뜰 때마다 테이블을 새로 만들어야 한다.
// 반대로 파일 DB는 이미 만들어진 테이블이 남아 있으므로 그럴 필요가 없다.
// AppModule이 migrationsRun을 결정할 때 쓴다.
export const isInMemoryDatabase = databasePath === ':memory:';

export const dataSourceOptions: DataSourceOptions = {
  type: 'better-sqlite3',
  database: databasePath,
  entities: [ReadingRecord],
  // 실행할 마이그레이션 목록. 새 마이그레이션을 만들 때마다 여기에 추가한다.
  // 흔히 쓰는 'dist/migrations/*.js' 같은 파일 경로 패턴(glob) 대신 클래스를 직접 import한다.
  // 경로 패턴은 빌드 결과(dist)가 최신일 때만 동작해서,
  // 빌드하지 않고 e2e 테스트를 돌리면 마이그레이션이 하나도 로드되지 않는다.
  // 순서가 곧 실행 순서다. 새 마이그레이션은 항상 뒤에 붙인다.
  migrations: [
    CreateReadingRecords1786716743353,
    AddStatusAndRating1786800197352,
  ],
  // 이제 테이블 구조는 마이그레이션이 책임진다. 자동 동기화는 끈다.
  synchronize: false,
};

// CLI는 이 파일의 default export를 DataSource로 인식한다.
export default new DataSource(dataSourceOptions);
