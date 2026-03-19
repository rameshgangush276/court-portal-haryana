const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const runBackup = require('../../scripts/db-backup');

const execAsync = promisify(exec);
const { refreshBackupJob } = require('../services/cronService');
const router = express.Router();

const BACKUP_DIR = path.join(__dirname, '../../backups');

// ─── 0. SETTINGS ENDPOINTS ───────────────────────────────────────
// Get backup time setting
router.get('/settings/backup-time', authenticate, requireRole('developer'), async (req, res) => {
    try {
        const now = new Date();
        const serverTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        // Raw SQL to ensure no ORM or metadata caching issues
        const results = await prisma.$queryRaw`SELECT value FROM system_settings WHERE key = 'backup_time'`;
        let val = results[0] ? results[0].value : '02:00';

        if (!results[0]) {
            await prisma.$executeRaw`INSERT INTO system_settings (key, value) VALUES ('backup_time', '02:00') ON CONFLICT (key) DO NOTHING`;
        }

        res.json({ value: val, serverTime });
    } catch (err) { 
        console.error('❌ Failed to fetch settings:', err);
        res.status(500).json({ error: 'Failed' }); 
    }
});

// Update backup time setting
router.post('/settings/backup-time', authenticate, requireRole('developer'), async (req, res) => {
    try {
        const { value } = req.body;
        if (!value || !/^\d{2}:\d{2}$/.test(value)) return res.status(400).json({ error: 'Invalid time' });

        // Raw SQL for absolute persistence guarantee
        await prisma.$executeRaw`INSERT INTO system_settings (key, value) VALUES ('backup_time', ${value}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;

        console.log(`📡 [SETTINGS] Updated backup schedule in DB to: ${value}`);
        await refreshBackupJob();
        res.json({ message: 'Saved' });
    } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Delete a backup file
router.delete('/backups/:filename', authenticate, requireRole('developer'), async (req, res) => {
    try {
        const { filename } = req.params;
        const backupPath = path.join(BACKUP_DIR, filename);
        
        if (!fs.existsSync(backupPath)) {
            return res.status(404).json({ error: 'Backup file not found' });
        }

        fs.unlinkSync(backupPath);
        res.json({ message: `Backup file ${filename} deleted successfully` });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete backup' });
    }
});

// ─── 1. GET /api/v1/system/backups-list ────────────────────────────────────
// List all available .sql backup files
router.get('/backups-list', authenticate, requireRole('developer'), async (req, res, next) => {
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            return res.json({ backups: [] });
        }
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith('.sql.gz') || f.endsWith('.sql'))
            .map(f => {
                const stats = fs.statSync(path.join(BACKUP_DIR, f));
                return {
                    name: f,
                    size: stats.size,
                    createdAt: stats.mtime
                };
            })
            .sort((a, b) => b.createdAt - a.createdAt);
        res.json({ backups: files });
    } catch (err) { next(err); }
});

// ─── 2. POST /api/v1/system/backup ─────────────────────────────────────────
// Trigger a manual on-demand backup
router.post('/backup', authenticate, requireRole('developer'), async (req, res, next) => {
    try {
        await runBackup();
        res.json({ message: 'Backup created successfully' });
    } catch (err) { next(err); }
});

const zlib = require('zlib');
const { spawn } = require('child_process');

async function restoreDatabase(backupPath) {
    const containerName = 'courtportalantigravity-db-1';
    const isCompressed = backupPath.endsWith('.gz');

    return new Promise((resolve, reject) => {
        // Prepare the psql process inside Docker
        const psql = spawn('docker', [
            'exec', 
            '-i', 
            containerName, 
            'sh', '-c', `PGPASSWORD=password psql -U user -d court_portal`
        ]);

        let errorOutput = '';
        psql.stderr.on('data', (data) => { errorOutput += data.toString(); });

        psql.on('exit', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Restore process exited with code ${code}: ${errorOutput}`));
        });

        // ─── Stream the file into psql's stdin ───────────────────────────
        const fileStream = fs.createReadStream(backupPath);
        
        if (isCompressed) {
            const gunzip = zlib.createGunzip();
            fileStream.pipe(gunzip).pipe(psql.stdin);
        } else {
            fileStream.pipe(psql.stdin);
        }

        fileStream.on('error', reject);
    });
}

