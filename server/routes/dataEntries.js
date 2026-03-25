const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * Validate data entry values against column definitions
 */
function validateValues(values, columns) {
    const errors = [];
    for (const col of columns) {
        const val = values[col.slug];

        if (col.isRequired && (val === undefined || val === null || val === '')) {
            errors.push(`${col.name} is required`);
            continue;
        }

        if (val === undefined || val === null || val === '') continue;

        switch (col.dataType) {
            case 'number':
                if (isNaN(Number(val))) {
                    errors.push(`${col.name} must be a number`);
                } else if (!Number.isInteger(Number(val))) {
                    errors.push(`${col.name} must be an integer (no decimals allowed)`);
                } else if (Number(val) < 0) {
                    errors.push(`${col.name} cannot be negative`);
                }
                break;
            case 'enum':
                const options = col.enumOptions || [];
                if (!options.includes(val)) errors.push(`${col.name} must be one of: ${options.join(', ')}`);
                break;
            case 'boolean':
                if (typeof val !== 'boolean' && val !== 'true' && val !== 'false') {
                    errors.push(`${col.name} must be true or false`);
                }
                break;
            case 'date':
                if (isNaN(Date.parse(val))) errors.push(`${col.name} must be a valid date`);
                break;
        }
    }
    return errors;
}

// Check if a specific court+date is locked
async function checkCourtDateLocked(courtId, dateString) {
    const locked = await prisma.dailySubmission.findFirst({
        where: {
            courtId: parseInt(courtId),
            entryDate: new Date(dateString + 'T00:00:00Z') // Ensure strict UTC midnight
        }
    });
    return !!locked;
}

// POST /api/v1/data-entries/select-court
router.post('/select-court', authenticate, requireRole('naib_court'), async (req, res, next) => {
    try {
        const { courtId } = req.body;
        if (!courtId) return res.status(400).json({ error: 'courtId is required' });

        // Verify court is in naib's district
        const court = await prisma.court.findFirst({
            where: { id: parseInt(courtId), districtId: req.user.districtId, deletedAt: null },
        });
        if (!court) return res.status(404).json({ error: 'Court not found in your district' });

        await prisma.user.update({
            where: { id: req.user.id },
            data: { lastSelectedCourtId: parseInt(courtId) },
        });

        res.json({ message: 'Court selected', courtId: parseInt(courtId) });
    } catch (err) { next(err); }
});

// GET /api/v1/data-entries/summary?courtId=&entryDate=
router.get('/summary', authenticate, requireRole('naib_court'), async (req, res, next) => {
    try {
        const { courtId, entryDate } = req.query;
        if (!courtId || !entryDate) return res.status(400).json({ error: 'courtId and entryDate are required' });

        const entryDateObj = new Date(entryDate);
        
        // Get all active tables
        const tables = await prisma.dataEntryTable.findMany({
            where: { deletedAt: null },
            select: { id: true, name: true, slug: true, singleRow: true },
            orderBy: { id: 'asc' }
        });

        // Count entries for each table
        const counts = await Promise.all(tables.map(async (table) => {
            const count = await prisma.dataEntry.count({
                where: {
                    tableId: table.id,
                    courtId: parseInt(courtId),
                    entryDate: entryDateObj
                }
            });
            return {
                tableId: table.id,
                tableName: table.name,
                singleRow: table.singleRow,
                count
            };
        }));

        const isLocked = await checkCourtDateLocked(courtId, entryDateObj.toISOString().split('T')[0]);

        res.json({ counts, isLocked });
    } catch (err) { next(err); }
});

