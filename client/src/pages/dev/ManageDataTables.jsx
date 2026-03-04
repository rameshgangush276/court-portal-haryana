import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function ManageDataTables() {
    const [tables, setTables] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', slug: '', description: '', singleRow: false });
    const [error, setError] = useState('');

    const load = () => api.get('/data-tables').then(d => setTables(d.tables)).catch(console.error);
    useEffect(() => { load(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await api.post('/data-tables', form);
            setShowForm(false);
            setForm({ name: '', slug: '', description: '', singleRow: false });
            load();
        } catch (err) { setError(err.message); }
    };

    return (
        <div>
            <div className="page-header">
                <h2>📋 Data Entry Tables</h2>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Table</button>
            </div>

            {showForm && (
                <div className="card mb-xl">
                    <h3 className="card-title mb-lg">Add New Table</h3>
                    {error && <div className="form-error mb-lg">{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Name</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Slug</label>
                                <input className="form-input" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="url-safe-name" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <input className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-lg)', cursor: 'pointer' }}>
                            <input type="checkbox" checked={form.singleRow} onChange={e => setForm({ ...form, singleRow: e.target.checked })} />
                            <span className="form-label" style={{ marginBottom: 0 }}>Single row per court per day</span>
                        </label>
                        <div className="flex gap-md">
                            <button className="btn btn-primary" type="submit">Create</button>
                            <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                {tables.map(t => (
                    <div className="card" key={t.id}>
                        <div className="flex-between mb-lg">
                            <div>
                                <div style={{ fontWeight: 600 }}>{t.name}</div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                    Slug: {t.slug} {t.singleRow && <span className="badge badge-warning ml-sm">Single Row</span>}
                                </div>
                            </div>
                        </div>
                        {t.description && <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)' }}>{t.description}</p>}

                        <div className="data-table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Column</th><th>Slug</th><th>Type</th><th>Required</th><th>Options</th></tr>
                                </thead>
                                <tbody>
                                    {t.columns?.map(col => (
                                        <tr key={col.id}>
                                            <td>{col.name}</td>
                                            <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}>{col.slug}</td>
                                            <td><span className="badge badge-secondary">{col.dataType}</span></td>
                                            <td>{col.isRequired ? '✅' : '—'}</td>
                                            <td>{col.enumOptions ? (col.enumOptions).join(', ') : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
