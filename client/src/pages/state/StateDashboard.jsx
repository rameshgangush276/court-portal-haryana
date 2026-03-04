import { useAuth } from '../../context/AuthContext';

export default function StateDashboard() {
    const { user } = useAuth();
    return (
        <div>
            <div className="page-header"><h2>State Admin Dashboard</h2></div>
            <div className="stat-cards">
                <div className="stat-card">
                    <div className="stat-icon">🏛️</div>
                    <div className="stat-value">—</div>
                    <div className="stat-label">Districts</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">⚖️</div>
                    <div className="stat-value">—</div>
                    <div className="stat-label">Courts</div>
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
                    <a className="btn btn-primary" href="/state/magistrates">Manage Magistrates</a>
                    <a className="btn btn-secondary" href="/state/alerts">View Alerts</a>
                    <a className="btn btn-secondary" href="/state/reports">Reports</a>
                </div>
            </div>
        </div>
    );
}
