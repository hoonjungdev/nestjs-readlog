import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ReadingRecordsService,
  PaginatedResult,
} from './reading-records.service';
import { CreateReadingRecordDto } from './dto/create-reading-record.dto';
import { UpdateReadingRecordDto } from './dto/update-reading-record.dto';
import { FindReadingRecordsDto } from './dto/find-reading-records.dto';
import { ReadingRecordResponseDto } from './dto/reading-record-response.dto';

@Controller('reading-records')
export class ReadingRecordsController {
  constructor(private readonly readingRecordsService: ReadingRecordsService) {}

  @Post()
  create(
    @Body() createReadingRecordDto: CreateReadingRecordDto,
  ): Promise<ReadingRecordResponseDto> {
    return this.readingRecordsService.create(createReadingRecordDto);
  }

  @Get()
  findAll(
    @Query() query: FindReadingRecordsDto,
  ): Promise<PaginatedResult<ReadingRecordResponseDto>> {
    return this.readingRecordsService.findAll({
      status: query.status,
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      order: query.order,
    });
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ReadingRecordResponseDto> {
    return this.readingRecordsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReadingRecordDto: UpdateReadingRecordDto,
  ): Promise<ReadingRecordResponseDto> {
    return this.readingRecordsService.update(id, updateReadingRecordDto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.readingRecordsService.remove(id);
  }
}
