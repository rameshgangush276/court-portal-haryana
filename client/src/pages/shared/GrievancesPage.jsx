import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../utils/api';

export default function GrievancesPage() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [grievances, setGrievances] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ subject: '', description: '' });
    const [commentText, setCommentText] = useState('');
    const [activeGrievance, setActiveGrievance] = useState(null);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('open');

    const [files, setFiles] = useState([]);

    const [commentFiles, setCommentFiles] = useState([]);

    const canCreate = ['naib_court', 'district_admin', 'state_admin'].includes(user.role);
    const isOwner = (g) => g.raisedBy === user.id;

    const load = () => api.get('/grievances').then(d => setGrievances(d.grievances)).catch(console.error);
    useEffect(() => { load(); }, []);

    const handleFileChange = (e, isComment = false) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length === 0) return;

        const validFiles = selectedFiles.filter(file => {
            const isTypeValid = file.type.startsWith('image/') || file.type === 'application/pdf';
            const isSizeValid = file.size <= 10 * 1024 * 1024; // 10MB
            if (!isTypeValid) alert(`Invalid file type: ${file.name}. Only images and PDFs are allowed.`);
            if (!isSizeValid) alert(`File too large: ${file.name}. Maximum size is 10MB.`);
            return isTypeValid && isSizeValid;
        });

        const currentFiles = isComment ? commentFiles : files;
        const newTotalFiles = [...currentFiles, ...validFiles];

        if (newTotalFiles.length > 5) {
            alert('You can only upload up to 5 files at once.');
            if (isComment) setCommentFiles(newTotalFiles.slice(0, 5));
            else setFiles(newTotalFiles.slice(0, 5));
        } else {
            if (isComment) setCommentFiles(newTotalFiles);
            else setFiles(newTotalFiles);
        }

        // Reset the input value so the exact same file can be selected again and so cancel doesn't break state
        e.target.value = '';
    };

    const removeFile = (indexToRemove, isComment = false) => {
        if (isComment) setCommentFiles(commentFiles.filter((_, i) => i !== indexToRemove));
        else setFiles(files.filter((_, i) => i !== indexToRemove));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('subject', form.subject);
            formData.append('description', form.description);
            files.forEach(file => {
                formData.append('files', file);
            });

            // Use fetch or custom api method for multipart/form-data
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL || '/api/v1'}/grievances`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create grievance');
            }

            setShowForm(false);
            setForm({ subject: '', description: '' });
            setFiles([]);
            load();
        } catch (err) { setError(err.message); }
    };

    const handleComment = async (id) => {
        if (!commentText.trim() && commentFiles.length === 0) return;
        try {
            const formData = new FormData();
            if (commentText.trim()) formData.append('body', commentText);
            else formData.append('body', 'Attached file(s)'); // Fallback if only sending file
            
            commentFiles.forEach(file => {
                formData.append('files', file);
            });

            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL || '/api/v1'}/grievances/${id}/comments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to add comment');
            }

            setCommentText('');
            setCommentFiles([]);
            load();
        } catch (err) { alert(err.message); }
    };

    const handleEscalate = async (id) => {
        try {
            await api.post(`/grievances/${id}/escalate`);
            load();
        } catch (err) { alert(err.message); }
    };

    const handleDeEscalate = async (id) => {
        try {
            await api.post(`/grievances/${id}/de-escalate`);
            load();
        } catch (err) { alert(err.message); }
    };

    const handleResolve = async (id) => {
        try {
            await api.put(`/grievances/${id}`, { status: 'resolved' });
            load();
        } catch (err) { alert(err.message); }
    };

    const handleCancel = async (id) => {
        try {
            await api.post(`/grievances/${id}/cancel`);
            load();
        } catch (err) { alert(err.message); }
    };

    const handleReopen = async (id) => {
        try {
            await api.post(`/grievances/${id}/reopen`);
            load();
        } catch (err) { alert(err.message); }
    };

    const statusBadge = (status) => {
        const map = { 
            open: 'badge-warning', 
            in_progress: 'badge-primary', 
            escalated: 'badge-danger', 
            resolved: 'badge-success',
            cancelled: 'badge-secondary'
        };
        return <span className={`badge ${map[status] || 'badge-secondary'}`}>{status.replace('_', ' ')}</span>;
    };

    const filteredGrievances = grievances.filter(g => {
        const isClosed = ['resolved', 'cancelled'].includes(g.status);
        return activeTab === 'closed' ? isClosed : !isClosed;
    });

    return (
        <div>
            <div className="page-header">
                <h2>{t('ticketMechanism')}</h2>
                {canCreate && <button className="btn btn-primary" onClick={() => setShowForm(true)}>{t('raiseTicketShort')}</button>}
            </div>

            {showForm && (
                <div className="card mb-xl">
                    <h3 className="card-title mb-lg">{t('raiseNewGrievance')}</h3>
                    {error && <div className="form-error mb-lg">{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">{t('subject') || 'Subject'}</label>
                            <input className="form-input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('description') || 'Description'}</label>
                            <textarea className="form-textarea" rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Attachments (Images/PDFs only, Max 5 files, 10MB each)</label>
                            <input 
                                type="file" 
                                className="form-input" 
                                multiple 
                                accept="image/*,application/pdf"
                                onChange={(e) => handleFileChange(e, false)}
                            />
                            {files.length > 0 && (
                                <ul style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-secondary)', padding: '0', listStyle: 'none' }}>
                                    {files.map((f, i) => (
                                        <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <span>{f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
                                            <button 
                                                type="button" 
                                                onClick={() => removeFile(i, false)}
                                                style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '0 4px', fontSize: '14px', fontWeight: 'bold' }}
                                            >
                                                &times;
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="flex gap-md">
                            <button className="btn btn-primary" type="submit">{t('submit')}</button>
                            <button className="btn btn-secondary" type="button" onClick={() => { setShowForm(false); setFiles([]); }}>{t('cancel')}</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="tabs mb-lg">
                <button 
                  className={`tab-btn ${activeTab === 'open' ? 'active' : ''}`} 
                  onClick={() => setActiveTab('open')}
                >
                  {t('openTickets')}
                  <span className="count-badge">{grievances.filter(g => !['resolved', 'cancelled'].includes(g.status)).length}</span>
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'closed' ? 'active' : ''}`} 
                  onClick={() => setActiveTab('closed')}
                >
                  {t('closedTickets')}
                  <span className="count-badge">{grievances.filter(g => ['resolved', 'cancelled'].includes(g.status)).length}</span>
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                {filteredGrievances.map(g => (
                    <div className="card" key={g.id} style={{ cursor: 'pointer' }} onClick={() => setActiveGrievance(activeGrievance === g.id ? null : g.id)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                                <div style={{ fontWeight: 600, wordBreak: 'break-word' }}>{g.subject}</div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '4px', wordBreak: 'break-word' }}>
                                    By {g.raisedByUser?.name} • {g.district?.name || 'State level'} • {new Date(g.createdAt).toLocaleDateString('en-IN')}
                                </div>
                            </div>
                            <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                                {statusBadge(g.status)}
                                <span className="badge badge-secondary">{g.currentLevel}</span>
                            </div>
                        </div>

                        {activeGrievance === g.id && (
                            <div className="mt-lg" onClick={e => e.stopPropagation()}>
                                <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{g.description}</p>

                                {/* Attachments */}
                                {g.attachments?.length > 0 && (
                                    <div style={{ marginBottom: 'var(--space-lg)' }}>
                                        <h4 style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-sm)' }}>Attachments</h4>
                                        <div className="flex gap-md flex-wrap">
                                            {g.attachments.map(att => (
                                                <a 
                                                    key={att.id} 
                                                    href={`${(import.meta.env.VITE_API_URL || '').replace(/\/api\/v1\/?$/, '')}${att.filePath}`} 

                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    style={{ 
                                                        display: 'inline-flex', alignItems: 'center', gap: '8px', 
                                                        padding: '4px 8px', background: 'var(--color-bg-hover)', 
                                                        borderRadius: 'var(--radius-sm)', textDecoration: 'none',
                                                        fontSize: '12px', color: 'var(--color-primary)'
                                                    }}
                                                >
                                                    {att.mimeType.startsWith('image/') ? '🖼️' : '📄'} 
                                                    <span style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {att.fileName}
                                                    </span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Comments */}
                                {g.comments?.length > 0 && (
                                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
                                        {g.comments.map(c => (
                                            <div key={c.id} style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)' }}>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                                                    <strong>{c.user?.name}</strong> ({c.user?.role}) • {new Date(c.createdAt).toLocaleString('en-IN')}
                                                </div>
                                                <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{c.body}</div>
                                                
                                                {/* Comment Attachments */}
                                                {c.attachments?.length > 0 && (
                                                    <div className="flex gap-md flex-wrap mt-sm">
                                                        {c.attachments.map(att => (
                                                            <a 
                                                                key={att.id} 
                                                                href={`${(import.meta.env.VITE_API_URL || '').replace(/\/api\/v1\/?$/, '')}${att.filePath}`} 
                                                                target="_blank" 
                                                                rel="noreferrer"
                                                                style={{ 
                                                                    display: 'inline-flex', alignItems: 'center', gap: '8px', 
                                                                    padding: '4px 8px', background: 'var(--color-bg-hover)', 
                                                                    borderRadius: 'var(--radius-sm)', textDecoration: 'none',
                                                                    fontSize: '12px', color: 'var(--color-primary)'
                                                                }}
                                                            >
                                                                {att.mimeType.startsWith('image/') ? '🖼️' : '📄'} 
                                                                <span style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {att.fileName}
                                                                </span>
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}

                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add comment */}
                                {['resolved', 'cancelled'].indexOf(g.status) === -1 && (
                                    <div className="mb-lg" style={{ background: 'var(--color-bg)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                                        <div className="flex gap-md mb-sm">
                                            <input className="form-input" style={{ flex: 1, minWidth: 0 }} placeholder="Type your comment..." value={activeGrievance === g.id ? commentText : ''} onChange={e => setCommentText(e.target.value)} />
                                        </div>
                                        <div className="flex gap-md" style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                            <div style={{ flex: 1 }}>
                                                <input 
                                                    type="file" 
                                                    className="form-input" 
                                                    style={{ padding: '4px' }}
                                                    multiple 
                                                    accept="image/*,application/pdf"
                                                    onChange={(e) => handleFileChange(e, true)}
                                                />
                                                {commentFiles.length > 0 && (
                                                    <ul style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-secondary)', padding: '0', listStyle: 'none' }}>
                                                        {commentFiles.map((f, i) => (
                                                            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                                <span>{f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => removeFile(i, true)}
                                                                    style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '0 4px', fontSize: '14px', fontWeight: 'bold' }}
                                                                >
                                                                    &times;
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                            <button className="btn btn-primary" onClick={() => handleComment(g.id)}>Send / Submit</button>
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-md flex-wrap">
                                    {/* Action logic based on status and role */}
                                    {activeTab === 'open' ? (
                                        <>
                                            {/* Resolve/Escalate logic for admins */}
                                            {['developer', 'state_admin', 'district_admin'].includes(user.role) && (
                                                <>
                                                    {/* District admin can escalate district level to state */}
                                                    {user.role === 'district_admin' && g.currentLevel === 'district' && <button className="btn btn-secondary btn-sm" onClick={() => handleEscalate(g.id)}>⬆️ Escalate to State</button>}
                                                    {/* State admin can escalate state level to developer */}
                                                    {user.role === 'state_admin' && g.currentLevel === 'state' && <button className="btn btn-secondary btn-sm" onClick={() => handleEscalate(g.id)}>⬆️ Escalate to Developer</button>}
                                                    {/* Developer can escalate district to state, or state to developer */}
                                                    {user.role === 'developer' && g.currentLevel !== 'developer' && <button className="btn btn-secondary btn-sm" onClick={() => handleEscalate(g.id)}>⬆️ Escalate</button>}

                                                    {/* De-escalate logic */}
                                                    {user.role === 'state_admin' && g.currentLevel === 'developer' && <button className="btn btn-secondary btn-sm" onClick={() => handleDeEscalate(g.id)}>⬇️ Pull Back to State</button>}
                                                    {user.role === 'district_admin' && g.currentLevel === 'state' && <button className="btn btn-secondary btn-sm" onClick={() => handleDeEscalate(g.id)}>⬇️ Pull Back to District</button>}
                                                    {user.role === 'developer' && g.currentLevel !== 'district' && <button className="btn btn-secondary btn-sm" onClick={() => handleDeEscalate(g.id)}>⬇️ De-escalate</button>}

                                                    {/* Resolve - restricted by level? (usually anyone handling should be able to resolve) */}
                                                    {/* If it's at their level, they can resolve */}
                                                    {((user.role === 'district_admin' && g.currentLevel === 'district') || 
                                                     (user.role === 'state_admin' && g.currentLevel === 'state') || 
                                                     (user.role === 'developer')) && (
                                                        <button className="btn btn-primary btn-sm" onClick={() => handleResolve(g.id)}>✅ Resolve</button>
                                                    )}
                                                </>
                                            )}
                                            
                                            {/* Cancel only for owner */}
                                            {isOwner(g) && <button className="btn btn-danger btn-sm" onClick={() => handleCancel(g.id)}>🚫 Cancel Ticket</button>}
                                        </>
                                    ) : (
                                        <>
                                            {/* Closed tab - only owner can reopen */}
                                            {isOwner(g) && <button className="btn btn-secondary btn-sm" onClick={() => handleReopen(g.id)}>🔄 Reopen Ticket</button>}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {filteredGrievances.length === 0 && (
                    <div className="empty-state">
                        <div className="icon">🎫</div>
                        <h3>No {activeTab} tickets</h3>
                        <p>{activeTab === 'open' ? 'Everything is clear!' : 'No closed tickets found.'}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
