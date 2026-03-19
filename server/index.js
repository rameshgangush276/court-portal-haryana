require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const districtRoutes = require('./routes/districts');
const courtRoutes = require('./routes/courts');
const magistrateRoutes = require('./routes/magistrates');
const naibCourtRoutes = require('./routes/naibCourts');
const dataTableRoutes = require('./routes/dataTables');
const dataEntryRoutes = require('./routes/dataEntries');
const alertRoutes = require('./routes/alerts');
const grievanceRoutes = require('./routes/grievances');
const reportRoutes = require('./routes/reports');
const systemRoutes = require('./routes/system');

const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// ─── API Routes ──────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/districts', districtRoutes);
app.use('/api/v1/courts', courtRoutes);
app.use('/api/v1/magistrates', magistrateRoutes);
app.use('/api/v1/naib-courts', naibCourtRoutes);
app.use('/api/v1/data-tables', dataTableRoutes);
app.use('/api/v1/data-entries', dataEntryRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/grievances', grievanceRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/system', systemRoutes);

// ─── Health Check ────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Serve Frontend (Production) ─────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

// ─── Error Handler ───────────────────────────────────
app.use(errorHandler);

// ─── Background Jobs ──────────────────────────────────
const { refreshBackupJob } = require('./services/cronService');
refreshBackupJob();

// ─── Start Server ────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Court Portal API running on port ${PORT}`);
});

module.exports = app;

