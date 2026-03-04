import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function ManageNaibCourts() {
    const { user } = useAuth();
    const [naibCourts, setNaibCourts] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [showTransfer, setShowTransfer] = useState(null);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState({ username: '', password: '', name: '', districtId: '', phone: '' });
    const [transferTo, setTransferTo] = useState('');
    const [error, setError] = useState('');

    const canTransfer = ['developer', 'state_admin'].includes(user.role);

    const load = () => api.get('/naib-courts').then(d => setNaibCourts(d.naibCourts)).catch(console.error);
    useEffect(() => {
        load();
        api.get('/districts').then(d => setDistricts(d.districts)).catch(console.error);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const body = { ...form };
            if (editItem) {
                if (!body.password) delete body.password;
                delete body.username; // can't change username
                await api.put(`/naib-courts/${editItem.id}`, body);
            } else {
                await api.post('/naib-courts', body);
            }
            setShowForm(false); setEditItem(null);
            setForm({ username: '', password: '', name: '', districtId: '', phone: '' });
            load();
        } catch (err) { setError(err.message); }
    };

    const handleTransfer = async (id) => {
        try {
            await api.post(`/naib-courts/${id}/transfer`, { toDistrictId: parseInt(transferTo) });
            setShowTransfer(null);
            setTransferTo('');
            load();
        } catch (err) { alert(err.message); }
    };

    return (
        <div>
            <div className="page-header">
                <h2>Manage Naib Courts</h2>
                <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditItem(null); setForm({ username: '', password: '', name: '', districtId: user.districtId || '', phone: '' }); }}>
                    + Add Naib Court
                </button>
            </div>

            {showForm && (
                <div className="card mb-xl">
                    <h3 className="card-title mb-lg">{editItem ? 'Edit' : 'Add'} Naib Court</h3>
                    {error && <div className="form-error mb-lg">{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            {!editItem && (
                                <div className="form-group">
                                    <label className="form-label">Username</label>
                                    <input className="form-input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
                                </div>
                            )}
                            <div className="form-group">
                                <label className="form-label">{editItem ? 'New Password (leave blank to keep)' : 'Password'}</label>
                                <input className="form-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={!editItem} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">District</label>
                                <select className="form-select" value={form.districtId} onChange={e => setForm({ ...form, districtId: e.target.value })} required>
                                    <option value="">Select District</option>
                                    {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex gap-md">
                            <button className="btn btn-primary" type="submit">Save</button>
                            <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="data-table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr><th>Username</th><th>Name</th><th>District</th><th>Last Court</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        {naibCourts.map(n => (
                            <tr key={n.id}>
                                <td>{n.username}</td>
                                <td>{n.name}</td>
                                <td>{n.district?.name || '—'}</td>
                                <td>{n.lastSelectedCourt?.name || <span className="text-muted">None</span>}</td>
                                <td>
                                    <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditItem(n); setForm({ username: n.username, password: '', name: n.name, districtId: n.districtId || '', phone: n.phone || '' }); setShowForm(true); }}>Edit</button>
                                        {canTransfer && (
                                            showTransfer === n.id ? (
                                                <div className="flex gap-sm">
                                                    <select className="form-select" style={{ minWidth: 120 }} value={transferTo} onChange={e => setTransferTo(e.target.value)}>
                                                        <option value="">To District...</option>
                                                        {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                    </select>
                                                    <button className="btn btn-primary btn-sm" onClick={() => handleTransfer(n.id)} disabled={!transferTo}>Go</button>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => setShowTransfer(null)}>✕</button>
                                                </div>
                                            ) : (
                                                <button className="btn btn-secondary btn-sm" onClick={() => setShowTransfer(n.id)}>Transfer</button>
                                            )
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
