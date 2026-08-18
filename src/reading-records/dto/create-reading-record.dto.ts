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

export class CreateReadingRecordDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  author: string;

  // 보내지 않아도 된다. 그때는 '읽고 싶은 책'으로 시작한다.
  //
  // ReadingStatus는 이제 우리가 손으로 쓴 enum이 아니라
  // schema.prisma의 enum 정의를 보고 Prisma가 만들어준 것이다.
  // 값 목록의 원본이 스키마 한 곳뿐이라 DB와 검증이 어긋날 수 없다.
  // @IsEnum은 "실행 중에" 값 목록을 훑어보므로, 컴파일하면 사라지는
  // 유니온 타입이 아니라 실제 객체로 남는 형태여야 한다는 점은 그대로다.
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
