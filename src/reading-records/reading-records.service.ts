import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateReadingRecordDto } from './dto/create-reading-record.dto';
import { UpdateReadingRecordDto } from './dto/update-reading-record.dto';
import type { ReadingRecord } from './reading-record.interface';

@Injectable()
export class ReadingRecordsService {
  private readonly readingRecords: ReadingRecord[] = [];
  private nextId = 1;

  create(createReadingRecordDto: CreateReadingRecordDto): ReadingRecord {
    const readingRecord: ReadingRecord = {
      id: this.nextId,
      title: createReadingRecordDto.title,
      author: createReadingRecordDto.author,
    };

    this.nextId += 1;
    this.readingRecords.push(readingRecord);

    return readingRecord;
  }

  findAll(): ReadingRecord[] {
    return this.readingRecords;
  }

  findOne(id: number): ReadingRecord {
    const readingRecord = this.readingRecords.find(
      (record) => record.id === id,
    );

    if (!readingRecord) {
      throw new NotFoundException(`Reading record with ID ${id} not found`);
    }

    return readingRecord;
  }

  update(
    id: number,
    updateReadingRecordDto: UpdateReadingRecordDto,
  ): ReadingRecord {
    const readingRecord = this.findOne(id);

    Object.assign(readingRecord, updateReadingRecordDto);

    return readingRecord;
  }

  remove(id: number): void {
    const readingRecord = this.findOne(id);
    const index = this.readingRecords.indexOf(readingRecord);

    this.readingRecords.splice(index, 1);
  }
}
