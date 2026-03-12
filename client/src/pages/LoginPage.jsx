import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const roleRoutes = {
    developer: '/dev',
    state_admin: '/state',
    district_admin: '/district',
    naib_court: '/naib',
    viewer_district: '/viewer',
    viewer_state: '/viewer',
};

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const user = await login(username, password);
            navigate(roleRoutes[user.role] || '/');
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleQuickLogin = async (u, p) => {
        setUsername(u);
        setPassword(p);
        setError('');
        setLoading(true);
        try {
            const user = await login(u, p);
            navigate(roleRoutes[user.role] || '/');
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const quickUsers = [
        { label: '👨‍💻 Dev', u: 'developer', p: 'admin123' },
        { label: '🏛️ State', u: 'state_admin', p: 'state123' },
        { label: '⚖️ Admin', u: 'admin_amb', p: 'district123' },
        { label: '👤 Naib', u: 'naib_rwr_01', p: 'Welcome@123' },
        { label: '👁️ Viewer', u: 'viewer_amb', p: 'viewer123' },
    ];

    return (
        <div className="login-page">
            <div className="login-card">
                <h1>Court Portal</h1>
                <p className="subtitle">Haryana District Courts Data Entry System</p>

                {/* Quick Login for Dev - Local Only */}
                {import.meta.env.DEV && (
                    <div style={{ marginBottom: 'var(--space-xl)', padding: 'var(--space-md)', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)' }}>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 'var(--space-sm)', fontWeight: 700 }}>Quick Login (Local Dev Only)</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-xs)' }}>
                            {quickUsers.map(qu => (
                                <button type="button" key={qu.u} onClick={() => handleQuickLogin(qu.u, qu.p)} style={{ fontSize: '10px', padding: '6px 2px', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', color: 'var(--color-text)' }}>
                                    {qu.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {error && (
                    <div style={{
                        background: 'var(--color-danger-soft)',
                        color: 'var(--color-danger)',
                        padding: 'var(--space-md) var(--space-lg)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-lg)',
                        fontSize: 'var(--font-size-sm)',
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="username">Username</label>
                        <input
                            id="username"
                            className="form-input"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            required
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password">Password</label>
                        <input
                            id="password"
                            className="form-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    <button className="btn btn-primary w-full" type="submit" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}
