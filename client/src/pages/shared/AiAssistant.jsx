import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

// ── Unique conversation ID per session ──
const SESSION_ID = crypto.randomUUID();

export default function AiAssistant() {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [sqlCopied, setSqlCopied] = useState(null);
    const [exportOpen, setExportOpen] = useState(null);
    const mediaRecorderRef = useRef(null);
    const chatEndRef = useRef(null);
    const audioChunksRef = useRef([]);
    const inputRef = useRef(null);

    const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    useEffect(() => { scrollToBottom(); }, [messages, loading]);

    // ── Suggestions for the welcome screen ──
    const suggestions = [
        "Which district granted the most bail applications this month?",
        "Show total NBW arrest warrants issued district-wise this week",
        "How many VC sessions of prisoners were conducted in Ambala last month?",
        "Compare disposed trials across all districts for this month",
        "Which courts have the most pending FIR registrations under 156(3)?",
        "Show total declared POs and PPs district-wise for this year"
    ];

    // ── Send message ──
    const handleSend = useCallback(async (textOverride) => {
        const text = textOverride || input;
        if (!text.trim() || loading) return;

        const userMsg = { role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await api.post('/reports/ai-assistant/query', {
                prompt: text,
                conversationId: SESSION_ID
            });

            const aiMsg = {
                role: 'assistant',
                content: res.explanation || res.text || 'No response received.',
                sql: res.sql || null,
                data: res.data || res.results || null,
                visualization: res.visualization || 'none',
                chart_config: res.chart_config || null,
                error: res.error || null
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, something went wrong. Please try again.',
                visualization: 'none'
            }]);
        } finally {
            setLoading(false);
        }
    }, [input, loading]);

    // ── Voice recording: click to start, click to stop ──
    const toggleRecording = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];
            recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
            recorder.onstop = async () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach(t => t.stop());
                setLoading(true);
                try {
                    const formData = new FormData();
                    formData.append('file', blob, 'voice.webm');
                    const resp = await api.post('/reports/ai-assistant/transcript', formData);
                    if (resp.text && resp.text.trim().length > 1) {
                        handleSend(resp.text);
                    } else {
                        setLoading(false);
                    }
                } catch {
                    setLoading(false);
                }
            };
            recorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Mic error:', err);
        }
    };

    // ── Text-to-Speech ──
    const speak = (text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1;
            utterance.pitch = 1;
            window.speechSynthesis.speak(utterance);
        }
    };

    // ── Copy SQL ──
    const copySql = (sql, idx) => {
        navigator.clipboard.writeText(sql);
        setSqlCopied(idx);
        setTimeout(() => setSqlCopied(null), 2000);
    };

    // ── Export to Excel ──
    const exportExcel = (data, title, idx) => {
        setExportOpen(null);
        import('xlsx').then(XLSX => {
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'AI Result');
            XLSX.writeFile(wb, `${title || 'ai_result'}_${idx + 1}.xlsx`);
        });
    };

    // ── Export to PDF ──
    const exportPDF = (data, title, idx) => {
        setExportOpen(null);
        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) { alert('PDF library not loaded yet. Please wait a moment and try again.'); return; }
        const doc = new jsPDF({ orientation: data[0] && Object.keys(data[0]).length > 5 ? 'landscape' : 'portrait' });
        const label = title || `AI Query Result ${idx + 1}`;
        doc.setFontSize(14);
        doc.setTextColor(40);
        doc.text(label, 14, 20);
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(`Exported: ${new Date().toLocaleString('en-IN')}`, 14, 27);
        const headers = Object.keys(data[0]);
        doc.autoTable({
            startY: 33,
            head: [headers.map(h => h.replace(/_/g, ' ').toUpperCase())],
            body: data.map(row => headers.map(h => String(row[h] ?? '—'))),
            styles: { fontSize: 9, cellPadding: 4 },
            headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 255] },
            margin: { left: 14, right: 14 }
        });
        doc.save(`${label.replace(/\s+/g, '_').toLowerCase()}.pdf`);
    };

    // ── Welcome screen (no messages yet) ──
    const renderWelcome = () => (
        <div style={styles.welcomeContainer}>
            <div style={styles.welcomeIcon}>🏛️</div>
            <h2 style={styles.welcomeTitle}>Court Data Intelligence</h2>
            <p style={styles.welcomeSubtitle}>
                Ask me anything about your court data — I'll query, analyze, and visualize it for you.
            </p>
            <div style={styles.suggestionsGrid}>
                {suggestions.map((s, i) => (
                    <button key={i} onClick={() => handleSend(s)} style={styles.suggestionBtn}>
                        <span style={styles.suggestionIcon}>💡</span>
                        {s}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div style={styles.container}>
            {/* Chat Canvas */}
            <div style={styles.chatCanvas}>
                {messages.length === 0 ? renderWelcome() : (
                    <>
                        {messages.map((m, i) => (
                            <div key={i} style={{ ...styles.msgRow, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                {m.role === 'assistant' && <div style={styles.aiAvatar}>AI</div>}
                                <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {/* Message bubble */}
                                    <div style={m.role === 'user' ? styles.userBubble : styles.aiBubble}>
                                        <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
                                        {m.role === 'assistant' && (
                                            <button onClick={() => speak(m.content)} style={styles.ttsBtn} title="Read aloud">
                                                🔊
                                            </button>
                                        )}
                                    </div>

                                    {/* SQL Block */}
                                    {m.sql && (
                                        <div style={styles.sqlBlock}>
                                            <div style={styles.sqlHeader}>
                                                <span style={styles.sqlLabel}>SQL Query</span>
                                                <button onClick={() => copySql(m.sql, i)} style={styles.copyBtn}>
                                                    {sqlCopied === i ? '✅ Copied' : '📋 Copy'}
                                                </button>
                                            </div>
                                            <pre style={styles.sqlCode}>{m.sql}</pre>
                                        </div>
                                    )}

                                    {/* Visualization + Export */}
                                    {m.data && m.data.length > 0 && (
                                        <div style={{ position: 'relative' }}>
                                            <VisualizationRenderer
                                                data={m.data}
                                                visualization={m.visualization}
                                                chartConfig={m.chart_config}
                                            />
                                            {/* Export button */}
                                            <div style={styles.exportWrapper}>
                                                <button
                                                    onClick={() => setExportOpen(exportOpen === i ? null : i)}
                                                    style={styles.exportBtn}
                                                    title="Export data"
                                                >
                                                    ↓ Export
                                                </button>
                                                {exportOpen === i && (
                                                    <div style={styles.exportDropdown}>
                                                        <button
                                                            style={styles.exportOption}
                                                            onClick={() => exportExcel(m.data, m.chart_config?.title || 'ai_result', i)}
                                                            onMouseOver={e => e.currentTarget.style.background = 'rgba(99,102,241,0.15)'}
                                                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            <span>📊</span> Export to Excel
                                                        </button>
                                                        <button
                                                            style={styles.exportOption}
                                                            onClick={() => exportPDF(m.data, m.chart_config?.title || 'AI Query Result', i)}
                                                            onMouseOver={e => e.currentTarget.style.background = 'rgba(99,102,241,0.15)'}
                                                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            <span>📄</span> Export to PDF
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </>
                )}

                {loading && (
                    <div style={styles.loadingRow}>
                        <div style={styles.aiAvatar}>AI</div>
                        <div style={styles.loadingBubble}>
                            <div style={styles.dotPulse}><span /><span /><span /></div>
                            <span style={{ marginLeft: '12px', color: 'var(--color-text-secondary)' }}>Analyzing...</span>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div style={styles.inputBar}>
                <button onClick={toggleRecording} style={{
                    ...styles.micBtn,
                    background: isRecording ? '#ef4444' : 'var(--color-bg-hover)',
                    color: isRecording ? 'white' : 'var(--color-primary)',
                    animation: isRecording ? 'pulse-glow 2s infinite' : 'none'
                }}>
                    {isRecording ? '⏹' : '🎤'}
                </button>

                <input
                    ref={inputRef}
                    style={styles.textInput}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder={isRecording ? '🎧 Listening...' : 'Ask about courts, FIRs, districts, trends...'}
                    disabled={loading}
                />

                <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || loading}
                    style={{
                        ...styles.sendBtn,
                        background: (!input.trim() || loading) ? 'var(--color-bg-hover)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: (!input.trim() || loading) ? 'var(--color-text-muted)' : 'white',
                        cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
                        boxShadow: (!input.trim() || loading) ? 'none' : '0 4px 15px rgba(99,102,241,0.4)'
                    }}
                >
                    {loading ? '⏳' : '➤'}
                </button>
            </div>

            <style>{`
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
                    50% { box-shadow: 0 0 0 12px rgba(239,68,68,0); }
                }
                @keyframes dot-blink {
                    0%, 80%, 100% { opacity: 0; }
                    40% { opacity: 1; }
                }
            `}</style>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// ── Visualization Renderer ──
// ═══════════════════════════════════════════════════════════
function VisualizationRenderer({ data, visualization, chartConfig }) {
    if (!data || data.length === 0) return null;

    switch (visualization) {
        case 'stat_card':
            return <StatCard data={data} config={chartConfig} />;
        case 'bar_chart':
            return <ChartViz data={data} type="bar" config={chartConfig} />;
        case 'pie_chart':
            return <ChartViz data={data} type="pie" config={chartConfig} />;
        case 'line_chart':
            return <ChartViz data={data} type="line" config={chartConfig} />;
        case 'table':
            return <DataTable data={data} />;
        case 'map':
            return <MapViz data={data} />;
        default:
            if (data.length === 1 && Object.keys(data[0]).length <= 2) {
                return <StatCard data={data} config={chartConfig} />;
            }
            return <DataTable data={data} />;
    }
}

// ── Stat Card ──
function StatCard({ data, config }) {
    const row = data[0];
    const keys = Object.keys(row);
    const value = row[keys[keys.length - 1]];
    const label = config?.title || keys[keys.length - 1]?.replace(/_/g, ' ');

    return (
        <div style={styles.statCard}>
            <div style={styles.statValue}>{typeof value === 'number' ? value.toLocaleString() : String(value)}</div>
            <div style={styles.statLabel}>{label}</div>
        </div>
    );
}

// ── Data Table ──
function DataTable({ data }) {
    const keys = Object.keys(data[0]);
    return (
        <div style={styles.tableWrapper}>
            <table style={styles.table}>
                <thead>
                    <tr>
                        {keys.map(k => (
                            <th key={k} style={styles.th}>{k.replace(/_/g, ' ').toUpperCase()}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.slice(0, 100).map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                            {keys.map((k, j) => (
                                <td key={j} style={styles.td}>{String(row[k] ?? '—')}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {data.length > 100 && <div style={styles.tableNote}>Showing first 100 of {data.length} rows</div>}
        </div>
    );
}

// ── Chart.js Visualization (bar, pie, line) ──
function ChartViz({ data, type, config }) {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!window.Chart || !canvasRef.current || !data?.length) return;

        // Destroy previous chart
        if (chartRef.current) chartRef.current.destroy();

        const keys = Object.keys(data[0]);
        const labelCol = config?.label_column || keys[0];
        const valueCol = config?.value_column || keys[keys.length - 1];

        const labels = data.map(r => String(r[labelCol] || r[keys[0]] || ''));
        const values = data.map(r => Number(r[valueCol] || r[keys[keys.length - 1]] || 0));

        const colors = [
            '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
            '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
            '#a855f7', '#3b82f6', '#22d3ee', '#facc15', '#fb923c'
        ];

        chartRef.current = new window.Chart(canvasRef.current, {
            type: type === 'pie' ? 'doughnut' : type,
            data: {
                labels,
                datasets: [{
                    label: config?.title || 'Result',
                    data: values,
                    backgroundColor: type === 'pie' ? colors.slice(0, labels.length) : 'rgba(99,102,241,0.7)',
                    borderColor: type === 'line' ? '#6366f1' : 'transparent',
                    borderWidth: type === 'line' ? 2 : 0,
                    borderRadius: type === 'bar' ? 6 : 0,
                    tension: 0.4,
                    fill: type === 'line' ? { target: 'origin', above: 'rgba(99,102,241,0.1)' } : false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: type === 'pie', labels: { color: '#94a3b8', font: { size: 12 } } },
                    title: config?.title ? { display: true, text: config.title, color: '#e2e8f0', font: { size: 14 } } : { display: false }
                },
                scales: type === 'pie' ? {} : {
                    x: {
                        ticks: { color: '#94a3b8', font: { size: 11 } },
                        grid: { color: 'rgba(148,163,184,0.06)' },
                        title: config?.x_label ? { display: true, text: config.x_label, color: '#94a3b8' } : { display: false }
                    },
                    y: {
                        ticks: { color: '#94a3b8', font: { size: 11 } },
                        grid: { color: 'rgba(148,163,184,0.06)' },
                        title: config?.y_label ? { display: true, text: config.y_label, color: '#94a3b8' } : { display: false }
                    }
                }
            }
        });

        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, [data, type, config]);

    return (
        <div style={styles.chartContainer}>
            <canvas ref={canvasRef} />
        </div>
    );
}

// ── Map Visualization ──
function MapViz({ data }) {
    const mapRef = useRef(null);
    const mapContainerRef = useRef(null);

    useEffect(() => {
        if (!window.L || !mapContainerRef.current || !data?.length) return;
        if (mapRef.current) mapRef.current.remove();

        const map = window.L.map(mapContainerRef.current).setView([29.0, 76.0], 7);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map);

        data.forEach(row => {
            const lat = row.latitude || row.lat;
            const lng = row.longitude || row.lng || row.lon;
            if (lat && lng) {
                const label = Object.values(row).find(v => typeof v === 'string') || '';
                window.L.marker([lat, lng]).addTo(map).bindPopup(label);
            }
        });

        mapRef.current = map;
        return () => { if (mapRef.current) mapRef.current.remove(); };
    }, [data]);

    return <div ref={mapContainerRef} style={styles.mapContainer} />;
}

// ═══════════════════════════════════════════════════════════
// ── Styles ──
// ═══════════════════════════════════════════════════════════
const styles = {
    container: {
        display: 'flex', flexDirection: 'column',
        height: 'calc(100vh - 130px)',
        background: '#0a0e1a',
        borderRadius: '16px',
        border: '1px solid rgba(148,163,184,0.08)',
        overflow: 'hidden'
    },

    // Chat
    chatCanvas: {
        flex: 1, overflowY: 'auto', padding: '24px',
        display: 'flex', flexDirection: 'column', gap: '20px'
    },
    msgRow: {
        display: 'flex', gap: '12px', alignItems: 'flex-start'
    },
    aiAvatar: {
        width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        color: 'white', fontWeight: 700, fontSize: '12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
    },
    userBubble: {
        padding: '14px 20px', borderRadius: '20px 20px 4px 20px',
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        color: 'white', fontSize: '14px', lineHeight: '1.6',
        maxWidth: '100%', wordBreak: 'break-word'
    },
    aiBubble: {
        padding: '14px 20px', borderRadius: '4px 20px 20px 20px',
        background: '#1a2236', color: '#f1f5f9',
        fontSize: '14px', lineHeight: '1.7',
        border: '1px solid rgba(148,163,184,0.08)',
        maxWidth: '100%', wordBreak: 'break-word',
        position: 'relative'
    },
    ttsBtn: {
        position: 'absolute', top: '8px', right: '8px',
        background: 'transparent', border: 'none',
        cursor: 'pointer', fontSize: '16px', opacity: 0.5,
        padding: '4px', borderRadius: '4px'
    },

    // SQL Block
    sqlBlock: {
        background: '#0f172a', borderRadius: '12px',
        border: '1px solid rgba(148,163,184,0.1)',
        overflow: 'hidden'
    },
    sqlHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 16px',
        background: 'rgba(148,163,184,0.05)',
        borderBottom: '1px solid rgba(148,163,184,0.08)'
    },
    sqlLabel: {
        fontSize: '11px', fontWeight: 600, color: '#64748b',
        textTransform: 'uppercase', letterSpacing: '0.5px'
    },
    copyBtn: {
        background: 'transparent', border: '1px solid rgba(148,163,184,0.15)',
        color: '#94a3b8', fontSize: '12px', cursor: 'pointer',
        padding: '4px 10px', borderRadius: '6px'
    },
    sqlCode: {
        padding: '14px 16px', margin: 0, fontSize: '13px',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        color: '#60a5fa', overflowX: 'auto', lineHeight: '1.6',
        whiteSpace: 'pre-wrap', wordBreak: 'break-all'
    },

    // Stat Card
    statCard: {
        background: 'linear-gradient(135deg, #1e293b, #1a2236)',
        borderRadius: '16px', padding: '30px',
        border: '1px solid rgba(148,163,184,0.1)',
        textAlign: 'center'
    },
    statValue: {
        fontSize: '48px', fontWeight: 800,
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        letterSpacing: '-1px'
    },
    statLabel: {
        fontSize: '14px', color: '#94a3b8', marginTop: '8px',
        textTransform: 'capitalize', fontWeight: 500
    },

    // Table
    tableWrapper: {
        background: '#111827', borderRadius: '12px',
        border: '1px solid rgba(148,163,184,0.08)',
        overflow: 'hidden'
    },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: {
        textAlign: 'left', padding: '12px 16px',
        background: '#1a2236', color: '#94a3b8',
        fontSize: '11px', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.5px',
        borderBottom: '1px solid rgba(148,163,184,0.08)',
        position: 'sticky', top: 0
    },
    td: {
        padding: '10px 16px', color: '#e2e8f0', fontSize: '13px',
        borderBottom: '1px solid rgba(148,163,184,0.04)'
    },
    tableNote: {
        padding: '10px 16px', fontSize: '12px',
        color: '#64748b', background: '#1a2236',
        borderTop: '1px solid rgba(148,163,184,0.08)'
    },

    // Chart
    chartContainer: {
        background: '#111827', borderRadius: '12px',
        border: '1px solid rgba(148,163,184,0.08)',
        padding: '20px'
    },

    // Map
    mapContainer: {
        height: '350px', borderRadius: '12px',
        border: '1px solid rgba(148,163,184,0.08)',
        overflow: 'hidden'
    },

    // Loading
    loadingRow: { display: 'flex', gap: '12px', alignItems: 'flex-start' },
    loadingBubble: {
        padding: '14px 20px', borderRadius: '4px 20px 20px 20px',
        background: '#1a2236', display: 'flex', alignItems: 'center',
        border: '1px solid rgba(148,163,184,0.08)'
    },
    dotPulse: {
        display: 'flex', gap: '6px',
        ['& span']: { width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }
    },

    // Welcome
    welcomeContainer: {
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '16px',
        padding: '40px'
    },
    welcomeIcon: { fontSize: '56px' },
    welcomeTitle: {
        fontSize: '26px', fontWeight: 700, color: '#f1f5f9',
        margin: 0, letterSpacing: '-0.5px'
    },
    welcomeSubtitle: {
        fontSize: '15px', color: '#94a3b8', textAlign: 'center',
        maxWidth: '500px', lineHeight: '1.6', margin: 0
    },
    suggestionsGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '12px', marginTop: '20px', width: '100%', maxWidth: '700px'
    },
    suggestionBtn: {
        padding: '14px 18px', borderRadius: '12px',
        border: '1px solid rgba(148,163,184,0.1)',
        background: '#1a2236', color: '#e2e8f0',
        fontSize: '13px', cursor: 'pointer', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: '10px',
        transition: 'all 0.2s ease', lineHeight: '1.4'
    },
    suggestionIcon: { fontSize: '16px', flexShrink: 0 },

    // Input Bar
    inputBar: {
        display: 'flex', gap: '12px', alignItems: 'center',
        padding: '20px 24px',
        background: '#111827',
        borderTop: '1px solid rgba(148,163,184,0.08)'
    },
    micBtn: {
        width: 46, height: 46, borderRadius: '50%', border: 'none',
        fontSize: '20px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'all 0.3s ease'
    },
    textInput: {
        flex: 1, padding: '14px 20px', borderRadius: '14px',
        border: '1px solid rgba(148,163,184,0.12)',
        background: '#0f172a', color: '#f1f5f9',
        fontSize: '14px', outline: 'none',
        fontFamily: "'Inter', sans-serif"
    },
    sendBtn: {
        width: 46, height: 46, borderRadius: '14px', border: 'none',
        fontSize: '18px', fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'all 0.3s ease'
    },

    // Export
    exportWrapper: {
        display: 'flex', justifyContent: 'flex-end',
        marginTop: '8px', position: 'relative'
    },
    exportBtn: {
        padding: '7px 16px', borderRadius: '20px',
        border: '1px solid rgba(99,102,241,0.35)',
        background: 'rgba(99,102,241,0.12)',
        color: '#818cf8', fontSize: '12px', fontWeight: 600,
        cursor: 'pointer', letterSpacing: '0.3px',
        transition: 'all 0.2s ease',
        display: 'flex', alignItems: 'center', gap: '6px'
    },
    exportDropdown: {
        position: 'absolute', bottom: '110%', right: 0,
        background: '#1a2236',
        border: '1px solid rgba(148,163,184,0.12)',
        borderRadius: '12px', overflow: 'hidden',
        boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
        zIndex: 100, minWidth: '180px'
    },
    exportOption: {
        display: 'flex', alignItems: 'center', gap: '10px',
        width: '100%', padding: '12px 16px',
        background: 'transparent', border: 'none',
        color: '#e2e8f0', fontSize: '13px',
        cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.15s ease'
    }
};
