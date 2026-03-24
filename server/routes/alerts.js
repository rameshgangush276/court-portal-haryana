const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/v1/alerts
router.get('/', authenticate, async (req, res, next) => {
    try {
        const where = {};
        
        if (req.query.resolved !== undefined) {
            where.resolved = req.query.resolved === 'true';
        }

        if (req.user.role === 'naib_court') {
            // Naib only sees alerts directed to them
            where.userId = req.user.id;
        } else if (req.user.role === 'district_admin') {
            // District admin sees district broadcast alerts OR personal alerts
            where.OR = [
                { districtId: req.user.districtId, userId: null },
                { userId: req.user.id }
            ];
        } else if (req.user.role === 'state_admin' || req.user.role === 'developer') {
            // Global roles can filter by district or see all
            if (req.query.districtId) where.districtId = parseInt(req.query.districtId);
        }

        const alerts = await prisma.alert.findMany({
            where,
            orderBy: [{ resolved: 'asc' }, { alertDate: 'desc' }],
        });
        res.json({ alerts });
    } catch (err) { next(err); }
});

// PUT /api/v1/alerts/mark-all-read
router.put('/mark-all-read', authenticate, async (req, res, next) => {
    try {
        const where = { resolved: false };
        
        if (req.user.role === 'naib_court') {
            where.userId = req.user.id;
        } else if (req.user.role === 'district_admin') {
            where.OR = [
                { districtId: req.user.districtId, userId: null },
                { userId: req.user.id }
            ];
        } else if (req.user.role === 'state_admin' || req.user.role === 'developer') {
            // Global roles viewing alerts marks their personal or all alerts they can see as read. 
            // Depending on scale, we mark all unread alerts in their scope.
        }

        const result = await prisma.alert.updateMany({
            where,
            data: {
                resolved: true,
                resolvedBy: req.user.id,
                resolvedAt: new Date(),
            },
        });
        
        res.json({ success: true, updatedCount: result.count });
    } catch (err) { next(err); }
});

// PUT /api/v1/alerts/:id/resolve
router.put('/:id/resolve', authenticate, async (req, res, next) => {
    try {
        const alertId = parseInt(req.params.id);
        const existing = await prisma.alert.findUnique({ where: { id: alertId } });

        if (!existing) return res.status(404).json({ error: 'Alert not found' });

        // Permission: Can resolve if it's assigned to you or you're a district admin for that district
        const isAdmin = ['developer', 'state_admin', 'district_admin'].includes(req.user.role);
        const isTargetUser = existing.userId === req.user.id;
        const isDistrictAdminForAlert = req.user.role === 'district_admin' && existing.districtId === req.user.districtId;

        if (!isTargetUser && !isAdmin && !isDistrictAdminForAlert) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const alert = await prisma.alert.update({
            where: { id: alertId },
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
