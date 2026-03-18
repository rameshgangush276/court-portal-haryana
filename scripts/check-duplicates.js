const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
    const dupPS = await p.$queryRawUnsafe(`SELECT name, district_id, count(*) as cnt FROM police_stations GROUP BY name, district_id HAVING count(*) > 1 LIMIT 5`);
    console.log('Duplicate Police Stations:', JSON.stringify(dupPS));
    const dupCourts = await p.$queryRawUnsafe(`SELECT court_no, district_id, count(*) as cnt FROM courts GROUP BY court_no, district_id HAVING count(*) > 1 LIMIT 5`);
    console.log('Duplicate Courts:', JSON.stringify(dupCourts));
    const psCount = await p.policeStation.count();
    const courtCount = await p.court.count();
    console.log('Total Police Stations:', psCount);
    console.log('Total Courts:', courtCount);
    await p.$disconnect();
}
main().catch(console.error);
