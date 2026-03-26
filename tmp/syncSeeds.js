const fs = require('fs');
const seedStr = fs.readFileSync('prisma/seed.js', 'utf8');
const prodSeedStr = fs.readFileSync('prisma/seed-production.js', 'utf8');

// Match tables array from seed.js
const tablesRegex = /const tables = \[([\s\S]*?)\];/;
const tablesMatch = seedStr.match(tablesRegex);
if (!tablesMatch) throw new Error("Could not find tables in seed.js");

const newTablesStr = "const tables = [" + tablesMatch[1] + "];";

// Replace it in seed-production.js
const prodTablesRegex = /\/\/ ─── 16 Predefined Data Entry Tables ───────────────\s*const tables = \[[\s\S]*?\];/;
let newProdSeed = prodSeedStr.replace(prodTablesRegex, "// ─── 17 Predefined Data Entry Tables ───────────────\n    " + newTablesStr);

// Update logic to use sortOrder for the table level upsert.
// Note: We need to be careful with the replacement. We need to add `sortOrder: t.sortOrder` to update and create.

newProdSeed = newProdSeed.replace(
    /update: \{\s*name: t\.name,\s*description: t\.description,\s*singleRow: t\.singleRow,\s*deletedAt: null,\s*\},/g,
    `update: {\n                name: t.name,\n                description: t.description,\n                singleRow: t.singleRow,\n                sortOrder: t.sortOrder,\n                deletedAt: null,\n            },`
);

newProdSeed = newProdSeed.replace(
    /create: \{\s*name: t\.name,\s*slug: t\.slug,\s*description: t\.description,\s*singleRow: t\.singleRow,\s*createdBy: developer\.id,\s*\},/g,
    `create: {\n                name: t.name,\n                slug: t.slug,\n                description: t.description,\n                singleRow: t.singleRow,\n                sortOrder: t.sortOrder,\n                createdBy: developer.id,\n            },`
);

fs.writeFileSync('prisma/seed-production.js', newProdSeed);
console.log("Replaced tables in seed-production.js successfully.");
