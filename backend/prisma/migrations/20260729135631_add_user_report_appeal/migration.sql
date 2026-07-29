-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('Post', 'User', 'Transaction');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('Pending', 'Under_Investigation', 'Violation_Confirmed', 'Report_Dismissed');

-- CreateEnum
CREATE TYPE "AppealStatus" AS ENUM ('Pending', 'Under_Review', 'Approved', 'Rejected');

-- CreateTable
CREATE TABLE "User" (
    "user_id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "first_name_en" VARCHAR(100) NOT NULL,
    "last_name_en" VARCHAR(100) NOT NULL,
    "first_name_th" VARCHAR(100) NOT NULL,
    "last_name_th" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(20),
    "status" VARCHAR(20) NOT NULL DEFAULT 'Active',
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "Report" (
    "report_id" SERIAL NOT NULL,
    "reporter_id" INTEGER NOT NULL,
    "report_type" "ReportType" NOT NULL,
    "target_id" INTEGER NOT NULL,
    "reason_category" VARCHAR(100) NOT NULL,
    "details" TEXT,
    "evidence_urls" JSONB,
    "status" "ReportStatus" NOT NULL DEFAULT 'Pending',
    "handled_by" INTEGER,
    "resolution_note" TEXT,
    "handled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("report_id")
);

-- CreateTable
CREATE TABLE "Appeal" (
    "appeal_id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "appellant_id" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence_urls" JSONB,
    "status" "AppealStatus" NOT NULL DEFAULT 'Pending',
    "handled_by" INTEGER,
    "resolution_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handled_at" TIMESTAMP(3),

    CONSTRAINT "Appeal_pkey" PRIMARY KEY ("appeal_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_handled_by_fkey" FOREIGN KEY ("handled_by") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "Report"("report_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_appellant_id_fkey" FOREIGN KEY ("appellant_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_handled_by_fkey" FOREIGN KEY ("handled_by") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
