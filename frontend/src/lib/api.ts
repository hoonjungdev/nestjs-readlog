import type {
  CreateReadingRecordInput,
  ReadingRecord,
  UpdateReadingRecordInput,
} from './types';

// Vite는 VITE_ 접두사가 붙은 환경 변수만 import.meta.env로 클라이언트 코드에 노출한다
// (그 외 변수는 실수로라도 브라우저 번들에 섞여 들어가지 않게 막아준다).
// frontend/.env에 값이 없으면 로컬 개발 기본값인 3000번 포트를 그대로 쓴다.
const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

// NestJS가 예외를 던지면 보통 { statusCode, message, error } 형태의 JSON을 응답한다.
// ValidationPipe가 걸리는 경우 message는 문자열 배열이다(필드마다 에러 메시지 하나씩).
interface NestErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

// fetch는 404/500이 나도 예외를 던지지 않고 그냥 response를 반환한다
// (네트워크 자체가 실패했을 때만 throw한다). 그래서 res.ok를 직접 확인해서
// 실패 응답이면 여기서 Error로 바꿔 던져줘야, 호출하는 쪽에서 try/catch로 잡을 수 있다.
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as NestErrorBody | null;
    const message = body
      ? Array.isArray(body.message)
        ? body.message.join(', ')
        : body.message
      : res.statusText;
    throw new Error(message);
  }

  // DELETE는 204 No Content라 본문이 없다 — json()을 부르면 파싱 에러가 난다.
  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export function fetchReadingRecords(): Promise<ReadingRecord[]> {
  return request<ReadingRecord[]>('/reading-records');
}

export function createReadingRecord(
  input: CreateReadingRecordInput,
): Promise<ReadingRecord> {
  return request<ReadingRecord>('/reading-records', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateReadingRecord(
  id: number,
  input: UpdateReadingRecordInput,
): Promise<ReadingRecord> {
  return request<ReadingRecord>(`/reading-records/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteReadingRecord(id: number): Promise<void> {
  return request<void>(`/reading-records/${id}`, { method: 'DELETE' });
}
