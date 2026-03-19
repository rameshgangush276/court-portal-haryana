const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCounts() {
    console.log('📊 Current Database Counts:');
    try {
        const districts = await prisma.district.count();
        const courts = await prisma.court.count();
        const users = await prisma.user.count();
        const entries = await prisma.dataEntry.count();
        console.log(`- Districts: ${districts}`);
        console.log(`- Courts: ${courts}`);
        console.log(`- Users (Total): ${users}`);
        console.log(`- Data Entries: ${entries}`);
    } catch (e) {
        console.error('❌ Error checking counts:', e);
    } finally {
        await prisma.$disconnect();
    }
}

checkCounts();
