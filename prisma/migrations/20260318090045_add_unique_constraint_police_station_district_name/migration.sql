/*
  Warnings:

  - A unique constraint covering the columns `[district_id,name]` on the table `police_stations` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "police_stations_district_id_name_key" ON "police_stations"("district_id", "name");
