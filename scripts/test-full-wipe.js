const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fullWipe() {
    console.log('📦 Starting Full System Wipe...');
    try {
        await prisma.dataEntry.deleteMany({});
        await prisma.grievance.deleteMany({});
        await prisma.user.deleteMany({ where: { role: { not: 'developer' } } });
        await prisma.magistrate.deleteMany({});
        await prisma.court.deleteMany({});
        await prisma.policeStation.deleteMany({});
        await prisma.district.deleteMany({});
        console.log('✅ Full Wipe Complete!');
    } catch (e) {
        console.error('❌ Wipe Failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

fullWipe();
