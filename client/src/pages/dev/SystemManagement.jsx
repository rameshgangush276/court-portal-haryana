import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function SystemManagement() {
    const [backups, setBackups] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const [backupTime, setBackupTime] = useState('');
    const [serverTime, setServerTime] = useState('');
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [savingTime, setSavingTime] = useState(false);

    useEffect(() => {
        fetchSettings();
        fetchBackups();
        fetchDistricts();
        
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

    const handleSaveTime = async () => {
        try {
            setSavingTime(true);
            await api.post('/system/settings/backup-time', { value: backupTime });
            setSuccess(`Daily backup successfully scheduled for ${backupTime}.`);
            setError('');
            fetchSettings(); // Refresh server time view
        } catch (err) {
            setError(err.message || 'Failed to save schedule');
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
        setError('');
        setSuccess('');
        try {
            const res = await api.post('/system/backup');
            setSuccess(res.message || 'Backup created successfully!');
            fetchBackups();
        } catch (err) { 
            setError(`Error: ${err.message || 'Failed to create backup.'}`); 
        }
        finally { setLoading(false); }
    };

    const handleRestore = async (name) => {
        if (!window.confirm(`⚠️ DANGER: Restoration will overwrite all current data. Are you sure you want to restore from: ${name}?`)) return;
        
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await api.post('/system/restore', { filename: name });
            setSuccess(`System successfully restored to backup: ${name}`);
        } catch (err) { setError('Restore failed. Check if psql is installed.'); }
        finally { setLoading(false); }
    };

    const handleCleanup = async (scope) => {
        const districtName = selectedDistrict ? districts.find(d => d.id === parseInt(selectedDistrict))?.name : 'ALL districts';
        const msg = scope === 'full_wipe' 
            ? '⚠️ DANGER: This will wipe ALL data (Courts, Entries, Users). Reset the system to zero? (Only the developer account will remain)' 
            : `Are you sure you want to clear "${scope.replace('_', ' ')}" for ${districtName}?`;
            
        if (!window.confirm(msg)) return;
        
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const d = await api.post('/system/cleanup', { scope, districtId: selectedDistrict });
            setSuccess(d.message);
        } catch (err) { setError('Cleanup failed.'); }
        finally { setLoading(false); }
    };

    const handleDeleteBackup = async (name) => {
        if (!window.confirm(`⚠️ PERMANENT DELETE: Are you sure you want to delete ${name}? This cannot be undone.`)) return;
        
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await api.delete(`/system/backups/${name}`);
            setSuccess(`Backup ${name} deleted successfully.`);
            fetchBackups();
        } catch (err) { setError('Failed to delete backup.'); }
        finally { setLoading(false); }
    };

    return (
        <div>
            <div className="page-header">
                <h2>📊 Data Backup/Cleanup</h2>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Database maintenance and recovery tools</div>
            </div>

            {success && <div className="alert alert-success mt-lg">{success}</div>}
            {error && <div className="alert alert-danger mt-lg">{error}</div>}

            <div className="grid grid-2 mt-xl" style={{ alignItems: 'start' }}>
                {/* 1. BACKUP & CLEANUP */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
                    <div className="card">
                        <div className="card-header"><div className="card-title">Backups</div></div>
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
                </div>

                {/* 2. RESTORE FROM BACKUP */}
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
        </div>
    );
}