// GET /api/v1/data-entries?tableId=&courtId=&entryDate=&districtId=
router.get('/', authenticate, async (req, res, next) => {
    try {
        const where = {};

        if (req.query.tableId) where.tableId = parseInt(req.query.tableId);
        if (req.query.courtId) where.courtId = parseInt(req.query.courtId);
        if (req.query.districtId) where.districtId = parseInt(req.query.districtId);

        if (req.query.entryDate) {
            where.entryDate = new Date(req.query.entryDate);
        }
        if (req.query.dateFrom || req.query.dateTo) {
            where.entryDate = {};
            if (req.query.dateFrom) where.entryDate.gte = new Date(req.query.dateFrom);
            if (req.query.dateTo) where.entryDate.lte = new Date(req.query.dateTo);
        }

        // Scope by role
        if (['naib_court', 'district_admin', 'viewer_district'].includes(req.user.role)) {
            where.districtId = req.user.districtId;
        }

        const entries = await prisma.dataEntry.findMany({
            where,
            include: {
                table: { select: { id: true, name: true, slug: true, singleRow: true } },
                court: { select: { id: true, name: true, courtNo: true } },
                magistrate: { select: { id: true, name: true } },
                createdByUser: { select: { id: true, name: true } },
                district: { select: { id: true, name: true } },
            },
            orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
        });

        let isLocked = false;
        if (req.query.courtId && req.query.entryDate) {
            isLocked = await checkCourtDateLocked(req.query.courtId, req.query.entryDate);
        }

        res.json({ entries, isLocked });
    } catch (err) { next(err); }
});

// POST /api/v1/data-entries/submit-day
router.post('/submit-day', authenticate, requireRole('naib_court'), async (req, res, next) => {
    try {
        const { courtId, entryDate } = req.body;
        if (!courtId || !entryDate) return res.status(400).json({ error: 'courtId and entryDate are required' });

        const isLocked = await checkCourtDateLocked(courtId, entryDate);
        if (isLocked) return res.status(400).json({ error: 'This date has already been finalized.' });

        await prisma.dailySubmission.create({
            data: {
                courtId: parseInt(courtId),
                entryDate: new Date(entryDate),
                submittedBy: req.user.id
            }
        });

        res.json({ success: true, message: 'Data for the day finalized successfully.' });
    } catch (err) { next(err); }
});

// POST /api/v1/data-entries
router.post('/', authenticate, requireRole('naib_court'), async (req, res, next) => {
    try {
        const { tableId, courtId, entryDate, values } = req.body;

        if (!tableId || !courtId || !values) {
            return res.status(400).json({ error: 'tableId, courtId, and values are required' });
        }

        // Validate date: only today or yesterday
        const todayStr = new Date().toLocaleDateString('en-CA');
        const yest = new Date();
        yest.setDate(yest.getDate() - 1);
        const yesterdayStr = yest.toLocaleDateString('en-CA');

        const reqDateStr = entryDate || todayStr;

        if (reqDateStr !== todayStr && reqDateStr !== yesterdayStr) {
            return res.status(400).json({ error: 'Entry date must be today or yesterday' });
        }

        if (await checkCourtDateLocked(courtId, reqDateStr)) {
            return res.status(403).json({ error: 'Data entry for this date has been finalized and cannot be modified.' });
        }

        const entryDateObj = new Date(reqDateStr); // Will be UTC midnight

        // Verify court is in naib's district
        const court = await prisma.court.findFirst({
            where: { id: parseInt(courtId), districtId: req.user.districtId, deletedAt: null },
            include: { magistrate: true },
        });
        if (!court) return res.status(404).json({ error: 'Court not found in your district' });

        // Get table and columns for validation
        const table = await prisma.dataEntryTable.findFirst({
            where: { id: parseInt(tableId), deletedAt: null },
            include: { columns: { where: { deletedAt: null } } },
        });
        if (!table) return res.status(404).json({ error: 'Table not found' });

        // For single-row tables, check if entry already exists
        if (table.singleRow) {
            const existing = await prisma.dataEntry.findFirst({
                where: {
                    tableId: parseInt(tableId),
                    courtId: parseInt(courtId),
                    entryDate: entryDateObj,
                },
            });
            if (existing) {
                return res.status(409).json({
                    error: 'An entry already exists for this table, court, and date. Use PUT to update.',
                    existingId: existing.id,
                });
            }
        }

        // Validate values
        const validationErrors = validateValues(values, table.columns);
        if (validationErrors.length > 0) {
            return res.status(400).json({ error: 'Validation failed', details: validationErrors });
        }

        const entry = await prisma.dataEntry.create({
            data: {
                tableId: parseInt(tableId),
                districtId: req.user.districtId,
                courtId: parseInt(courtId),
                magistrateId: court.magistrateId,
                entryDate: entryDateObj,
                values,
                createdBy: req.user.id,
            },
            include: {
                table: { select: { id: true, name: true } },
                court: { select: { id: true, name: true } },
            },
        });

        res.status(201).json({ entry });
    } catch (err) { next(err); }
});

