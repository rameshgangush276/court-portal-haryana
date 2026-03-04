import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function AlertsPage() {
    const [alerts, setAlerts] = useState([]);
    const [filter, setFilter] = useState('pending');

    const load = () => {
        const params = filter === 'pending' ? '?resolved=false' : filter === 'resolved' ? '?resolved=true' : '';
        api.get(`/alerts${params}`).then(d => setAlerts(d.alerts)).catch(console.error);
    };
    useEffect(() => { load(); }, [filter]);

    const handleResolve = async (id) => {
        await api.put(`/alerts/${id}/resolve`);
        load();
    };

    const typeBadge = (type) => {
        const map = { duplicate_entry: 'badge-danger', missing_entry: 'badge-warning' };
        return <span className={`badge ${map[type] || 'badge-secondary'}`}>{type.replace(/_/g, ' ')}</span>;
    };

    return (
        <div>
            <div className="page-header">
                <h2>🔔 Alerts</h2>
                <div className="flex gap-sm">
                    <button className={`btn btn-sm ${filter === 'pending' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('pending')}>Pending</button>
                    <button className={`btn btn-sm ${filter === 'resolved' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('resolved')}>Resolved</button>
                    <button className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('all')}>All</button>
                </div>
            </div>

            {alerts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {alerts.map(a => (
                        <div className="card" key={a.id}>
                            <div className="flex-between">
                                <div>
                                    {typeBadge(a.alertType)}
                                    <div style={{ marginTop: 'var(--space-sm)', fontWeight: 500 }}>{a.message}</div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                        {new Date(a.alertDate).toLocaleDateString('en-IN')}
                                    </div>
                                </div>
                                {!a.resolved && (
                                    <button className="btn btn-primary btn-sm" onClick={() => handleResolve(a.id)}>✅ Resolve</button>
                                )}
                                {a.resolved && <span className="badge badge-success">Resolved</span>}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <div className="icon">🔔</div>
                    <h3>No alerts</h3>
                    <p>All clear! No {filter === 'pending' ? 'pending ' : ''}alerts at the moment.</p>
                </div>
            )}
        </div>
    );
}
