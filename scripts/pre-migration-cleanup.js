const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Starting pre-migration database cleanup...');

    // ─── 1. Cleanup Duplicate Magistrates (Judicial Officers) ─────────────
    console.log('🔍 Checking for duplicate Judicial Officers...');
    const duplicateMagistrates = await prisma.$queryRaw`
        SELECT name, district_id, count(*) as cnt, min(id) as keeper_id
        FROM magistrates
        GROUP BY name, district_id
        HAVING count(*) > 1
    `;

    for (const dup of duplicateMagistrates) {
        const { name, district_id, cnt, keeper_id } = dup;
        console.log(`   🔸 Group: "${name}" (District ${district_id}) - Found ${cnt} records. Keeping target ID: ${keeper_id}`);

        // Find all records EXCEPT the keeper
        const duplicates = await prisma.magistrate.findMany({
            where: {
                name,
                districtId: district_id,
                id: { not: keeper_id }
            }
        });

        for (const record of duplicates) {
            // Re-point Courts
            await prisma.court.updateMany({
                where: { magistrateId: record.id },
                data: { magistrateId: keeper_id }
            });
            // Re-point DataEntries
            await prisma.dataEntry.updateMany({
                where: { magistrateId: record.id },
                data: { magistrateId: keeper_id }
            });
            // Delete record
            await prisma.magistrate.delete({ where: { id: record.id } });
            console.log(`      🗑️ Deleted duplicate Magistrate ID: ${record.id}`);
        }
    }

    // ─── 2. Cleanup Duplicate Police Stations ────────────────────────────
    console.log('🔍 Checking for duplicate Police Stations...');
    const duplicatePS = await prisma.$queryRaw`
        SELECT name, district_id, count(*) as cnt, min(id) as keeper_id
        FROM police_stations
        GROUP BY name, district_id
        HAVING count(*) > 1
    `;

    for (const dup of duplicatePS) {
        const { name, district_id, cnt, keeper_id } = dup;
        console.log(`   🔸 Group: "${name}" (District ${district_id}) - Found ${cnt} records. Keeping target ID: ${keeper_id}`);

        const duplicates = await prisma.policeStation.findMany({
            where: {
                name,
                districtId: district_id,
                id: { not: keeper_id }
            }
        });

        for (const record of duplicates) {
            // Delete record (Police Stations usually don't have relations yet, but check schema)
            await prisma.policeStation.delete({ where: { id: record.id } });
            console.log(`      🗑️ Deleted duplicate Police Station ID: ${record.id}`);
        }
    }

    console.log('✅ Pre-migration cleanup complete. Safe to run migrate deploy.');
}

main()
    .catch(e => {
        console.error('❌ Cleanup failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
