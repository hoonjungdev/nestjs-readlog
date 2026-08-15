import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ReadingStatus } from '../reading-status.enum';

export class CreateReadingRecordDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  author: string;

  // 보내지 않아도 된다. 그때는 '읽고 싶은 책'으로 시작한다.
  // @IsEnum은 실행 중에 ReadingStatus의 값 목록과 대조하므로
  // 유니온 타입이 아니라 enum이어야 한다.
  @IsOptional()
  @IsEnum(ReadingStatus)
  status?: ReadingStatus;

  // 아직 안 읽은 책에 별점을 매길 이유가 없으므로 선택 항목이다.
  // @IsInt()는 3.5 같은 소수와 '5' 같은 문자열을 모두 거부한다.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
}
