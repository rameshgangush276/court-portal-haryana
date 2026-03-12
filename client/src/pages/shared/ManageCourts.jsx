import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function ManageCourts() {
    const { user } = useAuth();
    const [courts, setCourts] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [magistrates, setMagistrates] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState({ districtId: '', name: '', courtNo: '' });
    const [filterDistrict, setFilterDistrict] = useState('');
    const [error, setError] = useState('');

    const load = () => {
        const params = filterDistrict ? `?districtId=${filterDistrict}` : '';
        api.get(`/courts${params}`).then(d => setCourts(d.courts)).catch(console.error);
    };

    useEffect(() => {
        api.get('/districts').then(d => setDistricts(d.districts)).catch(console.error);
        api.get('/magistrates').then(d => setMagistrates(d.magistrates)).catch(console.error);
    }, []);
    useEffect(() => { load(); }, [filterDistrict]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (editItem) {
                await api.put(`/courts/${editItem.id}`, form);
            } else {
                await api.post('/courts', form);
            }
            setShowForm(false); setEditItem(null);
            setForm({ districtId: '', name: '', courtNo: '' });
            load();
        } catch (err) { setError(err.message); }
    };

    const handleEdit = (c) => {
        setEditItem(c);
        setForm({ districtId: c.districtId, name: c.name, courtNo: c.courtNo });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this court?')) return;
        await api.delete(`/courts/${id}`);
        load();
    };

    return (
        <div>
            <div className="page-header">
                <h2>Manage Courts</h2>
                <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditItem(null); setForm({ districtId: user.districtId || filterDistrict || '', name: '', courtNo: '' }); }}>
                    + Add Court
                </button>
            </div>

            {['developer', 'state_admin'].includes(user.role) && (
                <div className="mb-xl">
                    <select className="form-select" style={{ maxWidth: 300 }} value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)}>
                        <option value="">All Districts</option>
                        {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>
            )}

            {showForm && (
                <div className="card mb-xl">
                    <h3 className="card-title mb-lg">{editItem ? 'Edit Court' : 'Add Court'}</h3>
                    {error && <div className="form-error mb-lg">{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">District</label>
                                <select className="form-select" value={form.districtId} onChange={e => setForm({ ...form, districtId: e.target.value })} required>
                                    <option value="">Select District</option>
                                    {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Court Name</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Court ID</label>
                                <input className="form-input" value={form.courtNo} onChange={e => setForm({ ...form, courtNo: e.target.value })} required />
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
                        <tr>
                            <th>S.No.</th>
                            <th>Court ID</th>
                            <th>Name</th>
                            <th>District</th>
                            <th>Judicial Officer</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {courts.map((c, idx) => (
                            <tr key={c.id}>
                                <td data-label="S.No.">{idx + 1}</td>
                                <td data-label="Court ID"><span className="badge badge-secondary">{c.courtNo}</span></td>
                                <td data-label="Name">{c.name}</td>
                                <td data-label="District">{c.district?.name}</td>
                                <td data-label="Judicial Officer">{c.magistrate ? c.magistrate.name : <span className="text-muted">Not assigned</span>}</td>
                                <td data-label="Actions">
                                    <div className="flex gap-sm">
                                        <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(c)}>Edit</button>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {courts.length === 0 && (
                            <tr><td colSpan="6" className="text-center text-muted">No courts found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
