import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function NaibDashboard() {
    const { user, refreshUser } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const isSelectCourtPage = location.pathname.includes('select-court');

    const [courts, setCourts] = useState([]);
    const [selectedCourt, setSelectedCourt] = useState(user?.lastSelectedCourtId || '');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [tables, setTables] = useState([]);
    const [activeTable, setActiveTable] = useState(null);
    const [entries, setEntries] = useState([]);
    const [formValues, setFormValues] = useState({});
    const [editingEntry, setEditingEntry] = useState(null);
    const [policeStations, setPoliceStations] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showSummary, setShowSummary] = useState(false);
    const [summaryData, setSummaryData] = useState([]);
    const [finalSubmitted, setFinalSubmitted] = useState(false);

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    useEffect(() => {
        api.get('/courts').then(d => setCourts(d.courts)).catch(console.error);
        api.get('/data-tables').then(d => setTables(d.tables)).catch(console.error);
        if (user?.districtId) {
            api.get(`/districts/${user.districtId}/police-stations`).then(d => setPoliceStations(d.policeStations)).catch(console.error);
        }
    }, [user?.districtId]);

    // Load entries when court/date/table changes
    useEffect(() => {
        if (selectedCourt && activeTable) {
            const params = `?courtId=${selectedCourt}&tableId=${activeTable.id}&entryDate=${selectedDate}`;
            api.get(`/data-entries${params}`).then(d => setEntries(d.entries)).catch(console.error);
        }
    }, [selectedCourt, selectedDate, activeTable]);

    const handleCourtSelect = async (courtId) => {
        setSelectedCourt(courtId);
        if (courtId) {
            try { 
                await api.post('/data-entries/select-court', { courtId: parseInt(courtId) }); 
                await refreshUser(); // Update global state
            }
            catch (err) { console.error(err); }
        }
    };

    const handleNewEntry = () => {
        if (!activeTable) return;
        const defaults = {};
        activeTable.columns.forEach(col => {
            defaults[col.slug] = col.dataType === 'date' ? selectedDate : '';
        });
        setFormValues(defaults);
        setEditingEntry('new');
        setError('');
    };

    const handleEditEntry = (entry) => {
        setFormValues({ ...entry.values });
        setEditingEntry(entry.id);
        setError('');
    };

    const handleSave = async () => {
        setError('');
        setSuccess('');
        try {
            if (editingEntry === 'new') {
                await api.post('/data-entries', {
                    tableId: activeTable.id,
                    courtId: parseInt(selectedCourt),
                    entryDate: selectedDate,
                    values: formValues,
                });
                setSuccess('Entry saved successfully!');
            } else {
                await api.put(`/data-entries/${editingEntry}`, { values: formValues });
                setSuccess('Entry updated successfully!');
            }
            setEditingEntry(null);
            // Reload entries
            const params = `?courtId=${selectedCourt}&tableId=${activeTable.id}&entryDate=${selectedDate}`;
            const d = await api.get(`/data-entries${params}`);
            setEntries(d.entries);
        } catch (err) {
            setError(err.details ? err.details.join(', ') : err.message);
        }
    };

    const handleDeleteEntry = async (id) => {
        if (!window.confirm('Are you sure you want to delete this entry?')) return;

        setError('');
        setSuccess('');
        try {
            await api.delete(`/data-entries/${id}`);
            setSuccess('Entry deleted successfully!');
            // Reload entries
            const params = `?courtId=${selectedCourt}&tableId=${activeTable.id}&entryDate=${selectedDate}`;
            const d = await api.get(`/data-entries${params}`);
            setEntries(d.entries);
        } catch (err) {
            setError(err.details ? err.details.join(', ') : err.message);
        }
    };

    const handleViewSummary = async () => {
        setError('');
        setSuccess('');
        try {
            const params = `?courtId=${selectedCourt}&entryDate=${selectedDate}`;
            const d = await api.get(`/data-entries/summary${params}`);
            setSummaryData(d.counts);
            setShowSummary(true);
            setFinalSubmitted(false);
            window.scrollTo(0, 0);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleFinalSubmit = () => {
        setFinalSubmitted(true);
        setSuccess('All data for today has been submitted successfully!');
        window.scrollTo(0, 0);
    };

    const renderField = (col) => {
        const value = (formValues[col.slug] !== undefined && formValues[col.slug] !== null) ? formValues[col.slug] : '';

        // Special handling for Police Station field
        if (col.slug === 'police_station' && policeStations.length > 0) {
            return (
                <select
                    className="form-select"
                    value={value}
                    onChange={e => setFormValues({ ...formValues, [col.slug]: e.target.value })}
                >
                    <option value="">Select Police Station...</option>
                    {policeStations.map(ps => (
                        <option key={ps.id} value={ps.name}>{ps.name}</option>
                    ))}
                </select>
            );
        }

        switch (col.dataType) {
            case 'enum':
                return (
                    <select className="form-select" value={value} onChange={e => setFormValues({ ...formValues, [col.slug]: e.target.value })}>
                        <option value="">Select...</option>
                        {(col.enumOptions || []).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                );
            case 'number':
                return (
                    <input 
                        className="form-input" 
                        type="number" 
                        min="0"
                        value={value} 
                        onChange={e => {
                            const val = e.target.value;
                            if (val !== '' && Number(val) < 0) return; // Prevent negative typing
                            setFormValues({ ...formValues, [col.slug]: val !== '' ? Number(val) : '' });
                        }} 
                    />
                );
            case 'date':
                return (
                    <input className="form-input" type="date" value={value} onChange={e => setFormValues({ ...formValues, [col.slug]: e.target.value })} />
                );
            case 'year':
                const currentYear = new Date().getFullYear();
                const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
                return (
                    <select className="form-select" value={value} onChange={e => setFormValues({ ...formValues, [col.slug]: e.target.value })}>
                        <option value="">Select Year...</option>
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                );
            case 'boolean':
                return (
                    <select className="form-select" value={String(value)} onChange={e => setFormValues({ ...formValues, [col.slug]: e.target.value === 'true' })}>
                        <option value="">Select...</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                    </select>
                );
            default:
                return (
                    <input className="form-input" type="text" value={value} onChange={e => setFormValues({ ...formValues, [col.slug]: e.target.value })} />
                );
        }
    };

    const courtName = courts.find(c => c.id === parseInt(selectedCourt))?.name;

    return (
        <div>
            <div className="page-header">
                <h2>{isSelectCourtPage ? '⚖️ Select Court' : '📝 Data Entry'}</h2>
            </div>

            {isSelectCourtPage ? (
                <>
                    {/* Court & Date Selection Only */}
                    <div className="card mb-xl">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Select Court</label>
                                <select className="form-select" value={selectedCourt} onChange={e => handleCourtSelect(e.target.value)}>
                                    <option value="">Choose court...</option>
                                    {courts.map(c => (
                                        <option key={c.id} value={c.id}>{c.courtNo} — {c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Entry Date</label>
                                <select className="form-select" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}>
                                    <option value={today}>Today ({today})</option>
                                    <option value={yesterday}>Yesterday ({yesterday})</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {selectedCourt && (
                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', padding: 'var(--space-md) var(--space-lg)', fontSize: '1.1rem', marginTop: 'var(--space-lg)' }}
                            onClick={() => navigate('/naib/entry')}
                        >
                            Proceed to Data Entry ➔
                        </button>
                    )}
                </>
            ) : (
                /* Data Entry Tab */
                !selectedCourt ? (
                    <div className="empty-state">
                        <div className="icon">⚖️</div>
                        <h3>No Court Selected</h3>
                        <p>Please select a court and date first to begin entering data.</p>
                        <button className="btn btn-primary mt-lg" onClick={() => navigate('/naib/select-court')}>Go to Select Court</button>
                    </div>
                ) : showSummary ? (
                    <>
                        <div className="page-header" style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => { setShowSummary(false); setFinalSubmitted(false); setError(''); setSuccess(''); }}
                            >
                                ← Back to Tables
                            </button>
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Data Verification Summary</h2>
                        </div>

                        <div className="card mb-xl">
                            <div style={{ display: 'flex', gap: 'var(--space-lg)', fontSize: 'var(--font-size-sm)', fontWeight: 600, flexWrap: 'wrap' }}>
                                <span style={{ color: 'var(--color-primary)' }}>📍 {courtName}</span>
                                <span style={{ color: 'var(--color-success)' }}>📅 {selectedDate}</span>
                            </div>
                        </div>

                        {success && <div style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--color-success)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-xl)', textAlign: 'center', border: '1px solid var(--color-success)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>🎉</div>
                            <h3 style={{ margin: 0 }}>{success}</h3>
                            {finalSubmitted && <button className="btn btn-primary mt-lg" onClick={() => navigate('/naib')}>Back to Dashboard</button>}
                        </div>}

                        {!finalSubmitted && (
                            <>
                                <div className="card mb-xl" style={{ overflowX: 'auto' }}>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '60px' }}>#</th>
                                                <th>Table Name</th>
                                                <th style={{ textAlign: 'center' }}>Status / Count</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {summaryData.map((row, idx) => {
                                                const isEmpty = row.count === 0;
                                                return (
                                                    <tr key={row.tableId} style={isEmpty ? { backgroundColor: 'var(--color-danger-soft)' } : {}}>
                                                        <td>{idx + 1}</td>
                                                        <td style={isEmpty ? { fontWeight: 600, color: 'var(--color-danger)' } : {}}>{row.tableName}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            {row.singleRow ? (
                                                                <span style={{ 
                                                                    padding: '4px 12px', 
                                                                    borderRadius: '20px', 
                                                                    fontSize: '12px', 
                                                                    background: isEmpty ? 'var(--color-danger-soft)' : 'var(--color-success-soft)',
                                                                    color: isEmpty ? 'var(--color-danger)' : 'var(--color-success)',
                                                                    fontWeight: 700
                                                                }}>
                                                                    {isEmpty ? '❌ NO' : '✅ YES'}
                                                                </span>
                                                            ) : (
                                                                <span style={{ 
                                                                    fontWeight: 700,
                                                                    color: isEmpty ? 'var(--color-danger)' : 'var(--color-text)'
                                                                }}>
                                                                    {row.count} Rows
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                
                                <div className="alert alert-info mb-xl">
                                    <strong>Note:</strong> Please ensure all tables marked in red (0 entries) are either intentionally left blank or filled before final submission.
                                </div>

                                <button 
                                    className="btn btn-primary" 
                                    onClick={handleFinalSubmit}
                                    style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', background: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                                >
                                    🚀 Final Submit Data to District Admin
                                </button>
                            </>
                        )}
                    </>
                ) : !activeTable ? (
                    <>
                        <div className="card mb-xl" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                            <div style={{ display: 'flex', gap: 'var(--space-lg)', fontSize: 'var(--font-size-sm)', fontWeight: 600, flexWrap: 'wrap' }}>
                                <span style={{ color: 'var(--color-primary)' }}>📍 {courtName}</span>
                                <span style={{ color: 'var(--color-success)' }}>📅 {selectedDate}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', marginBottom: 'var(--space-xl)' }}>
                            <div style={{ marginBottom: 'var(--space-sm)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                                Select a table below:
                            </div>
                            {tables.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => { setActiveTable(t); setEditingEntry(null); setError(''); setSuccess(''); setShowSummary(false); }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-md)',
                                        width: '100%',
                                        textAlign: 'left',
                                        padding: 'var(--space-md) var(--space-lg)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--color-border)',
                                        background: 'var(--color-surface)',
                                        color: 'var(--color-text)',
                                        cursor: 'pointer',
                                        fontSize: 'var(--font-size-sm)',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    <span style={{
                                        width: 24, height: 24,
                                        borderRadius: '50%',
                                        background: 'var(--color-border)',
                                        color: 'var(--color-text-secondary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '11px', fontWeight: 700, flexShrink: 0,
                                    }}>
                                        {tables.indexOf(t) + 1}
                                    </span>
                                    {t.name}
                                </button>
                            ))}
                            <button
                                className="btn btn-primary"
                                onClick={handleViewSummary}
                                style={{
                                    marginTop: 'var(--space-md)',
                                    width: '100%',
                                    background: 'var(--color-success)',
                                    borderColor: 'var(--color-success)',
                                    padding: 'var(--space-md)',
                                    fontWeight: 700
                                }}
                            >
                                ✅ Review & Final Submit Today's Data
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Active Table Screen */}
                        <div className="page-header" style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => { setActiveTable(null); setEditingEntry(null); setError(''); setSuccess(''); }}
                            >
                                ← Back
                            </button>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', lineHeight: 1.2 }}>{activeTable.name}</h2>
                        </div>

                        <div className="card mb-xl" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                            <div style={{ display: 'flex', gap: 'var(--space-lg)', fontSize: 'var(--font-size-sm)', fontWeight: 600, flexWrap: 'wrap' }}>
                                <span style={{ color: 'var(--color-primary)' }}>📍 {courtName}</span>
                                <span style={{ color: 'var(--color-success)' }}>📅 {selectedDate}</span>
                            </div>
                        </div>

                        {/* Success / Error */}
                        {success && <div style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--color-success)', padding: 'var(--space-md) var(--space-lg)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', fontSize: 'var(--font-size-sm)' }}>{success}</div>}
                        {error && <div style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', padding: 'var(--space-md) var(--space-lg)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', fontSize: 'var(--font-size-sm)' }}>{error}</div>}

                        {/* Entry Form */}
                        {editingEntry !== null && (
                            <div className="card mb-xl">
                                <h3 className="card-title mb-lg">{editingEntry === 'new' ? 'New Entry' : 'Edit Entry'}</h3>
                                <div className="form-row">
                                    {activeTable.columns.map(col => (
                                        <div className="form-group" key={col.id}>
                                            <label className="form-label">
                                                {col.name} {col.isRequired && <span className="text-danger">*</span>}
                                            </label>
                                            {renderField(col)}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-md">
                                    <button className="btn btn-primary" onClick={handleSave}>💾 Save</button>
                                    <button className="btn btn-secondary" onClick={() => setEditingEntry(null)}>Cancel</button>
                                </div>
                            </div>
                        )}

                        {/* Action Bar */}
                        {editingEntry === null && (
                            <div className="mb-lg">
                                {!(activeTable.singleRow && entries.length > 0) && (
                                    <button className="btn btn-primary" onClick={handleNewEntry}>+ Add Entry</button>
                                )}
                                {activeTable.singleRow && entries.length > 0 && (
                                    <button className="btn btn-primary" onClick={() => handleEditEntry(entries[0])}>✏️ Edit Entry</button>
                                )}
                            </div>
                        )}

                        {/* Entries List (Mobile-friendly Cards) */}
                        {entries.length > 0 && editingEntry === null && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                {entries.map((entry, index) => (
                                    <div key={entry.id} className="card" style={{ padding: 'var(--space-md)' }}>
                                        <div style={{ paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--space-sm)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>Entry #{index + 1}</span>
                                            <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                                <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => handleEditEntry(entry)}>✏️ Edit</button>
                                                <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--color-danger)', borderColor: 'var(--color-danger-soft)', background: 'var(--color-danger-soft)' }} onClick={() => handleDeleteEntry(entry.id)}>🗑️ Delete</button>
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' }}>
                                            {activeTable.columns.map(col => (
                                                <div key={col.id}>
                                                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col.name}</div>
                                                    <div style={{ fontWeight: 500 }}>{entry.values?.[col.slug] ?? '—'}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {entries.length === 0 && editingEntry === null && (
                            <div className="empty-state">
                                <div className="icon">📋</div>
                                <h3>No entries yet</h3>
                                <p>Click "Add Entry" to start filling data for this table</p>
                            </div>
                        )}
                    </>
                )
            )}
        </div>
    );
}
