const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const orderMap = {
    'trials-disposed': 1,
    'cancellation-decisions': 2,
    'police-applications': 3,
    'bail-granted': 4,
    'po-pp-bj': 5,
    'property-attached': 6,
    'complaints-against-police': 7,
    'fir-156-3': 8,
    'sho-dsp-appeared': 9,
    'police-deposition': 10,
    'vc-prisoners': 11,
    'tips-conducted': 12,
    'pairvi-witness': 13,
    'gangster-next-day': 14,
    'property-offender-next-day': 15,
    'bail-applications-tomorrow': 16,
    'nbw-arrest-warrants': 17,
};

async function main() {
    console.log('🔄 Resetting table sort orders...\n');
    for (const [slug, order] of Object.entries(orderMap)) {
        const result = await prisma.dataEntryTable.updateMany({
            where: { slug },
            data: { sortOrder: order },
        });
        const status = result.count > 0 ? '✅' : '⚠️  NOT FOUND';
        console.log(`  ${status}  sortOrder=${order}  →  ${slug}`);
    }
    console.log('\n✅ Done!');
}

main()
    .catch(e => { console.error('❌', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
