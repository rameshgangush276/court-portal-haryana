const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

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

    // Only seed base users and tables if they do not exist
    console.log('Skipping global wipe to preserve existing data.');

    // Create base users (Developer, State Admin)
    console.log('👤 Creating/Updating base system users...');
    const devPassword = 'admin123';
    const statePassword = 'state123';

    const developer = await prisma.user.upsert({
        where: { username: 'developer' },
        update: {},
        create: {
            username: 'developer',
            password: devPassword,
            name: 'System Developer',
            role: 'developer',
        },
    });

    await prisma.user.upsert({
        where: { username: 'state_admin' },
        update: {},
        create: {
            username: 'state_admin',
            password: statePassword,
            name: 'State Admin',
            role: 'state_admin',
        },
    });
    console.log('✅ Base users created.');

    // ─── 17 Predefined Data Entry Tables ───────────────
    const tables = [
        {
            name: '1. List of trials disposed/completed today',
            slug: 'trials-disposed',
            description: 'List of trials disposed/completed today',
            singleRow: false,
            sortOrder: 1,
            columns: [
                { name: 'FIR Number', slug: 'fir_no', dataType: 'text', sortOrder: 0 },
                { name: 'FIR Year', slug: 'fir_year', dataType: 'year', sortOrder: 1 },
                { name: 'Sections (U/s)', slug: 'sections', dataType: 'text', sortOrder: 2 },
                { name: 'Police Station', slug: 'police_station', dataType: 'text', sortOrder: 3 },
                { name: 'Name of Accused', slug: 'accused_name', dataType: 'text', sortOrder: 4 },
            ],
        },
        {
            name: '2. Decision on Cancellation/Untraced Files',
            slug: 'cancellation-decisions',
            description: 'Decision on Cancellation/Untraced Files',
            singleRow: false,
            sortOrder: 2,
            columns: [
                { name: 'FIR Number', slug: 'fir_no', dataType: 'text', sortOrder: 0 },
                { name: 'FIR Year', slug: 'fir_year', dataType: 'year', sortOrder: 1 },
                { name: 'Sections (U/s)', slug: 'sections', dataType: 'text', sortOrder: 2 },
                { name: 'Police Station', slug: 'police_station', dataType: 'text', sortOrder: 3 },
                { name: 'Decision', slug: 'decision', dataType: 'enum', enumOptions: ['Accept', 'Further investigation', 'Take cognizance', 'Take protest petition and proceed as complaint'], sortOrder: 4 },
            ],
        },
        {
            name: '3. Decision on any application filed by police officials',
            slug: 'police-applications',
            description: 'Decision on any application filed by police officials',
            singleRow: false,
            sortOrder: 3,
            columns: [
                { name: 'Application Type', slug: 'application_type', dataType: 'enum', enumOptions: ['Case Property Disposal', 'Bail Cancellation', 'Other'], sortOrder: 0 },
                { name: 'Date of Application', slug: 'application_date', dataType: 'date', sortOrder: 1 },
                { name: 'Decision', slug: 'decision', dataType: 'enum', enumOptions: ['Allowed', 'Dismissed', 'Abated'], sortOrder: 2 },
                { name: 'Reasons for Dismissal', slug: 'dismissal_reasons', dataType: 'text', isRequired: false, sortOrder: 3 },
                { name: 'Remarks', slug: 'remarks', dataType: 'text', isRequired: false, sortOrder: 4 },
            ],
        },
        {
            name: '4. List of accused granted bail (along with surety / Identifier, Photos Etc)',
            slug: 'bail-granted',
            description: 'List of accused granted bail (along with surety/identifier, photos etc.)',
            singleRow: false,
            sortOrder: 4,
            columns: [
                { name: 'Name of Accused', slug: 'accused_name', dataType: 'text', sortOrder: 0 },
                { name: 'FIR Number', slug: 'fir_no', dataType: 'text', sortOrder: 1 },
                { name: 'FIR Year', slug: 'fir_year', dataType: 'year', sortOrder: 2 },
                { name: 'Sections (U/s)', slug: 'sections', dataType: 'text', sortOrder: 3 },
                { name: 'Police Station', slug: 'police_station', dataType: 'text', sortOrder: 4 },
                { name: 'Bail Type', slug: 'bail_type', dataType: 'enum', enumOptions: ['Regular Bail', 'Interim Bail', 'Anticipatory Bail'], sortOrder: 5 },
                { name: 'Name of Surety', slug: 'surety_name', dataType: 'text', sortOrder: 6 },
                { name: 'Name of Identifier', slug: 'identifier_name', dataType: 'text', sortOrder: 7 },
                { name: 'Photo Taken', slug: 'photo_taken', dataType: 'enum', enumOptions: ['Yes', 'No'], sortOrder: 8 },
            ],
        },
        {
            name: '5. List of declared POs/PPs/BJs',
            slug: 'po-pp-bj',
            description: 'List of declared POs/PPs/BJs',
            singleRow: false,
            sortOrder: 5,
            columns: [
                { name: 'Name of Accused', slug: 'accused_name', dataType: 'text', sortOrder: 0 },
                { name: 'FIR Number', slug: 'fir_no', dataType: 'text', sortOrder: 1 },
                { name: 'FIR Year', slug: 'fir_year', dataType: 'year', sortOrder: 2 },
                { name: 'Sections (U/s)', slug: 'sections', dataType: 'text', sortOrder: 3 },
                { name: 'Police Station', slug: 'police_station', dataType: 'text', sortOrder: 4 },
                { name: 'Declaration Type', slug: 'declaration_type', dataType: 'enum', enumOptions: ['PO', 'PP', 'BJ'], sortOrder: 5 },
            ],
        },
        {
            name: '6. Value of Property attached (85 BNSS & 107 BNSS)',
            slug: 'property-attached',
            description: 'Detail of Property attached (85 BNSS & 107 BNSS)',
            singleRow: false,
            sortOrder: 6,
            columns: [
                { name: 'Name of Accused', slug: 'accused_name', dataType: 'text', sortOrder: 0 },
                { name: 'FIR Number', slug: 'fir_no', dataType: 'text', sortOrder: 1 },
                { name: 'FIR Year', slug: 'fir_year', dataType: 'year', sortOrder: 2 },
                { name: 'Sections (U/s)', slug: 'sections', dataType: 'text', sortOrder: 3 },
                { name: 'Police Station', slug: 'police_station', dataType: 'text', sortOrder: 4 },
                { name: 'BNSS Section', slug: 'bnss_section', dataType: 'enum', enumOptions: ['85 BNSS', '107 BNSS'], sortOrder: 5 },
                { name: 'Property Details', slug: 'property_details', dataType: 'text', sortOrder: 6 },
                { name: 'Property Value', slug: 'property_value', dataType: 'number', sortOrder: 7 },
            ],
        },
        {
            name: '7. Applications/Complaints/Istgasa filed against Police Officials',
            slug: 'complaints-against-police',
            description: 'Applications/Complaints/Istgasa filed against Police Officials',
            singleRow: false,
            sortOrder: 7,
            columns: [
                { name: 'Details of Applicant', slug: 'applicant_details', dataType: 'text', sortOrder: 0 },
                { name: 'Brief Facts', slug: 'brief_facts', dataType: 'text', sortOrder: 1 },
                { name: 'Next Hearing Date', slug: 'next_hearing_date', dataType: 'date', sortOrder: 2 },
            ],
        },
        {
            name: '8. FIR Registration under 156(3) CrPC',
            slug: 'fir-156-3',
            description: 'FIR Registration under 156(3) CrPC',
            singleRow: false,
            sortOrder: 8,
            columns: [
                { name: 'Details of Applicant', slug: 'applicant_details', dataType: 'text', sortOrder: 0 },
                { name: 'Sections in Complaint', slug: 'complaint_sections', dataType: 'text', sortOrder: 1 },
                { name: 'Police Station', slug: 'police_station', dataType: 'text', sortOrder: 2 },
                { name: 'Details of Police Officials', slug: 'police_official_details', dataType: 'text', sortOrder: 3 },
            ],
        },
        {
            name: '9. List of SHOs and DSPs who appeared in court today (for deposition or other matter)',
            slug: 'sho-dsp-appeared',
            description: 'List of SHOs and DSPs who appeared in court today',
            singleRow: false,
            sortOrder: 9,
            columns: [
                { name: 'Name of SHO/ DSP', slug: 'officer_name', dataType: 'text', sortOrder: 0 },
                { name: 'Rank', slug: 'rank', dataType: 'enum', enumOptions: ['SHO', 'DSP/ASP/Addl SP'], sortOrder: 1 },
                { name: 'Place of Posting', slug: 'posting_place', dataType: 'text', sortOrder: 2 },
                { name: 'Reason', slug: 'reason', dataType: 'text', sortOrder: 3 },
                { name: 'Remarks', slug: 'remarks', dataType: 'text', isRequired: false, sortOrder: 4 },
            ],
        },
        {
            name: '10. Deposition of police officials',
            slug: 'police-deposition',
            description: 'Deposition of police officials — aggregate counts per court per day',
            singleRow: true,
            sortOrder: 10,
            columns: [
                { name: 'Supposed to Appear', slug: 'supposed_to_appear', dataType: 'number', sortOrder: 0 },
                { name: 'Appeared Physically', slug: 'appeared_physically', dataType: 'number', sortOrder: 1 },
                { name: 'Examined Physically', slug: 'examined_physically', dataType: 'number', sortOrder: 2 },
                { name: 'Examined via VC', slug: 'examined_via_vc', dataType: 'number', sortOrder: 3 },
                { name: 'Absent (Unauthorized/No Request)', slug: 'absent_unauthorized', dataType: 'number', sortOrder: 4 },
            ],
        },
        {
            name: '11. VC of prisoners',
            slug: 'vc-prisoners',
            description: 'VC of prisoners — aggregate counts per court per day',
            singleRow: true,
            sortOrder: 11,
            columns: [
                { name: 'Produced Physically', slug: 'produced_physically', dataType: 'number', sortOrder: 0 },
                { name: 'Produced via VC', slug: 'produced_via_vc', dataType: 'number', sortOrder: 1 },
            ],
        },
        {
            name: '12. TIPs conducted today',
            slug: 'tips-conducted',
            description: 'TIPs conducted today',
            singleRow: false,
            sortOrder: 12,
            columns: [
                { name: 'FIR Number', slug: 'fir_no', dataType: 'text', sortOrder: 0 },
                { name: 'FIR Year', slug: 'fir_year', dataType: 'year', sortOrder: 1 },
                { name: 'Sections (U/s)', slug: 'sections', dataType: 'text', sortOrder: 2 },
                { name: 'Police Station', slug: 'police_station', dataType: 'text', sortOrder: 3 },
            ],
        },
        {
            name: '13. Pairvi for private witness',
            slug: 'pairvi-witness',
            description: 'Pairvi for private witness — aggregate counts per court per day',
            singleRow: true,
            sortOrder: 13,
            columns: [
                { name: 'Witnesses Examined', slug: 'witnesses_examined', dataType: 'number', sortOrder: 0 },
                { name: 'Witness prepared out of witness examined', slug: 'witnesses_prepared', dataType: 'number', sortOrder: 1 },
            ],
        },
        {
            name: '14. Any Gangster/Notorious Criminal appearing in Court the next day',
            slug: 'gangster-next-day',
            description: 'Any Gangster/Notorious Criminal appearing in Court the next day',
            singleRow: false,
            sortOrder: 14,
            columns: [
                { name: 'Gangster & Gang Details', slug: 'gangster_details', dataType: 'text', sortOrder: 0 },
                { name: 'FIR Number', slug: 'fir_no', dataType: 'text', sortOrder: 1 },
                { name: 'FIR Year', slug: 'fir_year', dataType: 'year', sortOrder: 2 },
                { name: 'Sections (U/s)', slug: 'sections', dataType: 'text', sortOrder: 3 },
                { name: 'Police Station', slug: 'police_station', dataType: 'text', sortOrder: 4 },
                { name: 'Accused Status', slug: 'accused_status', dataType: 'enum', enumOptions: ['Bail', 'Judicial Custody'], sortOrder: 5 },
                { name: 'Name of Jail', slug: 'jail_name', dataType: 'text', isRequired: false, sortOrder: 6 },
            ],
        },
        {
            name: '15. Any Crime against Property offender appearing in court the next day',
            slug: 'property-offender-next-day',
            description: 'Any Crime against Property offender appearing in court the next day',
            singleRow: false,
            sortOrder: 15,
            columns: [
                { name: 'Details of Accused', slug: 'accused_details', dataType: 'text', sortOrder: 0 },
                { name: 'FIR Number', slug: 'fir_no', dataType: 'text', sortOrder: 1 },
                { name: 'FIR Year', slug: 'fir_year', dataType: 'year', sortOrder: 2 },
                { name: 'Sections (U/s)', slug: 'sections', dataType: 'text', sortOrder: 3 },
                { name: 'Police Station', slug: 'police_station', dataType: 'text', sortOrder: 4 },
                { name: 'Accused Status', slug: 'accused_status', dataType: 'enum', enumOptions: ['Bail', 'Judicial Custody'], sortOrder: 5 },
                { name: 'Name of Jail', slug: 'jail_name', dataType: 'text', isRequired: false, sortOrder: 6 },
            ],
        },
        {
            name: '16. Fresh Bail Applications listed for tomorrow',
            slug: 'bail-applications-tomorrow',
            description: 'Bail Applications listed for tomorrow',
            singleRow: false,
            sortOrder: 16,
            columns: [
                { name: 'Name of Accused', slug: 'accused_name', dataType: 'text', sortOrder: 0 },
                { name: 'FIR Number', slug: 'fir_no', dataType: 'text', sortOrder: 1 },
                { name: 'FIR Year', slug: 'fir_year', dataType: 'year', sortOrder: 2 },
                { name: 'Sections (U/s)', slug: 'sections', dataType: 'text', sortOrder: 3 },
                { name: 'Police Station', slug: 'police_station', dataType: 'text', sortOrder: 4 },
                { name: 'Bail Type', slug: 'bail_type', dataType: 'enum', enumOptions: ['Regular Bail', 'Anticipatory Bail'], sortOrder: 5 },
            ],
        },
        {
            name: '17. NBW Arrest Warrants issued today',
            slug: 'nbw-arrest-warrants',
            description: 'NBW Arrest Warrants issued today',
            singleRow: false,
            sortOrder: 17,
            columns: [
                { name: 'Name of Accused', slug: 'accused_name', dataType: 'text', sortOrder: 0 },
                { name: 'FIR Number', slug: 'fir_no', dataType: 'text', sortOrder: 1 },
                { name: 'FIR Year', slug: 'fir_year', dataType: 'year', sortOrder: 2 },
                { name: 'Sections (U/s)', slug: 'sections', dataType: 'text', sortOrder: 3 },
                { name: 'Police Station', slug: 'police_station', dataType: 'text', sortOrder: 4 },
                { name: 'Next Date', slug: 'next_date', dataType: 'date', sortOrder: 5 },
            ],
        },
    ];

    console.log('📋 Syncing data entry tables...');
    for (const t of tables) {
        const table = await prisma.dataEntryTable.upsert({
            where: { slug: t.slug },
            update: {
                name: t.name,
                description: t.description,
                singleRow: t.singleRow,
                sortOrder: t.sortOrder,
                deletedAt: null,
            },
            create: {
                name: t.name,
                slug: t.slug,
                description: t.description,
                singleRow: t.singleRow,
                sortOrder: t.sortOrder,
                createdBy: developer.id,
            },
        });

        for (const col of t.columns) {
            await prisma.dataEntryColumn.upsert({
                where: { tableId_slug: { tableId: table.id, slug: col.slug } },
                update: {
                    name: col.name,
                    dataType: col.dataType,
                    enumOptions: col.enumOptions || null,
                    isRequired: col.isRequired !== undefined ? col.isRequired : true,
                    sortOrder: col.sortOrder,
                    deletedAt: null,
                },
                create: {
                    tableId: table.id,
                    name: col.name,
                    slug: col.slug,
                    dataType: col.dataType,
                    enumOptions: col.enumOptions || null,
                    isRequired: col.isRequired !== undefined ? col.isRequired : true,
                    sortOrder: col.sortOrder,
                },
            });
        }

        // --- CLEANUP COLS NO LONGER IN CONFIG ---
        const activeSlugs = t.columns.map(c => c.slug);
        await prisma.dataEntryColumn.updateMany({
            where: {
                tableId: table.id,
                slug: { notIn: activeSlugs },
                deletedAt: null
            },
            data: { deletedAt: new Date() }
        });

        console.log(`  ✅ Sync Complete: ${t.name}`);
    }
          const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));

    // Track stats
    let districtsCreated = 0;
    let courtsCreated = 0;
    let magistratesCreated = 0;
    let usersCreated = 0;
    let courtsDeleted = 0;

    // Counters per district for sequential IDs
    let districtUserCounters = {};
    let districtCourtNos = {};

    // Desired state built purely from Excel files
    // Map of districtCode -> { name, courts: Map(courtNo -> courtData) }
    const desiredState = new Map();

    // ─── Phase 1: Read all Excel files into desiredState ──────────────────────
    console.log('📊 Phase 1: Loading court structure from Excel files...');
    const sortedFiles = files.sort();
    for (const file of sortedFiles) {
        // Skip old/duplicate Kaithal file
        if (file.toLowerCase().includes('kaithal') && !file.toLowerCase().includes('new data updated')) {
            console.log(`  ⏭️  Skipping: ${file}`);
            continue;
        }

        console.log(`  📄 Reading: ${file}`);
        const filepath = path.join(dir, file);
        try {
            const workbook = xlsx.readFile(filepath);
            // Only first sheet to avoid duplicates from backup sheets
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) continue;

            const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });
            if (rawRows.length === 0) continue;

            const rawKeys = Object.keys(rawRows[0]);
            const findKey = (keywords) => rawKeys.find(k =>
                keywords.some(kw => normalize(k).includes(normalize(kw)))
            );

            const keyMap = {
                district:         findKey(['district']),
                cisNumber:        findKey(['cis number', 'court number', 'cis']),
                judgeName:        findKey(['magistrate name', 'judge name', 'magistarte name', 'judge/magistarte name']),
                judgeDesignation: findKey(['designation', 'desig']),
                naibRank:         findKey(['naib rank', 'rank']),
                naibName:         findKey(['naib court name', 'naib name']),
                naibPhone:        findKey(['phone no', 'phone number', 'phoneno', 'phone']),
            };

            const normalizeVal = (val, maxLen) => {
                if (val === null || val === undefined) return null;
                return val.toString().replace(/\s+/g, ' ').trim().substring(0, maxLen);
            };

            for (const rawRow of rawRows) {
                let districtName = normalizeVal(rawRow[keyMap.district], 100);
                if (!districtName) continue;
                districtName = districtName.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
                const districtCode = generateDistrictCode(districtName);

                if (!desiredState.has(districtCode)) {
                    desiredState.set(districtCode, { name: districtName, courts: new Map() });
                }
                const dState = desiredState.get(districtCode);

                const judgeDesig = normalizeVal(rawRow[keyMap.judgeDesignation], 100);
                if (!judgeDesig) continue;

                if (!districtCourtNos[districtCode]) districtCourtNos[districtCode] = 1;
                const courtNoStr = `${districtCode}-CRT-${String(districtCourtNos[districtCode]++).padStart(2, '0')}`;

                let cleanDesig = judgeDesig
                    .replace(/^\s*L\.?D\.?\s*/i, '')
                    .replace(/^\s*Ld\.?\s*/i, '')
                    .replace(/^,\s*/, '')
                    .trim();
                if (cleanDesig.length > 0) cleanDesig = cleanDesig[0].toUpperCase() + cleanDesig.slice(1);

                let cleanName = normalizeVal(rawRow[keyMap.judgeName], 150);
                if (cleanName) {
                    cleanName = cleanName
                        .replace(/^(Ms\.?|Mrs\.?|Smt\.?|Sh\.?|Shri\.?|Mr\.?|Dr\.?|Er\.?)\s*/i, '')
                        .replace(/^,\s*/, '')
                        .replace(/,\s*$/, '')
                        .trim();
                }

                const naibName = normalizeVal(rawRow[keyMap.naibName], 150);
                let naibUser = null;

                if (naibName) {
                    const naibPhone = rawRow[keyMap.naibPhone]
                        ? rawRow[keyMap.naibPhone].toString().replace(/\D/g, '').substring(0, 15)
                        : '';
                    
                    // Deduplication key: normalized name + phone
                    const naibKey = (normalize(naibName) + naibPhone).toLowerCase();
                    
                    if (!districtUserCounters[districtCode + '_naibs']) {
                        districtUserCounters[districtCode + '_naibs'] = new Map();
                    }

                    const naibMap = districtUserCounters[districtCode + '_naibs'];
                    
                    if (naibMap.has(naibKey)) {
                        naibUser = naibMap.get(naibKey);
                    } else {
                        const naibCounterCurrent = districtUserCounters[districtCode] || 1;
                        naibUser = {
                            username: generateUsername('naib_court', districtCode, naibCounterCurrent),
                            name: naibName,
                            rank: normalizeVal(rawRow[keyMap.naibRank], 50),
                            phone: naibPhone || null,
                        };
                        naibMap.set(naibKey, naibUser);
                        districtUserCounters[districtCode] = naibCounterCurrent + 1;
                    }
                }

                dState.courts.set(courtNoStr, {
                    name: cleanDesig,
                    cisNumber: normalizeVal(rawRow[keyMap.cisNumber], 50),
                    magistrate: cleanName ? { name: cleanName, designation: cleanDesig } : null,
                    naibUser: naibUser,
                });
            }
        } catch (e) {
            console.error(`  ❌ Error reading ${file}:`, e.message);
        }
    }

    // ─── Phase 2: Sync districts and courts to database ───────────────────────
    console.log('\n🚀 Phase 2: Syncing districts & courts to database...');
    
    // --- CLEANUP ALL EXISTING NAIB USERS BEFORE SYNC ---
    // This handles duplicates from previous buggy runs: any naib not refreshed by 
    // the new deduplicated logic will stay marked as deleted.
    console.log('🧹 Cleaning up old Naib Court users for sync...');
    await prisma.user.updateMany({
        where: { role: 'naib_court', deletedAt: null },
        data: { deletedAt: new Date() }
    });

    const allSeenCourtIds = new Set();
    const districtsHandled = new Set();

    const usersHandled = new Set();
    for (const [code, dData] of desiredState) {
        const district = await prisma.district.upsert({
            where: { code },
            update: { name: dData.name, deletedAt: null },
            create: { name: dData.name, code },
        });
        districtsHandled.add(district.id);
        districtsCreated++;

        for (const [courtNo, cData] of dData.courts) {
            let magistrateId = null;
            if (cData.magistrate) {
                const mag = await prisma.magistrate.upsert({
                    where: { districtId_name: { districtId: district.id, name: cData.magistrate.name } },
                    update: { designation: cData.magistrate.designation, deletedAt: null },
                    create: { name: cData.magistrate.name, designation: cData.magistrate.designation, districtId: district.id },
                });
                magistrateId = mag.id;
                magistratesCreated++;
            }

            const court = await prisma.court.upsert({
                where: { districtId_courtNo: { districtId: district.id, courtNo } },
                update: { name: cData.name, cisNumber: cData.cisNumber, magistrateId, deletedAt: null },
                create: { districtId: district.id, courtNo, name: cData.name, cisNumber: cData.cisNumber, magistrateId },
            });
            allSeenCourtIds.add(court.id);
            courtsCreated++;

            // Handle naib court user
            if (cData.naibUser) {
                const isNewUser = !usersHandled.has(cData.naibUser.username);
                await prisma.user.upsert({
                    where: { username: cData.naibUser.username },
                    update: {
                        name: cData.naibUser.name, phone: cData.naibUser.phone,
                        rank: cData.naibUser.rank, lastSelectedCourtId: court.id, 
                        districtId: district.id, deletedAt: null,
                    },
                    create: {
                        username: cData.naibUser.username, password: 'Welcome@123',
                        name: cData.naibUser.name, role: 'naib_court', districtId: district.id,
                        phone: cData.naibUser.phone, rank: cData.naibUser.rank, lastSelectedCourtId: court.id,
                        deletedAt: null,
                    },
                });
                if (isNewUser) {
                    usersHandled.add(cData.naibUser.username);
                    usersCreated++;
                }
            }
        }
    }

    // ─── Phase 3: Delete Excel-managed courts no longer in any Excel file ───────
    // Only removes courts matching the auto-generated pattern (e.g. PKL-CRT-01).
    // Courts added manually via the Developer UI (with custom courtNos) are NEVER deleted.
    console.log('\n🗑️  Phase 3: Cleaning up removed Excel courts...');
    const excelCourtNoPattern = /^[A-Z]+-CRT-\d+$/;
    const dbCourts = await prisma.court.findMany({
        where: { districtId: { in: Array.from(districtsHandled) } },
    });
    for (const c of dbCourts) {
        // Skip courts that were manually added via UI (non-standard courtNo)
        if (!excelCourtNoPattern.test(c.courtNo)) continue;
        if (!allSeenCourtIds.has(c.id)) {
            console.log(`  🗑️  Removing deleted Excel court: ${c.courtNo} - ${c.name}`);
            try {
                await prisma.court.delete({ where: { id: c.id } });
                courtsDeleted++;
            } catch {
                console.warn(`    ⚠️  Cannot delete ${c.courtNo} — has linked data entries.`);
            }
        }
    }
    if (courtsDeleted > 0) console.log(`  ✅ Removed ${courtsDeleted} Excel-orphaned courts.`);

    // ─── Phase 4: Create district admin & viewer accounts ─────────────────────
    const allKnownDistricts = await prisma.district.findMany({ where: { deletedAt: null } });
    console.log(`\n👤 Phase 4: Syncing accounts for ${allKnownDistricts.length} districts...`);

    for (const district of allKnownDistricts) {
        await prisma.user.upsert({
            where: { username: `admin_${district.code.toLowerCase()}` },
            update: { deletedAt: null },
            create: {
                username: `admin_${district.code.toLowerCase()}`, password: 'district123',
                name: `District Admin ${district.name}`, role: 'district_admin', districtId: district.id,
            },
        });
        await prisma.user.upsert({
            where: { username: `viewer_${district.code.toLowerCase()}` },
            update: { deletedAt: null },
            create: {
                username: `viewer_${district.code.toLowerCase()}`, password: 'viewer123',
                name: `District Viewer ${district.name}`, role: 'viewer_district', districtId: district.id,
            },
        });
    }
    await prisma.user.upsert({
        where: { username: 'viewer_state' },
        update: { deletedAt: null },
        create: { username: 'viewer_state', password: 'viewer123', name: 'State Viewer', role: 'viewer_state' },
    });

    // ─── Phase 5: Police Stations — upsert from CSV (preserves UI additions) ────
    // Uses upsert on unique (districtId, name) — no deleteMany, so stations added
    // through the Developer UI are NEVER removed. CSV stations are merged in safely.
    console.log('\n🔄 Phase 5: Merging Police Stations from CSV...');
    const csvPath = path.join(__dirname, '../Disrtrict_PS.csv');
    if (fs.existsSync(csvPath)) {
        const records = require('csv-parse/sync').parse(
            fs.readFileSync(csvPath, 'utf-8').replace(/^\uFEFF/, ''),
            { columns: true, skip_empty_lines: true, trim: true }
        );

        let psUpserted = 0;
        const csvDistrictsHandled = new Set();
        const csvStationsPerDistrict = {}; // districtId -> Set of names

        for (const record of records) {
            if (!record.PS || !record.District) continue;
            const districtCode = generateDistrictCode(record.District);
            const district = await prisma.district.findUnique({ where: { code: districtCode } });
            if (!district) continue;

            const psName = record.PS.trim();
            await prisma.policeStation.upsert({
                where: { districtId_name: { districtId: district.id, name: psName } },
                update: { deletedAt: null },
                create: { name: psName, districtId: district.id },
            });
            
            csvDistrictsHandled.add(district.id);
            if (!csvStationsPerDistrict[district.id]) csvStationsPerDistrict[district.id] = new Set();
            csvStationsPerDistrict[district.id].add(psName);
            psUpserted++;
        }

        // --- CLEANUP PS NO LONGER IN CSV ---
        let psDeleted = 0;
        for (const dId of csvDistrictsHandled) {
            const activeNames = Array.from(csvStationsPerDistrict[dId]);
            const removed = await prisma.policeStation.updateMany({
                where: {
                    districtId: dId,
                    name: { notIn: activeNames },
                    deletedAt: null
                },
                data: { deletedAt: new Date() }
            });
            psDeleted += removed.count;
        }

        console.log(`  ✅ Merged ${psUpserted} Police Stations from CSV (${psDeleted} removed).`);
    } else {
        console.log('  ⚠️  Disrtrict_PS.csv not found — skipping police stations.');
    }

    console.log('\n📊 Summary:');
    console.log(`  Districts : ${districtsCreated} upserted`);
    console.log(`  Courts    : ${courtsCreated} upserted, ${courtsDeleted} deleted`);
    console.log(`  Magistrates: ${magistratesCreated} created`);
    console.log(`  Naib Users: ${usersCreated} created/updated`);
    console.log('\n✅ Seeding completed successfully!');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
