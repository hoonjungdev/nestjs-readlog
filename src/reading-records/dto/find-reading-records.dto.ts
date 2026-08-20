import { IsOptional, IsEnum } from 'class-validator';
import { ReadingStatus } from '../../generated/prisma/client';

export class FindReadingRecordsDto {
  @IsOptional()
  @IsEnum(ReadingStatus)
  status?: ReadingStatus;
}
