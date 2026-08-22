import { IsOptional, IsEnum, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { Prisma, ReadingStatus } from '../../generated/prisma/client';

// 정렬에 쓸 수 있는 컬럼의 허용 목록(whitelist).
//
// status나 page와 달리 sort는 성격이 다르다. 지금까지 받은 값은 "데이터"였지만
// sort는 쿼리의 구조, 즉 컬럼 이름 자체를 사용자가 정하는 것이다.
// 검증 없이 그대로 넘기면 사용자가 아무 이름이나 적어 보낼 수 있다.
//
// Prisma가 만들어주는 Prisma.ReadingRecordScalarFieldEnum에도 컬럼 이름이
// 모두 들어 있어서 그걸 그대로 쓰면 편하다. 하지만 그러면 schema.prisma에
// 컬럼을 추가하는 순간 그 컬럼이 자동으로 정렬 가능해진다 — 응답 전용 타입에서
// 막았던 opt-out 문제와 똑같다. 그래서 여기 직접 적는다.
export const SORTABLE_FIELDS = [
  'id',
  'title',
  'author',
  'status',
  'rating',
] as const;

// as const 덕분에 SORTABLE_FIELDS의 타입은 string[]이 아니라
// readonly ['id', 'title', ...]로 좁혀진다. [number]로 그 원소들의
// 유니온 타입('id' | 'title' | ...)을 꺼내 쓸 수 있다.
export type SortableField = (typeof SORTABLE_FIELDS)[number];

export class FindReadingRecordsDto {
  @IsOptional()
  @IsEnum(ReadingStatus)
  status?: ReadingStatus;

  // 쿼리 파라미터는 항상 문자열로 들어오므로 @Type(() => Number)로
  // 검증 전에 숫자로 바꾼다. 순서 중요: @Type이 먼저 실행되고 그 결과를
  // @IsInt() 등 나머지 데코레이터가 검사한다.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  // @IsIn은 "이 배열 안에 있는 값인가"를 실행 중에 확인한다.
  // SortableField라는 타입 표기는 컴파일하면 사라지므로 이게 없으면
  // ?sort=아무거나가 그대로 Prisma까지 넘어가 500이 된다 (실제로 확인함).
  @IsOptional()
  @IsIn(SORTABLE_FIELDS)
  sort: SortableField = 'id';

  // Prisma.SortOrder는 { asc: 'asc', desc: 'desc' } 형태의 실제 객체라서
  // ReadingStatus처럼 @IsEnum에 그대로 넘길 수 있다.
  // 값 목록의 원본이 Prisma 한 곳이므로 우리가 따로 적을 필요가 없다.
  @IsOptional()
  @IsEnum(Prisma.SortOrder)
  order: Prisma.SortOrder = 'asc';
}
