import { useAuth } from '../../context/AuthContext';

export default function DistrictDashboard() {
    const { user } = useAuth();
    return (
        <div>
            <div className="page-header"><h2>District Admin Dashboard</h2></div>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xl)' }}>
                District: <strong>{user?.district?.name || '—'}</strong>
            </p>
            <div className="stat-cards">
                <div className="stat-card">
                    <div className="stat-icon">⚖️</div>
                    <div className="stat-value">—</div>
                    <div className="stat-label">Courts</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">👤</div>
                    <div className="stat-value">—</div>
                    <div className="stat-label">Naib Courts</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🔔</div>
                    <div className="stat-value">—</div>
                    <div className="stat-label">Pending Alerts</div>
                </div>
            </div>
            <div className="card">
                <div className="card-header"><div className="card-title">Quick Actions</div></div>
                <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
                    <a className="btn btn-primary" href="/district/data-vetting">Data Vetting</a>
                    <a className="btn btn-secondary" href="/district/alerts">View Alerts</a>
                    <a className="btn btn-secondary" href="/district/reports">Reports</a>
                </div>
            </div>
        </div>
    );
}
