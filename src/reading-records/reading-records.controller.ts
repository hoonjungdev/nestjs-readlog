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
import { ReadingRecord } from '../generated/prisma/client';
import { CreateReadingRecordDto } from './dto/create-reading-record.dto';
import { UpdateReadingRecordDto } from './dto/update-reading-record.dto';
import { FindReadingRecordsDto } from './dto/find-reading-records.dto';

@Controller('reading-records')
export class ReadingRecordsController {
  constructor(private readonly readingRecordsService: ReadingRecordsService) {}

  @Post()
  create(
    @Body() createReadingRecordDto: CreateReadingRecordDto,
  ): Promise<ReadingRecord> {
    return this.readingRecordsService.create(createReadingRecordDto);
  }

  @Get()
  findAll(
    @Query() query: FindReadingRecordsDto,
  ): Promise<PaginatedResult<ReadingRecord>> {
    return this.readingRecordsService.findAll(
      query.status,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ReadingRecord> {
    return this.readingRecordsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReadingRecordDto: UpdateReadingRecordDto,
  ): Promise<ReadingRecord> {
    return this.readingRecordsService.update(id, updateReadingRecordDto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.readingRecordsService.remove(id);
  }
}
