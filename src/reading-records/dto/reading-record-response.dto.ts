import { ReadingStatus } from '../../generated/prisma/client';

/**
 * API 응답으로 나가는 독서 기록의 모양.
 *
 * Prisma가 만들어주는 ReadingRecord(= 테이블의 모양)를 그대로 응답에 쓰지 않고
 * 이 타입을 따로 두는 이유는 "노출의 방향"을 뒤집기 위해서다.
 *
 *   엔티티를 그대로 반환 → schema.prisma에 컬럼을 추가하면 코드를 한 줄도
 *                          안 고쳐도 그 값이 API 응답에 자동으로 나간다 (opt-out).
 *   이 타입을 거쳐 반환  → 여기에 적지 않은 필드는 절대 나가지 않는다 (opt-in).
 *
 * 지금은 다섯 필드 모두 공개 대상이라 엔티티와 내용이 같다. 그래서 "왜 굳이"라고
 * 느껴질 수 있는데, 이 타입의 값은 오늘의 내용이 아니라 나중에 비공개 필드
 * (예: 로그인을 붙이면 생길 userId)가 추가될 때 아무 일도 일어나지 않는다는 점에 있다.
 *
 * 대신 대가도 있다: 공개하고 싶은 필드를 새로 추가할 때는 schema.prisma와
 * 이 파일 두 곳을 모두 고쳐야 한다. 빠뜨려도 컴파일 오류가 나지 않으므로
 * (없는 필드를 넣으면 오류가 나지만, 덜 내보내는 건 오류가 아니다) 직접 챙겨야 한다.
 */
export class ReadingRecordResponseDto {
  id: number;
  title: string;
  author: string;
  status: ReadingStatus;
  rating: number | null;
}
