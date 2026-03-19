const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
    console.log('🔄 Migrating FIR Date columns to FIR Year...');

    try {
        // 1. Find all columns named 'FIR Date'
        const columns = await prisma.dataEntryColumn.findMany({
            where: {
                OR: [
                    { name: 'FIR Date' },
                    { slug: 'fir_date' }
                ]
            }
        });

        console.log(`📍 Found ${columns.length} columns to update.`);

        for (const col of columns) {
            await prisma.dataEntryColumn.update({
                where: { id: col.id },
                data: {
                    name: 'FIR Year',
                    slug: 'fir_year',
                    dataType: 'year'
                }
            });
            console.log(`  ✅ Updated column ID ${col.id} in Table ID ${col.tableId}`);
        }

        // 2. Data Migration: Update existing DataEntry values to convert dates to years
        // We do this by searching for 'fir_date' in the JSON 'values' and moving it to 'fir_year'
        const entries = await prisma.dataEntry.findMany({});
        console.log(`📦 Checking ${entries.length} data entries for value migration...`);

        let updatedEntries = 0;
        for (const entry of entries) {
            let vals = entry.values;
            if (vals && vals.fir_date) {
                // Extract year from date string (e.g. "2024-03-12" or Date object)
                const dateVal = new Date(vals.fir_date);
                const yearVal = isNaN(dateVal.getFullYear()) ? vals.fir_date.split('-')[0] : dateVal.getFullYear().toString();
                
                vals.fir_year = yearVal;
                delete vals.fir_date;

                await prisma.dataEntry.update({
                    where: { id: entry.id },
                    data: { values: vals }
                });
                updatedEntries++;
            }
        }
        console.log(`✅ Migrated values for ${updatedEntries} entries.`);
        console.log('🎉 FIR Year migration complete.');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

migrate();
