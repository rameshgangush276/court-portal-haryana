import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useLanguage } from '../../context/LanguageContext';

export default function ManagePoliceStations() {
    const { t } = useLanguage();
    const { districtId } = useParams();
    const navigate = useNavigate();
    const [district, setDistrict] = useState(null);
    const [policeStations, setPoliceStations] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState({ name: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const loadDistrict = async () => {
        try {
            const d = await api.get(`/districts/${districtId}`);
            setDistrict(d.district);
        } catch (err) {
            console.error('Failed to load district:', err);
            setError('District not found');
        }
    };

    const loadStations = async () => {
        try {
            const res = await api.get(`/districts/${districtId}/police-stations`);
            setPoliceStations(res.policeStations);
        } catch (err) {
            console.error('Failed to load police stations:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDistrict();
        loadStations();
    }, [districtId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (editItem) {
                await api.put(`/districts/${districtId}/police-stations/${editItem.id}`, form);
                alert('Police station updated successfully');
            } else {
                await api.post(`/districts/${districtId}/police-stations`, form);
                alert('Police station added successfully');
            }
            setShowForm(false);
            setEditItem(null);
            setForm({ name: '' });
            loadStations();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleEdit = (ps) => {
        setEditItem(ps);
        setForm({ name: ps.name });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this police station?')) return;
        try {
            await api.delete(`/districts/${districtId}/police-stations/${id}`);
            loadStations();
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading && !district) return <div className="text-center p-xl">Loading...</div>;

    return (
        <div>
            <div className="page-header">
                <div>
                    <button className="btn btn-secondary btn-sm mb-sm" onClick={() => navigate('/dev/districts')}>
                        ← Back to Districts
                    </button>
                    <h2>👮 Manage Police Stations: {district?.name}</h2>
                </div>
                <button 
                    className="btn btn-primary" 
                    onClick={() => { setShowForm(true); setEditItem(null); setForm({ name: '' }); }}
                >
                    + Add Police Station
                </button>
            </div>

            {showForm && (
                <div className="card mb-xl">
                    <h3 className="card-title mb-lg">{editItem ? 'Edit Police Station' : 'Add Police Station'}</h3>
                    {error && <div className="form-error mb-lg">{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Police Station Name</label>
                            <input 
                                className="form-input" 
                                value={form.name} 
                                onChange={e => setForm({ ...form, name: e.target.value })} 
                                placeholder="e.g. PS Civil Lines" 
                                required 
                            />
                        </div>
                        <div className="flex gap-md">
                            <button className="btn btn-primary" type="submit">Save</button>
                            <button className="btn btn-secondary" type="button" onClick={() => { setShowForm(false); setEditItem(null); }}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card">
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: '80px' }}>S.No</th>
                                <th>Police Station Name</th>
                                <th style={{ width: '200px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {policeStations.map((ps, idx) => (
                                <tr key={ps.id}>
                                    <td data-label="S.No">{idx + 1}</td>
                                    <td data-label="Name">{ps.name}</td>
                                    <td data-label="Actions">
                                        <div className="flex gap-sm">
                                            <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(ps)}>Edit</button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(ps.id)}>Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {policeStations.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="3" className="text-center text-muted">No police stations found for this district.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
