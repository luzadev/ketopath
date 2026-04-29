-- CreateTable
CREATE TABLE "daily_check_ins" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "energy" INTEGER,
    "sleep" INTEGER,
    "hunger" INTEGER,
    "mood" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_check_ins_user_id_date_idx" ON "daily_check_ins"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_check_ins_user_id_date_key" ON "daily_check_ins"("user_id", "date");

-- AddForeignKey
ALTER TABLE "daily_check_ins" ADD CONSTRAINT "daily_check_ins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
