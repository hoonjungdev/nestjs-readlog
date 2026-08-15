import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatusAndRating1786800197352 implements MigrationInterface {
  name = 'AddStatusAndRating1786800197352';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "temporary_reading_records" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "title" varchar NOT NULL, "author" varchar NOT NULL, "status" varchar CHECK( "status" IN ('want_to_read','reading','finished') ) NOT NULL DEFAULT ('want_to_read'), "rating" integer)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_reading_records"("id", "title", "author") SELECT "id", "title", "author" FROM "reading_records"`,
    );
    await queryRunner.query(`DROP TABLE "reading_records"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_reading_records" RENAME TO "reading_records"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reading_records" RENAME TO "temporary_reading_records"`,
    );
    await queryRunner.query(
      `CREATE TABLE "reading_records" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "title" varchar NOT NULL, "author" varchar NOT NULL)`,
    );
    await queryRunner.query(
      `INSERT INTO "reading_records"("id", "title", "author") SELECT "id", "title", "author" FROM "temporary_reading_records"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_reading_records"`);
  }
}
