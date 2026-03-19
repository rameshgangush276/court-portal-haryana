const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const { RELAY_URL } = require('./gdrive-credentials');

/**
 * Uploads a file to Google Drive via the Apps Script Relay
 * Uses native fetch (Node 18+) for automatic redirect handling
 */
async function uploadToDrive(filePath, fileName) {
    console.log(`☁️  Relaying ${fileName} to Google Drive...`);
    
    if (!RELAY_URL) {
        console.warn('⚠️  Cloud Backup skipped: No Relay URL configured.');
        return false;
    }

    try {
        const fileBuffer = fs.readFileSync(filePath);
        const base64Content = fileBuffer.toString('base64');

        const response = await fetch(RELAY_URL, {
            method: 'POST',
            body: JSON.stringify({
                name: fileName,
                mimeType: 'application/gzip',
                content: base64Content
            }),
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();
        
        if (result.success) {
            console.log(`✅ Cloud Backup Successful via Relay! Drive ID: ${result.id}`);
            return true;
        } else {
            console.error('❌ Relay Upload Failed:', result);
            return false;
        }
    } catch (err) {
        console.error('❌ Relay Process Failed:', err.message);
        return false;
    }
}

async function runBackup() {
    console.log('📦 Starting Docker-to-Host Compressed Backup...');
    const result = { success: false, filename: null, cloudSync: false, error: null };
    
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `court-portal-backup-${timestamp}.sql.gz`;
    const backupPath = path.join(backupDir, filename);

    try {
        console.log('📡 Extracting and compressing from container...');
        
        const dumpStream = spawn('docker', [
            'exec', '-i', 'courtportalantigravity-db-1', 
            'sh', '-c', 'PGPASSWORD=password pg_dump -U user --clean --if-exists court_portal'
        ]);
        
        const gzip = zlib.createGzip();
        const output = fs.createWriteStream(backupPath);
        dumpStream.stdout.pipe(gzip).pipe(output);

        await new Promise((resolve, reject) => {
            output.on('finish', resolve);
            dumpStream.stdout.on('error', reject);
            gzip.on('error', reject);
            output.on('error', reject);
        });

        console.log(`✅ Local backup saved: ${backupPath}`);

        // Sync to cloud via Relay
        result.cloudSync = await uploadToDrive(backupPath, filename);
        result.success = true;
        result.filename = filename;

        // Rotation logic
        const files = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('court-portal-backup-') && f.endsWith('.sql.gz'))
            .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time);

        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        let removed = 0;
        files.slice(7).forEach(file => {
            if (file.time < thirtyDaysAgo) {
                fs.unlinkSync(path.join(backupDir, file.name));
                removed++;
            }
        });
        if (removed > 0) console.log(`🗑️  Rotated ${removed} backups.`);
        
        return result;
    } catch (error) {
        console.error('❌ Backup Failed:', error.message);
        result.error = error.message;
        return result;
    }
}

if (require.main === module) {
    runBackup();
}

module.exports = { runBackup, uploadToDrive };
