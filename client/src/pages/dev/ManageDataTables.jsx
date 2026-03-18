import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function ManageDataTables() {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Table Form State
    const [showTableModal, setShowTableModal] = useState(false);
    const [editingTable, setEditingTable] = useState(null);
    const [tableForm, setTableForm] = useState({ name: '', slug: '', description: '', singleRow: false });

    // Column Form State
    const [showColumnModal, setShowColumnModal] = useState(false);
    const [editingColumn, setEditingColumn] = useState(null);
    const [activeTableId, setActiveTableId] = useState(null);
    const [columnForm, setColumnForm] = useState({
        name: '',
        slug: '',
        dataType: 'text',
        isRequired: true,
        sortOrder: 0,
        optionsText: '' // string representation of enum options
    });

    const load = async () => {
        setLoading(true);
        try {
            const d = await api.get('/data-tables');
            setTables(d.tables);
        } catch (err) {
            setError('Failed to load tables');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    // ─── Table Actions ───────────────────────────────────

    const handleOpenTableModal = (table = null) => {
        if (table) {
            setEditingTable(table);
            setTableForm({
                name: table.name,
                slug: table.slug,
                description: table.description || '',
                singleRow: table.singleRow
            });
        } else {
            setEditingTable(null);
            setTableForm({ name: '', slug: '', description: '', singleRow: false });
        }
        setShowTableModal(true);
        setError('');
    };

    const handleTableSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingTable) {
                // Exclude slug when updating because it's immutable and causes backend validation issues
                const { slug, ...updatePayload } = tableForm;
                await api.put(`/data-tables/${editingTable.id}`, updatePayload);
                alert('Table updated successfully!');
            } else {
                await api.post('/data-tables', tableForm);
                alert('Table created successfully!');
            }
            setShowTableModal(false);
            load();
        } catch (err) { setError(err.message); }
    };

    const handleDeleteTable = async (id) => {
        if (!confirm('Are you sure you want to delete this table? All data will be hidden but not permanently deleted.')) return;
        try {
            await api.delete(`/data-tables/${id}`);
            load();
        } catch (err) { alert(err.message); }
    };

    // ─── Column Actions ──────────────────────────────────

    const handleOpenColumnModal = (tableId, column = null) => {
        setActiveTableId(tableId);
        if (column) {
            setEditingColumn(column);
            setColumnForm({
                name: column.name,
                slug: column.slug,
                dataType: column.dataType,
                isRequired: column.isRequired,
                sortOrder: column.sortOrder,
                optionsText: Array.isArray(column.enumOptions) ? column.enumOptions.join(', ') : ''
            });
        } else {
            setEditingColumn(null);
            setColumnForm({
                name: '',
                slug: '',
                dataType: 'text',
                isRequired: true,
                sortOrder: 0,
                optionsText: ''
            });
        }
        setShowColumnModal(true);
        setError('');
    };

    const handleColumnSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...columnForm,
            enumOptions: columnForm.dataType === 'enum' 
                ? columnForm.optionsText.split(',').map(s => s.trim()).filter(Boolean)
                : null
        };
        delete payload.optionsText;

        try {
            if (editingColumn) {
                // Exclude slug during column update
                const { slug, ...updatePayload } = payload;
                await api.put(`/data-tables/${activeTableId}/columns/${editingColumn.id}`, updatePayload);
                alert('Column updated successfully!');
            } else {
                await api.post(`/data-tables/${activeTableId}/columns`, payload);
                alert('Column added successfully!');
            }
            setShowColumnModal(false);
            load();
        } catch (err) { setError(err.message); }
    };

    const handleDeleteColumn = async (tableId, colId) => {
        if (!confirm('Are you sure you want to delete this column?')) return;
        try {
            await api.delete(`/data-tables/${tableId}/columns/${colId}`);
            load();
        } catch (err) { alert(err.message); }
    };

    if (loading && tables.length === 0) return <div className="p-xl text-center">Loading Data Schema...</div>;

    return (
        <div>
            <div className="page-header">
                <h2>📋 Manage Data Entry Tables</h2>
                <div className="flex gap-md">
                   <button className="btn btn-primary" onClick={() => handleOpenTableModal()}>+ Create Table</button>
                </div>
            </div>

            {error && <div className="form-error mb-xl">{error}</div>}

            <div className="space-y-xl">
                {tables.map(t => (
                    <div className="card" key={t.id}>
                        <div className="flex-between mb-xl border-b pb-md">
                            <div>
                                <h3 className="card-title" style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{t.name}</h3>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', gap: '12px' }}>
                                    <span>Slug: <code>{t.slug}</code></span>
                                    {t.singleRow && <span className="badge badge-warning">Single Row per Day</span>}
                                </div>
                                {t.description && <p className="mt-sm" style={{ fontStyle: 'italic', fontSize: '0.9rem' }}>{t.description}</p>}
                            </div>
                            <div className="flex gap-sm">
                                <button className="btn btn-secondary btn-sm" onClick={() => handleOpenTableModal(t)}>Edit Table</button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTable(t.id)}>Delete</button>
                            </div>
                        </div>

                        <div className="flex-between mb-md">
                            <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>Columns</h4>
                            <button className="btn btn-primary btn-sm" onClick={() => handleOpenColumnModal(t.id)}>+ Add Column</button>
                        </div>

                        <div className="data-table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Name / Slug</th>
                                        <th>Type</th>
                                        <th>Required</th>
                                        <th>Details / Order</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {t.columns?.length > 0 ? t.columns.map(col => (
                                        <tr key={col.id}>
                                            <td data-label="Column">
                                                <div style={{ fontWeight: 600 }}>{col.name}</div>
                                                <code style={{ fontSize: '0.75rem', opacity: 0.7 }}>{col.slug}</code>
                                            </td>
                                            <td data-label="Type">
                                                <span className={`badge badge-${col.dataType === 'number' ? 'primary' : 'secondary'}`}>
                                                    {col.dataType}
                                                </span>
                                            </td>
                                            <td data-label="Required">{col.isRequired ? '✅' : '—'}</td>
                                            <td data-label="Details">
                                                {col.dataType === 'enum' && (
                                                    <div style={{ fontSize: '0.8rem', maxWidth: '200px' }} className="truncate">
                                                        {col.enumOptions?.join(', ')}
                                                    </div>
                                                )}
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Order: {col.sortOrder}</div>
                                            </td>
                                            <td data-label="Actions">
                                                <div className="flex gap-sm">
                                                    <button className="btn btn-secondary btn-sm" onClick={() => handleOpenColumnModal(t.id, col)}>Edit</button>
                                                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteColumn(t.id, col.id)}>×</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="5" className="text-center p-lg">No columns defined yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table Modal */}
            {showTableModal && (
                <div className="modal-overlay" onClick={() => setShowTableModal(false)}>
                    <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
                        <h3 className="card-title mb-lg">{editingTable ? 'Edit Table' : 'New Data Table'}</h3>
                        <form onSubmit={handleTableSubmit}>
                            <div className="form-group">
                                <label className="form-label">Table Name</label>
                                <input className="form-input" value={tableForm.name} onChange={e => setTableForm({ ...tableForm, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Slug (Identifier)</label>
                                <input className="form-input" value={tableForm.slug} onChange={e => setTableForm({ ...tableForm, slug: e.target.value })} 
                                    placeholder="e.g. police-official-deposition" required disabled={!!editingTable} />
                                <small style={{ color: 'var(--color-text-muted)' }}>This is used in URLs and cannot be changed after creation.</small>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-input" value={tableForm.description} onChange={e => setTableForm({ ...tableForm, description: e.target.value })} rows="2" />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={tableForm.singleRow} onChange={e => setTableForm({ ...tableForm, singleRow: e.target.checked })} />
                                    <span>Single row per court per day (e.g. Daily Summary)</span>
                                </label>
                            </div>
                            <div className="flex-end gap-md pt-md">
                                <button className="btn btn-secondary" type="button" onClick={() => setShowTableModal(false)}>Cancel</button>
                                <button className="btn btn-primary" type="submit">{editingTable ? 'Update Table' : 'Create Table'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Column Modal */}
            {showColumnModal && (
                <div className="modal-overlay" onClick={() => setShowColumnModal(false)}>
                    <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
                        <h3 className="card-title mb-lg">{editingColumn ? 'Edit Column' : 'Add Column'}</h3>
                        <form onSubmit={handleColumnSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Column Name</label>
                                    <input className="form-input" value={columnForm.name} onChange={e => setColumnForm({ ...columnForm, name: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Slug</label>
                                    <input className="form-input" value={columnForm.slug} onChange={e => setColumnForm({ ...columnForm, slug: e.target.value })} required disabled={!!editingColumn} />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Data Type</label>
                                    <select className="form-input" value={columnForm.dataType} onChange={e => setColumnForm({ ...columnForm, dataType: e.target.value })}>
                                        <option value="text">Text</option>
                                        <option value="number">Number</option>
                                        <option value="date">Date</option>
                                        <option value="enum">Dropdown (Enum)</option>
                                        <option value="boolean">Boolean</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Sort Order</label>
                                    <input className="form-input" type="number" value={columnForm.sortOrder} onChange={e => setColumnForm({ ...columnForm, sortOrder: parseInt(e.target.value) })} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={columnForm.isRequired} onChange={e => setColumnForm({ ...columnForm, isRequired: e.target.checked })} />
                                    <span>Mandatory Field</span>
                                </label>
                            </div>

                            {columnForm.dataType === 'enum' && (
                                <div className="form-group">
                                    <label className="form-label">Dropdown Options (Comma Separated)</label>
                                    <textarea className="form-input" value={columnForm.optionsText} onChange={e => setColumnForm({ ...columnForm, optionsText: e.target.value })} 
                                        placeholder="Option 1, Option 2, Option 3" rows="3" required={columnForm.dataType === 'enum'} />
                                </div>
                            )}

                            <div className="flex-end gap-md pt-md">
                                <button className="btn btn-secondary" type="button" onClick={() => setShowColumnModal(false)}>Cancel</button>
                                <button className="btn btn-primary" type="submit">{editingColumn ? 'Update Column' : 'Add Column'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
