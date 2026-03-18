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

    // ─── 16 Predefined Data Entry Tables ───────────────
    const tables = [
        {
                name: "1. Trials Disposed/Completed Today",
                slug: "trials-disposed",
                description: "List of trials disposed/completed today",
                singleRow: false,
                columns: [
                        {
                                name: "FIR Number",
                                slug: "fir_no",
                                dataType: "text",
                                sortOrder: 0
                        },
                        {
                                name: "FIR Date",
                                slug: "fir_date",
                                dataType: "date",
                                sortOrder: 1
                        },
                        {
                                name: "Sections (U/s)",
                                slug: "sections",
                                dataType: "text",
                                sortOrder: 2
                        },
                        {
                                name: "Police Station",
                                slug: "police_station",
                                dataType: "text",
                                sortOrder: 3
                        },
                        {
                                name: "Name of Accused",
                                slug: "accused_name",
                                dataType: "text",
                                sortOrder: 4
                        }
                ]
        },
        {
                name: "2. Decision on Cancellation/Untraced Files",
                slug: "cancellation-decisions",
                description: "Decision on Cancellation/Untraced Files",
                singleRow: false,
                columns: [
                        {
                                name: "FIR Number",
                                slug: "fir_no",
                                dataType: "text",
                                sortOrder: 0
                        },
                        {
                                name: "FIR Date",
                                slug: "fir_date",
                                dataType: "date",
                                sortOrder: 1
                        },
                        {
                                name: "Sections (U/s)",
                                slug: "sections",
                                dataType: "text",
                                sortOrder: 2
                        },
                        {
                                name: "Police Station",
                                slug: "police_station",
                                dataType: "text",
                                sortOrder: 3
                        },
                        {
                                name: "Decision",
                                slug: "decision",
                                dataType: "enum",
                                sortOrder: 4,
                                enumOptions: [
                                        "Accepted",
                                        "Further Investigation",
                                        "Trial in court against protest petition"
                                ]
                        }
                ]
        },
        {
                name: "3. Decision on Applications by Police Officials",
                slug: "police-applications",
                description: "Decision on any application filed by police officials",
                singleRow: false,
                columns: [
                        {
                                name: "Application Type",
                                slug: "application_type",
                                dataType: "enum",
                                sortOrder: 0,
                                enumOptions: [
                                        "Case Property Disposal",
                                        "Bail Cancellation",
                                        "Other"
                                ]
                        },
                        {
                                name: "Date of Application",
                                slug: "application_date",
                                dataType: "date",
                                sortOrder: 1
                        },
                        {
                                name: "Decision",
                                slug: "decision",
                                dataType: "enum",
                                sortOrder: 2,
                                enumOptions: [
                                        "Allowed",
                                        "Dismissed",
                                        "Abated"
                                ]
                        },
                        {
                                name: "Reasons for Dismissal",
                                slug: "dismissal_reasons",
                                dataType: "text",
                                sortOrder: 3,
                                isRequired: false
                        },
                        {
                                name: "Remarks",
                                slug: "remarks",
                                dataType: "text",
                                sortOrder: 4,
                                isRequired: false
                        }
                ]
        },
        {
                name: "4. Accused Granted Bail",
                slug: "bail-granted",
                description: "List of accused granted bail (along with surety/identifier, photos etc.)",
                singleRow: false,
                columns: [
                        {
                                name: "Name of Accused",
                                slug: "accused_name",
                                dataType: "text",
                                sortOrder: 0
                        },
                        {
                                name: "FIR Number",
                                slug: "fir_no",
                                dataType: "text",
                                sortOrder: 1
                        },
                        {
                                name: "FIR Date",
                                slug: "fir_date",
                                dataType: "date",
                                sortOrder: 2
                        },
                        {
                                name: "Sections (U/s)",
                                slug: "sections",
                                dataType: "text",
                                sortOrder: 3
                        },
                        {
                                name: "Police Station",
                                slug: "police_station",
                                dataType: "text",
                                sortOrder: 4
                        },
                        {
                                name: "Bail Type",
                                slug: "bail_type",
                                dataType: "enum",
                                sortOrder: 5,
                                enumOptions: [
                                        "Regular Bail",
                                        "Interim Bail",
                                        "Anticipatory Bail"
                                ]
                        },
                        {
                                name: "Name of Surety",
                                slug: "surety_name",
                                dataType: "text",
                                sortOrder: 6,
                                isRequired: false
                        },
                        {
                                name: "Name of Identifier",
                                slug: "identifier_name",
                                dataType: "text",
                                sortOrder: 7,
                                isRequired: false
                        },
                        {
                                name: "Photo Taken",
                                slug: "photo_taken",
                                dataType: "enum",
                                sortOrder: 8,
                                enumOptions: [
                                        "Yes",
                                        "No"
                                ],
                                isRequired: false
                        }
                ]
        },
        {
                name: "5. Declared POs/PPs/BJs",
                slug: "po-pp-bj",
                description: "List of declared POs/PPs/BJs",
                singleRow: false,
                columns: [
                        {
                                name: "Name of Accused",
                                slug: "accused_name",
                                dataType: "text",
                                sortOrder: 0
                        },
                        {
                                name: "FIR Number",
                                slug: "fir_no",
                                dataType: "text",
                                sortOrder: 1
                        },
                        {
                                name: "FIR Date",
                                slug: "fir_date",
                                dataType: "date",
                                sortOrder: 2
                        },
                        {
                                name: "Sections (U/s)",
                                slug: "sections",
                                dataType: "text",
                                sortOrder: 3
                        },
                        {
                                name: "Police Station",
                                slug: "police_station",
                                dataType: "text",
                                sortOrder: 4
                        },
                        {
                                name: "Declaration Type",
                                slug: "declaration_type",
                                dataType: "enum",
                                sortOrder: 5,
                                enumOptions: [
                                        "PO",
                                        "PP",
                                        "BJ"
                                ]
                        }
                ]
        },
        {
                name: "6. Property Attached (85 BNSS & 107 BNSS)",
                slug: "property-attached",
                description: "Detail of Property attached (85 BNSS & 107 BNSS)",
                singleRow: false,
                columns: [
                        {
                                name: "Name of Accused",
                                slug: "accused_name",
                                dataType: "text",
                                sortOrder: 0
                        },
                        {
                                name: "FIR Number",
                                slug: "fir_no",
                                dataType: "text",
                                sortOrder: 1
                        },
                        {
                                name: "FIR Date",
                                slug: "fir_date",
                                dataType: "date",
                                sortOrder: 2
                        },
                        {
                                name: "Sections (U/s)",
                                slug: "sections",
                                dataType: "text",
                                sortOrder: 3
                        },
                        {
                                name: "Police Station",
                                slug: "police_station",
                                dataType: "text",
                                sortOrder: 4
                        },
                        {
                                name: "BNSS Section",
                                slug: "bnss_section",
                                dataType: "enum",
                                sortOrder: 5,
                                enumOptions: [
                                        "85 BNSS",
                                        "107 BNSS"
                                ]
                        },
                        {
                                name: "Property Details",
                                slug: "property_details",
                                dataType: "text",
                                sortOrder: 6
                        },
                        {
                                name: "Property Value",
                                slug: "property_value",
                                dataType: "number",
                                sortOrder: 7
                        }
                ]
        },
        {
                name: "7. Applications/Complaints Against Police Officials",
                slug: "complaints-against-police",
                description: "Applications/Complaints/Istgasa filed against Police Officials",
                singleRow: false,
                columns: [
                        {
                                name: "Details of Applicant",
                                slug: "applicant_details",
                                dataType: "text",
                                sortOrder: 0
                        },
                        {
                                name: "Brief Facts",
                                slug: "brief_facts",
                                dataType: "text",
                                sortOrder: 1
                        },
                        {
                                name: "Next Hearing Date",
                                slug: "next_hearing_date",
                                dataType: "date",
                                sortOrder: 2
                        }
                ]
        },
        {
                name: "8. FIR Registration under 156(3) CrPC",
                slug: "fir-156-3",
                description: "FIR Registration under 156(3) CrPC",
                singleRow: false,
                columns: [
                        {
                                name: "Details of Applicant",
                                slug: "applicant_details",
                                dataType: "text",
                                sortOrder: 0
                        },
                        {
                                name: "Sections in Complaint",
                                slug: "complaint_sections",
                                dataType: "text",
                                sortOrder: 1
                        },
                        {
                                name: "Police Station",
                                slug: "police_station",
                                dataType: "text",
                                sortOrder: 2
                        },
                        {
                                name: "Details of Police Officials",
                                slug: "police_official_details",
                                dataType: "text",
                                sortOrder: 3
                        }
                ]
        },
        {
                name: "9. SHOs and DSPs Who Appeared in Court",
                slug: "sho-dsp-appeared",
                description: "List of SHOs and DSPs who appeared in court today",
                singleRow: false,
                columns: [
                        {
                                name: "Name of SHO/DSP",
                                slug: "officer_name",
                                dataType: "text",
                                sortOrder: 0
                        },
                        {
                                name: "Place of Posting",
                                slug: "posting_place",
                                dataType: "text",
                                sortOrder: 1
                        },
                        {
                                name: "Reason",
                                slug: "reason",
                                dataType: "text",
                                sortOrder: 2
                        },
                        {
                                name: "Remarks",
                                slug: "remarks",
                                dataType: "text",
                                sortOrder: 3,
                                isRequired: false
                        }
                ]
        },
        {
                name: "10. Deposition of Police Officials",
                slug: "police-deposition",
                description: "Deposition of police officials — aggregate counts per court per day",
                singleRow: true,
                columns: [
                        {
                                name: "Supposed to Appear",
                                slug: "supposed_to_appear",
                                dataType: "number",
                                sortOrder: 0
                        },
                        {
                                name: "Appeared Physically",
                                slug: "appeared_physically",
                                dataType: "number",
                                sortOrder: 1
                        },
                        {
                                name: "Examined Physically",
                                slug: "examined_physically",
                                dataType: "number",
                                sortOrder: 2
                        },
                        {
                                name: "Examined via VC",
                                slug: "examined_via_vc",
                                dataType: "number",
                                sortOrder: 3
                        },
                        {
                                name: "Absent (Unauthorized/No Request)",
                                slug: "absent_unauthorized",
                                dataType: "number",
                                sortOrder: 4
                        }
                ]
        },
        {
                name: "11. VC of Prisoners in judicial custody",
                slug: "vc-prisoners",
                description: "VC of prisoners — aggregate counts per court per day",
                singleRow: true,
                columns: [
                        {
                                name: "Produced Physically",
                                slug: "produced_physically",
                                dataType: "number",
                                sortOrder: 0
                        },
                        {
                                name: "Produced via VC",
                                slug: "produced_via_vc",
                                dataType: "number",
                                sortOrder: 1
                        }
                ]
        },
        {
                name: "12. TIPs Conducted Today",
                slug: "tips-conducted",
                description: "TIPs conducted today",
                singleRow: false,
                columns: [
                        {
                                name: "FIR Number",
                                slug: "fir_no",
                                dataType: "text",
                                sortOrder: 0
                        },
                        {
                                name: "FIR Date",
                                slug: "fir_date",
                                dataType: "date",
                                sortOrder: 1
                        },
                        {
                                name: "Sections (U/s)",
                                slug: "sections",
                                dataType: "text",
                                sortOrder: 2
                        },
                        {
                                name: "Police Station",
                                slug: "police_station",
                                dataType: "text",
                                sortOrder: 3
                        }
                ]
        },
        {
                name: "13. Pairvi for Private Witness",
                slug: "pairvi-witness",
                description: "Pairvi for private witness — aggregate counts per court per day",
                singleRow: true,
                columns: [
                        {
                                name: "Witnesses Examined",
                                slug: "witnesses_examined",
                                dataType: "number",
                                sortOrder: 0
                        },
                        {
                                name: "Witnesses Prepared to Testify",
                                slug: "witnesses_prepared",
                                dataType: "number",
                                sortOrder: 1
                        }
                ]
        },
        {
                name: "14. Gangster/Notorious Criminal Appearing Next Day",
                slug: "gangster-next-day",
                description: "Any Gangster/Notorious Criminal appearing in Court the next day",
                singleRow: false,
                columns: [
                        {
                                name: "Gangster & Gang Details",
                                slug: "gangster_details",
                                dataType: "text",
                                sortOrder: 0
                        },
                        {
                                name: "FIR Number",
                                slug: "fir_no",
                                dataType: "text",
                                sortOrder: 1
                        },
                        {
                                name: "FIR Date",
                                slug: "fir_date",
                                dataType: "date",
                                sortOrder: 2
                        },
                        {
                                name: "Sections (U/s)",
                                slug: "sections",
                                dataType: "text",
                                sortOrder: 3
                        },
                        {
                                name: "Police Station",
                                slug: "police_station",
                                dataType: "text",
                                sortOrder: 4
                        },
                        {
                                name: "Accused Status",
                                slug: "accused_status",
                                dataType: "enum",
                                sortOrder: 5,
                                enumOptions: [
                                        "Bail",
                                        "Judicial Custody"
                                ]
                        },
                        {
                                name: "Name of Jail",
                                slug: "jail_name",
                                dataType: "text",
                                sortOrder: 6,
                                isRequired: false
                        }
                ]
        },
        {
                name: "15. Crime Against Property Offender Appearing Next Day",
                slug: "property-offender-next-day",
                description: "Any Crime against Property offender appearing in court the next day",
                singleRow: false,
                columns: [
                        {
                                name: "Details of Accused",
                                slug: "accused_details",
                                dataType: "text",
                                sortOrder: 0
                        },
                        {
                                name: "FIR Number",
                                slug: "fir_no",
                                dataType: "text",
                                sortOrder: 1
                        },
                        {
                                name: "FIR Date",
                                slug: "fir_date",
                                dataType: "date",
                                sortOrder: 2
                        },
                        {
                                name: "Sections (U/s)",
                                slug: "sections",
                                dataType: "text",
                                sortOrder: 3
                        },
                        {
                                name: "Police Station",
                                slug: "police_station",
                                dataType: "text",
                                sortOrder: 4
                        },
                        {
                                name: "Escort Guard Name",
                                slug: "escort_guard_name",
                                dataType: "text",
                                sortOrder: 5
                        },
                        {
                                name: "Escort Guard Mobile",
                                slug: "escort_guard_mobile",
                                dataType: "text",
                                sortOrder: 6
                        }
                ]
        },
        {
                name: "16. Bail Applications Listed for Tomorrow",
                slug: "bail-applications-tomorrow",
                description: "Bail Applications listed for tomorrow",
                singleRow: false,
                columns: [
                        {
                                name: "Name of Accused",
                                slug: "accused_name",
                                dataType: "text",
                                sortOrder: 0
                        },
                        {
                                name: "FIR Number",
                                slug: "fir_no",
                                dataType: "text",
                                sortOrder: 1
                        },
                        {
                                name: "FIR Date",
                                slug: "fir_date",
                                dataType: "date",
                                sortOrder: 2
                        },
                        {
                                name: "Sections (U/s)",
                                slug: "sections",
                                dataType: "text",
                                sortOrder: 3
                        },
                        {
                                name: "Police Station",
                                slug: "police_station",
                                dataType: "text",
                                sortOrder: 4
                        },
                        {
                                name: "Bail Type",
                                slug: "bail_type",
                                dataType: "enum",
                                sortOrder: 5,
                                enumOptions: [
                                        "Regular Bail",
                                        "Anticipatory Bail"
                                ]
                        }
                ]
        }
];

    console.log('📋 Syncing data entry tables...');
    for (const t of tables) {
        const table = await prisma.dataEntryTable.upsert({
            where: { slug: t.slug },
            update: {
                name: t.name,
                description: t.description,
                singleRow: t.singleRow,
                deletedAt: null,
            },
            create: {
                name: t.name,
                slug: t.slug,
                description: t.description,
                singleRow: t.singleRow,
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
        console.log(`  ✅ Sync Complete: ${t.name}`);
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));

    // Track stats
    let districtsCreated = 0;
    let courtsCreated = 0;
    let magistratesCreated = 0;
    let usersCreated = 0;

    // Use to track unique counters across all sheets/files
    let districtUserCounters = {};
    let districtCourtNos = {};

    // ─── Phase 1: Master Structure Sync (UI Deletions/Updates) ─────────
    const masterPath = path.join(__dirname, 'master_structure.json');
    const existingDistrictCodes = new Set();
    const existingCourtNos = new Set();

    if (fs.existsSync(masterPath)) {
        console.log('\n🏗️ Found Master Structure JSON. Syncing UI-managed configuration...');
        const masterData = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

        for (const d of masterData) {
            existingDistrictCodes.add(d.code);

            // 1. Upsert District
            const district = await prisma.district.upsert({
                where: { code: d.code },
                update: { name: d.name },
                create: { name: d.name, code: d.code }
            });
            districtsCreated++;

            for (const c of d.courts) {
                existingCourtNos.add(c.courtNo);

                // 2. Upsert Magistrate
                let magistrate = null;
                if (c.magistrate) {
                    magistrate = await prisma.magistrate.upsert({
                        where: { id: c.magistrate.id },
                        update: {
                            name: c.magistrate.name,
                            designation: c.magistrate.designation,
                            gender: c.magistrate.gender,
                            districtId: district.id
                        },
                        create: {
                            name: c.magistrate.name,
                            designation: c.magistrate.designation,
                            gender: c.magistrate.gender,
                            districtId: district.id
                        }
                    });
                    magistratesCreated++;
                }

                // 3. Upsert Court
                const court = await prisma.court.upsert({
                    where: { districtId_courtNo: { districtId: district.id, courtNo: c.courtNo } },
                    update: {
                        name: c.name,
                        cisNumber: c.cisNumber,
                        magistrateId: magistrate ? magistrate.id : null,
                        districtId: district.id
                    },
                    create: {
                        courtNo: c.courtNo,
                        name: c.name,
                        cisNumber: c.cisNumber,
                        magistrateId: magistrate ? magistrate.id : null,
                        districtId: district.id
                    }
                });
                courtsCreated++;

                // 4. Sync Naib Court Users
                if (c.usersLastSelected) {
                    for (const u of c.usersLastSelected) {
                        await prisma.user.upsert({
                            where: { username: u.username },
                            update: {
                                name: u.name,
                                phone: u.phone,
                                rank: u.rank,
                                lastSelectedCourtId: court.id
                            },
                            create: {
                                username: u.username,
                                password: 'Welcome@123',
                                name: u.name,
                                role: 'naib_court',
                                districtId: district.id,
                                phone: u.phone,
                                rank: u.rank,
                                lastSelectedCourtId: court.id
                            }
                        });
                        usersCreated++;
                    }
                }
            }
        }
        
        // --- CLEANUP: Handle Deletions ---
        const dbDistricts = await prisma.district.findMany({ where: { code: { in: Array.from(existingDistrictCodes) } }, select: { id: true } });
        const districtIds = dbDistricts.map(dx => dx.id);
        const dbCourts = await prisma.court.findMany({ where: { districtId: { in: districtIds } } });

        for (const dbC of dbCourts) {
            if (!existingCourtNos.has(dbC.courtNo)) {
                console.log(`🗑️ Deleting Court ${dbC.courtNo} (removed from UI/JSON)`);
                try {
                    await prisma.court.delete({ where: { id: dbC.id } });
                } catch (e) {
                    console.warn(`  ⚠️ Could not delete court ${dbC.courtNo} - likely has active data entries.`);
                }
            }
        }
    }

    // ─── Phase 2: Excel Import (Fallback / New Districts) ─────────
    for (const file of files) {
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
                    
                    const districtCode = generateDistrictCode(districtName);
                    // CRITICAL: Skip if this district is already managed by Master JSON
                    if (existingDistrictCodes.has(districtCode)) continue;

                    const cisNumberStr = normalizeVal(rawRow[keyMap.cisNumber], 50);
                    const judgeNameStr = normalizeVal(rawRow[keyMap.judgeName], 150);
                    const judgeDesig = normalizeVal(rawRow[keyMap.judgeDesignation], 100);
                    const naibNameStr = normalizeVal(rawRow[keyMap.naibName], 150);
                    const naibRankStr = normalizeVal(rawRow[keyMap.naibRank], 50);
                    const naibPhoneStr = rawRow[keyMap.naibPhone] ? rawRow[keyMap.naibPhone].toString().replace(/\D/g, '').substring(0, 15) : null;

                    if (!districtName || !judgeDesig) continue;

                    if (!districtUserCounters[districtCode]) districtUserCounters[districtCode] = 1;

                    let district = await prisma.district.upsert({
                        where: { code: districtCode },
                        update: {},
                        create: { name: districtName, code: districtCode }
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
                            .replace(/,\s*$/, '') // Remove trailing commas
                            .trim();
                    }

                    // 2. Process Judicial Officer (if exists)
                    let magistrate = null;
                    if (cleanName) {
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
                    const courtName = normalizeVal(cleanDesig, 150);
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
                        const username = generateUsername('naib_court', districtCode, districtUserCounters[districtCode]++);

                        await prisma.user.upsert({
                            where: { username: username },
                            update: {
                                name: naibNameStr,
                                phone: naibPhoneStr,
                                rank: naibRankStr,
                                lastSelectedCourtId: court.id
                            },
                            create: {
                                username: username,
                                password: 'Welcome@123',
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
    const processedDistricts = Object.keys(districtUserCounters);
    // Add districts from Phase 1 too
    existingDistrictCodes.forEach(code => {
        if (!processedDistricts.includes(code)) processedDistricts.push(code);
    });

    console.log(`👤 Creating accounts for ${processedDistricts.length} districts...`);
    const adminPassword = 'district123';
    const viewerPassword = 'viewer123';

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
                password: adminPassword,
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
                password: viewerPassword,
                name: `District Viewer ${district.name}`,
                role: 'viewer_district',
                districtId: district.id,
            },
        });
    }

    // State Viewer
    await prisma.user.upsert({
        where: { username: 'viewer_state' },
        update: {},
        create: {
            username: 'viewer_state',
            password: viewerPassword,
            name: 'State Viewer',
            role: 'viewer_state',
        },
    });

    // ─── Update Police Stations from CSV ──────────────────
    console.log('\n🔄 Updating Police Stations from CSV...');
    const csvPath = path.join(__dirname, '../Disrtrict_PS.csv');
    if (fs.existsSync(csvPath)) {
        const fileContent = fs.readFileSync(csvPath, 'utf-8');
        const cleanContent = fileContent.charCodeAt(0) === 0xFEFF ? fileContent.slice(1) : fileContent;
        
        const records = require('csv-parse/sync').parse(cleanContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        for (const record of records) {
            const districtName = record.District;
            const psName = record.PS;
            if (!psName || !districtName) continue;

            const districtCode = generateDistrictCode(districtName);
            const district = await prisma.district.findUnique({ where: { code: districtCode } });
            if (!district) continue;

            await prisma.policeStation.upsert({
                where: { 
                    // Note: Schema doesn't have a unique constraint on districtId/name yet, 
                    // but we'll use findFirst/create for now to avoid duplicates
                    id: -1 // Dummy to force create or we search first
                },
                update: {},
                create: {
                    name: psName,
                    districtId: district.id
                }
            }).catch(async () => {
                // Better fallback for PS upsert without unique set
                const existing = await prisma.policeStation.findFirst({
                    where: { name: psName, districtId: district.id }
                });
                if (!existing) {
                    await prisma.policeStation.create({
                        data: { name: psName, districtId: district.id }
                    });
                }
            });
        }
        console.log(`✅ Synced ${records.length} Police Stations.`);
    }

    console.log('\n🚀 Seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
