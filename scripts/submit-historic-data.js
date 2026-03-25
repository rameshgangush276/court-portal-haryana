const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Identifying unfinalized historic data entries...');

    // Get all unique (courtId, entryDate) pairs from existing data entries
    const entries = await prisma.dataEntry.findMany({
        select: {
            courtId: true,
            entryDate: true,
            createdBy: true,
        },
        distinct: ['courtId', 'entryDate'],
    });

    console.log(`📊 Found ${entries.length} unique court-date pairs in the system.`);

    let count = 0;
    for (const entry of entries) {
        try {
            // Check if already submitted
            const existing = await prisma.dailySubmission.findUnique({
                where: {
                    courtId_entryDate: {
                        courtId: entry.courtId,
                        entryDate: entry.entryDate,
                    }
                }
            });

            if (!existing) {
                await prisma.dailySubmission.create({
                    data: {
                        courtId: entry.courtId,
                        entryDate: entry.entryDate,
                        submittedBy: entry.createdBy,
                        submittedAt: new Date(),
                    }
                });
                count++;
            }
        } catch (err) {
            console.error(`❌ Error finalizing ${entry.courtId} on ${entry.entryDate.toISOString()}:`, err.message);
        }
    }

    console.log(`✅ Successfully marked ${count} historic days as "Final Submitted".`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
