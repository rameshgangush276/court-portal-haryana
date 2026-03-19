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

        // Determine starting level based on role
        let currentLevel = 'district';
        if (req.user.role === 'district_admin') currentLevel = 'state';
        if (req.user.role === 'state_admin' || req.user.role === 'developer') currentLevel = 'developer';

        const grievance = await prisma.grievance.create({
            data: {
                raisedBy: req.user.id,
                subject,
                description,
                currentLevel,
                districtId: req.user.districtId || null,
            },
        });
        res.status(201).json({ grievance });
    } catch (err) { next(err); }
});

// PUT /api/v1/grievances/:id
router.put('/:id', authenticate, async (req, res, next) => {
    try {
        const { status, assignedTo } = req.body;
        const grievanceId = parseInt(req.params.id);
        
        const existing = await prisma.grievance.findUnique({ where: { id: grievanceId } });
        if (!existing) return res.status(404).json({ error: 'Grievance not found' });

        // Basic permission check: only admins or creator
        const isAdmin = ['developer', 'state_admin', 'district_admin'].includes(req.user.role);
        const isOwner = existing.raisedBy === req.user.id;
        
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const data = {};
        if (status) {
            data.status = status;
            if (status === 'resolved') data.resolvedAt = new Date();
        }
        if (assignedTo !== undefined && isAdmin) {
            data.assignedTo = assignedTo ? parseInt(assignedTo) : null;
        }

        const grievance = await prisma.grievance.update({
            where: { id: grievanceId },
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

        const grievanceId = parseInt(req.params.id);
        const grievance = await prisma.grievance.findUnique({
            where: { id: grievanceId },
            select: { raisedBy: true, districtId: true, subject: true }
        });

        if (!grievance) return res.status(404).json({ error: 'Grievance not found' });

        const comment = await prisma.grievanceComment.create({
            data: {
                grievanceId,
                userId: req.user.id,
                body,
            },
            include: { user: { select: { id: true, name: true, role: true } } },
        });

        // Generate alert for the raiser if commenter is someone else
        if (grievance.raisedBy !== req.user.id) {
            await prisma.alert.create({
                data: {
                    districtId: grievance.districtId || req.user.districtId || 1, // Fallback to 1
                    userId: grievance.raisedBy,
                    alertType: 'grievance_update',
                    message: `New comment on grievance: "${grievance.subject}"`,
                    alertDate: new Date(),
                    metadata: {
                        grievanceId,
                        commentId: comment.id,
                        commenterName: req.user.name
                    }
                }
            });
        }

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

        // Restriction: District admin can only escalate from district to state
        if (req.user.role === 'district_admin' && grievance.currentLevel !== 'district') {
            return res.status(403).json({ error: 'District admin can only escalate district-level tickets to state' });
        }
        // Restriction: State admin can only escalate from state to developer
        if (req.user.role === 'state_admin' && grievance.currentLevel !== 'state') {
            return res.status(403).json({ error: 'State admin can only escalate state-level tickets to developer' });
        }

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

// POST /api/v1/grievances/:id/de-escalate
router.post('/:id/de-escalate', authenticate, requireRole('developer', 'state_admin', 'district_admin'), async (req, res, next) => {
    try {
        const grievance = await prisma.grievance.findUnique({
            where: { id: parseInt(req.params.id) },
        });
        if (!grievance) return res.status(404).json({ error: 'Grievance not found' });

        // Restriction: State admin can only de-escalate from developer to state
        if (req.user.role === 'state_admin' && grievance.currentLevel !== 'developer') {
            return res.status(403).json({ error: 'State admin can only de-escalate developer-level tickets back to state' });
        }

        // Restriction: District admin can only de-escalate from state to district
        if (req.user.role === 'district_admin' && grievance.currentLevel !== 'state') {
            return res.status(403).json({ error: 'District admin can only de-escalate state-level tickets back to district' });
        }

        const deEscalationMap = { developer: 'state', state: 'district' };
        const prevLevel = deEscalationMap[grievance.currentLevel];
        if (!prevLevel) {
            return res.status(400).json({ error: 'Cannot de-escalate further' });
        }

        const updated = await prisma.grievance.update({
            where: { id: parseInt(req.params.id) },
            data: {
                currentLevel: prevLevel,
                status: 'open',
                assignedTo: null,
            },
        });

        res.json({ grievance: updated, message: `De-escalated to ${prevLevel} level` });
    } catch (err) { next(err); }
});

// POST /api/v1/grievances/:id/cancel
router.post('/:id/cancel', authenticate, async (req, res, next) => {
    try {
        const grievanceId = parseInt(req.params.id);
        const grievance = await prisma.grievance.findUnique({ where: { id: grievanceId } });
        
        if (!grievance) return res.status(404).json({ error: 'Grievance not found' });
        if (grievance.raisedBy !== req.user.id) return res.status(403).json({ error: 'Only the creator can cancel a ticket' });

        const updated = await prisma.grievance.update({
            where: { id: grievanceId },
            data: { status: 'cancelled' },
        });
        res.json({ grievance: updated });
    } catch (err) { next(err); }
});

// POST /api/v1/grievances/:id/reopen
router.post('/:id/reopen', authenticate, async (req, res, next) => {
    try {
        const grievanceId = parseInt(req.params.id);
        const grievance = await prisma.grievance.findUnique({ where: { id: grievanceId } });
        
        if (!grievance) return res.status(404).json({ error: 'Grievance not found' });
        if (grievance.raisedBy !== req.user.id) return res.status(403).json({ error: 'Only the creator can reopen a ticket' });

        const updated = await prisma.grievance.update({
            where: { id: grievanceId },
            data: { status: 'open', resolvedAt: null },
        });
        res.json({ grievance: updated });
    } catch (err) { next(err); }
});

module.exports = router;
