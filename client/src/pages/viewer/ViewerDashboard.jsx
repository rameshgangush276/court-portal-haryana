export default function ViewerDashboard() {
    return (
        <div>
            <div className="page-header"><h2>Reports Dashboard</h2></div>
            <div className="card">
                <div className="card-header"><div className="card-title">Welcome</div></div>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                    You have read-only access to reports. Navigate to <a href="/viewer/reports">Reports</a> to view data.
                </p>
            </div>
        </div>
    );
}
