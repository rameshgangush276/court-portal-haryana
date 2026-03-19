const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // ─── Developer User ─────────────────────────────────
    const devPassword = await bcrypt.hash('admin123', 10);
    const developer = await prisma.user.upsert({
        where: { username: 'developer' },
        update: {},
        create: {
            username: 'developer',
            passwordHash: devPassword,
            name: 'System Developer',
            role: 'developer',
        },
    });
    console.log('✅ Developer user created');

    // Districts are created by the production seed script (seed-production.js)
    // which reads them from the Excel files.

    // ─── 16 Predefined Data Entry Tables ───────────────
    const tables = [
        {
            name: '1. Trials Disposed/Completed Today',
            slug: 'trials-disposed',
            description: 'List of trials disposed/completed today',
            singleRow: false,
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
            columns: [
                { name: 'FIR Number', slug: 'fir_no', dataType: 'text', sortOrder: 0 },
                { name: 'FIR Year', slug: 'fir_year', dataType: 'year', sortOrder: 1 },
                { name: 'Sections (U/s)', slug: 'sections', dataType: 'text', sortOrder: 2 },
                { name: 'Police Station', slug: 'police_station', dataType: 'text', sortOrder: 3 },
                { name: 'Decision', slug: 'decision', dataType: 'enum', enumOptions: ['Accepted', 'Further Investigation', 'Trial in court against protest petition'], sortOrder: 4 },
            ],
        },
        {
            name: '3. Decision on Applications by Police Officials',
            slug: 'police-applications',
            description: 'Decision on any application filed by police officials',
            singleRow: false,
            columns: [
                { name: 'Application Type', slug: 'application_type', dataType: 'enum', enumOptions: ['Case Property Disposal', 'Bail Cancellation', 'Other'], sortOrder: 0 },
                { name: 'Date of Application', slug: 'application_date', dataType: 'date', sortOrder: 1 },
                { name: 'Decision', slug: 'decision', dataType: 'enum', enumOptions: ['Allowed', 'Dismissed', 'Abated'], sortOrder: 2 },
                { name: 'Reasons for Dismissal', slug: 'dismissal_reasons', dataType: 'text', isRequired: false, sortOrder: 3 },
                { name: 'Remarks', slug: 'remarks', dataType: 'text', isRequired: false, sortOrder: 4 },
            ],
        },
        {
            name: '4. Accused Granted Bail',
            slug: 'bail-granted',
            description: 'List of accused granted bail (along with surety/identifier, photos etc.)',
            singleRow: false,
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
            name: '5. Declared POs/PPs/BJs',
            slug: 'po-pp-bj',
            description: 'List of declared POs/PPs/BJs',
            singleRow: false,
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
            name: '6. Property Attached (85 BNSS & 107 BNSS)',
            slug: 'property-attached',
            description: 'Detail of Property attached (85 BNSS & 107 BNSS)',
            singleRow: false,
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
            name: '7. Applications/Complaints Against Police Officials',
            slug: 'complaints-against-police',
            description: 'Applications/Complaints/Istgasa filed against Police Officials',
            singleRow: false,
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
            columns: [
                { name: 'Details of Applicant', slug: 'applicant_details', dataType: 'text', sortOrder: 0 },
                { name: 'Sections in Complaint', slug: 'complaint_sections', dataType: 'text', sortOrder: 1 },
                { name: 'Police Station', slug: 'police_station', dataType: 'text', sortOrder: 2 },
                { name: 'Details of Police Officials', slug: 'police_official_details', dataType: 'text', sortOrder: 3 },
            ],
        },
        {
            name: '9. SHOs and DSPs Who Appeared in Court',
            slug: 'sho-dsp-appeared',
            description: 'List of SHOs and DSPs who appeared in court today',
            singleRow: false,
            columns: [
                { name: 'Name of SHO/DSP', slug: 'officer_name', dataType: 'text', sortOrder: 0 },
                { name: 'Place of Posting', slug: 'posting_place', dataType: 'text', sortOrder: 1 },
                { name: 'Reason', slug: 'reason', dataType: 'text', sortOrder: 2 },
                { name: 'Remarks', slug: 'remarks', dataType: 'text', isRequired: false, sortOrder: 3 },
            ],
        },
        {
            name: '10. Deposition of Police Officials',
            slug: 'police-deposition',
            description: 'Deposition of police officials — aggregate counts per court per day',
            singleRow: true,
            columns: [
                { name: 'Supposed to Appear', slug: 'supposed_to_appear', dataType: 'number', sortOrder: 0 },
                { name: 'Appeared Physically', slug: 'appeared_physically', dataType: 'number', sortOrder: 1 },
                { name: 'Examined Physically', slug: 'examined_physically', dataType: 'number', sortOrder: 2 },
                { name: 'Examined via VC', slug: 'examined_via_vc', dataType: 'number', sortOrder: 3 },
                { name: 'Absent (Unauthorized/No Request)', slug: 'absent_unauthorized', dataType: 'number', sortOrder: 4 },
            ],
        },
        {
            name: '11. VC of Prisoners',
            slug: 'vc-prisoners',
            description: 'VC of prisoners — aggregate counts per court per day',
            singleRow: true,
            columns: [
                { name: 'Produced Physically', slug: 'produced_physically', dataType: 'number', sortOrder: 0 },
                { name: 'Produced via VC', slug: 'produced_via_vc', dataType: 'number', sortOrder: 1 },
            ],
        },
        {
            name: '12. TIPs Conducted Today',
            slug: 'tips-conducted',
            description: 'TIPs conducted today',
            singleRow: false,
            columns: [
                { name: 'FIR Number', slug: 'fir_no', dataType: 'text', sortOrder: 0 },
                { name: 'FIR Year', slug: 'fir_year', dataType: 'year', sortOrder: 1 },
                { name: 'Sections (U/s)', slug: 'sections', dataType: 'text', sortOrder: 2 },
                { name: 'Police Station', slug: 'police_station', dataType: 'text', sortOrder: 3 },
            ],
        },
        {
            name: '13. Pairvi for Private Witness',
            slug: 'pairvi-witness',
            description: 'Pairvi for private witness — aggregate counts per court per day',
            singleRow: true,
            columns: [
                { name: 'Witnesses Examined', slug: 'witnesses_examined', dataType: 'number', sortOrder: 0 },
                { name: 'Witnesses Prepared to Testify', slug: 'witnesses_prepared', dataType: 'number', sortOrder: 1 },
            ],
        },
        {
            name: '14. Gangster/Notorious Criminal Appearing Next Day',
            slug: 'gangster-next-day',
            description: 'Any Gangster/Notorious Criminal appearing in Court the next day',
            singleRow: false,
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
            name: '15. Crime Against Property Offender Appearing Next Day',
            slug: 'property-offender-next-day',
            description: 'Any Crime against Property offender appearing in court the next day',
            singleRow: false,
            columns: [
                { name: 'Details of Accused', slug: 'accused_details', dataType: 'text', sortOrder: 0 },
                { name: 'FIR Number', slug: 'fir_no', dataType: 'text', sortOrder: 1 },
                { name: 'FIR Year', slug: 'fir_year', dataType: 'year', sortOrder: 2 },
                { name: 'Sections (U/s)', slug: 'sections', dataType: 'text', sortOrder: 3 },
                { name: 'Police Station', slug: 'police_station', dataType: 'text', sortOrder: 4 },
                { name: 'Escort Guard Name', slug: 'escort_guard_name', dataType: 'text', sortOrder: 5 },
                { name: 'Escort Guard Mobile', slug: 'escort_guard_mobile', dataType: 'text', sortOrder: 6 },
            ],
        },
        {
            name: '16. Bail Applications Listed for Tomorrow',
            slug: 'bail-applications-tomorrow',
            description: 'Bail Applications listed for tomorrow',
            singleRow: false,
            columns: [
                { name: 'Name of Accused', slug: 'accused_name', dataType: 'text', sortOrder: 0 },
                { name: 'FIR Number', slug: 'fir_no', dataType: 'text', sortOrder: 1 },
                { name: 'FIR Year', slug: 'fir_year', dataType: 'year', sortOrder: 2 },
                { name: 'Sections (U/s)', slug: 'sections', dataType: 'text', sortOrder: 3 },
                { name: 'Police Station', slug: 'police_station', dataType: 'text', sortOrder: 4 },
                { name: 'Bail Type', slug: 'bail_type', dataType: 'enum', enumOptions: ['Regular Bail', 'Anticipatory Bail'], sortOrder: 5 },
            ],
        },
    ];

    for (const t of tables) {
        const existing = await prisma.dataEntryTable.findUnique({ where: { slug: t.slug } });
        if (!existing) {
            await prisma.dataEntryTable.create({
                data: {
                    name: t.name,
                    slug: t.slug,
                    description: t.description,
                    singleRow: t.singleRow,
                    createdBy: developer.id,
                    columns: {
                        create: t.columns.map((col) => ({
                            name: col.name,
                            slug: col.slug,
                            dataType: col.dataType,
                            enumOptions: col.enumOptions || null,
                            isRequired: col.isRequired !== undefined ? col.isRequired : true,
                            sortOrder: col.sortOrder,
                        })),
                    },
                },
            });
            console.log(`  ✅ Table: ${t.name}`);
        } else {
            console.log(`  ⏭️  Table exists: ${t.name}`);
        }
    }

    // ─── State Admin ───────────────────────────────────
    const stateAdminPassword = await bcrypt.hash('state123', 10);
    await prisma.user.upsert({
        where: { username: 'state_admin' },
        update: {},
        create: {
            username: 'state_admin',
            passwordHash: stateAdminPassword,
            name: 'State Administrator',
            role: 'state_admin',
        },
    });
    console.log('✅ State admin user created');

    // District admins, viewers, courts, and naib courts are created
    // by the production seed script (seed-production.js)

    console.log('\n🎉 Base seeding complete!');
    console.log('\n📋 Login credentials:');
    console.log('   Developer:      developer / admin123');
    console.log('   State Admin:    state_admin / state123');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
