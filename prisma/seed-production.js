const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Use relative path to support running on Render and other environments
const dir = path.join(__dirname, '../TESTING COURT EXCEL FILE');

// Normalization helper
const normalize = (str) => {
    if (!str) return '';
    return str.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
};

// Must match the codes in prisma/seed.js exactly
const DISTRICT_CODE_MAP = {
    'ambala': 'AMB',
    'bhiwani': 'BHW',
    'charkhi dadri': 'CDR',
    'faridabad': 'FDB',
    'fatehabad': 'FTB',
    'gurugram': 'GGM',
    'hisar': 'HSR',
    'jhajjar': 'JJR',
    'jind': 'JND',
    'kaithal': 'KTL',
    'karnal': 'KNL',
    'kurukshetra': 'KKR',
    'mahendragarh': 'MHG',
    'nuh': 'NUH',
    'palwal': 'PLW',
    'panchkula': 'PKL',
    'panipat': 'PNP',
    'rewari': 'RWR',
    'rohtak': 'RTK',
    'sirsa': 'SRS',
    'sonipat': 'SNP',
    'yamunanagar': 'YNR',
};

const generateDistrictCode = (name) => {
    const key = name.toLowerCase().trim();
    if (DISTRICT_CODE_MAP[key]) return DISTRICT_CODE_MAP[key];
    // Fallback: first 3 chars uppercase
    console.warn(`⚠️ Unknown district "${name}", using fallback code.`);
    return name.substring(0, 3).toUpperCase();
};

const generateUsername = (role, districtCode, index) => {
    const rolePrefix = role === 'naib_court' ? 'naib' : 'admin';
    const num = String(index).padStart(2, '0');
    return `${rolePrefix}_${districtCode.toLowerCase()}_${num}`;
};

