-- CreateTable
CREATE TABLE "grievance_attachments" (
    "id" SERIAL NOT NULL,
    "grievance_id" INTEGER NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grievance_attachments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "grievance_attachments" ADD CONSTRAINT "grievance_attachments_grievance_id_fkey" FOREIGN KEY ("grievance_id") REFERENCES "grievances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
