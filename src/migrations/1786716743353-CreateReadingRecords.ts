import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReadingRecords1786716743353 implements MigrationInterface {
  name = 'CreateReadingRecords1786716743353';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "reading_records" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "title" varchar NOT NULL, "author" varchar NOT NULL)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "reading_records"`);
  }
}
