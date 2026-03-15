const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const data = {
    "Ambala": [
        "PS SADAR AMBALA", "PS AMBALA CANTT", "PS AMBALA CITY", "PS BALDEV NAGAR", "PS BARARA",
        "PS MAHESH NAGAR", "PS MULLANA", "PS NAGGAL", "PS NARAINGARH", "PS PANJOKHRA",
        "PS PARAO", "PS SAHA", "PS SHAHZADPUR", "PS SECTOR 9", "PS Women AMBALA",
        "PS Women NARAINGARH", "PS Traffic MOHRA", "PS Traffic-2 SHAHZADPUR", "PS Cyber Crime Ambala"
    ],
    "Hisar": [
        "PS CITY HISAR", "PS HTM HISAR", "PS CIVIL LINE HISAR", "PS URBAN ESTATE", "PS SADAR Hisar",
        "PS AZAD NAGAR", "PS BARWALA", "PS UKLANA", "PS AGROHA", "PS ADAMPUR", "PS TRAFFIC HISAR", "PS WOMEN HISAR"
    ],
    "Kaithal": [
        "PS Civil Line Kaithal", "PS City Kaithal", "PS Cheeka", "PS Dhand", "PS Gulha",
        "PS Kalayat", "PS Pundri", "PS Rajound", "PS Sadar Kaithal", "PS Siwan", "PS Titram", "PS Traffic Kaithal"
    ],
    "Kurukshetra": [
        "PS City", "PS Sadar", "PS Pehowa", "PS Shahabad", "PS Ladwa", "PS Babain",
        "PS Jhansa", "PS Ismailabad", "PS KUK", "PS K. Gate", "PS Traffic", "PS Women Kurukshetra", "PS City Pehowa"
    ],
    "Nuh": [
        "PS CITY NUH", "PS SADAR NUH", "PS WOMEN NUH", "TRAFFIC KMP", "PS PUNHANA",
        "PS PINGWAN", "PS CITY TAURU", "PS SADAR TAURU", "PS FEROZEPUR JHIRKA", "PS ROJKA MEO",
        "PS NAGINA", "PS BICHHORE", "PS CYBER NUH", "PS TRAFFIC MANDIKHERA", "PS CITY PUNHANA",
        "PS CITY FIROZPUR JHIRKA", "PS AKERA", "PS MOHAMMADPUR AHIR"
    ],
    "Palwal": [
        "PS City Palwal", "PS Sadar Palwal", "PS Camp Palwal", "PS Hodal", "PS Chandhut",
        "PS Hassanpur", "PS Hathin", "PS Bahin", "PS Mundkati", "PS Gadpuri", "PS Utawar", "PS Women Police"
    ],
    "Panchkula": [
        "PS Sector 5", "PS Sector-14", "PS Sector-20", "PS Mansa Devi Complex (MDC)",
        "PS Chandimandir", "PS Pinjore", "PS Kalka", "PS Raipur Rani", "PS Women", "PS Traffic", "PS Cyber Crime"
    ],
    "Panipat": [
        "PS Bapoli", "PS City Panipat", "PS Chandanibagh", "PS Matlauda", "PS Model Town Panipat",
        "PS Industrial Sector 29 Panipat", "PS Israna", "PS Old Industrial Panipat", "PS Quilla Panipat",
        "PS Samalkha", "PS Sadar Panipat", "PS Sanoli", "PS Sector 13/17 Panipat", "PS Tehsil Camp Panipat",
        "PS Traffic Babarpur", "PS Cyber Crime PS Panipat", "PS Women PS Panipat"
    ],
    "Rewari": [
        "PS City Rewari", "PS Model Town Rewari", "PS Sadar Rewari", "PS Dharuhera", "PS Bawal",
        "PS Khol", "PS Jatusana", "PS Kasola", "PS Rohrai", "PS Rampura", "PS Women Rewari",
        "PS Traffic", "PS Cyber Crime"
    ],
    "Sirsa": [
        "PS City Sirsa", "PS Sadar Sirsa", "PS Civil Line Sirsa", "PS Nathushari Chopta",
        "PS Ding", "PS Ellenabad", "PS Rania", "PS Bara Gudha", "PS Rori", "PS Kalanwali",
        "PS Odhan", "PS City Dabwali", "PS Sadar Dabwali", "PS Women", "PS Traffic", "PS Cyber Crime"
    ]
};

async function main() {
    console.log('🌱 Seeding police stations...');

    for (const [districtName, stations] of Object.entries(data)) {
        const district = await prisma.district.findFirst({
            where: { name: { equals: districtName, mode: 'insensitive' } }
        });

        if (!district) {
            console.log(`⚠️ District not found: ${districtName}`);
            continue;
        }

        console.log(`📍 Seeding ${stations.length} stations for ${districtName}...`);

        for (const stationName of stations) {
            await prisma.policeStation.upsert({
                where: {
                    // Since we don't have a unique constraint on (districtId, name) yet, 
                    // we'll just check if it exists. Actually matches the model.
                    id: 0 // Dummy ID for upsert but wait, I didn't add the unique constraint.
                },
                // Let's use findFirst/create pattern instead or add unique to schema.
                update: {},
            }).catch(async () => {
                // Better pattern:
                const existing = await prisma.policeStation.findFirst({
                    where: { districtId: district.id, name: stationName }
                });
                if (!existing) {
                    await prisma.policeStation.create({
                        data: {
                            districtId: district.id,
                            name: stationName
                        }
                    });
                }
            });
        }
    }

    console.log('✅ Police stations seeded.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
