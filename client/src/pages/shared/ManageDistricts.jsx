import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function ManageDistricts() {
    const [districts, setDistricts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState({ name: '', code: '' });
    const [error, setError] = useState('');

    const load = () => api.get('/districts').then(d => setDistricts(d.districts)).catch(console.error);
    useEffect(() => { load(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (editItem) {
                await api.put(`/districts/${editItem.id}`, form);
            } else {
                await api.post('/districts', form);
            }
            setShowForm(false);
            setEditItem(null);
            setForm({ name: '', code: '' });
            load();
        } catch (err) { setError(err.message); }
    };

    const handleEdit = (d) => {
        setEditItem(d);
        setForm({ name: d.name, code: d.code });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this district?')) return;
        await api.delete(`/districts/${id}`);
        load();
    };

    return (
        <div>
            <div className="page-header">
                <h2>Manage Districts</h2>
                <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditItem(null); setForm({ name: '', code: '' }); }}>
                    + Add District
                </button>
            </div>

            {showForm && (
                <div className="card mb-xl">
                    <h3 className="card-title mb-lg">{editItem ? 'Edit District' : 'Add District'}</h3>
                    {error && <div className="form-error mb-lg">{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Name</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Code</label>
                                <input className="form-input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} maxLength={10} required />
                            </div>
                        </div>
                        <div className="flex gap-md">
                            <button className="btn btn-primary" type="submit">Save</button>
                            <button className="btn btn-secondary" type="button" onClick={() => { setShowForm(false); setEditItem(null); }}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="data-table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>S.No.</th>
                            <th>Name</th>
                            <th>Code</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {districts.map((d, idx) => (
                            <tr key={d.id}>
                                <td data-label="S.No.">{idx + 1}</td>
                                <td data-label="Name">{d.name}</td>
                                <td data-label="Code"><span className="badge badge-primary">{d.code}</span></td>
                                <td data-label="Actions">
                                    <div className="flex gap-sm">
                                        <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(d)}>Edit</button>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(d.id)}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {districts.length === 0 && (
                            <tr><td colSpan="4" className="text-center text-muted">No districts found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
