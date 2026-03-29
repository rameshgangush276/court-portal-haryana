import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { useLanguage } from '../../context/LanguageContext';

export default function NaibDashboard() {
    const { user } = useAuth();
    const { t, tTable } = useLanguage();
    const location = useLocation();
    const [stats, setStats] = useState(null);
    const [summary, setSummary] = useState([]);
    const [isLocked, setIsLocked] = useState(false);
    const [loading, setLoading] = useState(true);

    const activeDate = (() => {
        const saved = sessionStorage.getItem('naibSelectedDate');
        const _today = new Date().toISOString().split('T')[0];
        const _yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        return (saved === _today || saved === _yesterday) ? saved : _today;
    })();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (user?.lastSelectedCourtId) {
                    const params = `?courtId=${user.lastSelectedCourtId}&entryDate=${activeDate}`;
                    const d = await api.get(`/data-entries/summary${params}`);
                    setSummary(d.counts || []);
                    setIsLocked(d.isLocked || false);
                }
                
                const g = await api.get('/grievances');
                setStats({
                    grievances: g.grievances?.filter(gr => !['resolved', 'cancelled'].includes(gr.status)).length || 0,
                    selectedCourt: user?.lastSelectedCourt?.name || user?.lastSelectedCourt?.courtNo || user?.lastSelectedCourtName || null,
                });
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user?.lastSelectedCourtId, user?.lastSelectedCourt?.name]);

    const totalTables = summary.length;
    const filledTables = summary.filter(s => s.count > 0).length;
    const nilTables = totalTables - filledTables;

    return (
        <div>
            <div className="page-header"><h2>{t('naibDashboard')}</h2></div>

            {location.state?.successMessage && (
                <div style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--color-success)', padding: 'var(--space-md) var(--space-lg)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-xs)' }}>🎉</div>
                    <strong style={{ fontSize: '1.1rem' }}>{location.state.successMessage}</strong>
                </div>
            )}

            <div style={{ background: 'var(--color-bg-secondary)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-xl)', border: '1px solid var(--color-border)' }}>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>{t('welcome')} <strong>{user?.name}</strong> • {user?.district?.name} {t('district')}</p>
                {user?.lastSelectedCourtId ? (
                    <div style={{ marginTop: 'var(--space-sm)', color: 'var(--color-success)', fontWeight: 600 }}>
                        📍 {t('reportingFor')} {stats?.selectedCourt || t('selectedCourt')}
                        {isLocked && <span style={{ marginLeft: 'var(--space-sm)', background: 'var(--color-success-soft)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', border: '1px solid var(--color-success)' }}>🔒 Locked for {activeDate}</span>}
                    </div>
                ) : (
                    <div style={{ marginTop: 'var(--space-sm)', color: 'var(--color-warning)', fontWeight: 600 }}>⚠️ {t('noCourtSelected')}</div>
                )}
            </div>

            <div className="stat-cards">
                <Link to="/naib/entry" className="stat-card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
                    <div className="stat-value">{totalTables}</div>
                    <div className="stat-label">{t('totalTables')}</div>
                </Link>
                <Link to="/naib/entry" className="stat-card" style={{ borderLeft: '4px solid var(--color-success)' }}>
                    <div className="stat-value">{filledTables}</div>
                    <div className="stat-label">{t('filledTables')}</div>
                </Link>
                <Link to="/naib/entry" className="stat-card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
                    <div className="stat-value">{nilTables}</div>
                    <div className="stat-label">{t('nilTables')}</div>
                </Link>
                <Link to="/naib/grievances" className="stat-card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
                    <div className="stat-value">{stats?.grievances ?? '—'}</div>
                    <div className="stat-label">{t('openTickets')}</div>
                </Link>
            </div>

            <div className="grid grid-2" style={{ alignItems: 'start' }}>
                <div className="card">
                    <div className="card-header"><div className="card-title">Data Entry Summary ({activeDate})</div></div>
                    {loading ? (
                        <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading summary...</div>
                    ) : summary.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            {summary.map(s => (
                                <div key={s.tableId} style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center', 
                                    padding: 'var(--space-md)', 
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--color-border)'
                                }}>
                                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{tTable(s.tableSlug, s.tableName)}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                        <span style={{ fontSize: 'var(--font-size-xs)', color: s.count > 0 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                                            {s.singleRow ? (s.count > 0 ? 'Completed' : 'Pending') : `${s.count} Entries`}
                                        </span>
                                        <span style={{ 
                                            width: 10, height: 10, borderRadius: '50%', 
                                            background: s.count > 0 ? 'var(--color-success)' : 'var(--color-danger)' 
                                        }}></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', marginBottom: 'var(--space-md)' }}>📋</div>
                            <p style={{ color: 'var(--color-text-muted)' }}>Select a court first to see today's reporting status.</p>
                            <Link to="/naib/select-court" className="btn btn-primary mt-lg">Select Court</Link>
                        </div>
                    )}
                </div>

                <div className="card">
                    <div className="card-header"><div className="card-title">{t('quickActions')}</div></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        <Link className="btn btn-primary" to="/naib/entry" style={{ justifyContent: 'start' }}>📝 {t('goToDataEntry')}</Link>
                        <Link className="btn btn-secondary" to="/naib/select-court" style={{ justifyContent: 'start' }}>⚖️ {t('changeSelectedCourt')}</Link>
                        <Link className="btn btn-secondary" to="/naib/reports" style={{ justifyContent: 'start' }}>📊 {t('viewPastReports')}</Link>
                        <Link className="btn btn-secondary" to="/naib/grievances" style={{ justifyContent: 'start' }}>🎫 {t('manageGrievances')}</Link>
                        <Link className="btn btn-secondary" to="/naib/change-password" style={{ justifyContent: 'start' }}>🔑 {t('changePassword')}</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
