const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/v1/naib-courts?districtId=
router.get('/', authenticate, requireRole('developer', 'state_admin', 'district_admin'), async (req, res, next) => {
    try {
        const where = { role: 'naib_court', deletedAt: null };
        if (req.query.districtId) where.districtId = parseInt(req.query.districtId);
        if (req.user.role === 'district_admin') {
            where.districtId = req.user.districtId;
        }

        const naibCourts = await prisma.user.findMany({
            where,
            select: {
                id: true, username: true, name: true, phone: true,
                districtId: true, lastSelectedCourtId: true, createdAt: true,
                district: { select: { id: true, name: true } },
                lastSelectedCourt: { select: { id: true, name: true, courtNo: true } },
            },
            orderBy: { name: 'asc' },
        });
        res.json({ naibCourts });
    } catch (err) { next(err); }
});

// POST /api/v1/naib-courts
router.post('/', authenticate, requireRole('developer', 'state_admin', 'district_admin'), async (req, res, next) => {
    try {
        const { username, password, name, districtId, phone } = req.body;
        if (!username || !password || !name || !districtId) {
            return res.status(400).json({ error: 'username, password, name, and districtId are required' });
        }

        // District admin can only add to their own district
        if (req.user.role === 'district_admin' && parseInt(districtId) !== req.user.districtId) {
            return res.status(403).json({ error: 'Can only add naib courts to your own district' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                username,
                passwordHash,
                name,
                role: 'naib_court',
                districtId: parseInt(districtId),
                phone,
            },
        });

        const { passwordHash: _, refreshToken: __, ...safeUser } = user;
        res.status(201).json({ naibCourt: safeUser });
    } catch (err) { next(err); }
});

// PUT /api/v1/naib-courts/:id
router.put('/:id', authenticate, requireRole('developer', 'state_admin', 'district_admin'), async (req, res, next) => {
    try {
        const { name, phone, password } = req.body;
        const data = {};
        if (name) data.name = name;
        if (phone !== undefined) data.phone = phone;
        if (password) data.passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.update({
            where: { id: parseInt(req.params.id) },
            data,
        });

        const { passwordHash: _, refreshToken: __, ...safeUser } = user;
        res.json({ naibCourt: safeUser });
    } catch (err) { next(err); }
});

// DELETE /api/v1/naib-courts/:id (soft-delete)
router.delete('/:id', authenticate, requireRole('developer', 'state_admin', 'district_admin'), async (req, res, next) => {
    try {
        await prisma.user.update({
            where: { id: parseInt(req.params.id) },
            data: { deletedAt: new Date() },
        });
        res.json({ message: 'Naib court deleted' });
    } catch (err) { next(err); }
});

// POST /api/v1/naib-courts/:id/transfer (state admin transfers across districts)
router.post('/:id/transfer', authenticate, requireRole('developer', 'state_admin'), async (req, res, next) => {
    try {
        const { toDistrictId } = req.body;
        const userId = parseInt(req.params.id);

        const user = await prisma.user.findFirst({
            where: { id: userId, role: 'naib_court', deletedAt: null },
        });
        if (!user) return res.status(404).json({ error: 'Naib court not found' });

        await prisma.transferLog.create({
            data: {
                entityType: 'naib_court',
                entityId: userId,
                fromDistrictId: user.districtId,
                toDistrictId: toDistrictId ? parseInt(toDistrictId) : null,
                transferredBy: req.user.id,
                transferDate: new Date(),
            },
        });

        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                districtId: toDistrictId ? parseInt(toDistrictId) : null,
                lastSelectedCourtId: null, // reset court selection
            },
        });

        const { passwordHash: _, refreshToken: __, ...safeUser } = updated;
        res.json({ naibCourt: safeUser, message: 'Naib court transferred successfully' });
    } catch (err) { next(err); }
});

module.exports = router;
