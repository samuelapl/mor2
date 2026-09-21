-- AlterTable
ALTER TABLE "live_sessions" ADD COLUMN     "trainer_id" TEXT;

-- CreateIndex
CREATE INDEX "live_sessions_trainer_id_idx" ON "live_sessions"("trainer_id");

-- AddForeignKey
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
