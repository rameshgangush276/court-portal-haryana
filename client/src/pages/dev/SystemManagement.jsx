import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';

export default function SystemManagement() {
    const [backups, setBackups] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null); // { message, type: 'success'|'error' }

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4500);
    }, []);
    const [courts, setCourts] = useState([]);
    const [finalSelect, setFinalSelect] = useState({
        districtId: '',
        courtId: '',
        date: ''
    });

    const [backupTime, setBackupTime] = useState('');
    const [serverTime, setServerTime] = useState('');
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [savingTime, setSavingTime] = useState(false);
    const [tables, setTables] = useState([]);
    const [savingTables, setSavingTables] = useState(false);

    useEffect(() => {
        fetchSettings();
        fetchBackups();
        fetchDistricts();
        fetchTables();
        
        // Update server time locally every 30s to keep it roughly sync'd
        const timer = setInterval(() => {
            setServerTime(prev => {
                if (!prev) return '';
                const d = new Date(`1970-01-01T${prev}Z`);
                d.setSeconds(d.getSeconds() + 30);
                return d.toISOString().substr(11, 5);
            });
        }, 30000);
        return () => clearInterval(timer);
    }, []);

    const fetchSettings = async () => {
        try {
            setLoadingSettings(true);
            const res = await api.get(`/system/settings/backup-time?t=${Date.now()}`);
            setBackupTime(res.value);
            setServerTime(res.serverTime);
        } catch (err) { 
            console.error('Failed to load settings', err);
            // Fallback to local time if API fails for now
            const now = new Date();
            setServerTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
        }
        finally { setLoadingSettings(false); }
    }

    const fetchTables = async () => {
        try {
            const res = await api.get('/data-tables');
            setTables(res.tables || []);
        } catch (err) {
            console.error('Failed to fetch tables', err);
        }
    };

    const handleMoveTable = (index, direction) => {
        const newTables = [...tables];
        if (direction === 'up' && index > 0) {
            [newTables[index], newTables[index - 1]] = [newTables[index - 1], newTables[index]];
        } else if (direction === 'down' && index < newTables.length - 1) {
            [newTables[index], newTables[index + 1]] = [newTables[index + 1], newTables[index]];
        }
        setTables(newTables);
    };

    const handleSaveTableSort = async () => {
        setSavingTables(true);
        try {
            const updates = tables.map((t, idx) => ({ id: t.id, sortOrder: idx + 1 }));
            const res = await api.post('/system/tables/reorder', { updates });
            showToast(res.message);
            fetchTables();
        } catch (err) {
            showToast(err.message || 'Failed to save sort order', 'error');
        } finally {
            setSavingTables(false);
        }
    };

    const handleSaveTime = async () => {
        try {
            setSavingTime(true);
            await api.post('/system/settings/backup-time', { value: backupTime });
            showToast(`Daily backup successfully scheduled for ${backupTime}.`);
            fetchSettings();
        } catch (err) {
            showToast(err.message || 'Failed to save schedule', 'error');
        } finally {
            setSavingTime(false);
        }
    }

    const fetchBackups = async () => {
        try {
            const d = await api.get('/system/backups-list');
            setBackups(d.backups);
        } catch (err) { console.error('Failed to fetch backups', err); }
    };

    const fetchDistricts = async () => {
        try {
            const d = await api.get('/districts');
            setDistricts(d.districts || []);
        } catch (err) { console.error('Failed to fetch districts', err); }
    };

    const handleBackup = async () => {
        setLoading(true);
        try {
            const res = await api.post('/system/backup');
            showToast(res.message || 'Backup created successfully!');
            fetchBackups();
        } catch (err) { 
            showToast(`Error: ${err.message || 'Failed to create backup.'}`, 'error');
        }
        finally { setLoading(false); }
    };

    const fetchCourts = async (dId) => {
        if (!dId) { setCourts([]); return; }
        try {
            const res = await api.get(`/courts?districtId=${dId}`);
            setCourts(res.courts || []);
        } catch (err) { console.error('Failed to fetch courts', err); }
    };

    const handleFinalize = async () => {
        let sc = '';
        if (finalSelect.courtId) sc = `Court ${finalSelect.courtId}`;
        else if (finalSelect.districtId) sc = `District ${finalSelect.districtId}`;
        else sc = 'Global (ALL Districts)';

        const msg = `⚠️ Bulk Finalization: Mark all existing entries for ${sc} ${finalSelect.date ? `on ${finalSelect.date}` : 'across ALL history'} as "Final Submitted"?`;
        if (!window.confirm(msg)) return;

        setLoading(true);
        try {
            const res = await api.post('/system/finalize-submissions', finalSelect);
            showToast(res.message);
        } catch (err) { showToast(err.message || 'Finalization failed', 'error'); }
        finally { setLoading(false); }
    };

    const handleRestore = async (name) => {
        if (!window.confirm(`⚠️ DANGER: Restoration will overwrite all current data. Are you sure you want to restore from: ${name}?`)) return;
        
        setLoading(true);
        try {
            await api.post('/system/restore', { filename: name });
            showToast(`System successfully restored to backup: ${name}`);
        } catch (err) { showToast('Restore failed. Check if psql is installed.', 'error'); }
        finally { setLoading(false); }
    };

    const handleCleanup = async (scope) => {
        const districtName = selectedDistrict ? districts.find(d => d.id === parseInt(selectedDistrict))?.name : 'ALL districts';
        const msg = scope === 'full_wipe' 
            ? '⚠️ DANGER: This will wipe ALL data (Courts, Entries, Users). Reset the system to zero? (Only the developer account will remain)' 
            : `Are you sure you want to clear "${scope.replace('_', ' ')}" for ${districtName}?`;
            
        if (!window.confirm(msg)) return;
        
        setLoading(true);
        try {
            const d = await api.post('/system/cleanup', { scope, districtId: selectedDistrict });
            showToast(d.message);
        } catch (err) { showToast(err.message || 'Cleanup failed.', 'error'); }
        finally { setLoading(false); }
    };

    const handleDeleteBackup = async (name) => {
        if (!window.confirm(`⚠️ PERMANENT DELETE: Are you sure you want to delete ${name}? This cannot be undone.`)) return;
        
        setLoading(true);
        try {
            await api.delete(`/system/backups/${name}`);
            showToast(`Backup ${name} deleted successfully.`);
            fetchBackups();
        } catch (err) { showToast('Failed to delete backup.', 'error'); }
        finally { setLoading(false); }
    };

    return (
        <div>
            <div className="page-header">
                <h2>⚙️ System Management</h2>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginTop: 'var(--space-md)' }}>
                    <p style={{ marginBottom: '8px' }}><strong>Powerful developer tools to maintain the portal:</strong></p>
                    <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <li><strong>Daily Submissions:</strong> Manually lock or finalize data entries for any specific court or district.</li>
                        <li><strong>Data Backups:</strong> Create and restore full PostgreSQL database backups instantly.</li>
                        <li><strong>Background Synchronization:</strong> Configure automated daily background Google Drive backups.</li>
                        <li><strong>Table Configuration:</strong> Reorder reporting tables dynamically without writing code.</li>
                        <li><strong>Cleanup Options:</strong> Safely wipe redundant data arrays while keeping core functionality intact.</li>
                    </ul>
                </div>
            </div>

            {/* ── Floating Toast Notification ── */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: '32px', right: '32px', zIndex: 9999,
                    background: toast.type === 'error' ? 'var(--color-danger)' : 'var(--color-success)',
                    color: '#fff', padding: '14px 22px', borderRadius: '10px',
                    boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    maxWidth: '420px', fontSize: '0.95rem', fontWeight: 500,
                    animation: 'slideInUp 0.3s ease'
                }}>
                    <span style={{ fontSize: '18px' }}>{toast.type === 'error' ? '❌' : '✅'}</span>
                    <span style={{ flex: 1 }}>{toast.message}</span>
                    <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: 0 }}>×</button>
                </div>
            )}

            <div className="grid grid-2 mt-xl" style={{ alignItems: 'start' }}>
                {/* ========================================= COLUMN 1: BACKUPS & RESTORE ========================================= */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
                    
                    <div className="card">
                        <div className="card-header"><div className="card-title">Manual Data Backup</div></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            <button 
                                className="btn btn-primary" 
                                onClick={handleBackup} 
                                disabled={loading}
                                style={{ justifyContent: 'start' }}
                            >
                                📦 Create Manual Data Backup
                            </button>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', background: 'rgba(255,165,0,0.05)', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-warning)' }}>
                                Note: Backups are stored in the '/backups' directory and Google Drive of courtdataportal@gmail.com.
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header"><div className="card-title">Schedule Daily Backup</div></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                                    Automated Daily Data Snapshot
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                                    <div style={{ 
                                        fontSize: '0.75rem', 
                                        padding: '5px 12px', 
                                        background: 'rgba(52, 211, 153, 0.2)', 
                                        color: '#34d399', 
                                        borderRadius: '8px', 
                                        border: '1px solid rgba(52, 211, 153, 0.5)',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        letterSpacing: '0.5px'
                                    }}>
                                        <span style={{ width: '8px', height: '8px', background: '#34d399', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 10px #34d399' }}></span>
                                        SERVER CLOCK: {serverTime || '--:--'}
                                    </div>
                                    {backupTime && (
                                        <div style={{ 
                                            fontSize: '0.75rem', 
                                            padding: '5px 12px', 
                                            background: 'rgba(59, 130, 246, 0.2)', 
                                            color: '#60a5fa', 
                                            borderRadius: '8px', 
                                            border: '1px solid rgba(59, 130, 246, 0.5)',
                                            fontWeight: 700,
                                            letterSpacing: '0.5px'
                                        }}>
                                            SCHEDULED JOB: {backupTime}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {loadingSettings ? (
                                <div style={{ height: '38px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-sm)', animate: 'pulse 1.5s infinite' }}></div>
                            ) : (
                                <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                                    <input 
                                        type="time" 
                                        className="form-input" 
                                        value={backupTime} 
                                        onChange={(e) => setBackupTime(e.target.value)} 
                                        style={{ 
                                            width: '140px', 
                                            padding: 'var(--space-sm) var(--space-md)', 
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid var(--color-border)',
                                            background: 'var(--color-bg-secondary)',
                                            color: 'var(--color-text-primary)',
                                            fontSize: 'var(--font-size-md)'
                                        }}
                                    />
                                    <button className="btn btn-primary btn-sm" onClick={handleSaveTime} disabled={savingTime || loading}>
                                        {savingTime ? 'Saving...' : 'Set Schedule'}
                                    </button>
                                </div>
                            )}
                            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                                Note: Backups will trigger according to the Server Time shown above.
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">Restore from Archive</div>
                        </div>
                        {backups.length === 0 ? (
                            <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                No backup files found yet.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                {backups.map(b => (
                                    <div key={b.name} style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center', 
                                        padding: 'var(--space-md)', 
                                        background: 'var(--color-bg-secondary)', 
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--color-border)'
                                    }}>
                                        <div style={{ overflow: 'hidden' }}>
                                            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden' }}>{b.name}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                                {(b.size / 1024).toFixed(1)} KB — {new Date(b.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                            <button 
                                                className="btn btn-secondary btn-sm" 
                                                onClick={() => handleRestore(b.name)}
                                                disabled={loading}
                                                style={{ fontSize: '11px', padding: '4px 8px' }}
                                            >
                                                REVERT ↺
                                            </button>
                                            <button 
                                                className="btn btn-danger btn-sm" 
                                                onClick={() => handleDeleteBackup(b.name)}
                                                disabled={loading}
                                                style={{ fontSize: '11px', padding: '4px 8px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                                            >
                                                DELETE 🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ========================================= COLUMN 2: DATA & TABLES ========================================= */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
                    
                    <div className="card" style={{ border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        <div className="card-header"><div className="card-title" style={{ color: 'var(--color-danger)' }}>💣 Database Cleanup</div></div>
                        
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <label className="form-label" style={{ fontSize: '11px' }}>Apply cleanup to:</label>
                            <select 
                                className="form-select" 
                                value={selectedDistrict} 
                                onChange={e => setSelectedDistrict(e.target.value)}
                                style={{ fontSize: 'var(--font-size-sm)' }}
                            >
                                <option value="">Global (All Districts)</option>
                                {districts.map(d => (
                                    <option key={d.id} value={d.id}>{d.name} District</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleCleanup('entries_only')} disabled={loading}>
                                Clear Table Entries
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleCleanup('grievances_only')} disabled={loading}>
                                Clear Grievances
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleCleanup('police_stations_only')} disabled={loading}>
                                Clear Police Stations
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleCleanup('courts_only')} disabled={loading}>
                                Clear Courts
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleCleanup('magistrates_only')} disabled={loading}>
                                Clear Jud. Officers
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleCleanup('naib_courts_only')} disabled={loading}>
                                Clear Naib Courts
                            </button>
                            {!selectedDistrict && (
                                <button className="btn btn-secondary btn-sm" onClick={() => handleCleanup('districts_only')} disabled={loading}>
                                    Clear Districts
                                </button>
                            )}
                        </div>
                        
                        <hr style={{ opacity: 0.1, margin: 'var(--space-md) 0' }} />
                        
                        {!selectedDistrict && (
                            <button 
                                className="btn btn-danger" 
                                onClick={() => handleCleanup('full_wipe')} 
                                disabled={loading}
                                style={{ width: '100%' }}
                            >
                                🔥 FULL SYSTEM WIPE 
                            </button>
                        )}
                        {selectedDistrict && (
                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                                Full wipe is only available when "Global" is selected.
                            </div>
                        )}
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">🔢 Data Integrity: Round Off Decimals</div>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)' }}>
                            Scans all <strong>number-type</strong> columns across every data entry and rounds any decimal values (e.g. 3.5 → 4, 2.1 → 2) to the nearest integer. Safe to run multiple times.
                        </p>
                        <button
                            className="btn btn-secondary"
                            style={{ width: '100%' }}
                            disabled={loading}
                            onClick={async () => {
                                if (!window.confirm('Round off all decimal entries in number columns to integers?')) return;
                                setLoading(true);
                                try {
                                    const res = await api.post('/system/round-decimals');
                                    showToast(res.message);
                                } catch (err) {
                                    showToast(err.message || 'Failed to round decimals', 'error');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                        >
                            🔃 Round Off All Decimal Entries
                        </button>
                    </div>

                    <div className="card" style={{ border: '1px solid var(--color-primary-soft)' }}>
                        <div className="card-header">
                            <div className="card-title">🛂 Developer Power: Force Finalize</div>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)' }}>
                            Instantly mark data as "Submitted" to bypass Naib Court requirements for reports.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            <div>
                                <label className="form-label" style={{ fontSize: '11px' }}>District</label>
                                <select 
                                    className="form-select" 
                                    value={finalSelect.districtId} 
                                    onChange={e => {
                                        const id = e.target.value;
                                        setFinalSelect({ ...finalSelect, districtId: id, courtId: '' });
                                        fetchCourts(id);
                                    }}
                                >
                                    <option value="">Global (State Level)</option>
                                    {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>

                            {finalSelect.districtId && (
                            <div>
                                <label className="form-label" style={{ fontSize: '11px' }}>Court (Optional)</label>
                                <select 
                                    className="form-select" 
                                    value={finalSelect.courtId} 
                                    onChange={e => setFinalSelect({ ...finalSelect, courtId: e.target.value })}
                                >
                                    <option value="">All Courts in District</option>
                                    {courts.map(c => <option key={c.id} value={c.id}>Court {c.courtNo} - {c.name}</option>)}
                                </select>
                            </div>
                            )}

                            <div>
                                <label className="form-label" style={{ fontSize: '11px' }}>Specific Date (Leave blank for ALL history)</label>
                                <input 
                                    type="date" 
                                    className="form-input" 
                                    value={finalSelect.date}
                                    onChange={e => setFinalSelect({ ...finalSelect, date: e.target.value })}
                                />
                            </div>

                            <button className="btn btn-primary mt-md" onClick={handleFinalize} disabled={loading}>
                                ✅ Force Mark as Submitted
                            </button>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">Table Reordering</div>
                            <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                <button 
                                    className="btn btn-secondary btn-sm" 
                                    onClick={async () => {
                                        if(!window.confirm('Reset all 17 tables to their default sequential order (1–17)?')) return;
                                        setLoading(true);
                                        try {
                                            const res = await api.post('/system/sync-table-sort-order');
                                            setSuccess(res.message);
                                            const data = await api.get('/data-tables');
                                            setTables(data.tables || []);
                                        } catch(err) { setError(err.message || 'Reset failed'); }
                                        finally { setLoading(false); }
                                    }} 
                                    disabled={loading}
                                >
                                    🔃 Reset
                                </button>
                                <button 
                                    className="btn btn-sm" 
                                    onClick={handleSaveTableSort} 
                                    disabled={savingTables || tables.length === 0}
                                >
                                    {savingTables ? 'Saving...' : '💾 Save Order'}
                                </button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {tables.map((t, index) => (
                                <div key={t.id} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                                    padding: '0.5rem 1rem', background: 'var(--color-bg-secondary)', 
                                    borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ minWidth: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-primary)', color: 'white', borderRadius: '50%', fontWeight: 'bold' }}>
                                            {index + 1}
                                        </div>
                                        <div style={{ fontWeight: 500 }}>{t.name}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        <button 
                                            className="btn btn-sm btn-secondary" 
                                            onClick={() => handleMoveTable(index, 'up')}
                                            disabled={index === 0}
                                        >⬆️</button>
                                        <button 
                                            className="btn btn-sm btn-secondary" 
                                            onClick={() => handleMoveTable(index, 'down')}
                                            disabled={index === tables.length - 1}
                                        >⬇️</button>
                                    </div>
                                </div>
                            ))}
                            {tables.length === 0 && <div className="text-secondary" style={{ padding: '1rem' }}>Loading tables...</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
