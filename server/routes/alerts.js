const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/v1/alerts?districtId=&resolved=
router.get('/', authenticate, requireRole('developer', 'state_admin', 'district_admin'), async (req, res, next) => {
    try {
        const where = {};
        if (req.query.districtId) where.districtId = parseInt(req.query.districtId);
        if (req.query.resolved !== undefined) where.resolved = req.query.resolved === 'true';
        if (req.user.role === 'district_admin') {
            where.districtId = req.user.districtId;
        }

        const alerts = await prisma.alert.findMany({
            where,
            orderBy: [{ resolved: 'asc' }, { alertDate: 'desc' }],
        });
        res.json({ alerts });
    } catch (err) { next(err); }
});

// PUT /api/v1/alerts/:id/resolve
router.put('/:id/resolve', authenticate, requireRole('developer', 'state_admin', 'district_admin'), async (req, res, next) => {
    try {
        const alert = await prisma.alert.update({
            where: { id: parseInt(req.params.id) },
            data: {
                resolved: true,
                resolvedBy: req.user.id,
                resolvedAt: new Date(),
            },
        });
        res.json({ alert });
    } catch (err) { next(err); }
});

module.exports = router;
