const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const { google } = require('googleapis');
const { promisify } = require('util');

const { REVERSED_B64, FOLDER_ID, getCredentials } = require('./gdrive-credentials');

/**
 * Uploads a file to Google Drive
 */
async function uploadToDrive(filePath, fileName) {
    let credentials;
    let folderId = process.env.GD_FOLDER_ID || FOLDER_ID;

    try {
        if (process.env.GD_SERVICE_ACCOUNT_JSON) {
            credentials = JSON.parse(process.env.GD_SERVICE_ACCOUNT_JSON);
        } else {
            console.log('📦 Using baked-in Google Drive vault...');
            credentials = getCredentials();
        }
    } catch (err) {
        console.warn('⚠️  Cloud Backup skipped: Invalid Google Drive credentials provided.');
        return;
    }

    if (!folderId) {
        console.warn('⚠️  Cloud Backup skipped: Folder ID missing.');
        return;
    }

    try {
        console.log(`☁️  Uploading ${fileName} to Google Drive...`);
        
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });

        const drive = google.drive({ version: 'v3', auth });

        const fileMetadata = {
            name: fileName,
            parents: [folderId],
        };

        const media = {
            mimeType: 'application/gzip',
            body: fs.createReadStream(filePath),
        };

        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id',
        });

        console.log(`✅ Cloud Backup Successful! Drive File ID: ${response.data.id}`);
    } catch (err) {
        console.error('❌ Google Drive Upload Failed:', err.message);
    }
}

async function runBackup() {
    console.log('📦 Starting Docker-to-Host Compressed Backup...');
    
    // ─── 1. Prepare Paths ──────────────────────────────────────────────────
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `court-portal-backup-${timestamp}.sql.gz`;
    const backupPath = path.join(backupDir, filename);

    // ─── 2. Docker Container Details ────────────────────────────────────────
    const containerName = 'courtportalantigravity-db-1';

    try {
        console.log(`📡 Extracting and compressing from container ${containerName}...`);
        
        // Execute pg_dump INSIDE the docker container
        const dumpStream = spawn('docker', [
            'exec', 
            '-i', 
            containerName, 
            'sh', '-c', `PGPASSWORD=password pg_dump -U user --clean --if-exists court_portal`
        ]);
        const gzip = zlib.createGzip();
        const output = fs.createWriteStream(backupPath);

        dumpStream.stdout.pipe(gzip).pipe(output);

        await new Promise((resolve, reject) => {
            output.on('finish', () => {
                console.log(`✅ Local backup saved: ${backupPath}`);
                resolve();
            });
            dumpStream.on('error', (err) => {
                console.error('Docker command failed. Is the container running?');
                reject(err);
            });
            gzip.on('error', reject);
            output.on('error', reject);
        });

        // ─── 3. Google Drive Sync ──────────────────────────────────────────
        await uploadToDrive(backupPath, filename);

        // ─── 4. Rotation (Keep only last 30 days) ───────────────────────────
        console.log('🔄 Checking for old local backups...');
        const files = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('court-portal-backup-') && f.endsWith('.sql.gz'))
            .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time);

        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        let removed = 0;
        for (const file of files) {
            if (files.indexOf(file) > 7 && file.time < thirtyDaysAgo) {
                fs.unlinkSync(path.join(backupDir, file.name));
                removed++;
            }
        }
        if (removed > 0) console.log(`🗑️  Rotated ${removed} backups.`);
        
    } catch (error) {
        console.error('❌ Backup Failed:', error.message);
    }
}

// Allow running manually (node scripts/db-backup.js) or being imported
if (require.main === module) {
    // Load local environment for testing if needed
    require('dotenv').config();
    runBackup();
}

module.exports = runBackup;
