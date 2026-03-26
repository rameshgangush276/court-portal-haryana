const express = require('express');
const { Prisma } = require('@prisma/client');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const router = express.Router();

// Multer for Audio transcription (Whisper)
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'temp_audio');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// POST /api/v1/reports/ai-assistant/transcript
router.post('/ai-assistant/transcript', authenticate, upload.single('file'), async (req, res, next) => {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return res.status(500).json({ error: 'Groq API Key not configured' });
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });

    try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(req.file.path));
        formData.append('model', 'whisper-large-v3');
        formData.append('response_format', 'text');

        const response = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${groqKey}`
            }
        });

        // Cleanup temp file
        fs.unlinkSync(req.file.path);

        res.json({ text: response.data });
    } catch (err) {
        console.error('Groq Transcript Error:', err.response?.data || err.message);
        if (req.file) fs.unlinkSync(req.file.path);
        next(err);
    }
});

// ── Dynamic Schema Extraction ──
async function getDbSchema() {
    let schema = '';
    try {
        const sensitiveTables = ['users', 'system_settings', 'daily_submissions', '_prisma_migrations', 'transfer_logs', 'sessions'];
        const tables = await prisma.$queryRaw`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            AND table_name NOT IN (${Prisma.join(sensitiveTables)})
        `;
        for (const t of tables) {
            const name = t.table_name;
            const cols = await prisma.$queryRawUnsafe(
                `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'`,
                name
            );
            schema += `\nTable: ${name}\nColumns:\n`;
            cols.forEach(c => {
                schema += `  - ${c.column_name} (${c.data_type}${c.is_nullable === 'NO' ? ', NOT NULL' : ''})\n`;
            });
            try {
                const sample = await prisma.$queryRawUnsafe(`SELECT * FROM "${name}" LIMIT 3`);
                if (sample.length > 0) schema += `Sample data: ${JSON.stringify(sample, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2)}\n`;
            } catch (_) {}
        }
    } catch (err) {
        console.error('Schema extraction failed:', err);
    }
    return schema;
}

// ── Conversation history (in-memory, per session) ──
const conversations = new Map();

// ── Build system prompt once at startup ──
let SYSTEM_PROMPT = '';
(async () => {
    try {
        const dbSchema = await getDbSchema();
        SYSTEM_PROMPT = `You are an intelligent database assistant for the Haryana Court Data Portal.
You help users query and analyze court data using natural language.
Today's date is ${new Date().toISOString().split('T')[0]}.

Here is the database schema:
${dbSchema}

IMPORTANT RULES:
1. When the user asks about data, generate a valid PostgreSQL query.
2. Return ONLY this JSON format (no markdown, no code blocks):
{
  "sql": "YOUR SQL QUERY HERE",
  "explanation": "Brief friendly explanation of what the data shows",
  "visualization": "table" | "bar_chart" | "pie_chart" | "line_chart" | "stat_card" | "map" | "none",
  "chart_config": {
    "title": "Chart Title",
    "x_label": "X axis label",
    "y_label": "Y axis label",
    "label_column": "column_name for labels",
    "value_column": "column_name for values"
  }
}
3. ONLY use SELECT statements. Never INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE.
4. Choose the best visualization:
   - "stat_card" for single values (counts, averages, sums)
   - "table" for multi-row, multi-column results
   - "bar_chart" for category comparisons
   - "pie_chart" for proportions/percentages
   - "line_chart" for time-series trends
   - "map" if user asks for geographic view (query MUST return latitude, longitude columns)
   - "none" for conversational responses (greetings, help, export questions, etc.)
5. For non-data questions (greetings, help, export, actions), respond with:
   { "sql": null, "explanation": "your helpful conversational response", "visualization": "none", "chart_config": null }
6. Limit results to max 100 rows. For maps max 500.
7. Use PostgreSQL syntax: ILIKE for case-insensitive search, TO_CHAR/EXTRACT for dates.
8. Use JOINs when data from multiple tables is needed.
9. For data_entries, remember the 'values' column is JSONB. Use ->> operator to extract fields.
   Example: SELECT COUNT(*) as total FROM data_entries e JOIN data_entry_tables t ON e.table_id = t.id WHERE t.name ILIKE '%FIR%';
10. Always alias aggregate columns (COUNT(*) as count, SUM(...) as total, etc.).`;
        console.log('✅ AI schema context loaded');
    } catch (err) {
        console.error('Failed to load AI schema:', err);
    }
})();

