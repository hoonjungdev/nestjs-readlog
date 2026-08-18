import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ReadingStatus } from '../../generated/prisma/client';

export class UpdateReadingRecordDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  author?: string;

  @IsOptional()
  @IsEnum(ReadingStatus)
  status?: ReadingStatus;

  // 타입이 number | null인 이유:
  // 이 API에서 세 요청은 서로 다른 뜻이다.
  //   { "rating": 3 }     → 3점으로 바꿔라
  //   { }                 → 별점은 건드리지 마라   (필드 없음 = undefined)
  //   { "rating": null }  → 별점을 지워라          (명시적으로 비움)
  //
  // @IsOptional()은 값이 undefined "또는 null"이면 나머지 검증을 건너뛴다.
  // 그래서 null이 @IsInt()에 걸리지 않고 그대로 통과해 서비스까지 온다.
  // 그다음은 Prisma가 이 둘을 구분해준다 (undefined = 그대로, null = 비움).
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number | null;
}
