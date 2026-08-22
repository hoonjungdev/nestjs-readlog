import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ReadingStatus } from '../../generated/prisma/client';

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
}