// POST /api/v1/reports/ai-assistant/query  (matches replication plan contract)
router.post('/ai-assistant/query', authenticate, async (req, res, next) => {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

    const { prompt, conversationId } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Message is required' });

    try {
        // ── Conversation history ──
        const convId = conversationId || 'default';
        if (!conversations.has(convId)) conversations.set(convId, []);
        const history = conversations.get(convId);

        let contextPrompt = SYSTEM_PROMPT + '\n\n';
        
        // ── Role-Based Restrictions ──
        const userRole = req.user.role;
        const userDistrictId = req.user.districtId;
        const userDistrictName = req.user.district?.name || 'your assigned district';

        contextPrompt += `USER CONTEXT:
- Role: ${userRole}
- District ID: ${userDistrictId || 'Global Access'}
- District Name: ${userDistrictName}

IMPORTANT SECURITY ENFORCEMENT for ${userRole}:
1. DO NOT query any tables related to users, passwords, or authentication.
2. If role is NOT 'developer' or 'viewer_state', you MUST strictly filter all queries by district_id = ${userDistrictId}.
3. ONLY provide data relevant to district ${userDistrictName}.
4. If the user asks for data outside their district, explain politely that you are restricted to their jurisdiction.
\n`;

        const recent = history.slice(-6);
        if (recent.length > 0) {
            contextPrompt += 'Recent conversation:\n';
            recent.forEach(h => { contextPrompt += `User: ${h.user}\nAssistant: ${h.assistant}\n\n`; });
        }
        contextPrompt += `\nUser's new question: ${prompt}\n\nRespond with valid JSON only:`;

        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: contextPrompt }],
            temperature: 0.1,
            response_format: { type: 'json_object' }
        }, {
            headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' }
        });

        // ── Parse AI response ──
        let parsed;
        try {
            const text = response.data.choices[0]?.message?.content || '';
            const match = text.match(/\{[\s\S]*\}/);
            parsed = match ? JSON.parse(match[0]) : null;
            if (!parsed) throw new Error('No JSON');
        } catch (_) {
            parsed = { sql: null, explanation: 'Could you rephrase that? I didn\'t quite understand.', visualization: 'none', chart_config: null };
        }

        // ── Execute SQL safely ──
        let queryResult = null, error = null;
        if (parsed.sql) {
            try {
                const sanitized = parsed.sql.trim().toUpperCase();
                if (!sanitized.startsWith('SELECT') && !sanitized.startsWith('WITH')) {
                    throw new Error('Only SELECT queries are allowed');
                }
                const result = await prisma.$queryRawUnsafe(parsed.sql);
                queryResult = JSON.parse(JSON.stringify(result, (k, v) => typeof v === 'bigint' ? v.toString() : v));
            } catch (dbErr) {
                error = dbErr.message;
                parsed.explanation += `\n\n⚠️ SQL Error: ${dbErr.message}`;
                parsed.visualization = 'none';
            }
        }

        // ── Save to conversation history ──
        history.push({ user: prompt, assistant: parsed.explanation });
        if (history.length > 20) history.splice(0, history.length - 20);

        // ── Return in replication plan contract format ──
        res.json({
            explanation: parsed.explanation,
            sql: parsed.sql,
            data: queryResult,
            visualization: parsed.visualization,
            chart_config: parsed.chart_config || null,
            error
        });

    } catch (err) {
        console.error('AI Error:', err.response?.data || err.message);
        res.status(500).json({
            error: 'Failed to process request',
            explanation: 'Something went wrong on my end. Please try again.',
            visualization: 'none'
        });
    }
});

