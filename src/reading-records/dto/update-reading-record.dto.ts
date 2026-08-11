import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateReadingRecordDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  author?: string;
}
