const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/v1/courts?districtId=
router.get('/', authenticate, async (req, res, next) => {
    try {
        const where = { deletedAt: null };
        if (req.query.districtId) where.districtId = parseInt(req.query.districtId);
        // Naib courts & district admins see only their district's courts
        if (['naib_court', 'district_admin', 'viewer_district'].includes(req.user.role)) {
            where.districtId = req.user.districtId;
        }

        const courts = await prisma.court.findMany({
            where,
            include: {
                magistrate: { select: { id: true, name: true, designation: true } },
                district: { select: { id: true, name: true } },
            },
            orderBy: { courtNo: 'asc' },
        });
        res.json({ courts });
    } catch (err) { next(err); }
});

// GET /api/v1/courts/:id
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const court = await prisma.court.findFirst({
            where: { id: parseInt(req.params.id), deletedAt: null },
            include: {
                magistrate: true,
                district: true,
            },
        });
        if (!court) return res.status(404).json({ error: 'Court not found' });
        res.json({ court });
    } catch (err) { next(err); }
});

// POST /api/v1/courts
router.post('/', authenticate, requireRole('developer', 'state_admin'), async (req, res, next) => {
    try {
        const { districtId, name, courtNo } = req.body;
        if (!districtId || !name || !courtNo) {
            return res.status(400).json({ error: 'districtId, name, and courtNo are required' });
        }

        const court = await prisma.court.create({
            data: { districtId: parseInt(districtId), name, courtNo },
        });
        res.status(201).json({ court });
    } catch (err) { next(err); }
});

// PUT /api/v1/courts/:id
router.put('/:id', authenticate, requireRole('developer', 'state_admin'), async (req, res, next) => {
    try {
        const { name, courtNo, magistrateId } = req.body;
        const data = {};
        if (name) data.name = name;
        if (courtNo) data.courtNo = courtNo;
        if (magistrateId !== undefined) data.magistrateId = magistrateId ? parseInt(magistrateId) : null;

        const court = await prisma.court.update({
            where: { id: parseInt(req.params.id) },
            data,
        });
        res.json({ court });
    } catch (err) { next(err); }
});

// DELETE /api/v1/courts/:id (soft-delete)
router.delete('/:id', authenticate, requireRole('developer', 'state_admin'), async (req, res, next) => {
    try {
        await prisma.court.update({
            where: { id: parseInt(req.params.id) },
            data: { deletedAt: new Date() },
        });
        res.json({ message: 'Court deleted' });
    } catch (err) { next(err); }
});

module.exports = router;
