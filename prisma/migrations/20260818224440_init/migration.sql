-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "reading_status" AS ENUM ('want_to_read', 'reading', 'finished');

-- CreateTable
CREATE TABLE "reading_records" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "status" "reading_status" NOT NULL DEFAULT 'want_to_read',
    "rating" INTEGER,

    CONSTRAINT "reading_records_pkey" PRIMARY KEY ("id")
);

