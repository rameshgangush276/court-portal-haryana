-- AlterTable
ALTER TABLE "grievance_attachments" ADD COLUMN     "comment_id" INTEGER;

-- AddForeignKey
ALTER TABLE "grievance_attachments" ADD CONSTRAINT "grievance_attachments_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "grievance_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
