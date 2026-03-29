const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

/**
 * Restore Script for Court Portal
 * Usage: node scripts/db-restore.js [optional-path-to-gz-file]
 */

const IS_CLOUD = !!process.env.RENDER;
const BACKUP_DIR = IS_CLOUD ? '/tmp/backups' : path.join(__dirname, '../backups');

async function runRestore(specificFile = null) {
    console.log('🔄 Starting Full System Restore...');

    let backupPath = specificFile;

    // 1. If no file specified, find latest in backups folder
    if (!backupPath) {
        if (!fs.existsSync(BACKUP_DIR)) {
            console.error('❌ No backup directory found.');
            return;
        }

        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('court-portal-backup-') && f.endsWith('.sql.gz'))
            .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time);

        if (files.length === 0) {
            console.error('❌ No backup files found in ' + BACKUP_DIR);
            return;
        }

        backupPath = path.join(BACKUP_DIR, files[0].name);
    }

    console.log(`📂 Using backup file: ${backupPath}`);

    try {
        // Prepare extraction
        const gunzip = zlib.createGunzip();
        const fileStream = fs.createReadStream(backupPath);

        let restoreProcess;

        // 2. Determine Restore Method
        let hasDocker = false;
        try {
            execSync('docker -v', { stdio: 'ignore' });
            hasDocker = true;
        } catch (e) {}

        if (hasDocker && !IS_CLOUD) {
            console.log('📡 Restoring to Local Docker container...');
            restoreProcess = spawn('docker', [
                'exec', '-i', 'courtportalantigravity-db-1',
                'sh', '-c', 'PGPASSWORD=password psql -U user court_portal'
            ]);
        } else if (process.env.DATABASE_URL) {
            console.log('📡 Restoring directly to DATABASE_URL...');
            
            // Extract connection params from URL for psql
            // Note: simple psql [url] works best
            restoreProcess = spawn('psql', [process.env.DATABASE_URL]);
        } else {
            throw new Error('No database restore method available.');
        }

        // Pipe: File -> Gunzip -> Restore stdin
        fileStream.pipe(gunzip).pipe(restoreProcess.stdin);

        await new Promise((resolve, reject) => {
            restoreProcess.on('close', async (code) => {
                if (code === 0) {
                    console.log('✅ Base Data Restored. Running Post-Restore Cleanup...');
                    
                    // Deduplication & Integrity Check
                    try {
                        const { PrismaClient } = require('@prisma/client');
                        const prisma = new PrismaClient();
                        
                        console.log('🔍 Checking for administrative account duplicates...');
                        // Ensure 'developer' and 'state_admin' remain unique and correct
                        // This fixes the '2 developer accounts' issue by merging or removing relics
                        const admins = await prisma.user.findMany({
                            where: { username: { in: ['developer', 'state_admin'] } },
                            orderBy: { id: 'desc' } // Keep the newest one if multiple exist
                        });

                        const seen = new Set();
                        for (const admin of admins) {
                            if (seen.has(admin.username)) {
                                console.log(`🗑️ Removing duplicate ${admin.username} (ID: ${admin.id})`);
                                await prisma.user.delete({ where: { id: admin.id } });
                            } else {
                                seen.add(admin.username);
                            }
                        }

                        await prisma.$disconnect();
                        console.log('✅ System Restore & Deduplication Successful!');
                        resolve();
                    } catch (err) {
                        console.error('⚠️ Post-restore cleanup failed:', err.message);
                        resolve(); // Still success since base data is back
                    }
                } else {
                    reject(new Error(`Restore failed with exit code ${code}`));
                }
            });

            restoreProcess.stderr.on('data', (data) => {
                const msg = data.toString();
                // Ignore "notice" or "already exists" warnings that occur with --clean
                if (!msg.includes('NOTICE') && !msg.includes('already exists')) {
                    console.warn(`⚠️ Restore Log: ${msg.trim()}`);
                }
            });

            fileStream.on('error', reject);
            gunzip.on('error', reject);
            restoreProcess.on('error', reject);
        });

    } catch (err) {
        console.error('❌ Restore Engine Failed:', err.message);
    }
}

// CLI Execution
if (require.main === module) {
    const arg = process.argv[2];
    runRestore(arg);
}

module.exports = { runRestore };
