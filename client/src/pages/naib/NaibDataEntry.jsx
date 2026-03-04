import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function NaibDashboard() {
    const { user } = useAuth();
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
                <h2>📝 Data Entry</h2>
            </div>

            {/* Court & Date Selection */}
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
                {courtName && (
                    <div style={{ color: 'var(--color-success)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                        ✅ Selected: {courtName} | Date: {selectedDate}
                    </div>
                )}
            </div>

            {!selectedCourt ? (
                <div className="empty-state">
                    <div className="icon">⚖️</div>
                    <h3>Select a Court</h3>
                    <p>Choose a court from the dropdown above to start data entry</p>
                </div>
            ) : (
                <>
                    {/* Table Tabs */}
                    <div className="tabs">
                        {tables.map(t => (
                            <button
                                key={t.id}
                                className={`tab-btn ${activeTable?.id === t.id ? 'active' : ''}`}
                                onClick={() => { setActiveTable(t); setEditingEntry(null); }}
                            >
                                {t.name}
                            </button>
                        ))}
                    </div>

                    {activeTable && (
                        <>
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

                            {/* Entries Table */}
                            {entries.length > 0 && editingEntry === null && (
                                <div className="data-table-wrapper">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                {activeTable.columns.map(col => <th key={col.id}>{col.name}</th>)}
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {entries.map(entry => (
                                                <tr key={entry.id}>
                                                    {activeTable.columns.map(col => (
                                                        <td key={col.id}>{entry.values?.[col.slug] ?? '—'}</td>
                                                    ))}
                                                    <td>
                                                        <button className="btn btn-secondary btn-sm" onClick={() => handleEditEntry(entry)}>Edit</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
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
                    )}

                    {!activeTable && (
                        <div className="empty-state">
                            <div className="icon">📋</div>
                            <h3>Select a Table</h3>
                            <p>Choose a data entry table from the tabs above</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
