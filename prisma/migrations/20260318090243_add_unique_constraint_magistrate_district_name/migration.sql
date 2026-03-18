/*
  Warnings:

  - A unique constraint covering the columns `[district_id,name]` on the table `magistrates` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "magistrates_district_id_name_key" ON "magistrates"("district_id", "name");
