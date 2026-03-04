import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navConfig = {
    developer: {
        label: 'Developer',
        sections: [
            { label: 'Overview', items: [{ to: '/dev', icon: '📊', text: 'Dashboard' }] },
            {
                label: 'Management', items: [
                    { to: '/dev/districts', icon: '🏛️', text: 'Districts' },
                    { to: '/dev/courts', icon: '⚖️', text: 'Courts' },
                    { to: '/dev/magistrates', icon: '👨‍⚖️', text: 'Magistrates' },
                    { to: '/dev/naib-courts', icon: '👤', text: 'Naib Courts' },
                    { to: '/dev/data-tables', icon: '📋', text: 'Data Tables' },
                ],
            },
            {
                label: 'Review', items: [
                    { to: '/dev/grievances', icon: '🎫', text: 'Grievances' },
                    { to: '/dev/reports', icon: '📈', text: 'Reports' },
                ],
            },
        ],
    },
    state_admin: {
        label: 'State Admin',
        sections: [
            { label: 'Overview', items: [{ to: '/state', icon: '📊', text: 'Dashboard' }] },
            {
                label: 'Management', items: [
                    { to: '/state/districts', icon: '🏛️', text: 'Districts' },
                    { to: '/state/courts', icon: '⚖️', text: 'Courts' },
                    { to: '/state/magistrates', icon: '👨‍⚖️', text: 'Magistrates' },
                    { to: '/state/naib-courts', icon: '👤', text: 'Naib Courts' },
                ],
            },
            {
                label: 'Review', items: [
                    { to: '/state/alerts', icon: '🔔', text: 'Alerts' },
                    { to: '/state/grievances', icon: '🎫', text: 'Grievances' },
                    { to: '/state/reports', icon: '📈', text: 'Reports' },
                ],
            },
        ],
    },
    district_admin: {
        label: 'District Admin',
        sections: [
            { label: 'Overview', items: [{ to: '/district', icon: '📊', text: 'Dashboard' }] },
            {
                label: 'Management', items: [
                    { to: '/district/courts', icon: '⚖️', text: 'Courts' },
                    { to: '/district/magistrates', icon: '👨‍⚖️', text: 'Magistrates' },
                    { to: '/district/naib-courts', icon: '👤', text: 'Naib Courts' },
                ],
            },
            {
                label: 'Data', items: [
                    { to: '/district/data-vetting', icon: '✅', text: 'Data Vetting' },
                    { to: '/district/alerts', icon: '🔔', text: 'Alerts' },
                ],
            },
            {
                label: 'Review', items: [
                    { to: '/district/grievances', icon: '🎫', text: 'Grievances' },
                    { to: '/district/reports', icon: '📈', text: 'Reports' },
                ],
            },
        ],
    },
    naib_court: {
        label: 'Naib Court',
        sections: [
            { label: 'Overview', items: [{ to: '/naib', icon: '📊', text: 'Dashboard' }] },
            {
                label: 'Data Entry', items: [
                    { to: '/naib/select-court', icon: '⚖️', text: 'Select Court' },
                    { to: '/naib/entry', icon: '📝', text: 'Data Entry' },
                    { to: '/naib/history', icon: '📜', text: 'History' },
                ],
            },
            {
                label: 'Other', items: [
                    { to: '/naib/grievances', icon: '🎫', text: 'Grievances' },
                    { to: '/naib/reports', icon: '📈', text: 'Reports' },
                ],
            },
        ],
    },
    viewer_district: {
        label: 'District Viewer',
        sections: [
            {
                label: 'Reports', items: [
                    { to: '/viewer', icon: '📊', text: 'Dashboard' },
                    { to: '/viewer/reports', icon: '📈', text: 'Reports' },
                ]
            },
        ],
    },
    viewer_state: {
        label: 'State Viewer',
        sections: [
            {
                label: 'Reports', items: [
                    { to: '/viewer', icon: '📊', text: 'Dashboard' },
                    { to: '/viewer/reports', icon: '📈', text: 'Reports' },
                ]
            },
        ],
    },
};

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const config = navConfig[user?.role] || navConfig.viewer_district;

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // Mobile bottom nav: first 5 items across all sections
    const allItems = config.sections.flatMap(s => s.items);
    const bottomItems = allItems.slice(0, 5);

    return (
        <div className="app-layout">
            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-logo">
                    <h2>Court Portal</h2>
                    <span className="role-badge">{config.label}</span>
                </div>

                <nav className="sidebar-nav">
                    {config.sections.map((section) => (
                        <div className="nav-section" key={section.label}>
                            <div className="nav-section-label">{section.label}</div>
                            {section.items.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.to === `/${user?.role === 'developer' ? 'dev' : user?.role?.replace('_', '-')}`}
                                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <span className="icon">{item.icon}</span>
                                    {item.text}
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{user?.name}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                            {user?.district?.name || 'State Level'}
                        </div>
                    </div>
                    <button className="btn btn-secondary btn-sm w-full" onClick={handleLogout}>
                        🚪 Logout
                    </button>
                </div>
            </aside>

            {/* Main */}
            <div className="main-content">
                <header className="top-header">
                    <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        ☰
                    </button>
                    <h1>Haryana Court Data Portal</h1>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                </header>

                <main className="page-content">
                    <Outlet />
                </main>
            </div>

            {/* Bottom Nav (Mobile) */}
            <nav className="bottom-nav">
                <div className="bottom-nav-items">
                    {bottomItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="icon">{item.icon}</span>
                            <span>{item.text}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>

            {/* Overlay for mobile sidebar */}
            {sidebarOpen && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }}
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}
