const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSetting() {
    try {
        console.log('--- DB Check ---');
        const setting = await prisma.systemSetting.findUnique({ where: { key: 'backup_time' } });
        console.log('DB Content:', setting);

        console.log('--- API Check (Simulated) ---');
        const now = new Date();
        const serverTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        console.log('Simulated Response:', { value: setting ? setting.value : '02:00', serverTime });
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkSetting();
