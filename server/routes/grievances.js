const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'grievances');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per file
    fileFilter: (req, file, cb) => {
        // Accept images and pdfs
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
        }
    }
});

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
                attachments: true,
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
router.post('/', authenticate, upload.array('files', 5), async (req, res, next) => {
    try {
        const { subject, description } = req.body;
        if (!subject || !description) {
            return res.status(400).json({ error: 'Subject and description are required' });
        }

        // Determine starting level based on role
        let currentLevel = 'district';
        if (req.user.role === 'district_admin') currentLevel = 'state';
        if (req.user.role === 'state_admin' || req.user.role === 'developer') currentLevel = 'developer';

        const attachmentData = req.files ? req.files.map(file => ({
            fileName: file.originalname,
            filePath: `/uploads/grievances/${file.filename}`,
            mimeType: file.mimetype,
            fileSize: file.size,
        })) : [];

        const grievance = await prisma.grievance.create({
            data: {
                raisedBy: req.user.id,
                subject,
                description,
                currentLevel,
                districtId: req.user.districtId || null,
                attachments: {
                    create: attachmentData
                }
            },
            include: {
                attachments: true
            }
        });

        // 🚨 Alert the assigned level users about new grievance
        const targetRole = currentLevel === 'district' ? 'district_admin' : (currentLevel === 'state' ? 'state_admin' : 'developer');
        let targetUsers = [];
        if (targetRole === 'district_admin' && req.user.districtId) {
            targetUsers = await prisma.user.findMany({ where: { role: 'district_admin', districtId: req.user.districtId }, select: { id: true } });
        } else {
            targetUsers = await prisma.user.findMany({ where: { role: targetRole }, select: { id: true } });
        }

        if (targetUsers.length > 0) {
            const createAlerts = targetUsers.map(u => ({
                districtId: req.user.districtId || 1,
                userId: u.id,
                alertType: 'grievance_update',
                message: `New Grievance Raised: "${subject}" by ${req.user.name}`,
                alertDate: new Date(),
                metadata: { grievanceId: grievance.id }
            }));
            await prisma.alert.createMany({ data: createAlerts });
        }

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
router.post('/:id/comments', authenticate, upload.array('files', 5), async (req, res, next) => {
    try {
        const { body } = req.body;
        if (!body) return res.status(400).json({ error: 'Comment body is required' });

        const grievanceId = parseInt(req.params.id);
        const grievance = await prisma.grievance.findUnique({
            where: { id: grievanceId },
            select: { raisedBy: true, districtId: true, subject: true, currentLevel: true }
        });

        if (!grievance) return res.status(404).json({ error: 'Grievance not found' });

        const attachmentData = req.files ? req.files.map(file => ({
            grievanceId,
            fileName: file.originalname,
            filePath: `/uploads/grievances/${file.filename}`,
            mimeType: file.mimetype,
            fileSize: file.size,
        })) : [];

        const comment = await prisma.grievanceComment.create({
            data: {
                grievanceId,
                userId: req.user.id,
                body,
                attachments: {
                    create: attachmentData
                }
            },
            include: { 
                user: { select: { id: true, name: true, role: true } },
                attachments: true
            },
        });

        // Determine who gets an alert based on the chain hierarchy
        const rolesToAlert = ['district_admin'];
        if (grievance.currentLevel === 'state' || grievance.currentLevel === 'developer') {
            rolesToAlert.push('state_admin');
        }
        if (grievance.currentLevel === 'developer') {
            rolesToAlert.push('developer');
        }

        const chainUsers = await prisma.user.findMany({
            where: { role: { in: rolesToAlert } },
            select: { id: true, role: true, districtId: true }
        });

        const userIdsToAlert = new Set();
        
        // 1. Notify the original complainant
        if (grievance.raisedBy !== req.user.id) {
            userIdsToAlert.add(grievance.raisedBy);
        }

        // 2. Notify the chain
        chainUsers.forEach(u => {
            if (u.id === req.user.id) return; // exclude commenter
            
            if (u.role === 'district_admin') {
                if (u.districtId === grievance.districtId) {
                    userIdsToAlert.add(u.id);
                }
            } else {
                // state_admin or developer
                userIdsToAlert.add(u.id);
            }
        });

        // Generate the discrete alerts
        if (userIdsToAlert.size > 0) {
            const newAlerts = Array.from(userIdsToAlert).map(uid => ({
                districtId: grievance.districtId || 1, // Fallback to 1 if null
                userId: uid,
                alertType: 'grievance_update',
                message: `New comment on grievance: "${grievance.subject}" by ${req.user.name} (${req.user.role.replace('_', ' ')})`,
                alertDate: new Date(),
                metadata: {
                    grievanceId,
                    commentId: comment.id,
                    commenterName: req.user.name
                }
            }));

            await prisma.alert.createMany({ data: newAlerts });
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

        // 🚨 Alert the admins corresponding to this new escalated level
        const alertRole = nextLevel === 'state' ? 'state_admin' : 'developer';
        const targetUsers = await prisma.user.findMany({ where: { role: alertRole }, select: { id: true } });

        if (targetUsers.length > 0) {
            const escalationAlerts = targetUsers.map(u => ({
                districtId: grievance.districtId || 1,
                userId: u.id,
                alertType: 'grievance_update',
                message: `Grievance Escalated to ${nextLevel.toUpperCase()}: "${grievance.subject}"`,
                alertDate: new Date(),
                metadata: { grievanceId: grievance.id }
            }));
            await prisma.alert.createMany({ data: escalationAlerts });
        }

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