// ─── 3. POST /api/v1/system/restore ────────────────────────────────────────
// Restore from a specific backup file
router.post('/restore', authenticate, requireRole('developer'), async (req, res, next) => {
    try {
        const { filename } = req.body;
        if (!filename) return res.status(400).json({ error: 'filename is required' });

        const backupPath = path.join(BACKUP_DIR, filename);
        if (!fs.existsSync(backupPath)) return res.status(404).json({ error: 'Backup file not found' });

        console.log(`⚠️  RESTORE INITIATED: ${filename}`);
        await restoreDatabase(backupPath);
        
        res.json({ message: `System successfully restored to ${filename}` });
    } catch (err) { 
        console.error('Restore Error:', err);
        res.status(500).json({ error: 'Restore failed', details: err.message });
    }
});

// ─── 4. POST /api/v1/system/cleanup ─────────────────────────────────────────
// Wipe sections of the database or entire database
router.post('/cleanup', authenticate, requireRole('developer'), async (req, res, next) => {
    try {
        const { scope, districtId } = req.body;
        const dId = districtId ? parseInt(districtId) : null;
        
        let msg = '';

        if (scope === 'entries_only') {
            const where = dId ? { districtId: dId } : {};
            await prisma.dataEntry.deleteMany({ where });
            msg = `All data entries cleared${dId ? ` for District ID ${dId}` : ''}.`;
        }
        else if (scope === 'grievances_only') {
            const where = dId ? { districtId: dId } : {};
            await prisma.grievance.deleteMany({ where });
            msg = `All grievances cleared${dId ? ` for District ID ${dId}` : ''}.`;
        }
        else if (scope === 'courts_only') {
            const where = dId ? { districtId: dId } : {};
            await prisma.court.deleteMany({ where });
            msg = `All courts cleared ${dId ? ` for District ID ${dId}` : ''}.`;
        }
        else if (scope === 'magistrates_only') {
            const where = dId ? { districtId: dId } : {};
            await prisma.magistrate.deleteMany({ where });
            msg = `All judicial officers cleared ${dId ? ` for District ID ${dId}` : ''}.`;
        }
        else if (scope === 'naib_courts_only') {
            const where = { role: 'naib_court' };
            if (dId) where.districtId = dId;
            await prisma.user.deleteMany({ where });
            msg = `All naib court user accounts cleared ${dId ? ` for District ID ${dId}` : ''}.`;
        }
        else if (scope === 'police_stations_only') {
            const where = dId ? { districtId: dId } : {};
            await prisma.policeStation.deleteMany({ where });
            msg = `All police stations cleared ${dId ? ` for District ID ${dId}` : ''}.`;
        }
        else if (scope === 'districts_only' && !dId) {
            // Cannot delete all districts easily without cascade, but we'll try
            await prisma.dataEntry.deleteMany({});
            await prisma.grievance.deleteMany({});
            await prisma.court.deleteMany({});
            await prisma.magistrate.deleteMany({});
            await prisma.policeStation.deleteMany({});
            await prisma.user.deleteMany({ where: { role: { not: 'developer' } } });
            await prisma.district.deleteMany({});
            msg = 'All districts and their associated data (full wipe) cleared.';
        }
        else if (scope === 'full_wipe') {
            // Delete in order to satisfy foreign key constraints
            await prisma.dataEntry.deleteMany({});
            await prisma.grievance.deleteMany({});
            await prisma.user.deleteMany({ where: { role: { not: 'developer' } } });
            await prisma.magistrate.deleteMany({});
            await prisma.court.deleteMany({});
            await prisma.policeStation.deleteMany({});
            await prisma.district.deleteMany({});
            msg = 'Full database cleanup complete (only Developer account remains).';
        }

        if (msg) return res.json({ message: msg });
        res.status(400).json({ error: 'Invalid cleanup scope' });
    } catch (err) { next(err); }
});

module.exports = router;
