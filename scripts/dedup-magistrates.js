/**
 * Deduplication script for Magistrates.
 * Keeps the earliest-created magistrate for each (districtId, name) pair
 * and deletes all others, re-pointing any courts/data entries to the keeper.
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    console.log('🔍 Finding duplicate magistrates...');
    const dups = await p.$queryRawUnsafe(`
        SELECT name, district_id, COUNT(*) as cnt, MIN(id) as keep_id
        FROM magistrates
        GROUP BY name, district_id
        HAVING COUNT(*) > 1
    `);

    if (dups.length === 0) {
        console.log('✅ No duplicate magistrates found!');
        return;
    }

    console.log(`Found ${dups.length} groups with duplicates.`);
    let deleted = 0;
    for (const dup of dups) {
        const keepId = Number(dup.keep_id);
        console.log(`  Deduplicating: "${dup.name}" (district ${dup.district_id}) — keeping id=${keepId}`);

        // Find all duplicate IDs (excluding the one we keep)
        const dupeRecords = await p.magistrate.findMany({
            where: {
                name: dup.name,
                districtId: dup.district_id ? Number(dup.district_id) : null,
                id: { not: keepId }
            },
        });

        for (const dupe of dupeRecords) {
            // Re-point any courts referencing the duplicate to the keeper
            await p.court.updateMany({
                where: { magistrateId: dupe.id },
                data: { magistrateId: keepId },
            });
            // Re-point any data entries
            await p.dataEntry.updateMany({
                where: { magistrateId: dupe.id },
                data: { magistrateId: keepId },
            });
            // Now delete the duplicate
            await p.magistrate.delete({ where: { id: dupe.id } });
            deleted++;
        }
    }

    console.log(`\n✅ Done! Removed ${deleted} duplicate magistrate records.`);
}

main().catch(console.error).finally(() => p.$disconnect());
