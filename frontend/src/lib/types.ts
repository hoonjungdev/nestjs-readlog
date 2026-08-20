// 백엔드의 단일 원본은 prisma/schema.prisma지만, 프론트엔드는 그 파일을 import할 수 없다
// (서로 다른 프로젝트/런타임이다). 그래서 백엔드가 실제로 응답하는 JSON 모양을 여기 손으로
// 맞춰 적어둔다 — 백엔드의 enum이나 DTO가 바뀌면 이 파일도 함께 고쳐야 한다.

// prisma/schema.prisma의 ReadingStatus enum과 값이 동일해야 한다.
export type ReadingStatus = 'want_to_read' | 'reading' | 'finished';

export const READING_STATUSES: ReadingStatus[] = [
  'want_to_read',
  'reading',
  'finished',
];

export const READING_STATUS_LABELS: Record<ReadingStatus, string> = {
  want_to_read: '읽고 싶은 책',
  reading: '읽는 중',
  finished: '다 읽음',
};

// GET /reading-records, GET /reading-records/:id 등이 실제로 내려주는 모양.
export interface ReadingRecord {
  id: number;
  title: string;
  author: string;
  status: ReadingStatus;
  rating: number | null;
}

// POST /reading-records의 요청 바디.
// CreateReadingRecordDto와 같은 필드만 보내야 한다 — 서버의 ValidationPipe가
// whitelist: true, forbidNonWhitelisted: true로 설정돼 있어서, 정의 안 된 필드를
// 보내면 검증 단계에서 곧바로 400 에러가 난다.
export interface CreateReadingRecordInput {
  title: string;
  author: string;
  status?: ReadingStatus;
  rating?: number;
}

// PATCH /reading-records/:id의 요청 바디.
// rating을 null로 보내면 "지워라", 아예 필드를 안 보내면(undefined) "건드리지 마라"는
// 뜻이다 — UpdateReadingRecordDto의 규칙과 동일하다.
export interface UpdateReadingRecordInput {
  title?: string;
  author?: string;
  status?: ReadingStatus;
  rating?: number | null;
}