async function main() {
    console.log('Starting production data seed...');

    // CLEANUP: Remove old data to ensure a fresh start with Excel data
    console.log('🧹 Cleaning up existing database records...');

    // Delete in order to satisfy foreign key constraints
    try { await prisma.grievanceComment.deleteMany({}); } catch (e) { }
    try { await prisma.grievance.deleteMany({}); } catch (e) { }
    try { await prisma.dataEntry.deleteMany({}); } catch (e) { }
    try { await prisma.transferLog.deleteMany({}); } catch (e) { }
    try { await prisma.dataEntryColumn.deleteMany({}); } catch (e) { }
    try { await prisma.dataEntryTable.deleteMany({}); } catch (e) { }
    try { await prisma.alert.deleteMany({}); } catch (e) { }

    // User has a circular dependency with Court via lastSelectedCourtId
    // Nullify the references first to allow deletion
    await prisma.user.updateMany({ data: { lastSelectedCourtId: null } });

    // Now delete main entities
    await prisma.court.deleteMany({});
    await prisma.magistrate.deleteMany({});

    // Remove all users except possibly system ones, but we recreate them anyway
    await prisma.user.deleteMany({});

    // Finally clear districts
    await prisma.district.deleteMany({});
    console.log('✅ Cleanup complete.\n');

    // Create base users (Developer, State Admin)
    console.log('👤 Creating base system users...');
    const devPassword = await bcrypt.hash('admin123', 10);
    const statePassword = await bcrypt.hash('state123', 10);

    await prisma.user.create({
        data: {
            username: 'developer',
            passwordHash: devPassword,
            name: 'System Developer',
            role: 'developer',
        },
    });

    await prisma.user.create({
        data: {
            username: 'state_admin',
            passwordHash: statePassword,
            name: 'State Admin',
            role: 'state_admin',
        },
    });
    console.log('✅ Base users created.');

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));

    // Track stats
    let districtsCreated = 0;
    let courtsCreated = 0;
    let magistratesCreated = 0;
    let usersCreated = 0;

    // Hash default password once
    const defaultPasswordHash = await bcrypt.hash('Welcome@123', 10);

    // District counters for username generation
    const districtUserCouters = {};
    // Track used CIS/courtNo per district to handle duplicates
    const districtCourtNos = {};

    for (const file of files) {
        // Skip OLD Kaithal file only (we now load from the new updated file)
        if (file.toLowerCase().includes('kaithal') && !file.toLowerCase().includes('new data updated')) {
            console.log(`\n⏭️ Skipping old Kaithal file: ${file}`);
            continue;
        }

        console.log(`\n📄 Processing file: ${file}`);
        const filepath = path.join(dir, file);

        try {
            const workbook = xlsx.readFile(filepath);

            for (const sheetName of workbook.SheetNames) {
                let rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });
                if (rawRows.length === 0) continue;

                // Map columns
                const rawKeys = Object.keys(rawRows[0]);
                const findKey = (keywords) => rawKeys.find(k => {
                    const nk = normalize(k);
                    return keywords.some(keyword => nk.includes(normalize(keyword)));
                });

                const keyMap = {
                    district: findKey(['district']),
                    cisNumber: findKey(['cis number', 'court number', 'cis']),
                    judgeName: findKey(['magistrate name', 'judge name', 'magistarte name', 'judge/magistarte name']),
                    judgeDesignation: findKey(['designation', 'desig']),
                    naibRank: (findKey(['naib']) && findKey(['rank'])) || findKey(['rank']),
                    naibName: findKey(['naib court name', 'naib name']),
                    naibPhone: findKey(['phone', 'phone no', 'phone number', 'phoneno'])
                };

                console.log(`   🔍 Column mapping for sheet "${sheetName}":`,
                    Object.entries(keyMap).filter(([_, v]) => v).map(([k, v]) => `${k}->${v}`).join(', ') || 'None found');

                for (let i = 0; i < rawRows.length; i++) {
                    const rawRow = rawRows[i];

                    const normalizeVal = (val, maxLen) => {
                        if (val === null || val === undefined) return null;
                        return val.toString().replace(/\s+/g, ' ').trim().substring(0, maxLen);
                    };

                    let districtName = normalizeVal(rawRow[keyMap.district], 100);
                    if (districtName) {
                        districtName = districtName.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
                    }
                    const cisNumberStr = normalizeVal(rawRow[keyMap.cisNumber], 50);
                    const judgeNameStr = normalizeVal(rawRow[keyMap.judgeName], 150);
                    const judgeDesig = normalizeVal(rawRow[keyMap.judgeDesignation], 100);
                    const naibNameStr = normalizeVal(rawRow[keyMap.naibName], 150);
                    const naibRankStr = normalizeVal(rawRow[keyMap.naibRank], 50);
                    const naibPhoneStr = rawRow[keyMap.naibPhone] ? rawRow[keyMap.naibPhone].toString().replace(/\D/g, '').substring(0, 15) : null;

                    // Skip rows heavily incomplete or explicitly requested to drop
                    if (!districtName || !judgeDesig) {
                        continue;
                    }

                    // 1. Process District
                    const districtCode = generateDistrictCode(districtName);
                    if (!districtUserCouters[districtCode]) {
                        districtUserCouters[districtCode] = 1;
                    }

                    let district = await prisma.district.upsert({
                        where: { code: districtCode },
                        update: {},
                        create: {
                            name: districtName,
                            code: districtCode
                        }
                    });
                    districtsCreated++;

                    // ─── Clean designation: remove prefixes like "Ld.", "LD.", "Ld "
                    let cleanDesig = judgeDesig;
                    if (cleanDesig) {
                        cleanDesig = cleanDesig
                            .replace(/^\s*L\.?D\.?\s*/i, '')
                            .replace(/^\s*Ld\.?\s*/i, '')
                            .replace(/^,\s*/, '')
                            .trim();
                        // Capitalize first letter
                        if (cleanDesig.length > 0) {
                            cleanDesig = cleanDesig.charAt(0).toUpperCase() + cleanDesig.slice(1);
                        }
                    }

                    // ─── Clean name from prefix and reset gender
                    let gender = null;
                    let cleanName = judgeNameStr;
                    if (judgeNameStr) {
                        // Strip existing prefix from name, like Ms, Mrs, Sh, Shri, Mr, Dr, Er, Smt
                        cleanName = judgeNameStr
                            .replace(/^(Ms\.?|Mrs\.?|Smt\.?|Sh\.?|Shri\.?|Mr\.?|Dr\.?|Er\.?)\s*/i, '')
                            .replace(/^,\s*/, '')
                            .trim();
                        // Reset gender
                        gender = null;
                    }

                    // 2. Process Judicial Officer (if exists)
                    let magistrate = null;
                    if (cleanName) {
                        // First see if a magistrate with this exact name exists in this district
                        magistrate = await prisma.magistrate.findFirst({
                            where: { name: cleanName, districtId: district.id }
                        });

                        if (!magistrate) {
                            magistrate = await prisma.magistrate.create({
                                data: {
                                    name: cleanName,
                                    designation: cleanDesig,
                                    gender: gender,
                                    districtId: district.id
                                }
                            });
                            magistratesCreated++;
                        }
                    }

                    // 3. Process Court
                    // Use the cleaned designation as the Court Name
                    const courtName = normalizeVal(cleanDesig, 150);
                    // Generate unique court ID (e.g., AMB-CRT-01)
                    if (!districtCourtNos[districtCode]) districtCourtNos[districtCode] = 1;
                    const seqStr = String(districtCourtNos[districtCode]).padStart(2, '0');
                    const courtNoStr = `${districtCode}-CRT-${seqStr}`;
                    districtCourtNos[districtCode]++;

                    let court = await prisma.court.upsert({
                        where: {
                            districtId_courtNo: {
                                districtId: district.id,
                                courtNo: courtNoStr
                            }
                        },
                        update: {
                            name: courtName,
                            cisNumber: cisNumberStr,
                            magistrateId: magistrate ? magistrate.id : null
                        },
                        create: {
                            districtId: district.id,
                            name: courtName,
                            courtNo: courtNoStr,
                            cisNumber: cisNumberStr,
                            magistrateId: magistrate ? magistrate.id : null
                        }
                    });
                    courtsCreated++;

                    // 4. Process Naib Court User (if exists)
                    if (naibNameStr) {
                        const username = generateUsername('naib_court', districtCode, districtUserCouters[districtCode]++);

                        let user = await prisma.user.upsert({
                            // Hard to upsert on real name since multiple 'Ramesh' could exist, so we use generated username
                            where: { username: username },
                            update: {
                                // If running this multiple times, just update their details
                                name: naibNameStr,
                                phone: naibPhoneStr,
                                rank: naibRankStr,
                                lastSelectedCourtId: court.id // Default them to this court
                            },
                            create: {
                                username: username,
                                passwordHash: defaultPasswordHash,
                                name: naibNameStr,
                                role: 'naib_court',
                                districtId: district.id,
                                phone: naibPhoneStr,
                                rank: naibRankStr,
                                lastSelectedCourtId: court.id
                            }
                        });
                        usersCreated++;
                    }
                }
            }
        } catch (error) {
            console.error(`❌ Error processing file ${file}:`, error);
        }
    }

    // ─── Create District Admins & Viewers ──────────────────
    const processedDistricts = Object.keys(districtUserCouters);
    console.log(`👤 Creating accounts for ${processedDistricts.length} districts...`);
    const adminPassword = await bcrypt.hash('district123', 10);
    const viewerPassword = await bcrypt.hash('viewer123', 10);

    for (const code of processedDistricts) {
        const district = await prisma.district.findUnique({ where: { code } });
        if (!district) continue;

        // District Admin
        const adminUsername = `admin_${code.toLowerCase()}`;
        await prisma.user.upsert({
            where: { username: adminUsername },
            update: {},
            create: {
                username: adminUsername,
                passwordHash: adminPassword,
                name: `District Admin ${district.name}`,
                role: 'district_admin',
                districtId: district.id,
            },
        });

        // District Viewer
        const viewerUsername = `viewer_${code.toLowerCase()}`;
        await prisma.user.upsert({
            where: { username: viewerUsername },
            update: {},
            create: {
                username: viewerUsername,
                passwordHash: viewerPassword,
                name: `District Viewer ${district.name}`,
                role: 'viewer_district',
                districtId: district.id,
            },
        });
    }
    console.log(`\n✅ Created ${processedDistricts.length} District Admins (password: district123)`);
    console.log(`✅ Created ${processedDistricts.length} District Viewers (password: viewer123)`);

    // State Viewer
    await prisma.user.upsert({
        where: { username: 'viewer_state' },
        update: {},
        create: {
            username: 'viewer_state',
            passwordHash: viewerPassword,
            name: 'State Viewer',
            role: 'viewer_state',
        },
    });
    console.log('✅ Created State Viewer (viewer_state / viewer123)');

    console.log('\n✅ Data Import Complete!');
    console.log(`- Districts: ${processedDistricts.length}`);
    console.log(`- Courts: ${courtsCreated}`);
    console.log(`- Magistrates: ${magistratesCreated}`);
    console.log(`- Naib Court Users: ${usersCreated}`);
    console.log(`- District Admins: ${processedDistricts.length}`);
    console.log(`- District Viewers: ${processedDistricts.length}`);
    console.log(`- State Viewer: 1`);
    console.log(`\nPasswords: Naib=Welcome@123, Admin=district123, Viewer=viewer123`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
