import { IsNotEmpty, IsString } from 'class-validator';

export class CreateReadingRecordDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  author: string;
}
