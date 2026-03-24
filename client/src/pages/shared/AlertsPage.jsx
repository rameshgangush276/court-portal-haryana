import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function AlertsPage() {
    const [alerts, setAlerts] = useState([]);
    const [highlightedAlertIds, setHighlightedAlertIds] = useState([]);

    const load = async () => {
        try {
            const data = await api.get(`/alerts`);
            const loadedAlerts = data.alerts || [];
            
            // Any alert that is currently unresolved is treated as 'new' for this session
            const newIds = loadedAlerts.filter(a => !a.resolved).map(a => a.id);
            setHighlightedAlertIds(newIds);
            setAlerts(loadedAlerts);

            // Immediately mark all fetched 'new' alerts as read behind the scenes
            if (newIds.length > 0) {
                await api.put(`/alerts/mark-all-read`);
                window.dispatchEvent(new Event('alertsRead'));
            }
        } catch (err) {
            console.error(err);
        }
    };
    
    useEffect(() => { load(); }, []);

    const typeBadge = (type) => {
        const map = { duplicate_entry: 'badge-danger', missing_entry: 'badge-warning' };
        return <span className={`badge ${map[type] || 'badge-secondary'}`}>{type.replace(/_/g, ' ')}</span>;
    };

    return (
        <div>
            <div className="page-header">
                <h2>🔔 Alerts</h2>
            </div>

            {alerts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {alerts.map(a => {
                        const isNew = highlightedAlertIds.includes(a.id);
                        return (
                            <div 
                                className="card" 
                                key={a.id} 
                                style={isNew ? { borderLeft: '4px solid var(--color-primary)', background: 'var(--color-bg-hover)' } : {}}
                            >
                                <div className="flex-between">
                                    <div>
                                        {typeBadge(a.alertType)}
                                        {isNew && <span style={{ marginLeft: '8px', fontSize: '10px', color: 'var(--color-primary)', fontWeight: 'bold' }}>NEW</span>}
                                        <div style={{ marginTop: 'var(--space-sm)', fontWeight: 500 }}>{a.message}</div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                            {new Date(a.alertDate).toLocaleDateString('en-IN')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="empty-state">
                    <div className="icon">🔔</div>
                    <h3>No alerts</h3>
                    <p>All clear! No alerts at the moment.</p>
                </div>
            )}
        </div>
    );
}
