import { Injectable, NotFoundException } from '@nestjs/common';
import { ReadingRecord, ReadingStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReadingRecordDto } from './dto/create-reading-record.dto';
import { UpdateReadingRecordDto } from './dto/update-reading-record.dto';
import { ReadingRecordResponseDto } from './dto/reading-record-response.dto';

// 지금은 findAll() 하나만 쓰지만, 목록 API가 늘어나면 그때마다 재사용한다.
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ReadingRecordsService {
  // TypeORM에서는 테이블마다 Repository를 하나씩 주입받았지만,
  // Prisma는 클라이언트 하나에 모든 테이블이 속성으로 달려 있다.
  // 모델 ReadingRecord → prisma.readingRecord (첫 글자만 소문자)
  constructor(private readonly prisma: PrismaService) {}

  // DB에서 꺼낸 행(ReadingRecord)을 API로 내보낼 모양으로 옮겨 담는다.
  // 여기 적지 않은 필드는 응답에 나가지 않는다.
  //
  // 반환 타입을 ReadingRecordResponseDto로 명시해 두면 타입스크립트가 두 가지를 잡아준다.
  //   - 필드를 빠뜨리면       → "Property 'title' is missing" 오류
  //   - 없는 필드를 적으면    → "Object literal may only specify known properties" 오류
  //     (객체 리터럴에만 적용되는 '초과 속성 검사'다.)
  //
  // 다만 그 검사에는 구멍이 있다. `return { ...record }`로 쓰면 스프레드로 펼친 속성은
  // 검사 대상이 아니라서 모든 컬럼이 새는데도 컴파일 오류가 나지 않는다.
  // 그래서 필드를 하나씩 적고, 응답에 나가는 키 목록은 테스트로 따로 못박아 둔다.
  private toResponse(record: ReadingRecord): ReadingRecordResponseDto {
    return {
      id: record.id,
      title: record.title,
      author: record.author,
      status: record.status,
      rating: record.rating,
    };
  }

  async create(
    createReadingRecordDto: CreateReadingRecordDto,
  ): Promise<ReadingRecordResponseDto> {
    // TypeORM은 create()로 객체를 만들고 save()로 저장하는 2단계였다.
    // Prisma의 create()는 한 번에 INSERT를 실행하고 저장된 행을 돌려준다.
    const createdRecord = await this.prisma.readingRecord.create({
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

    return this.toResponse(createdRecord);
  }

  async findAll(
    status?: ReadingStatus,
    page = 1,
    limit = 10,
  ): Promise<PaginatedResult<ReadingRecordResponseDto>> {
    const where = { status };

    // findMany와 count는 서로의 결과를 기다릴 필요가 없는 독립적인 쿼리라
    // Promise.all로 동시에 보낸다. 순서대로 await 하면 두 번째 쿼리가
    // 첫 번째 쿼리의 응답을 기다리는 동안 그냥 놀게 된다.
    const [data, total] = await Promise.all([
      this.prisma.readingRecord.findMany({
        // PostgreSQL은 ORDER BY가 없으면 행의 순서를 보장하지 않는다.
        // (SQLite에서는 우연히 넣은 순서대로 나왔을 뿐이다.)
        // 응답 순서가 들쭉날쭉해지지 않도록 명시한다. 페이지네이션에서는
        // 이게 없으면 페이지마다 순서가 달라져 같은 행이 중복되거나 빠질 수 있다.
        orderBy: { id: 'asc' },
        where,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.readingRecord.count({ where }),
    ]);

    return {
      data: data.map((record) => this.toResponse(record)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<ReadingRecordResponseDto> {
    // 찾지 못하면 예외가 아니라 null을 돌려준다.
    const readingRecord = await this.prisma.readingRecord.findUnique({
      where: { id },
    });

    if (!readingRecord) {
      throw new NotFoundException(`Reading record with ID ${id} not found`);
    }

    return this.toResponse(readingRecord);
  }

  async update(
    id: number,
    updateReadingRecordDto: UpdateReadingRecordDto,
  ): Promise<ReadingRecordResponseDto> {
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
    const updatedRecord = await this.prisma.readingRecord.update({
      where: { id },
      data: {
        title: updateReadingRecordDto.title,
        author: updateReadingRecordDto.author,
        status: updateReadingRecordDto.status,
        rating: updateReadingRecordDto.rating,
      },
    });

    return this.toResponse(updatedRecord);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);

    await this.prisma.readingRecord.delete({ where: { id } });
  }
}
