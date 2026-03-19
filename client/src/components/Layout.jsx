import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/api';

export default function Layout() {
    const { user, logout } = useAuth();
    const { lang, toggleLanguage, t } = useLanguage();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const navConfig = {
        developer: {
            label: t('roleDeveloper'),
            sections: [
                { label: t('overview'), items: [{ to: '/dev', icon: '📊', text: t('dashboard') }] },
                {
                    label: t('management'), items: [
                        { to: '/dev/districts', icon: '🏛️', text: t('districts') },
                        { to: '/dev/courts', icon: '⚖️', text: t('courts') },
                        { to: '/dev/magistrates', icon: '👨‍⚖️', text: t('judicialOfficers') },
                        { to: '/dev/naib-courts', icon: '👤', text: t('naibCourts') },
                        { to: '/dev/data-tables', icon: '📋', text: t('dataTables') },
                    ],
                },
                {
                    label: t('review'), items: [
                        { to: '/dev/alerts', icon: '🔔', text: t('alerts') },
                        { to: '/dev/grievances', icon: '🎫', text: t('grievances') },
                        { to: '/dev/reports', icon: '📈', text: t('reports') },
                    ],
                },
            ],
        },
        state_admin: {
            label: t('roleStateAdmin'),
            sections: [
                { label: t('overview'), items: [{ to: '/state', icon: '📊', text: t('dashboard') }] },
                {
                    label: t('management'), items: [
                        { to: '/state/districts', icon: '🏛️', text: t('districts') },
                        { to: '/state/courts', icon: '⚖️', text: t('courts') },
                        { to: '/state/magistrates', icon: '👨‍⚖️', text: t('judicialOfficers') },
                        { to: '/state/naib-courts', icon: '👤', text: t('naibCourts') },
                    ],
                },
                {
                    label: t('review'), items: [
                        { to: '/state/alerts', icon: '🔔', text: t('alerts') },
                        { to: '/state/grievances', icon: '🎫', text: t('grievances') },
                        { to: '/state/reports', icon: '📈', text: t('reports') },
                    ],
                },
            ],
        },
        district_admin: {
            label: t('roleDistrictAdmin'),
            sections: [
                { label: t('overview'), items: [{ to: '/district', icon: '📊', text: t('dashboard') }] },
                {
                    label: t('management'), items: [
                        { to: '/district/courts', icon: '⚖️', text: t('courts') },
                        { to: '/district/magistrates', icon: '👨‍⚖️', text: t('judicialOfficers') },
                        { to: '/district/naib-courts', icon: '👤', text: t('naibCourts') },
                    ],
                },
                {
                    label: t('data'), items: [
                        { to: '/district/data-vetting', icon: '✅', text: t('dataVetting') },
                        { to: '/district/alerts', icon: '🔔', text: t('alerts') },
                    ],
                },
                {
                    label: t('review'), items: [
                        { to: '/district/grievances', icon: '🎫', text: t('grievances') },
                        { to: '/district/reports', icon: '📈', text: t('reports') },
                    ],
                },
            ],
        },
        naib_court: {
            label: t('roleNaibCourt'),
            sections: [
                { label: t('overview'), items: [{ to: '/naib/dashboard', icon: '📊', text: t('dashboard') }] },
                {
                    label: t('dataEntry'), items: [
                        { to: '/naib/select-court', icon: '⚖️', text: t('selectCourt') },
                        { to: '/naib/entry', icon: '📝', text: t('dataEntry') },
                    ],
                },
                {
                    label: t('other'), items: [
                        { to: '/naib/alerts', icon: '🔔', text: t('alerts') },
                        { to: '/naib/grievances', icon: '🎫', text: t('grievances') },
                        { to: '/naib/reports', icon: '📈', text: t('reports') },
                    ],
                },
            ],
        },
        viewer_district: {
            label: t('roleDistrictViewer'),
            sections: [
                {
                    label: t('reports'), items: [
                        { to: '/viewer', icon: '📊', text: t('dashboard') },
                        { to: '/viewer/reports', icon: '📈', text: t('reports') },
                    ]
                },
            ],
        },
        viewer_state: {
            label: t('roleStateViewer'),
            sections: [
                {
                    label: t('reports'), items: [
                        { to: '/viewer', icon: '📊', text: t('dashboard') },
                        { to: '/viewer/reports', icon: '📈', text: t('reports') },
                    ]
                },
            ],
        },
    };

    const config = navConfig[user?.role] || navConfig.viewer_district;

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const allItems = config.sections.flatMap(s => s.items);
    const bottomItems = allItems.slice(0, 4);

    return (
        <div className="app-layout">
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
                    <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{user?.name}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                            {user?.district?.name || t('stateLevel')}
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button className="btn btn-secondary btn-sm w-full" onClick={handleLogout}>
                            🚪 {t('logout')}
                        </button>
                    </div>
                </div>
            </aside>

            <div className="main-content">
                <header className="top-header">
                    <div className="flex items-center gap-md">
                        <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            ☰
                        </button>
                        <h1 className="header-title">{t('appTitle')}</h1>
                    </div>
                    
                    <div className="flex items-center gap-xl">
                        <div className="header-date">
                            {new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        
                        <button className="lang-toggle" onClick={toggleLanguage} title={lang === 'en' ? 'हिन्दी में बदलें' : 'Switch to English'}>
                            <span className={`lang-label ${lang === 'en' ? 'active' : ''}`}>EN</span>
                            <div className="toggle-track">
                                <div className={`toggle-thumb ${lang === 'hi' ? 'right' : ''}`}></div>
                            </div>
                            <span className={`lang-label ${lang === 'hi' ? 'active' : ''}`}>हि</span>
                        </button>
                    </div>
                </header>

                <main className="page-content">
                    <Outlet />
                </main>
            </div>

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
                    <button className="bottom-nav-item" onClick={handleLogout}>
                        <span className="icon">🚪</span>
                        <span>{t('logout')}</span>
                    </button>
                </div>
            </nav>

            {sidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}

