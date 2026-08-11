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
} from '@nestjs/common';
import { ReadingRecordsService } from './reading-records.service';
import type { ReadingRecord } from './reading-record.interface';
import { CreateReadingRecordDto } from './dto/create-reading-record.dto';
import { UpdateReadingRecordDto } from './dto/update-reading-record.dto';

@Controller('reading-records')
export class ReadingRecordsController {
  constructor(private readonly readingRecordsService: ReadingRecordsService) {}

  @Post()
  create(
    @Body() createReadingRecordDto: CreateReadingRecordDto,
  ): ReadingRecord {
    return this.readingRecordsService.create(createReadingRecordDto);
  }

  @Get()
  findAll(): ReadingRecord[] {
    return this.readingRecordsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): ReadingRecord {
    return this.readingRecordsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReadingRecordDto: UpdateReadingRecordDto,
  ): ReadingRecord {
    return this.readingRecordsService.update(id, updateReadingRecordDto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number): void {
    this.readingRecordsService.remove(id);
  }
}
