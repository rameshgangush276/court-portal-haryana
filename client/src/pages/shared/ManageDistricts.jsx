import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useLanguage } from '../../context/LanguageContext';

export default function ManageDistricts() {
    const { t } = useLanguage();
    const navigate = useNavigate();
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
        if (!confirm(t('confirmDeleteDistrict'))) return;
        await api.delete(`/districts/${id}`);
        load();
    };

    return (
        <div>
            <div className="page-header">
                <h2>{t('manageDistricts')}</h2>
                <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditItem(null); setForm({ name: '', code: '' }); }}>
                    + {t('addDistrict')}
                </button>
            </div>

            {showForm && (
                <div className="card mb-xl">
                    <h3 className="card-title mb-lg">{editItem ? t('editDistrict') : t('addDistrict')}</h3>
                    {error && <div className="form-error mb-lg">{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">{t('nameLabel')}</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('codeLabel')}</label>
                                <input className="form-input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} maxLength={10} required />
                            </div>
                        </div>
                        <div className="flex gap-md">
                            <button className="btn btn-primary" type="submit">{t('save')}</button>
                            <button className="btn btn-secondary" type="button" onClick={() => { setShowForm(false); setEditItem(null); }}>{t('cancel')}</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="data-table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>{t('serialNo')}</th>
                            <th>{t('nameLabel')}</th>
                            <th>{t('codeLabel')}</th>
                            <th>{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {districts.map((d, idx) => (
                            <tr key={d.id}>
                                <td data-label={t('serialNo')}>{idx + 1}</td>
                                <td data-label={t('nameLabel')}>{d.name}</td>
                                <td data-label={t('codeLabel')}><span className="badge badge-primary">{d.code}</span></td>
                                <td data-label={t('actions')}>
                                    <div className="flex gap-sm">
                                        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/dev/districts/${d.id}/police-stations`)}>
                                            🏢 Stations
                                        </button>
                                        <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(d)}>{t('edit')}</button>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(d.id)}>{t('delete')}</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {districts.length === 0 && (
                            <tr><td colSpan="4" className="text-center text-muted">{t('noDistrictsFound')}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
