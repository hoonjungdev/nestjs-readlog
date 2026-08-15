import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ReadingStatus } from './reading-status.enum';

// 이 클래스 하나가 reading_records 테이블의 구조를 정의한다.
// TypeORM은 실행 시점에 이 데코레이터들이 남긴 메타데이터를 읽어 테이블을 다룬다.
@Entity('reading_records')
export class ReadingRecord {
  // 기본 키(primary key)이면서 값을 DB가 자동으로 매겨준다.
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  author: string;

  // 필수 컬럼. SQLite에는 enum 타입이 없어서 TypeORM의 'simple-enum'을 쓴다.
  // 실제로는 문자열 컬럼 + "이 값들만 허용"이라는 CHECK 제약으로 만들어진다.
  // default는 TypeScript의 기본값이 아니라 DB 컬럼의 DEFAULT 제약이다.
  // 즉 INSERT문에서 이 컬럼을 빼먹었을 때 DB가 대신 채워 넣는 값이다.
  @Column({
    type: 'simple-enum',
    enum: ReadingStatus,
    default: ReadingStatus.WantToRead,
  })
  status: ReadingStatus;

  // 선택 컬럼. "값이 없을 수 있다"를 두 곳에 따로 알려줘야 한다.
  //   nullable: true  → DB에게 (NOT NULL 제약을 걸지 마라)
  //   number | null   → TypeScript에게 (읽을 때 null일 수 있으니 확인하고 써라)
  // 둘 중 하나만 하면 어긋난다. nullable만 쓰면 타입은 number라고 믿는데 실제로는
  // null이 들어와 런타임에 터지고, | null만 쓰면 DB가 NOT NULL을 걸어 INSERT가 실패한다.
  @Column({ type: 'integer', nullable: true })
  rating: number | null;
}
