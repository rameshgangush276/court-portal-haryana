const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/v1/districts
router.get('/', authenticate, async (req, res, next) => {
    try {
        const districts = await prisma.district.findMany({
            where: { deletedAt: null },
            orderBy: { name: 'asc' },
        });
        res.json({ districts });
    } catch (err) { next(err); }
});

// GET /api/v1/districts/:id
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const district = await prisma.district.findFirst({
            where: { id: parseInt(req.params.id), deletedAt: null },
            include: { courts: { where: { deletedAt: null } } },
        });
        if (!district) return res.status(404).json({ error: 'District not found' });
        res.json({ district });
    } catch (err) { next(err); }
});

// POST /api/v1/districts
router.post('/', authenticate, requireRole('developer', 'state_admin'), async (req, res, next) => {
    try {
        const { name, code } = req.body;
        if (!name || !code) return res.status(400).json({ error: 'Name and code are required' });

        const district = await prisma.district.create({ data: { name, code: code.toUpperCase() } });
        res.status(201).json({ district });
    } catch (err) { next(err); }
});

// PUT /api/v1/districts/:id
router.put('/:id', authenticate, requireRole('developer', 'state_admin'), async (req, res, next) => {
    try {
        const { name, code } = req.body;
        const district = await prisma.district.update({
            where: { id: parseInt(req.params.id) },
            data: { ...(name && { name }), ...(code && { code: code.toUpperCase() }) },
        });
        res.json({ district });
    } catch (err) { next(err); }
});

// DELETE /api/v1/districts/:id (soft-delete)
router.delete('/:id', authenticate, requireRole('developer', 'state_admin'), async (req, res, next) => {
    try {
        await prisma.district.update({
            where: { id: parseInt(req.params.id) },
            data: { deletedAt: new Date() },
        });
        res.json({ message: 'District deleted' });
    } catch (err) { next(err); }
});

module.exports = router;
