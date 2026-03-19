const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/v1/districts/all-police-stations
router.get('/all-police-stations', authenticate, async (req, res, next) => {
    try {
        const policeStations = await prisma.policeStation.findMany({
            include: { district: { select: { name: true } } },
            orderBy: [{ district: { name: 'asc' } }, { name: 'asc' }],
        });
        res.json({ policeStations });
    } catch (err) { next(err); }
});

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

// GET /api/v1/districts/:id/police-stations
router.get('/:id/police-stations', authenticate, async (req, res, next) => {
    try {
        const policeStations = await prisma.policeStation.findMany({
            where: { districtId: parseInt(req.params.id) },
            orderBy: { name: 'asc' },
        });
        res.json({ policeStations });
    } catch (err) { next(err); }
});

// POST /api/v1/districts/:id/police-stations
router.post('/:id/police-stations', authenticate, requireRole('developer', 'state_admin'), async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const policeStation = await prisma.policeStation.create({
            data: {
                name,
                districtId: parseInt(req.params.id)
            }
        });
        res.status(201).json({ policeStation });
    } catch (err) { next(err); }
});

// PUT /api/v1/districts/:districtId/police-stations/:id
router.put('/:districtId/police-stations/:id', authenticate, requireRole('developer', 'state_admin'), async (req, res, next) => {
    try {
        const { name } = req.body;
        const policeStation = await prisma.policeStation.update({
            where: { id: parseInt(req.params.id) },
            data: { name }
        });
        res.json({ policeStation });
    } catch (err) { next(err); }
});

// DELETE /api/v1/districts/:districtId/police-stations/:id
router.delete('/:districtId/police-stations/:id', authenticate, requireRole('developer', 'state_admin'), async (req, res, next) => {
    try {
        await prisma.policeStation.delete({
            where: { id: parseInt(req.params.id) }
        });
        res.json({ message: 'Police station deleted' });
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
