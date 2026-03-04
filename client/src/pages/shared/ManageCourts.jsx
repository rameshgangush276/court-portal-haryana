import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function ManageCourts() {
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
                <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditItem(null); setForm({ districtId: filterDistrict || '', name: '', courtNo: '' }); }}>
                    + Add Court
                </button>
            </div>

            <div className="mb-xl">
                <select className="form-select" style={{ maxWidth: 300 }} value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)}>
                    <option value="">All Districts</option>
                    {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
            </div>

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
                                <label className="form-label">Court No</label>
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
                            <th>Court No</th>
                            <th>Name</th>
                            <th>District</th>
                            <th>Magistrate</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {courts.map(c => (
                            <tr key={c.id}>
                                <td><span className="badge badge-secondary">{c.courtNo}</span></td>
                                <td>{c.name}</td>
                                <td>{c.district?.name}</td>
                                <td>{c.magistrate ? c.magistrate.name : <span className="text-muted">Not assigned</span>}</td>
                                <td>
                                    <div className="flex gap-sm">
                                        <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(c)}>Edit</button>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {courts.length === 0 && (
                            <tr><td colSpan="5" className="text-center text-muted">No courts found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
