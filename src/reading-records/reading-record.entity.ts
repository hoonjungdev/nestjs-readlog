import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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
}
