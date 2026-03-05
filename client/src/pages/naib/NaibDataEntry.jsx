import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function NaibDashboard() {
    const { user } = useAuth();
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
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    useEffect(() => {
        api.get('/courts').then(d => setCourts(d.courts)).catch(console.error);
        api.get('/data-tables').then(d => setTables(d.tables)).catch(console.error);
    }, []);

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
            try { await api.post('/data-entries/select-court', { courtId: parseInt(courtId) }); }
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

    const renderField = (col) => {
        const value = formValues[col.slug] || '';

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
                    <input className="form-input" type="number" value={value} onChange={e => setFormValues({ ...formValues, [col.slug]: e.target.value ? Number(e.target.value) : '' })} />
                );
            case 'date':
                return (
                    <input className="form-input" type="date" value={value} onChange={e => setFormValues({ ...formValues, [col.slug]: e.target.value })} />
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
                                    onClick={() => { setActiveTable(t); setEditingEntry(null); setError(''); setSuccess(''); }}
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