// POST /api/v1/reports/generate
router.post('/generate', authenticate, async (req, res, next) => {
    try {
        const { mode, districtId, dateFrom, dateTo, tableIds } = req.body;

        // Common validations
        if (!mode || !dateFrom || !dateTo) {
            return res.status(400).json({ error: 'mode, dateFrom, and dateTo are required' });
        }

        const dFrom = new Date(dateFrom);
        const dTo = new Date(dateTo);

        // Security role checks for districts
        let targetDistrict = districtId;
        if (['district_admin', 'naib_court', 'viewer_district'].includes(req.user.role)) {
            // Cannot select 'all' or other districts
            targetDistrict = req.user.districtId;
        }

        // PENDING ENTRIES MODE
        if (mode === 'pending-entries') {
            const courtsWhere = { deletedAt: null };
            if (targetDistrict !== 'all') courtsWhere.districtId = parseInt(targetDistrict);
            
            const courts = await prisma.court.findMany({
                where: courtsWhere,
                include: { district: { select: { name: true } } }
            });

            const submissions = await prisma.dailySubmission.findMany({
                where: {
                    entryDate: { gte: dFrom, lte: dTo },
                    ...(targetDistrict !== 'all' && { court: { districtId: parseInt(targetDistrict) } })
                }
            });

            const subSet = new Set(submissions.map(s => `${s.courtId}_${s.entryDate.toISOString().split('T')[0]}`));

            // Generate array of dates
            const dateArray = [];
            let curr = new Date(dFrom);
            while (curr <= dTo) {
                dateArray.push(curr.toISOString().split('T')[0]);
                curr.setDate(curr.getDate() + 1);
            }

            const pendingData = [];
            for (const court of courts) {
                const missingDates = [];
                for (const d of dateArray) {
                    if (!subSet.has(`${court.id}_${d}`)) {
                        missingDates.push(d);
                    }
                }
                if (missingDates.length > 0) {
                    pendingData.push({
                        courtId: court.id,
                        courtName: court.name,
                        courtNo: court.courtNo,
                        districtName: court.district.name,
                        missingDates,
                        missingCount: missingDates.length
                    });
                }
            }
            return res.json({ pendingData });
        }

        // DISTRICT-WISE / DATE-WISE MODES
        if (!tableIds || !Array.isArray(tableIds) || tableIds.length === 0) {
            return res.status(400).json({ error: 'tableIds must be a non-empty array' });
        }

        const smWhere = { entryDate: { gte: dFrom, lte: dTo } };
        if (targetDistrict !== 'all') {
            smWhere.court = { districtId: parseInt(targetDistrict) };
        }
        
        // Fetch valid submissions to enforce the lock constraint
        const submissions = await prisma.dailySubmission.findMany({
            where: smWhere,
            select: { courtId: true, entryDate: true }
        });
        const validSet = new Set(submissions.map(s => `${s.courtId}_${s.entryDate.toISOString().split('T')[0]}`));

        const entryWhere = {
            tableId: { in: tableIds },
            entryDate: { gte: dFrom, lte: dTo }
        };
        if (targetDistrict !== 'all') {
            entryWhere.districtId = parseInt(targetDistrict);
        }

        const entries = await prisma.dataEntry.findMany({
            where: entryWhere,
            include: {
                table: { select: { id: true, name: true, slug: true, columns: true, singleRow: true } },
                court: { select: { id: true, name: true, courtNo: true } },
                district: { select: { id: true, name: true } },
                // Use select inside include which returns null if user is missing rather than failing the whole row
                createdByUser: { select: { id: true, name: true } }
            },
            orderBy: [{ entryDate: 'asc' }]
        });

        // Filter out entries whose (courtId, date) are not in validSet
        const filteredEntries = entries.filter(e => validSet.has(`${e.courtId}_${e.entryDate.toISOString().split('T')[0]}`));

        // Group the valid entries by table so the frontend can easily iterate over each table checked
        const reportByTable = {};
        for (const e of filteredEntries) {
            if (!reportByTable[e.tableId]) {
                reportByTable[e.tableId] = {
                    tableId: e.table.id,
                    tableName: e.table.name,
                    tableSlug: e.table.slug,
                    singleRow: e.table.singleRow,
                    columns: e.table.columns,
                    entries: []
                };
            }
            reportByTable[e.tableId].entries.push(e);
        }

        res.json({ tables: Object.values(reportByTable) });
    } catch (err) { next(err); }
});

module.exports = router;
