const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/v1/reports/court?courtId=&dateFrom=&dateTo=&tableId=
router.get('/court', authenticate, async (req, res, next) => {
    try {
        const { courtId, dateFrom, dateTo, tableId } = req.query;
        if (!courtId) return res.status(400).json({ error: 'courtId is required' });

        const where = { courtId: parseInt(courtId) };
        if (tableId) where.tableId = parseInt(tableId);
        if (dateFrom || dateTo) {
            where.entryDate = {};
            if (dateFrom) where.entryDate.gte = new Date(dateFrom);
            if (dateTo) where.entryDate.lte = new Date(dateTo);
        }

        const entries = await prisma.dataEntry.findMany({
            where,
            include: {
                table: { select: { id: true, name: true, slug: true } },
                magistrate: { select: { id: true, name: true } },
                createdByUser: { select: { id: true, name: true } },
            },
            orderBy: [{ entryDate: 'desc' }, { tableId: 'asc' }],
        });

        const court = await prisma.court.findUnique({
            where: { id: parseInt(courtId) },
            include: {
                district: { select: { name: true } },
                magistrate: { select: { name: true, designation: true } },
            },
        });

        res.json({ court, entries, count: entries.length });
    } catch (err) { next(err); }
});

// GET /api/v1/reports/magistrate?magistrateId=&dateFrom=&dateTo=
router.get('/magistrate', authenticate, async (req, res, next) => {
    try {
        const { magistrateId, dateFrom, dateTo } = req.query;
        if (!magistrateId) return res.status(400).json({ error: 'magistrateId is required' });

        const where = { magistrateId: parseInt(magistrateId) };
        if (dateFrom || dateTo) {
            where.entryDate = {};
            if (dateFrom) where.entryDate.gte = new Date(dateFrom);
            if (dateTo) where.entryDate.lte = new Date(dateTo);
        }

        const entries = await prisma.dataEntry.findMany({
            where,
            include: {
                table: { select: { id: true, name: true, slug: true } },
                court: { select: { id: true, name: true, courtNo: true } },
                createdByUser: { select: { id: true, name: true } },
            },
            orderBy: [{ entryDate: 'desc' }, { tableId: 'asc' }],
        });

        const magistrate = await prisma.magistrate.findUnique({
            where: { id: parseInt(magistrateId) },
            include: { district: { select: { name: true } } },
        });

        res.json({ magistrate, entries, count: entries.length });
    } catch (err) { next(err); }
});

// GET /api/v1/reports/district?districtId=&dateFrom=&dateTo=&tableId=
router.get('/district', authenticate, async (req, res, next) => {
    try {
        let districtId = req.query.districtId ? parseInt(req.query.districtId) : null;

        // District-level users can only see their own district
        if (['district_admin', 'naib_court', 'viewer_district'].includes(req.user.role)) {
            districtId = req.user.districtId;
        }

        if (!districtId) return res.status(400).json({ error: 'districtId is required' });

        const where = { districtId };
        if (req.query.tableId) where.tableId = parseInt(req.query.tableId);
        if (req.query.dateFrom || req.query.dateTo) {
            where.entryDate = {};
            if (req.query.dateFrom) where.entryDate.gte = new Date(req.query.dateFrom);
            if (req.query.dateTo) where.entryDate.lte = new Date(req.query.dateTo);
        }

        const entries = await prisma.dataEntry.findMany({
            where,
            include: {
                table: { select: { id: true, name: true, slug: true } },
                court: { select: { id: true, name: true, courtNo: true } },
                magistrate: { select: { id: true, name: true } },
                createdByUser: { select: { id: true, name: true } },
            },
            orderBy: [{ entryDate: 'desc' }, { tableId: 'asc' }],
        });

        const district = await prisma.district.findUnique({
            where: { id: districtId },
        });

        // Summary stats
        const uniqueDates = [...new Set(entries.map(e => e.entryDate.toISOString().split('T')[0]))];
        const uniqueCourts = [...new Set(entries.map(e => e.courtId))];

        res.json({
            district,
            entries,
            count: entries.length,
            summary: {
                totalEntries: entries.length,
                datesWithData: uniqueDates.length,
                courtsWithData: uniqueCourts.length,
            },
        });
    } catch (err) { next(err); }
});

// GET /api/v1/reports/state?dateFrom=&dateTo=&tableId=
router.get('/state', authenticate, async (req, res, next) => {
    try {
        // Only state-level users
        if (['naib_court', 'district_admin', 'viewer_district'].includes(req.user.role)) {
            return res.status(403).json({ error: 'State-level reports require state-level access' });
        }

        const where = {};
        if (req.query.tableId) where.tableId = parseInt(req.query.tableId);
        if (req.query.dateFrom || req.query.dateTo) {
            where.entryDate = {};
            if (req.query.dateFrom) where.entryDate.gte = new Date(req.query.dateFrom);
            if (req.query.dateTo) where.entryDate.lte = new Date(req.query.dateTo);
        }

        // Aggregate by district
        const districts = await prisma.district.findMany({
            where: { deletedAt: null },
            select: { id: true, name: true },
        });

        const summaries = await Promise.all(
            districts.map(async (district) => {
                const count = await prisma.dataEntry.count({
                    where: { ...where, districtId: district.id },
                });
                const courts = await prisma.court.count({
                    where: { districtId: district.id, deletedAt: null },
                });
                return {
                    district,
                    totalEntries: count,
                    totalCourts: courts,
                };
            })
        );

        const totalEntries = summaries.reduce((sum, s) => sum + s.totalEntries, 0);

        res.json({
            state: 'Haryana',
            summaries,
            totalEntries,
            totalDistricts: districts.length,
        });
    } catch (err) { next(err); }
});

module.exports = router;
