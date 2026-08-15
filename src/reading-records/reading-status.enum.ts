// 독서 상태는 정해진 세 값 중 하나만 가질 수 있다.
//
// type ReadingStatus = 'want_to_read' | ... (유니온 타입) 대신 enum을 쓰는 이유:
// 유니온 타입은 컴파일하면 사라지므로 실행 중에는 값 목록이 존재하지 않는다.
// 그런데 DTO의 @IsEnum()과 DB의 CHECK 제약은 둘 다 "실행 중에" 값 목록이 필요하다.
// enum은 컴파일 후에도 객체로 남기 때문에, 목록을 여기 한 곳에만 적고 양쪽에서 쓸 수 있다.
export enum ReadingStatus {
  WantToRead = 'want_to_read',
  Reading = 'reading',
  Finished = 'finished',
}
