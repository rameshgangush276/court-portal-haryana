import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function NaibDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [summary, setSummary] = useState([]);
    const [loading, setLoading] = useState(true);

    const todayDate = new Date().toISOString().split('T')[0];

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch stats and summary if court is selected
                if (user?.lastSelectedCourtId) {
                    const params = `?courtId=${user.lastSelectedCourtId}&entryDate=${todayDate}`;
                    const d = await api.get(`/data-entries/summary${params}`);
                    setSummary(d.counts || []);
                }
                
                const g = await api.get('/grievances');
                setStats({
                    grievances: g.grievances?.filter(gr => !['resolved', 'cancelled'].includes(gr.status)).length || 0,
                    selectedCourt: user?.lastSelectedCourt?.name || user?.lastSelectedCourtName || null,
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
            <div className="page-header"><h2>Naib Court Dashboard</h2></div>
            <div style={{ background: 'var(--color-bg-secondary)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-xl)', border: '1px solid var(--color-border)' }}>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>Welcome, <strong>{user?.name}</strong> • {user?.district?.name} District</p>
                {user?.lastSelectedCourtId ? (
                    <div style={{ marginTop: 'var(--space-sm)', color: 'var(--color-success)', fontWeight: 600 }}>📍 Reporting for: {stats?.selectedCourt || 'Selected Court'}</div>
                ) : (
                    <div style={{ marginTop: 'var(--space-sm)', color: 'var(--color-warning)', fontWeight: 600 }}>⚠️ No court selected. Please select a court to start reporting.</div>
                )}
            </div>

            <div className="stat-cards">
                <Link to="/naib/entry" className="stat-card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
                    <div className="stat-value">{totalTables}</div>
                    <div className="stat-label">Total Tables</div>
                </Link>
                <Link to="/naib/entry" className="stat-card" style={{ borderLeft: '4px solid var(--color-success)' }}>
                    <div className="stat-value">{filledTables}</div>
                    <div className="stat-label">Filled Tables</div>
                </Link>
                <Link to="/naib/entry" className="stat-card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
                    <div className="stat-value">{nilTables}</div>
                    <div className="stat-label">Nil Entry Tables</div>
                </Link>
                <Link to="/naib/grievances" className="stat-card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
                    <div className="stat-value">{stats?.grievances ?? '—'}</div>
                    <div className="stat-label">Open Grievances</div>
                </Link>
            </div>

            <div className="grid grid-2" style={{ alignItems: 'start' }}>
                <div className="card">
                    <div className="card-header"><div className="card-title">Today's Data Entry Summary ({todayDate})</div></div>
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
                                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{s.tableName}</span>
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
                    <div className="card-header"><div className="card-title">Quick Actions</div></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        <Link className="btn btn-primary" to="/naib/entry" style={{ justifyContent: 'start' }}>📝 Go to Data Entry</Link>
                        <Link className="btn btn-secondary" to="/naib/select-court" style={{ justifyContent: 'start' }}>⚖️ Change Selected Court</Link>
                        <Link className="btn btn-secondary" to="/naib/reports" style={{ justifyContent: 'start' }}>📊 View Past Reports</Link>
                        <Link className="btn btn-secondary" to="/naib/grievances" style={{ justifyContent: 'start' }}>🎫 Manage Grievances</Link>
                        <Link className="btn btn-secondary" to="/naib/change-password" style={{ justifyContent: 'start' }}>🔑 Change Password</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
