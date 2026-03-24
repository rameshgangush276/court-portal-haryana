const fs = require('fs');
const dir1 = 'prisma/migrations/20260318091500_dedup_and_unique_magistrates';
const dir2 = 'prisma/migrations/20260320152100_add_system_settings_model';

if (!fs.existsSync(dir1)) fs.mkdirSync(dir1, { recursive: true });
if (!fs.existsSync(dir2)) fs.mkdirSync(dir2, { recursive: true });

fs.writeFileSync(`${dir1}/migration.sql`, '-- Empty Migration for history\n', 'utf8');

fs.writeFileSync(`${dir2}/migration.sql`, `-- CreateTable
CREATE TABLE "system_settings" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");
`, 'utf8');

console.log('✅ Migrations fixed with UTF-8 encoding!');
