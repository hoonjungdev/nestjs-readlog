import { Injectable, NotFoundException } from '@nestjs/common';
import { ReadingRecord, ReadingStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReadingRecordDto } from './dto/create-reading-record.dto';
import { UpdateReadingRecordDto } from './dto/update-reading-record.dto';

@Injectable()
export class ReadingRecordsService {
  // TypeORM에서는 테이블마다 Repository를 하나씩 주입받았지만,
  // Prisma는 클라이언트 하나에 모든 테이블이 속성으로 달려 있다.
  // 모델 ReadingRecord → prisma.readingRecord (첫 글자만 소문자)
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createReadingRecordDto: CreateReadingRecordDto,
  ): Promise<ReadingRecord> {
    // TypeORM은 create()로 객체를 만들고 save()로 저장하는 2단계였다.
    // Prisma의 create()는 한 번에 INSERT를 실행하고 저장된 행을 돌려준다.
    return this.prisma.readingRecord.create({
      data: {
        title: createReadingRecordDto.title,
        author: createReadingRecordDto.author,
        // status가 undefined면 Prisma는 이 컬럼을 INSERT문에서 아예 빼고,
        // 그러면 DB의 DEFAULT('want_to_read')가 적용된다.
        // 기본값을 여기 또 적으면 schema.prisma와 두 곳으로 흩어진다.
        status: createReadingRecordDto.status,
        // rating은 DEFAULT가 없다. "별점 없음"을 null로 분명히 적어 넣는다.
        rating: createReadingRecordDto.rating ?? null,
      },
    });
  }

  async findAll(status?: ReadingStatus): Promise<ReadingRecord[]> {
    return this.prisma.readingRecord.findMany({
      // PostgreSQL은 ORDER BY가 없으면 행의 순서를 보장하지 않는다.
      // (SQLite에서는 우연히 넣은 순서대로 나왔을 뿐이다.)
      // 응답 순서가 들쭉날쭉해지지 않도록 명시한다.
      orderBy: { id: 'asc' },
      where: { status },
    });
  }

  async findOne(id: number): Promise<ReadingRecord> {
    // 찾지 못하면 예외가 아니라 null을 돌려준다.
    const readingRecord = await this.prisma.readingRecord.findUnique({
      where: { id },
    });

    if (!readingRecord) {
      throw new NotFoundException(`Reading record with ID ${id} not found`);
    }

    return readingRecord;
  }

  async update(
    id: number,
    updateReadingRecordDto: UpdateReadingRecordDto,
  ): Promise<ReadingRecord> {
    // 없는 id면 여기서 NotFoundException이 난다.
    // (이걸 생략하면 아래 update가 Prisma 고유의 P2025 오류를 던져 500이 된다.)
    await this.findOne(id);

    // TypeORM에서는 필드마다 `!== undefined`를 직접 확인해야 했다.
    // Prisma의 update는 그 규칙을 이미 갖고 있다.
    //   undefined → UPDATE문에서 제외 (건드리지 않음)
    //   null      → NULL로 갱신       (값을 비움)
    // 그래서 DTO 값을 그대로 넘기기만 하면 된다.
    //
    // 또 하나 달라진 점: update는 갱신된 행을 DB에서 다시 읽어 돌려준다.
    // 예전처럼 "메모리 위 객체가 undefined로 오염된 채 응답이 되는" 사고가 구조적으로 생기지 않는다.
    return this.prisma.readingRecord.update({
      where: { id },
      data: {
        title: updateReadingRecordDto.title,
        author: updateReadingRecordDto.author,
        status: updateReadingRecordDto.status,
        rating: updateReadingRecordDto.rating,
      },
    });
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);

    await this.prisma.readingRecord.delete({ where: { id } });
  }
}
