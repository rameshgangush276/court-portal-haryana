import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { useLanguage } from '../../context/LanguageContext';

export default function NaibDataEntry() {
    const { user, refreshUser } = useAuth();
    const { t, tTable, tColumn } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const isSelectCourtPage = location.pathname.includes('select-court');

    const [courts, setCourts] = useState([]);
    const [selectedCourt, setSelectedCourt] = useState(user?.lastSelectedCourtId || '');
    const [selectedDate, setSelectedDate] = useState(() => {
        const saved = sessionStorage.getItem('naibSelectedDate');
        const _today = new Date().toISOString().split('T')[0];
        const _yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        return (saved === _today || saved === _yesterday) ? saved : _today;
    });

    useEffect(() => {
        sessionStorage.setItem('naibSelectedDate', selectedDate);
    }, [selectedDate]);
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
    const [showOtherDistricts, setShowOtherDistricts] = useState(false);

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    useEffect(() => {
        api.get('/courts').then(d => setCourts(d.courts)).catch(console.error);
        api.get('/data-tables').then(d => setTables(d.tables)).catch(console.error);
        api.get('/districts/all-police-stations').then(d => setPoliceStations(d.policeStations)).catch(console.error);
    }, []);

    // Check lock status globally whenever court or date changes
    useEffect(() => {
        if (selectedCourt && selectedDate) {
            const params = `?courtId=${selectedCourt}&entryDate=${selectedDate}`;
            api.get(`/data-entries/summary${params}`)
                .then(d => setFinalSubmitted(d.isLocked || false))
                .catch(console.error);
        }
    }, [selectedCourt, selectedDate]);

    // Load entries when court/table/date changes
    useEffect(() => {
        if (selectedCourt && activeTable) {
            const params = `?courtId=${selectedCourt}&tableId=${activeTable.id}&entryDate=${selectedDate}`;
            api.get(`/data-entries${params}`).then(d => {
                setEntries(d.entries);
                setFinalSubmitted(d.isLocked || false);
            }).catch(console.error);
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

        // Validation for Table 13: Pairvi for private witness
        if (activeTable?.name?.toLowerCase().includes('pairvi') || Object.keys(formValues).includes('witnesses_prepared')) {
            const examined = parseFloat(formValues['witnesses_examined'] || 0);
            const prepared = parseFloat(formValues['witnesses_prepared'] || 0);
            if (prepared > examined) {
                setError('Validation Error: Witnesses Prepared to Testify cannot be greater than Witnesses Examined.');
                window.scrollTo(0, 0);
                return;
            }
        }

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

    const handleFinalSubmit = async () => {
        setError('');
        try {
            await api.post('/data-entries/submit-day', { courtId: selectedCourt, entryDate: selectedDate });
            setFinalSubmitted(true);
            navigate('/naib/dashboard', {
                state: { successMessage: `All data for ${selectedDate} has been submitted successfully! The calendar is now locked.` }
            });
        } catch (err) {
            setError(err.error || err.message || 'Error occurred');
        }
    };

    const renderField = (col) => {
        const value = (formValues[col.slug] !== undefined && formValues[col.slug] !== null) ? formValues[col.slug] : '';

        // Special handling for Police Station field - Context Aware (Home District first)
        if (col.slug === 'police_station' && policeStations.length > 0) {
            const homeDistrictId = user?.districtId;
            const homeDistrictPS = policeStations.filter(ps => ps.districtId === homeDistrictId);

            // If the currently selected PS is from another district, we need to keep it in the list so it's visible
            const currentSelectedPS = policeStations.find(ps => ps.name === value);
            const isExternalSelected = currentSelectedPS && currentSelectedPS.districtId !== homeDistrictId;

            // Group by District (for the expanded view)
            const grouped = policeStations.reduce((acc, ps) => {
                const distName = ps.district?.name || 'Other';
                if (!acc[distName]) acc[distName] = [];
                acc[distName].push(ps);
                return acc;
            }, {});

            const handlePSChange = (e) => {
                const val = e.target.value;
                if (val === '__SHOW_ALL__') {
                    setShowOtherDistricts(true);
                } else {
                    setFormValues({ ...formValues, [col.slug]: val });
                }
            };

            return (
                <div key={col.slug}>
                    <select
                        className="form-select"
                        value={value}
                        onChange={handlePSChange}
                        onBlur={() => {
                            // Delay slightly so it doesn't flip before the selection is registered
                            setTimeout(() => setShowOtherDistricts(false), 250);
                        }}
                    >
                        <option value="">Select Police Station...</option>

                        {!showOtherDistricts ? (
                            <>
                                {homeDistrictPS.map(ps => (
                                    <option key={ps.id} value={ps.name}>{ps.name}</option>
                                ))}
                                {isExternalSelected && (
                                    <option key={currentSelectedPS.id} value={currentSelectedPS.name}>
                                        📍 {currentSelectedPS.name} ({currentSelectedPS.district?.name})
                                    </option>
                                )}
                                <option value="__SHOW_ALL__" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                                    ➕ Other District PS
                                </option>
                            </>
                        ) : (
                            Object.entries(grouped).map(([district, pss]) => (
                                <optgroup key={district} label={district}>
                                    {pss.map(ps => (
                                        <option key={ps.id} value={ps.name}>
                                            {ps.name} {ps.districtId !== homeDistrictId ? `(${ps.district?.name})` : ''}
                                        </option>
                                    ))}
                                </optgroup>
                            ))
                        )}
                    </select>
                </div>
            );
        }

        switch (col.dataType) {
            case 'enum':
                return (
                    <select className="form-select" value={value} onChange={e => setFormValues({ ...formValues, [col.slug]: e.target.value })}>
                        <option value="">{t('select')}</option>
                        {(col.enumOptions || []).map(opt => (
                            <option key={opt} value={opt}>{t(opt) || opt}</option>
                        ))}
                    </select>
                );
            case 'number': {
                // Display with Indian comma formatting (e.g. 10,00,000)
                // formValues stores the raw number; displayValue shows formatted string
                const rawNum = value === '' || value === undefined ? '' : value;
                const formatIndian = (n) => {
                    if (n === '' || n === null || n === undefined) return '';
                    return Number(n).toLocaleString('en-IN');
                };
                return (
                    <input
                        className="form-input"
                        type="text"
                        inputMode="numeric"
                        value={rawNum === '' ? '' : formatIndian(rawNum)}
                        onChange={e => {
                            // Strip all commas and non-digits
                            const stripped = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
                            const num = stripped === '' ? '' : parseInt(stripped, 10);
                            setFormValues({ ...formValues, [col.slug]: num });
                        }}
                        onKeyDown={e => {
                            // Allow: backspace, delete, tab, arrows, digits
                            const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
                            if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
                                e.preventDefault();
                            }
                        }}
                        placeholder="0"
                        style={{ textAlign: 'right' }}
                    />
                );
            }

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
                        <option value="">{t('select')}</option>
                        <option value="true">{t('yes') || 'Yes'}</option>
                        <option value="false">{t('no') || 'No'}</option>
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
                                <select className="form-select" value={selectedCourt} onChange={e => {
                                    handleCourtSelect(e.target.value);
                                    setSuccess('');
                                    setError('');
                                }}>
                                    <option value="">Choose court...</option>
                                    {courts.map(c => (
                                        <option key={c.id} value={c.id}>{c.courtNo} — {c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Entry Date</label>
                                <select className="form-select" value={selectedDate} onChange={e => {
                                    setSelectedDate(e.target.value);
                                    setSuccess('');
                                    setError('');
                                }}>
                                    <option value={new Date().toLocaleDateString('en-CA')}>Today ({new Date().toLocaleDateString('en-CA')})</option>
                                    <option value={new Date(Date.now() - 86400000).toLocaleDateString('en-CA')}>Yesterday ({new Date(Date.now() - 86400000).toLocaleDateString('en-CA')})</option>
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
                                onClick={() => { setShowSummary(false); setError(''); setSuccess(''); }}
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
                                    <strong>{t('note')}</strong> {t('ensureFilled')}
                                </div>

                                <button
                                    className="btn btn-primary"
                                    onClick={handleFinalSubmit}
                                    style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', background: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                                >
                                    🚀 {t('finalSubmit')}
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

                        {finalSubmitted && (
                            <div style={{
                                marginBottom: 'var(--space-lg)',
                                width: '100%',
                                background: 'rgba(34,197,94,0.1)',
                                color: 'var(--color-success)',
                                border: '1px solid var(--color-success)',
                                padding: 'var(--space-md)',
                                borderRadius: 'var(--radius-md)',
                                fontWeight: 700,
                                textAlign: 'center'
                            }}>
                                🔒 Data finalized and locked for {selectedDate}.
                            </div>
                        )}

                        {success && <div style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--color-success)', padding: 'var(--space-md) var(--space-lg)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-xs)' }}>🎉</div>
                            <strong style={{ fontSize: '1.1rem' }}>{success}</strong>
                        </div>}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', marginBottom: 'var(--space-xl)' }}>
                            <div style={{ marginBottom: 'var(--space-sm)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                                {t('selectATable')}
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
                                    {tTable(t.slug, t.name)}
                                </button>
                            ))}

                            {!finalSubmitted && (
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
                                    ✅ {t('reviewBeforeSubmit')}
                                </button>
                            )}
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
                                ← {t('back')}
                            </button>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', lineHeight: 1.2 }}>{tTable(activeTable.slug, activeTable.name)}</h2>
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
                                <h3 className="card-title mb-lg">{editingEntry === 'new' ? t('newEntry') : t('editEntry')}</h3>
                                <div className="form-row">
                                    {activeTable.columns.map(col => (
                                        <div className="form-group" key={col.id}>
                                            <label className="form-label">
                                                {tColumn(col.slug, col.name)} {col.isRequired && <span className="text-danger">*</span>}
                                            </label>
                                            {renderField(col)}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-md">
                                    <button className="btn btn-primary" onClick={handleSave}>💾 {t('saveEntry')}</button>
                                    <button className="btn btn-secondary" onClick={() => setEditingEntry(null)}>{t('cancel')}</button>
                                </div>
                            </div>
                        )}

                        {/* Action Bar */}
                        {editingEntry === null && (
                            <div className="mb-lg">
                                {finalSubmitted ? (
                                    <div className="alert alert-success" style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                        🔒 {t('dataLocked')} {selectedDate}.
                                    </div>
                                ) : (
                                    <>
                                        {!(activeTable.singleRow && entries.length > 0) && (
                                            <button className="btn btn-primary" onClick={handleNewEntry}>{t('addEntry')}</button>
                                        )}
                                        {activeTable.singleRow && entries.length > 0 && (
                                            <button className="btn btn-primary" onClick={() => handleEditEntry(entries[0])}>✏️ {t('editEntry')}</button>
                                        )}
                                    </>
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
                                                {!finalSubmitted && (
                                                    <>
                                                        <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => handleEditEntry(entry)}>✏️ {t('edit')}</button>
                                                        <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--color-danger)', borderColor: 'var(--color-danger-soft)', background: 'var(--color-danger-soft)' }} onClick={() => handleDeleteEntry(entry.id)}>🗑️ {t('delete')}</button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' }}>
                                            {activeTable.columns.map(col => {
                                                const rawVal = entry.values?.[col.slug];
                                                const displayVal = (rawVal === undefined || rawVal === null || rawVal === '')
                                                    ? '—'
                                                    : col.dataType === 'number'
                                                        ? Number(rawVal).toLocaleString('en-IN')
                                                        : (col.dataType === 'enum' || col.dataType === 'boolean')
                                                            ? t(String(rawVal)) || rawVal
                                                            : rawVal;
                                                return (
                                                    <div key={col.id}>
                                                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tColumn(col.slug, col.name)}</div>
                                                        <div style={{ fontWeight: 500, textAlign: col.dataType === 'number' ? 'right' : 'left' }}>{displayVal}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {entries.length === 0 && editingEntry === null && (
                            <div className="empty-state">
                                <div className="icon">📋</div>
                                <h3>{t('noEntries')}</h3>
                                <p>{t('addEntryStart')}</p>
                            </div>
                        )}
                    </>
                )
            )}
        </div>
    );
}
