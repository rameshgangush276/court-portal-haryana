/**
 * auto-sync.js
 * Reads the live database structure and writes it to prisma/table-definitions.js.
 * Called automatically after any table or column modification.
 */

const fs = require('fs');
const path = require('path');

const TABLE_DEFS_PATH = path.join(__dirname, '../prisma/table-definitions.js');

async function syncTableDefinitions(prisma) {
    try {
        const dbTables = await prisma.dataEntryTable.findMany({
            where: { deletedAt: null },
            include: {
                columns: {
                    where: { deletedAt: null },
                    orderBy: { sortOrder: 'asc' }
                }
            },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }]
        });

        const tables = dbTables.map(t => ({
            name: t.name,
            slug: t.slug,
            description: t.description || '',
            singleRow: t.singleRow,
            sortOrder: t.sortOrder,
            columns: t.columns.map(c => ({
                name: c.name,
                slug: c.slug,
                dataType: c.dataType,
                enumOptions: c.enumOptions || null,
                isRequired: c.isRequired,
                sortOrder: c.sortOrder
            }))
        }));

        const fileContent = `// ─── AUTO-GENERATED: Single Source of Truth for Table Definitions ───────────
// This file is automatically updated whenever a table or column is modified
// via the Developer Dashboard. Do NOT edit manually.
// To make structural changes: use the Manage Data Entry Tables UI.

module.exports = ${JSON.stringify(tables, null, 4)};
`;

        fs.writeFileSync(TABLE_DEFS_PATH, fileContent, 'utf8');
        console.log('✅ [AUTO-SYNC] prisma/table-definitions.js updated.');
    } catch (err) {
        // Non-fatal — log but don't crash the API response
        console.error('⚠️ [AUTO-SYNC] Failed to sync table-definitions.js:', err.message);
    }
}

module.exports = { syncTableDefinitions };
