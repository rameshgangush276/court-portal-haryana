import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function DevDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);

    useEffect(() => {
        Promise.all([
            api.get('/districts'),
            api.get('/data-tables'),
            api.get('/grievances'),
        ]).then(([d, t, g]) => {
            setStats({
                districts: d.districts?.length || 0,
                tables: t.tables?.length || 0,
                grievances: g.grievances?.filter(gr => gr.status !== 'resolved').length || 0,
            });
        }).catch(console.error);
    }, []);

    return (
        <div>
            <div className="page-header">
                <h2>Developer Dashboard</h2>
            </div>

            <div className="stat-cards">
                <div className="stat-card">
                    <div className="stat-icon">🏛️</div>
                    <div className="stat-value">{stats?.districts ?? '—'}</div>
                    <div className="stat-label">Districts</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📋</div>
                    <div className="stat-value">{stats?.tables ?? '—'}</div>
                    <div className="stat-label">Data Tables</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🎫</div>
                    <div className="stat-value">{stats?.grievances ?? '—'}</div>
                    <div className="stat-label">Open Grievances</div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <div className="card-title">Quick Actions</div>
                </div>
                <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
                    <a className="btn btn-primary" href="/dev/districts">Manage Districts</a>
                    <a className="btn btn-secondary" href="/dev/data-tables">Manage Tables</a>
                    <a className="btn btn-secondary" href="/dev/grievances">View Grievances</a>
                    <a className="btn btn-secondary" href="/dev/reports">View Reports</a>
                </div>
            </div>
        </div>
    );
}
