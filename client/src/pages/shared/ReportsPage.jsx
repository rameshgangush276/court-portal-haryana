import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

import { getTableColumns } from '../../utils/reportConfigs';

export default function ReportsPage() {
    const { user } = useAuth();
    const [mode, setMode] = useState('district-court-wise'); // "district-court-wise", "date-wise", "pending-entries"
    
    // District / Court
    const [districts, setDistricts] = useState([]);
    const [selectedDistrict, setSelectedDistrict] = useState('all'); // "all" or districtId
    
    // Date presets
    const [datePreset, setDatePreset] = useState('range'); 
    // presets for district-court-wise: "range", "month", "year"
    // presets for date-wise: "day-wise", "month-wise", "year-wise"
    // "pending-entries": only uses "range"
    
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Tables selection
    const [tables, setTables] = useState([]);
    const [selectedTables, setSelectedTables] = useState([]); 

    const [reportData, setReportData] = useState(null);
    const [pendingData, setPendingData] = useState(null);
    const [loading, setLoading] = useState(false);

    // Modal state for clickable aggregates
    const [modalData, setModalData] = useState(null);

    const isStateLevel = ['developer', 'state_admin', 'viewer_state'].includes(user.role);

    useEffect(() => {
        api.get('/districts').then(d => setDistricts(d.districts)).catch(console.error);
        api.get('/data-tables').then(d => {
            setTables(d.tables);
            // Default select all
            setSelectedTables(d.tables.map(t => t.id));
        }).catch(console.error);
        
        // Default to yesterday
        const yest = new Date(Date.now() - 86400000);
        const localFormat = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };
        const yestStr = localFormat(yest);
        setDateFrom(yestStr);
        setDateTo(yestStr);
    }, []);

    const handleSelectAllTables = () => {
        if (selectedTables.length === tables.length) {
            setSelectedTables([]);
        } else {
            setSelectedTables(tables.map(t => t.id));
        }
    };

    const handleTableToggle = (id) => {
        if (selectedTables.includes(id)) {
            setSelectedTables(selectedTables.filter(t => t !== id));
        } else {
            setSelectedTables([...selectedTables, id]);
        }
    };

    const localFormat = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const handlePresetChange = (preset) => {
        setDatePreset(preset);
        const today = new Date();
        const yest = new Date(Date.now() - 86400000);
        
        if (preset === 'range' || preset === 'day-wise') {
            if (preset === 'day-wise') {
                // For the current month, upto previous day
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                setDateFrom(localFormat(firstDay));
                setDateTo(localFormat(yest));
            } else {
                setDateFrom(localFormat(yest));
                setDateTo(localFormat(yest));
            }
        } else if (preset === 'month' || preset === 'month-wise') {
            if (preset === 'month-wise') {
                // For the current year, upto previous month
                const firstDay = new Date(today.getFullYear(), 0, 1);
                const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                setDateFrom(localFormat(firstDay));
                setDateTo(localFormat(lastDay));
            } else {
                // Default to previous month
                const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                setDateFrom(localFormat(firstDay));
                setDateTo(localFormat(lastDay));
            }
        } else if (preset === 'year' || preset === 'year-wise') {
            if (preset === 'year-wise') {
                // Upto previous year (default view last 5 years)
                const firstDay = new Date(today.getFullYear() - 5, 0, 1);
                const lastDay = new Date(today.getFullYear() - 1, 11, 31);
                setDateFrom(localFormat(firstDay));
                setDateTo(localFormat(lastDay));
            } else {
                // Default to previous year
                const firstDay = new Date(today.getFullYear() - 1, 0, 1);
                const lastDay = new Date(today.getFullYear() - 1, 11, 31);
                setDateFrom(localFormat(firstDay));
                setDateTo(localFormat(lastDay));
            }
        }
    };

    const generateReport = async () => {
        setLoading(true);
        setReportData(null);
        setPendingData(null);
        
        try {
            if (mode !== 'pending-entries' && selectedTables.length === 0) {
                throw new Error("Please select at least one table.");
            }

            const payload = {
                mode,
                districtId: isStateLevel ? selectedDistrict : user.districtId,
                dateFrom,
                dateTo,
                tableIds: selectedTables
            };

            const data = await api.post('/reports/generate', payload);

            if (mode === 'pending-entries') {
                setPendingData(data.pendingData);
            } else {
                // Ensure data is sorted by table order or just keep backend order
                setReportData(data.tables || []);
            }
        } catch (err) {
            alert(err.error || err.message || 'Error generating report');
        } finally {
            setLoading(false);
        }
    };

    const openAggregateModal = (title, entries) => {
        setModalData({ title, entries });
    };

    const exportToCSV = (tableId, tableName, entries) => {
        if (!entries || entries.length === 0) return;
        const targetTableDef = tables.find(t => t.id === tableId);
        if (!targetTableDef) return;

        // Build headers
        const headers = ['Date', 'District', 'Court', ...targetTableDef.columns.map(c => c.name)];

        // Build rows
        const rows = entries.map(entry => {
            const baseFields = [
                new Date(entry.entryDate).toLocaleDateString('en-IN'),
                entry.district?.name || '—',
                entry.court?.name || '—',
            ];
            const colFields = targetTableDef.columns.map(col => {
                const val = entry.values?.[col.slug];
                return (val !== undefined && val !== null) ? String(val) : '—';
            });
            return [...baseFields, ...colFields];
        });

        // Escape a CSV cell (wrap in quotes if it contains comma, quote, or newline)
        const escapeCell = (cell) => {
            const str = String(cell);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const csvContent = [
            headers.map(escapeCell).join(','),
            ...rows.map(row => row.map(escapeCell).join(','))
        ].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${tableName}_Report.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>📈 Reports Hub</h2>
                <button 
                    className="btn btn-primary" 
                    onClick={() => {
                        const pathPrefix = user.role === 'developer' ? 'dev' : 
                                         user.role === 'state_admin' ? 'state' : 
                                         user.role === 'district_admin' ? 'district' : 'viewer';
                        window.location.href = `/${pathPrefix}/reports/ai-assistant`;
                    }}
                    style={{ background: 'var(--gradient-primary)', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    ✨ Ask AI Assistant
                </button>
            </div>

            <div className="card mb-xl">
                <h3 className="card-title mb-lg">Generate Report</h3>
                
                <div className="tabs mb-lg" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                    <button className={`btn ${mode === 'district-court-wise' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setMode('district-court-wise'); setDatePreset('range'); }}>District/Court Wise</button>
                    <button className={`btn ${mode === 'date-wise' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setMode('date-wise'); setDatePreset('day-wise'); }}>Date Wise</button>
                    <button className={`btn ${mode === 'pending-entries' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setMode('pending-entries'); setDatePreset('range'); }}>Pending Entries Alerts</button>
                </div>

                <div className="form-row">
                    {/* District Dropdown (Unified) */}
                    {isStateLevel && (
                        <div className="form-group">
                            <label className="form-label">District Selection</label>
                            <select className="form-select" value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)}>
                                <option value="all">🌐 All Districts (District Wise View)</option>
                                {districts.map(d => <option key={d.id} value={d.id}>📍 {d.name} (Court Wise View)</option>)}
                            </select>
                        </div>
                    )}

                    {/* Date Presets based on Mode */}
                    {mode === 'district-court-wise' && (
                        <div className="form-group">
                            <label className="form-label">Date Preset</label>
                            <select className="form-select" value={datePreset} onChange={e => handlePresetChange(e.target.value)}>
                                <option value="range">Any Date Range</option>
                                <option value="month">Particular Month</option>
                                <option value="year">Particular Year</option>
                            </select>
                        </div>
                    )}

                    {mode === 'date-wise' && (
                        <div className="form-group">
                            <label className="form-label">Date Preset</label>
                            <select className="form-select" value={datePreset} onChange={e => handlePresetChange(e.target.value)}>
                                <option value="day-wise">Day Wise</option>
                                <option value="month-wise">Month Wise</option>
                                <option value="year-wise">Year Wise</option>
                            </select>
                        </div>
                    )}

                    {/* Dynamic Date Inputs based on preset and mode */}
                    {(mode === 'pending-entries' || (mode === 'district-court-wise' && datePreset === 'range')) && (
                        <>
                            <div className="form-group">
                                <label className="form-label">From</label>
                                <input className="form-input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">To</label>
                                <input className="form-input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                            </div>
                        </>
                    )}

                    {mode === 'district-court-wise' && datePreset === 'month' && (
                        <div className="form-group">
                            <label className="form-label">Select Month</label>
                            <input 
                                className="form-input" 
                                type="month" 
                                value={dateFrom ? dateFrom.substring(0, 7) : ''} 
                                onChange={e => {
                                    const yyyyMm = e.target.value; 
                                    if(yyyyMm) {
                                        const [y, m] = yyyyMm.split('-');
                                        const firstDay = new Date(y, parseInt(m)-1, 1);
                                        const lastDay = new Date(y, parseInt(m), 0);
                                        setDateFrom(localFormat(firstDay));
                                        setDateTo(localFormat(lastDay));
                                    }
                                }}
                            />
                        </div>
                    )}

                    {mode === 'district-court-wise' && datePreset === 'year' && (
                        <div className="form-group">
                            <label className="form-label">Select Year</label>
                            <select 
                                className="form-select" 
                                value={dateFrom ? dateFrom.substring(0, 4) : ''} 
                                onChange={e => {
                                    const y = parseInt(e.target.value);
                                    if(y) {
                                        const firstDay = new Date(y, 0, 1);
                                        const lastDay = new Date(y, 11, 31);
                                        setDateFrom(localFormat(firstDay));
                                        setDateTo(localFormat(lastDay));
                                    }
                                }}
                            >
                                <option value="">-- Choose Year --</option>
                                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                                <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
                                <option value={new Date().getFullYear() - 2}>{new Date().getFullYear() - 2}</option>
                                <option value={new Date().getFullYear() - 3}>{new Date().getFullYear() - 3}</option>
                            </select>
                        </div>
                    )}

                    {mode === 'date-wise' && (
                        <div className="form-group" style={{ 
                            gridColumn: '1 / -1', 
                            padding: '12px', 
                            background: 'var(--color-surface-hover)', 
                            borderLeft: '4px solid var(--color-primary)',
                            borderRadius: '4px'
                        }}>
                            <p style={{ margin: 0, fontWeight: 500, color: 'var(--color-text)' }}>
                                {datePreset === 'day-wise' && '📅 For the current month, upto previous day'}
                                {datePreset === 'month-wise' && '📅 For the current year, upto previous month'}
                                {datePreset === 'year-wise' && '📅 Upto previous year'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Table Checkboxes (Excluded for pending-entries) */}
                {mode !== 'pending-entries' && (
                    <div className="form-group mt-md">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label className="form-label" style={{ margin: 0 }}>Select Tables to Include</label>
                            <button className="btn btn-secondary btn-sm" onClick={handleSelectAllTables}>
                                {selectedTables.length === tables.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-hover)' }}>
                            {tables.map(t => (
                                <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedTables.includes(t.id)} 
                                        onChange={() => handleTableToggle(t.id)} 
                                        style={{ width: '16px', height: '16px' }}
                                    />
                                    {t.name}
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                <button className="btn btn-primary mt-lg" onClick={generateReport} disabled={loading} style={{ width: '100%', padding: '12px', fontSize: '1.1rem' }}>
                    {loading ? 'Generating...' : '📊 Generate Detailed Report'}
                </button>
            </div>

            {/* Results Rendering */}
            {mode === 'pending-entries' && pendingData && (
                <div className="card">
                    <h3 className="card-title text-danger">⚠️ Pending Data Entries</h3>
                    {pendingData.length === 0 ? (
                        <p style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>All courts have submitted their data for the selected dates!</p>
                    ) : (
                        <div className="data-table-wrapper mt-md">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>District</th>
                                        <th>Court Name</th>
                                        <th>Missing Days Count</th>
                                        <th>Specific Dates Missing</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingData.map((pd, idx) => (
                                        <tr key={idx}>
                                            <td data-label="District">{pd.districtName}</td>
                                            <td data-label="Court Name">Court {pd.courtNo} - {pd.courtName}</td>
                                            <td data-label="Count" style={{ fontWeight: 'bold', color: 'var(--color-danger)' }}>{pd.missingCount}</td>
                                            <td data-label="Dates">{pd.missingDates.join(', ')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {mode !== 'pending-entries' && reportData && (
                <div className="report-results">
                    {reportData.length === 0 ? (
                        <div className="card"><p>No data found for the selected criteria. (Ensure Naib courts have clicked "Final Submit" for the requested dates).</p></div>
                    ) : (
                        reportData.map((tableBlock) => {
                            const rawEntries = tableBlock.entries || [];
                            if (rawEntries.length === 0) return null;

                            // Grouping Logic
                            const grouped = {};
                            rawEntries.forEach(entry => {
                                let groupKey = '';
                                let groupLabel = '';
                                if (mode === 'district-court-wise') {
                                    if (isStateLevel && selectedDistrict === 'all') {
                                        groupKey = entry.districtId;
                                        groupLabel = entry.district?.name;
                                    } else {
                                        groupKey = entry.courtId;
                                        groupLabel = `Court ${entry.court?.courtNo} - ${entry.court?.name}`;
                                    }
                                } else if (mode === 'date-wise') {
                                    const dateStr = new Date(entry.entryDate).toLocaleDateString('en-CA');
                                    groupKey = dateStr;
                                    groupLabel = new Date(entry.entryDate).toLocaleDateString('en-IN');
                                }
                                if (!groupKey) return;
                                if (!grouped[groupKey]) {
                                    grouped[groupKey] = { label: groupLabel, entries: [] };
                                }
                                grouped[groupKey].entries.push(entry);
                            });
                            const groupedData = Object.values(grouped).sort((a,b) => a.label.localeCompare(b.label));

                            // Get column definitions
                            const tableColumns = getTableColumns(tableBlock.tableSlug);

                            let rowHeaderLabel = 'Scope';
                            if (mode === 'date-wise') {
                                rowHeaderLabel = 'Date';
                            } else if (isStateLevel && selectedDistrict === 'all') {
                                rowHeaderLabel = 'District';
                            } else {
                                rowHeaderLabel = 'Court Name & No.';
                            }

                            return (
                                <div key={tableBlock.tableId} className="card mb-xl">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <h3 className="card-title" style={{ margin: 0, color: 'var(--color-primary)' }}>{tableBlock.tableName}</h3>
                                        <button className="btn btn-secondary btn-sm" onClick={() => exportToCSV(tableBlock.tableId, tableBlock.tableName, rawEntries)}>
                                            📥 Export CSV
                                        </button>
                                    </div>

                                    <div className="data-table-wrapper" style={{ overflowX: 'auto', width: 'fit-content', maxWidth: '100%' }}>
                                        <table className="data-table" style={{ width: 'auto' }}>
                                            <thead>
                                                <tr>
                                                    <th>Sr. No.</th>
                                                    <th>{rowHeaderLabel}</th>
                                                    {tableColumns.map((col, idx) => (
                                                        <th key={idx}>{col.header}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {groupedData.map((row, idx) => (
                                                    <tr key={idx}>
                                                        <td>{idx + 1}</td>
                                                        <td style={{ fontWeight: 'bold' }}>{row.label}</td>
                                                        {tableColumns.map((col, cIdx) => (
                                                            <td key={cIdx}>
                                                                {col.renderCell(row.entries, (modalEntries) => openAggregateModal(`Details for ${row.label} - ${col.header}`, modalEntries))}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                                {/* Total Row */}
                                                {groupedData.length > 0 && (
                                                    <tr style={{ background: 'var(--color-surface-hover)', fontWeight: 'bold' }}>
                                                        <td colSpan="2" style={{ textAlign: 'right' }}>OVERALL TOTAL:</td>
                                                        {tableColumns.map((col, cIdx) => (
                                                            <td key={cIdx}>
                                                                {col.renderCell(rawEntries, (modalEntries) => openAggregateModal(`Overall Total - ${col.header}`, modalEntries))}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Modal for Clickable Aggregates */}
            {modalData && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div className="modal-content" style={{ background: 'var(--color-surface)', width: '90%', maxWidth: '1000px', maxHeight: '80vh', borderRadius: 'var(--radius-lg)', padding: '24px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)' }}>
                            <h2 style={{ margin: 0, color: 'var(--color-text)' }}>{modalData.title}</h2>
                            <button className="btn btn-secondary" onClick={() => setModalData(null)}>✖ Close</button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            <div className="data-table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>District</th>
                                            <th>Court</th>
                                            {Object.keys(modalData.entries[0]?.values || {}).map(k => (
                                                <th key={k}>{k.replace(/_/g, ' ').toUpperCase()}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {modalData.entries.map(entry => (
                                            <tr key={entry.id}>
                                                <td>{new Date(entry.entryDate).toLocaleDateString('en-IN')}</td>
                                                <td>{entry.district?.name}</td>
                                                <td>Court {entry.court?.courtNo} - {entry.court?.name}</td>
                                                {Object.values(entry.values || {}).map((val, i) => (
                                                    <td key={i}>{val !== null && val !== undefined ? val : '—'}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
