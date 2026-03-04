const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/v1/grievances
router.get('/', authenticate, async (req, res, next) => {
    try {
        const where = {};

        if (req.user.role === 'naib_court') {
            where.raisedBy = req.user.id;
        } else if (req.user.role === 'district_admin') {
            where.districtId = req.user.districtId;
        } else if (req.user.role === 'state_admin') {
            where.currentLevel = { in: ['state', 'developer'] };
        }
        // developer sees all

        const grievances = await prisma.grievance.findMany({
            where,
            include: {
                raisedByUser: { select: { id: true, name: true, role: true } },
                assignedToUser: { select: { id: true, name: true, role: true } },
                district: { select: { id: true, name: true } },
                comments: {
                    include: { user: { select: { id: true, name: true, role: true } } },
                    orderBy: { createdAt: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ grievances });
    } catch (err) { next(err); }
});

// POST /api/v1/grievances
router.post('/', authenticate, async (req, res, next) => {
    try {
        const { subject, description } = req.body;
        if (!subject || !description) {
            return res.status(400).json({ error: 'Subject and description are required' });
        }

        const grievance = await prisma.grievance.create({
            data: {
                raisedBy: req.user.id,
                subject,
                description,
                currentLevel: 'district',
                districtId: req.user.districtId,
            },
        });
        res.status(201).json({ grievance });
    } catch (err) { next(err); }
});

// PUT /api/v1/grievances/:id
router.put('/:id', authenticate, requireRole('developer', 'state_admin', 'district_admin'), async (req, res, next) => {
    try {
        const { status, assignedTo } = req.body;
        const data = {};
        if (status) {
            data.status = status;
            if (status === 'resolved') data.resolvedAt = new Date();
        }
        if (assignedTo !== undefined) data.assignedTo = assignedTo ? parseInt(assignedTo) : null;

        const grievance = await prisma.grievance.update({
            where: { id: parseInt(req.params.id) },
            data,
        });
        res.json({ grievance });
    } catch (err) { next(err); }
});

// POST /api/v1/grievances/:id/comments
router.post('/:id/comments', authenticate, async (req, res, next) => {
    try {
        const { body } = req.body;
        if (!body) return res.status(400).json({ error: 'Comment body is required' });

        const comment = await prisma.grievanceComment.create({
            data: {
                grievanceId: parseInt(req.params.id),
                userId: req.user.id,
                body,
            },
            include: { user: { select: { id: true, name: true, role: true } } },
        });
        res.status(201).json({ comment });
    } catch (err) { next(err); }
});

// POST /api/v1/grievances/:id/escalate
router.post('/:id/escalate', authenticate, requireRole('developer', 'state_admin', 'district_admin'), async (req, res, next) => {
    try {
        const grievance = await prisma.grievance.findUnique({
            where: { id: parseInt(req.params.id) },
        });
        if (!grievance) return res.status(404).json({ error: 'Grievance not found' });

        const escalationMap = { district: 'state', state: 'developer' };
        const nextLevel = escalationMap[grievance.currentLevel];
        if (!nextLevel) {
            return res.status(400).json({ error: 'Cannot escalate further' });
        }

        const updated = await prisma.grievance.update({
            where: { id: parseInt(req.params.id) },
            data: {
                currentLevel: nextLevel,
                status: 'escalated',
                assignedTo: null,
            },
        });

        res.json({ grievance: updated, message: `Escalated to ${nextLevel} level` });
    } catch (err) { next(err); }
});

module.exports = router;
