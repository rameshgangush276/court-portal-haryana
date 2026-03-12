import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function StateDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);

    useEffect(() => {
        Promise.all([
            api.get('/districts'),
            api.get('/courts'),
            api.get('/magistrates'),
            api.get('/grievances'),
            api.get('/alerts'),
        ]).then(([d, c, m, g, a]) => {
            setStats({
                districts: d.districts?.length || 0,
                courts: c.courts?.length || 0,
                magistrates: m.magistrates?.length || 0,
                grievances: g.grievances?.filter(gr => gr.status !== 'resolved').length || 0,
                alerts: a.alerts?.filter(al => !al.resolved).length || 0,
            });
        }).catch(console.error);
    }, []);

    return (
        <div>
            <div className="page-header"><h2>State Admin Dashboard</h2></div>
            <div className="stat-cards">
                <div className="stat-card">
                    <div className="stat-icon">🏛️</div>
                    <div className="stat-value">{stats?.districts ?? '—'}</div>
                    <div className="stat-label">Districts</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">⚖️</div>
                    <div className="stat-value">{stats?.courts ?? '—'}</div>
                    <div className="stat-label">Courts</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">👨‍⚖️</div>
                    <div className="stat-value">{stats?.magistrates ?? '—'}</div>
                    <div className="stat-label">Judicial Officers</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🎫</div>
                    <div className="stat-value">{stats?.grievances ?? '—'}</div>
                    <div className="stat-label">Open Grievances</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🔔</div>
                    <div className="stat-value">{stats?.alerts ?? '—'}</div>
                    <div className="stat-label">Pending Alerts</div>
                </div>
            </div>
            <div className="card">
                <div className="card-header"><div className="card-title">Quick Actions</div></div>
                <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
                    <a className="btn btn-primary" href="/state/districts">Manage Districts</a>
                    <a className="btn btn-secondary" href="/state/magistrates">Manage Judicial Officers</a>
                    <a className="btn btn-secondary" href="/state/alerts">View Alerts</a>
                    <a className="btn btn-secondary" href="/state/grievances">Grievances</a>
                    <a className="btn btn-secondary" href="/state/reports">Reports</a>
                </div>
            </div>
        </div>
    );
}
