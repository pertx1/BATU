-- AlterTable
ALTER TABLE "Task" ADD COLUMN "externalKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Task_userId_externalKey_key" ON "Task"("userId", "externalKey");
