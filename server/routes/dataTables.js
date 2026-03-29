const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const { syncTableDefinitions } = require('../../scripts/auto-sync');

const router = express.Router();

// GET /api/v1/data-tables
router.get('/', authenticate, async (req, res, next) => {
    try {
        const tables = await prisma.dataEntryTable.findMany({
            where: { deletedAt: null },
            include: { columns: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } } },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        });
        res.json({ tables });
    } catch (err) { next(err); }
});

// GET /api/v1/data-tables/:id
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const table = await prisma.dataEntryTable.findFirst({
            where: { id: parseInt(req.params.id), deletedAt: null },
            include: { columns: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } } },
        });
        if (!table) return res.status(404).json({ error: 'Table not found' });
        res.json({ table });
    } catch (err) { next(err); }
});

// POST /api/v1/data-tables
router.post('/', authenticate, requireRole('developer'), async (req, res, next) => {
    try {
        const { name, slug, description, singleRow, columns } = req.body;
        if (!name || !slug) return res.status(400).json({ error: 'Name and slug are required' });

        const table = await prisma.dataEntryTable.create({
            data: {
                name,
                slug,
                description,
                singleRow: singleRow || false,
                createdBy: req.user.id,
                columns: columns ? {
                    create: columns.map((col, i) => ({
                        name: col.name,
                        slug: col.slug,
                        dataType: col.dataType,
                        enumOptions: col.enumOptions || null,
                        isRequired: col.isRequired !== undefined ? col.isRequired : true,
                        sortOrder: col.sortOrder || i,
                    })),
                } : undefined,
            },
            include: { columns: true },
        });

        syncTableDefinitions(prisma); // auto-sync (non-blocking)
        res.status(201).json({ table });
    } catch (err) { next(err); }
});

// PUT /api/v1/data-tables/:id
router.put('/:id', authenticate, requireRole('developer'), async (req, res, next) => {
    try {
        const { name, description, singleRow } = req.body;
        const data = {};
        if (name) data.name = name;
        if (description !== undefined) data.description = description;
        if (singleRow !== undefined) data.singleRow = singleRow;

        const table = await prisma.dataEntryTable.update({
            where: { id: parseInt(req.params.id) },
            data,
        });

        syncTableDefinitions(prisma); // auto-sync (non-blocking)
        res.json({ table });
    } catch (err) { next(err); }
});

// DELETE /api/v1/data-tables/:id (soft-delete)
router.delete('/:id', authenticate, requireRole('developer'), async (req, res, next) => {
    try {
        await prisma.dataEntryTable.update({
            where: { id: parseInt(req.params.id) },
            data: { deletedAt: new Date() },
        });

        syncTableDefinitions(prisma); // auto-sync (non-blocking)
        res.json({ message: 'Table deleted' });
    } catch (err) { next(err); }
});

// ─── Column Management ───────────────────────────────

// POST /api/v1/data-tables/:id/columns
router.post('/:id/columns', authenticate, requireRole('developer'), async (req, res, next) => {
    try {
        const { name, slug, dataType, enumOptions, isRequired, sortOrder } = req.body;
        if (!name || !slug || !dataType) {
            return res.status(400).json({ error: 'name, slug, and dataType are required' });
        }

        const column = await prisma.dataEntryColumn.create({
            data: {
                tableId: parseInt(req.params.id),
                name,
                slug,
                dataType,
                enumOptions: enumOptions || null,
                isRequired: isRequired !== undefined ? isRequired : true,
                sortOrder: sortOrder || 0,
            },
        });

        syncTableDefinitions(prisma); // auto-sync (non-blocking)
        res.status(201).json({ column });
    } catch (err) { next(err); }
});

// PUT /api/v1/data-tables/:tableId/columns/:colId
router.put('/:tableId/columns/:colId', authenticate, requireRole('developer'), async (req, res, next) => {
    try {
        const { name, dataType, enumOptions, isRequired, sortOrder } = req.body;
        const data = {};
        if (name) data.name = name;
        if (dataType) data.dataType = dataType;
        if (enumOptions !== undefined) data.enumOptions = enumOptions;
        if (isRequired !== undefined) data.isRequired = isRequired;
        if (sortOrder !== undefined) data.sortOrder = sortOrder;

        const column = await prisma.dataEntryColumn.update({
            where: { id: parseInt(req.params.colId) },
            data,
        });

        syncTableDefinitions(prisma); // auto-sync (non-blocking)
        res.json({ column });
    } catch (err) { next(err); }
});

// DELETE /api/v1/data-tables/:tableId/columns/:colId (soft-delete)
router.delete('/:tableId/columns/:colId', authenticate, requireRole('developer'), async (req, res, next) => {
    try {
        await prisma.dataEntryColumn.update({
            where: { id: parseInt(req.params.colId) },
            data: { deletedAt: new Date() },
        });

        syncTableDefinitions(prisma); // auto-sync (non-blocking)
        res.json({ message: 'Column deleted' });
    } catch (err) { next(err); }
});

module.exports = router;