// PUT /api/v1/data-entries/:id
router.put('/:id', authenticate, requireRole('naib_court', 'district_admin', 'developer'), async (req, res, next) => {
    try {
        const { values } = req.body;
        const entryId = parseInt(req.params.id);

        const entry = await prisma.dataEntry.findUnique({
            where: { id: entryId },
            include: {
                table: { include: { columns: { where: { deletedAt: null } } } },
            },
        });
        if (!entry) return res.status(404).json({ error: 'Entry not found' });

        // Check edit window
        const todayStr = new Date().toLocaleDateString('en-CA');
        const localToday = new Date(todayStr); // UTC midnight of today
        const entryDateObj = new Date(entry.entryDate); // Prisma Date is UTC midnight
        const daysDiff = Math.floor((localToday - entryDateObj) / (1000 * 60 * 60 * 24));

        if (req.user.role === 'naib_court' && daysDiff > 1) {
            return res.status(403).json({ error: 'Naib courts can only edit data from today and yesterday' });
        }
        if (req.user.role === 'district_admin' && daysDiff > 2) {
            return res.status(403).json({ error: 'District admins can only edit data from the past 3 days' });
        }

        // District scoping
        if (['naib_court', 'district_admin'].includes(req.user.role) && entry.districtId !== req.user.districtId) {
            return res.status(403).json({ error: 'Cannot edit entries outside your district' });
        }

        const entryDateStr = entry.entryDate.toISOString().split('T')[0];
        if (await checkCourtDateLocked(entry.courtId, entryDateStr)) {
            return res.status(403).json({ error: 'Data entry for this date has been finalized and cannot be modified.' });
        }

        // Validate
        if (values) {
            const validationErrors = validateValues(values, entry.table.columns);
            if (validationErrors.length > 0) {
                return res.status(400).json({ error: 'Validation failed', details: validationErrors });
            }
        }

        const updated = await prisma.dataEntry.update({
            where: { id: entryId },
            data: {
                values: values || entry.values,
                updatedBy: req.user.id,
            },
        });

        res.json({ entry: updated });
    } catch (err) { next(err); }
});

// DELETE /api/v1/data-entries/:id
router.delete('/:id', authenticate, requireRole('naib_court', 'district_admin', 'developer'), async (req, res, next) => {
    try {
        const entryId = parseInt(req.params.id);

        const entry = await prisma.dataEntry.findUnique({
            where: { id: entryId }
        });
        if (!entry) return res.status(404).json({ error: 'Entry not found' });

        // Check edit/delete window (same as PUT)
        const todayStr = new Date().toLocaleDateString('en-CA');
        const localToday = new Date(todayStr);
        const entryDateObj = new Date(entry.entryDate);
        const daysDiff = Math.floor((localToday - entryDateObj) / (1000 * 60 * 60 * 24));

        if (req.user.role === 'naib_court' && daysDiff > 1) {
            return res.status(403).json({ error: 'Naib courts can only delete data from today and yesterday' });
        }
        if (req.user.role === 'district_admin' && daysDiff > 2) {
            return res.status(403).json({ error: 'District admins can only delete data from the past 3 days' });
        }

        // District scoping
        if (['naib_court', 'district_admin'].includes(req.user.role) && entry.districtId !== req.user.districtId) {
            return res.status(403).json({ error: 'Cannot delete entries outside your district' });
        }

        const entryDateStr = entry.entryDate.toISOString().split('T')[0];
        if (await checkCourtDateLocked(entry.courtId, entryDateStr)) {
            return res.status(403).json({ error: 'Data entry for this date has been finalized and cannot be deleted.' });
        }

        await prisma.dataEntry.delete({
            where: { id: entryId }
        });

        res.json({ message: 'Entry deleted successfully' });
    } catch (err) { next(err); }
});

module.exports = router;
