import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateReadingRecordDto } from './dto/create-reading-record.dto';
import { UpdateReadingRecordDto } from './dto/update-reading-record.dto';
import { ReadingRecord } from './reading-record.entity';

@Injectable()
export class ReadingRecordsService {
  // 저장소(Repository)는 reading_records 테이블을 다루는 객체다.
  // 직접 new로 만들지 않고 Nest가 주입해준다.
  constructor(
    @InjectRepository(ReadingRecord)
    private readonly readingRecordsRepository: Repository<ReadingRecord>,
  ) {}

  async create(
    createReadingRecordDto: CreateReadingRecordDto,
  ): Promise<ReadingRecord> {
    // create는 메모리에 엔티티 객체를 만들 뿐 DB에 저장하지 않는다.
    const readingRecord = this.readingRecordsRepository.create({
      title: createReadingRecordDto.title,
      author: createReadingRecordDto.author,
    });

    // 실제로 INSERT가 실행되는 지점. 저장된 뒤 id가 채워져 돌아온다.
    return this.readingRecordsRepository.save(readingRecord);
  }

  async findAll(): Promise<ReadingRecord[]> {
    return this.readingRecordsRepository.find();
  }

  async findOne(id: number): Promise<ReadingRecord> {
    // 찾지 못하면 예외가 아니라 null을 돌려준다.
    const readingRecord = await this.readingRecordsRepository.findOneBy({ id });

    if (!readingRecord) {
      throw new NotFoundException(`Reading record with ID ${id} not found`);
    }

    return readingRecord;
  }

  async update(
    id: number,
    updateReadingRecordDto: UpdateReadingRecordDto,
  ): Promise<ReadingRecord> {
    const readingRecord = await this.findOne(id);

    // 요청에 실제로 담겨 온 필드만 반영한다.
    // ValidationPipe를 거친 DTO는 보내지 않은 필드도 undefined 값으로 갖고 있어서,
    // Object.assign을 쓰면 이 엔티티 객체의 기존 값이 undefined로 덮인다.
    // (DB는 save가 undefined를 무시해 안전하지만, 이 객체가 그대로 응답이 된다.)
    if (updateReadingRecordDto.title !== undefined) {
      readingRecord.title = updateReadingRecordDto.title;
    }

    if (updateReadingRecordDto.author !== undefined) {
      readingRecord.author = updateReadingRecordDto.author;
    }

    // id가 이미 있는 엔티티라 save는 INSERT가 아니라 UPDATE를 실행한다.
    return this.readingRecordsRepository.save(readingRecord);
  }

  async remove(id: number): Promise<void> {
    const readingRecord = await this.findOne(id);

    await this.readingRecordsRepository.remove(readingRecord);
  }
}
