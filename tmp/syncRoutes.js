const fs = require('fs');
const seedStr = fs.readFileSync('prisma/seed.js', 'utf8');
const sysStr = fs.readFileSync('server/routes/system.js', 'utf8');

// Match tables array from seed.js
const tablesRegex = /const tables = \[([\s\S]*?)\];/;
const tablesMatch = seedStr.match(tablesRegex);
if (!tablesMatch) throw new Error("Could not find tables in seed.js");

const newTablesStr = "const allTables = [" + tablesMatch[1] + "];";

// Replace it in system.js
// Right now system.js has `const missingTables = [` from line 370. 
// We will replace `const missingTables = [...];` with `const allTables = [...];`
const sysMissingTablesRegex = /const missingTables = \[\s*[\s\S]*?\s*\];/;
let newSysStr = sysStr.replace(sysMissingTablesRegex, newTablesStr);

// Then we change `for (const t of missingTables)` to `for (const t of allTables)`
newSysStr = newSysStr.replace(/for \(const t of missingTables\)/g, "for (const t of allTables)");

fs.writeFileSync('server/routes/system.js', newSysStr);
console.log("Replaced tables inside system.js successfully.");
