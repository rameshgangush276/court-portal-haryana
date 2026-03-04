import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function ManageMagistrates() {
    const { user } = useAuth();
    const [magistrates, setMagistrates] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [courts, setCourts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [showTransfer, setShowTransfer] = useState(null);
    const [showAssign, setShowAssign] = useState(null);
    const [form, setForm] = useState({ name: '', designation: '', districtId: '', phone: '' });
    const [transferTo, setTransferTo] = useState('');
    const [assignCourt, setAssignCourt] = useState('');
    const [editItem, setEditItem] = useState(null);
    const [error, setError] = useState('');

    const canTransfer = ['developer', 'state_admin'].includes(user.role);
    const canCreate = ['developer', 'state_admin'].includes(user.role);
    const canAssign = ['developer', 'state_admin', 'district_admin'].includes(user.role);

    const load = () => {
        api.get('/magistrates').then(d => setMagistrates(d.magistrates)).catch(console.error);
    };
    useEffect(() => {
        load();
        api.get('/districts').then(d => setDistricts(d.districts)).catch(console.error);
        api.get('/courts').then(d => setCourts(d.courts)).catch(console.error);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (editItem) {
                await api.put(`/magistrates/${editItem.id}`, form);
            } else {
                await api.post('/magistrates', form);
            }
            setShowForm(false); setEditItem(null);
            load();
        } catch (err) { setError(err.message); }
    };

    const handleTransfer = async (id) => {
        try {
            await api.post(`/magistrates/${id}/transfer`, { toDistrictId: parseInt(transferTo) });
            setShowTransfer(null);
            setTransferTo('');
            load();
        } catch (err) { alert(err.message); }
    };

    const handleAssign = async (id) => {
        try {
            await api.post(`/magistrates/${id}/assign-court`, { courtId: parseInt(assignCourt) });
            setShowAssign(null);
            setAssignCourt('');
            load();
        } catch (err) { alert(err.message); }
    };

    return (
        <div>
            <div className="page-header">
                <h2>Manage Magistrates</h2>
                {canCreate && (
                    <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditItem(null); setForm({ name: '', designation: '', districtId: '', phone: '' }); }}>
                        + Add Magistrate
                    </button>
                )}
            </div>

            {showForm && (
                <div className="card mb-xl">
                    <h3 className="card-title mb-lg">{editItem ? 'Edit' : 'Add'} Magistrate</h3>
                    {error && <div className="form-error mb-lg">{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Name</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Designation</label>
                                <input className="form-input" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="e.g. ADJ, CJM" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">District</label>
                                <select className="form-select" value={form.districtId} onChange={e => setForm({ ...form, districtId: e.target.value })}>
                                    <option value="">No District</option>
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
                        <tr><th>Name</th><th>Designation</th><th>District</th><th>Court</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        {magistrates.map(m => (
                            <tr key={m.id}>
                                <td>{m.name}</td>
                                <td><span className="badge badge-primary">{m.designation}</span></td>
                                <td>{m.district?.name || <span className="text-muted">Unassigned</span>}</td>
                                <td>{m.courts?.length ? m.courts.map(c => c.name).join(', ') : <span className="text-muted">None</span>}</td>
                                <td>
                                    <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                                        {canCreate && <button className="btn btn-secondary btn-sm" onClick={() => { setEditItem(m); setForm({ name: m.name, designation: m.designation, districtId: m.district?.id || '', phone: m.phone || '' }); setShowForm(true); }}>Edit</button>}
                                        {canTransfer && (
                                            showTransfer === m.id ? (
                                                <div className="flex gap-sm">
                                                    <select className="form-select" style={{ minWidth: 120 }} value={transferTo} onChange={e => setTransferTo(e.target.value)}>
                                                        <option value="">To District...</option>
                                                        {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                    </select>
                                                    <button className="btn btn-primary btn-sm" onClick={() => handleTransfer(m.id)} disabled={!transferTo}>Go</button>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => setShowTransfer(null)}>✕</button>
                                                </div>
                                            ) : (
                                                <button className="btn btn-secondary btn-sm" onClick={() => setShowTransfer(m.id)}>Transfer</button>
                                            )
                                        )}
                                        {canAssign && (
                                            showAssign === m.id ? (
                                                <div className="flex gap-sm">
                                                    <select className="form-select" style={{ minWidth: 140 }} value={assignCourt} onChange={e => setAssignCourt(e.target.value)}>
                                                        <option value="">Assign Court...</option>
                                                        {courts.filter(c => !m.districtId || c.districtId === m.districtId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                    <button className="btn btn-primary btn-sm" onClick={() => handleAssign(m.id)} disabled={!assignCourt}>Go</button>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => setShowAssign(null)}>✕</button>
                                                </div>
                                            ) : (
                                                <button className="btn btn-secondary btn-sm" onClick={() => setShowAssign(m.id)}>Assign Court</button>
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
