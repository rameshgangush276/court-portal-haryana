-- CreateTable
CREATE TABLE "police_stations" (
    "id" SERIAL NOT NULL,
    "district_id" INTEGER NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "police_stations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "police_stations" ADD CONSTRAINT "police_stations_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
