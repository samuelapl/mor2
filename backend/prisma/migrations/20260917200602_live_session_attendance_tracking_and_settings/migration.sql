-- AlterTable
ALTER TABLE "attendance" ADD COLUMN     "active_seconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "percentage" DOUBLE PRECISION,
ADD COLUMN     "rejoin_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "live_sessions" ADD COLUMN     "actual_ended_at" TIMESTAMP(3),
ADD COLUMN     "actual_started_at" TIMESTAMP(3),
ADD COLUMN     "allow_view_attendance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "attendance_threshold" INTEGER NOT NULL DEFAULT 60;

-- CreateTable
CREATE TABLE "attendance_logs" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "attendance_id" TEXT,
    "user_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "duration_seconds" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "attendance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "attendance_logs_session_id_user_id_idx" ON "attendance_logs"("session_id", "user_id");

-- CreateIndex
CREATE INDEX "attendance_logs_session_id_idx" ON "attendance_logs"("session_id");

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
