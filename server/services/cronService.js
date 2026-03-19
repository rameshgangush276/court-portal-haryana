const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { runBackup } = require('../../scripts/db-backup');

let backupJob = null;

async function refreshBackupJob() {
    try {
        if (backupJob) {
            backupJob.stop();
            console.log('🛑 Stopped existing backup job.');
        }

        // Use Raw SQL for absolute reliability
        const results = await prisma.$queryRaw`SELECT value FROM system_settings WHERE key = 'backup_time'`;
        const timeString = results[0] ? results[0].value : '02:00';
        
        const [hours, minutes] = timeString.split(':');

        // Note: cron format is 'min hour dom mon dow'
        const cronSchedule = `${minutes} ${hours} * * *`;
        
        backupJob = cron.schedule(cronSchedule, () => {
            console.log(`⏰ [CRON] ${new Date().toLocaleTimeString()}: Triggering Scheduled DB Backup...`);
            runBackup().catch(err => console.error('⏰ [CRON] Scheduled backup failed:', err));
        });

        const now = new Date();
        console.log(`--------------------------------------------------`);
        console.log(`✅ BACKUP SCHEDULED: ${hours}:${minutes} daily`);
        console.log(`🎯 Cron Pattern: ${cronSchedule}`);
        console.log(`⏱️  Current Server Time: ${now.toLocaleTimeString()}`);
        console.log(`🌐 UTC Time: ${now.toUTCString()}`);
        console.log(`--------------------------------------------------`);
    } catch (error) {
        console.error('❌ Failed to refresh backup job:', error);
    }
}

module.exports = { refreshBackupJob };
