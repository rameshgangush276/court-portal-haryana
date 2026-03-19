const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { spawn } = require('child_process');

async function restoreDatabase(backupPath) {
    const containerName = 'courtportalantigravity-db-1';
    const isCompressed = backupPath.endsWith('.gz');

    return new Promise((resolve, reject) => {
        console.log(`📡 Restoring from ${backupPath} to container ${containerName}...`);
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
            if (code === 0) {
                console.log('✅ Restoration Successful!');
                resolve();
            } else {
                reject(new Error(`Restore process exited with code ${code}: ${errorOutput}`));
            }
        });

        // Stream the file into psql's stdin
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

// Find the latest backup
const BACKUP_DIR = path.join(__dirname, '../backups');
const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.sql.gz'))
    .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
    .sort((a, b) => b.time - a.time);

if (files.length > 0) {
    restoreDatabase(path.join(BACKUP_DIR, files[0].name))
        .catch(console.error);
} else {
    console.error('No backup files found!');
}
