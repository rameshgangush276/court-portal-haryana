const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Updating Police Stations from CSV...');

    const csvPath = path.join(__dirname, '..', 'Disrtrict_PS.csv');
    if (!fs.existsSync(csvPath)) {
        console.error('❌ CSV file not found at:', csvPath);
        process.exit(1);
    }

    let fileContent = fs.readFileSync(csvPath, 'utf-8');
    // Handle UTF-8 BOM if present
    if (fileContent.charCodeAt(0) === 0xFEFF) {
        fileContent = fileContent.slice(1);
    }
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    });

    console.log(`📋 Found ${records.length} records in CSV.`);

    // 1. Clear existing police stations to start fresh with standardized data
    console.log('🗑️ Clearing existing police stations...');
    await prisma.policeStation.deleteMany({});

    // 2. Group by district for efficiency
    const districtGroups = {};
    for (const record of records) {
        const districtName = record.District ? record.District.trim() : null;
        const psName = record.PS ? record.PS.trim() : null;
        
        if (!districtName || !psName) continue;
        
        if (!districtGroups[districtName]) {
            districtGroups[districtName] = new Set();
        }
        districtGroups[districtName].add(psName);
    }

    // 3. Insert new records
    const dbDistricts = await prisma.district.findMany();
    console.log('🏛️ Found districts in DB:', dbDistricts.map(d => d.name));

    for (const [csvDistrictName, psNames] of Object.entries(districtGroups)) {
        // Find district (case-insensitive)
        const district = dbDistricts.find(d => d.name.toLowerCase() === csvDistrictName.toLowerCase());

        if (!district) {
            console.warn(`⚠️ CSV District "${csvDistrictName}" not found in database. Skipping.`);
            continue;
        }

        console.log(`📍 Inserting ${psNames.size} stations for ${district.name}...`);

        const data = Array.from(psNames).map(name => ({
            name: name,
            districtId: district.id
        }));

        await prisma.policeStation.createMany({
            data: data
        });
    }

    console.log('✅ Police stations updated successfully from CSV.');
}

main()
    .catch(e => {
        console.error('❌ Error during update:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
