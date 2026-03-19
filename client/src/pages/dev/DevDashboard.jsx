import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
                grievances: g.grievances?.filter(gr => !['resolved', 'cancelled'].includes(gr.status)).length || 0,
            });
        }).catch(console.error);
    }, []);

    return (
        <div>
            <div className="page-header">
                <h2>Developer Dashboard</h2>
            </div>

            <div className="stat-cards">
                <Link to="/dev/districts" className="stat-card">
                    <div className="stat-icon">🏛️</div>
                    <div className="stat-value">{stats?.districts ?? '—'}</div>
                    <div className="stat-label">Districts</div>
                </Link>
                <Link to="/dev/data-tables" className="stat-card">
                    <div className="stat-icon">📋</div>
                    <div className="stat-value">{stats?.tables ?? '—'}</div>
                    <div className="stat-label">Data Tables</div>
                </Link>
                <Link to="/dev/grievances" className="stat-card">
                    <div className="stat-icon">🎫</div>
                    <div className="stat-value">{stats?.grievances ?? '—'}</div>
                    <div className="stat-label">Open Grievances</div>
                </Link>
            </div>

            <div className="card">
                <div className="card-header">
                    <div className="card-title">Quick Actions</div>
                </div>
                <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
                    <Link className="btn btn-secondary" to="/dev/courts">Manage Courts</Link>
                    <Link className="btn btn-secondary" to="/dev/magistrates">Manage Judicial Officers</Link>
                    <Link className="btn btn-secondary" to="/dev/naib-courts">Manage Naib Courts</Link>
                    <Link className="btn btn-secondary" to="/dev/reports">View Reports</Link>
                    <Link className="btn btn-primary" to="/dev/system">📊 Data backup/cleanup</Link>
                    <Link className="btn btn-danger" to="/dev/reset-passwords">Reset Passwords</Link>
                    <Link className="btn btn-secondary" to="/dev/change-password">Change Password</Link>
                </div>
            </div>
        </div>
    );
}
