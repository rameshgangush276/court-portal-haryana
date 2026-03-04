import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function GrievancesPage() {
    const { user } = useAuth();
    const [grievances, setGrievances] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ subject: '', description: '' });
    const [commentText, setCommentText] = useState('');
    const [activeGrievance, setActiveGrievance] = useState(null);
    const [error, setError] = useState('');

    const canCreate = user.role === 'naib_court';
    const canEscalate = ['district_admin', 'state_admin', 'developer'].includes(user.role);

    const load = () => api.get('/grievances').then(d => setGrievances(d.grievances)).catch(console.error);
    useEffect(() => { load(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/grievances', form);
            setShowForm(false);
            setForm({ subject: '', description: '' });
            load();
        } catch (err) { setError(err.message); }
    };

    const handleComment = async (id) => {
        if (!commentText.trim()) return;
        try {
            await api.post(`/grievances/${id}/comments`, { body: commentText });
            setCommentText('');
            load();
        } catch (err) { alert(err.message); }
    };

    const handleEscalate = async (id) => {
        try {
            await api.post(`/grievances/${id}/escalate`);
            load();
        } catch (err) { alert(err.message); }
    };

    const handleResolve = async (id) => {
        try {
            await api.put(`/grievances/${id}`, { status: 'resolved' });
            load();
        } catch (err) { alert(err.message); }
    };

    const statusBadge = (status) => {
        const map = { open: 'badge-warning', in_progress: 'badge-primary', escalated: 'badge-danger', resolved: 'badge-success' };
        return <span className={`badge ${map[status] || 'badge-secondary'}`}>{status}</span>;
    };

    return (
        <div>
            <div className="page-header">
                <h2>🎫 Grievances</h2>
                {canCreate && <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Raise Ticket</button>}
            </div>

            {showForm && (
                <div className="card mb-xl">
                    <h3 className="card-title mb-lg">Raise New Grievance</h3>
                    {error && <div className="form-error mb-lg">{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Subject</label>
                            <input className="form-input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea className="form-textarea" rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
                        </div>
                        <div className="flex gap-md">
                            <button className="btn btn-primary" type="submit">Submit</button>
                            <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                {grievances.map(g => (
                    <div className="card" key={g.id} style={{ cursor: 'pointer' }} onClick={() => setActiveGrievance(activeGrievance === g.id ? null : g.id)}>
                        <div className="flex-between">
                            <div>
                                <div style={{ fontWeight: 600 }}>{g.subject}</div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                    By {g.raisedByUser?.name} • {g.district?.name || 'State level'} • {new Date(g.createdAt).toLocaleDateString('en-IN')}
                                </div>
                            </div>
                            <div className="flex gap-sm">
                                {statusBadge(g.status)}
                                <span className="badge badge-secondary">{g.currentLevel}</span>
                            </div>
                        </div>

                        {activeGrievance === g.id && (
                            <div className="mt-lg" onClick={e => e.stopPropagation()}>
                                <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>{g.description}</p>

                                {/* Comments */}
                                {g.comments?.length > 0 && (
                                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
                                        {g.comments.map(c => (
                                            <div key={c.id} style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)' }}>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                                                    <strong>{c.user?.name}</strong> ({c.user?.role}) • {new Date(c.createdAt).toLocaleString('en-IN')}
                                                </div>
                                                <div>{c.body}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add comment */}
                                <div className="flex gap-md mb-lg">
                                    <input className="form-input" placeholder="Add a comment..." value={activeGrievance === g.id ? commentText : ''} onChange={e => setCommentText(e.target.value)} />
                                    <button className="btn btn-secondary btn-sm" onClick={() => handleComment(g.id)}>Send</button>
                                </div>

                                {/* Actions */}
                                {g.status !== 'resolved' && canEscalate && (
                                    <div className="flex gap-md">
                                        {g.currentLevel !== 'developer' && <button className="btn btn-secondary btn-sm" onClick={() => handleEscalate(g.id)}>⬆️ Escalate</button>}
                                        <button className="btn btn-primary btn-sm" onClick={() => handleResolve(g.id)}>✅ Resolve</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {grievances.length === 0 && (
                    <div className="empty-state">
                        <div className="icon">🎫</div>
                        <h3>No grievances</h3>
                        <p>{canCreate ? 'You can raise a ticket if you have an issue.' : 'No grievances to review.'}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
