const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/v1/magistrates?districtId=
router.get('/', authenticate, async (req, res, next) => {
    try {
        const where = { deletedAt: null };
        if (req.query.districtId) where.districtId = parseInt(req.query.districtId);
        if (['district_admin', 'viewer_district'].includes(req.user.role)) {
            where.districtId = req.user.districtId;
        }

        const magistrates = await prisma.magistrate.findMany({
            where,
            include: {
                district: { select: { id: true, name: true } },
                courts: { where: { deletedAt: null }, select: { id: true, name: true, courtNo: true } },
            },
            orderBy: { name: 'asc' },
        });
        res.json({ magistrates });
    } catch (err) { next(err); }
});

// POST /api/v1/magistrates
router.post('/', authenticate, requireRole('developer', 'state_admin'), async (req, res, next) => {
    try {
        const { name, designation, districtId, phone } = req.body;
        if (!name || !designation) {
            return res.status(400).json({ error: 'Name and designation are required' });
        }

        const magistrate = await prisma.magistrate.create({
            data: {
                name,
                designation,
                districtId: districtId ? parseInt(districtId) : null,
                phone,
            },
        });
        res.status(201).json({ magistrate });
    } catch (err) { next(err); }
});

// PUT /api/v1/magistrates/:id
router.put('/:id', authenticate, requireRole('developer', 'state_admin'), async (req, res, next) => {
    try {
        const { name, designation, phone } = req.body;
        const data = {};
        if (name) data.name = name;
        if (designation) data.designation = designation;
        if (phone !== undefined) data.phone = phone;

        const magistrate = await prisma.magistrate.update({
            where: { id: parseInt(req.params.id) },
            data,
        });
        res.json({ magistrate });
    } catch (err) { next(err); }
});

// DELETE /api/v1/magistrates/:id (soft-delete)
router.delete('/:id', authenticate, requireRole('developer', 'state_admin'), async (req, res, next) => {
    try {
        await prisma.magistrate.update({
            where: { id: parseInt(req.params.id) },
            data: { deletedAt: new Date() },
        });
        res.json({ message: 'Magistrate deleted' });
    } catch (err) { next(err); }
});

// POST /api/v1/magistrates/:id/transfer (state admin transfers across districts)
router.post('/:id/transfer', authenticate, requireRole('developer', 'state_admin'), async (req, res, next) => {
    try {
        const { toDistrictId } = req.body;
        const magistrateId = parseInt(req.params.id);

        const magistrate = await prisma.magistrate.findUnique({ where: { id: magistrateId } });
        if (!magistrate || magistrate.deletedAt) {
            return res.status(404).json({ error: 'Magistrate not found' });
        }

        // Remove from current court assignments
        await prisma.court.updateMany({
            where: { magistrateId },
            data: { magistrateId: null },
        });

        // Log transfer
        await prisma.transferLog.create({
            data: {
                entityType: 'magistrate',
                entityId: magistrateId,
                fromDistrictId: magistrate.districtId,
                toDistrictId: toDistrictId ? parseInt(toDistrictId) : null,
                transferredBy: req.user.id,
                transferDate: new Date(),
            },
        });

        // Update magistrate district
        const updated = await prisma.magistrate.update({
            where: { id: magistrateId },
            data: { districtId: toDistrictId ? parseInt(toDistrictId) : null },
        });

        res.json({ magistrate: updated, message: 'Magistrate transferred successfully' });
    } catch (err) { next(err); }
});

// POST /api/v1/magistrates/:id/assign-court (district admin assigns to court)
router.post('/:id/assign-court', authenticate, requireRole('developer', 'state_admin', 'district_admin'), async (req, res, next) => {
    try {
        const { courtId } = req.body;
        const magistrateId = parseInt(req.params.id);

        if (!courtId) return res.status(400).json({ error: 'courtId is required' });

        const court = await prisma.court.findFirst({
            where: { id: parseInt(courtId), deletedAt: null },
        });
        if (!court) return res.status(404).json({ error: 'Court not found' });

        // District admin can only assign within their district
        if (req.user.role === 'district_admin' && court.districtId !== req.user.districtId) {
            return res.status(403).json({ error: 'Cannot assign magistrate to courts outside your district' });
        }

        // Remove magistrate from any existing court
        await prisma.court.updateMany({
            where: { magistrateId },
            data: { magistrateId: null },
        });

        // Assign to new court
        const updated = await prisma.court.update({
            where: { id: parseInt(courtId) },
            data: { magistrateId },
        });

        res.json({ court: updated, message: 'Magistrate assigned to court' });
    } catch (err) { next(err); }
});

module.exports = router;
