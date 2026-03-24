const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const { RELAY_URL } = require('./gdrive-credentials');

/**
 * Deployment Awareness
 */
const IS_CLOUD = !!process.env.RENDER;
const BACKUP_DIR = IS_CLOUD ? '/tmp/backups' : path.join(__dirname, '../backups');

// Ensure directory exists as soon as module is loaded
if (!fs.existsSync(BACKUP_DIR)) {
    try {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    } catch (e) {
        console.error(`❌ Failed to create backup directory ${BACKUP_DIR}:`, e.message);
    }
}

/**
 * Uploads a file to Google Drive via the Apps Script Relay
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
    console.log(`📦 Starting ${IS_CLOUD ? 'Cloud' : 'Local'} Compressed Backup...`);
    const result = { success: false, filename: null, cloudSync: false, error: null };
    
    // Final safety check
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `court-portal-backup-${timestamp}.sql.gz`;
    const backupPath = path.join(BACKUP_DIR, filename);

    try {
        let dumpStream;
        
        // 1. Try Docker First (Best for Local Development)
        // We check for Docker by attempting to run 'docker -v'
        let hasDocker = false;
        try {
            execSync('docker -v', { stdio: 'ignore' });
            hasDocker = true;
        } catch (e) { /* No docker */ }

        if (hasDocker && !IS_CLOUD) {
            console.log('📡 Extracting from Local Docker container...');
            dumpStream = spawn('docker', [
                'exec', '-i', 'courtportalantigravity-db-1', 
                'sh', '-c', 'PGPASSWORD=password pg_dump -U user --clean --if-exists --exclude-table=grievances --exclude-table=grievance_comments --exclude-table=grievance_attachments court_portal'
            ]);
        } 
        // 2. Fallback to pg_dump (Best for Cloud or local with Postgres installed)
        else if (process.env.DATABASE_URL) {
            console.log('📡 Extracting directly from DATABASE_URL using pg_dump...');
            dumpStream = spawn('pg_dump', [
                process.env.DATABASE_URL, 
                '--clean', 
                '--if-exists',
                '--exclude-table=public.grievances',
                '--exclude-table=public.grievance_comments',
                '--exclude-table=public.grievance_attachments'
            ]);
        }
        else {
            throw new Error('No database extraction method available. Ensure Docker is running or DATABASE_URL is set.');
        }
        
        const gzip = zlib.createGzip();
        const output = fs.createWriteStream(backupPath);
        dumpStream.stdout.pipe(gzip).pipe(output);

        await new Promise((resolve, reject) => {
            output.on('finish', resolve);
            dumpStream.stdout.on('error', (err) => {
                console.error('⚠️ Database extract failed:', err.message);
                reject(new Error(`Extraction failed: ${err.message}`));
            });
            gzip.on('error', reject);
            output.on('error', reject);
            
            // Capture stderr to diagnose credential issues
            let stderrData = '';
            dumpStream.stderr.on('data', (d) => { stderrData += d.toString(); });
            dumpStream.on('close', (code) => {
                if (code !== 0) {
                    console.error(`⚠️ pg_dump exited with code ${code}: ${stderrData}`);
                    reject(new Error(`pg_dump failed (exit code ${code}): ${stderrData}`));
                }
            });
        });

        console.log(`✅ Local backup saved: ${backupPath}`);

        // Sync to cloud via Relay
        result.cloudSync = await uploadToDrive(backupPath, filename);
        result.success = true;
        result.filename = filename;

        // Rotation logic
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('court-portal-backup-') && f.endsWith('.sql.gz'))
            .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time);

        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        let removed = 0;
        files.slice(10).forEach(file => { // Keep 10 latest
            if (file.time < thirtyDaysAgo) {
                fs.unlinkSync(path.join(BACKUP_DIR, file.name));
                removed++;
            }
        });
        if (removed > 0) console.log(`🗑️  Rotated ${removed} backups.`);
        
        return result;
    } catch (error) {
        console.error('❌ Backup Engine Failed:', error.message);
        result.error = error.message;
        return result;
    }
}

if (require.main === module) {
    runBackup();
}

module.exports = { runBackup, uploadToDrive, BACKUP_DIR };
