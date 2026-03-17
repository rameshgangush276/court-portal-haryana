import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function DataVetting() {
    const { user } = useAuth();
    const [entries, setEntries] = useState([]);
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState('');

    // 3 days back: today, yesterday, day before yesterday
    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 2);

    useEffect(() => {
        api.get('/data-tables').then(d => setTables(d.tables)).catch(console.error);
        load();
    }, []);

    const load = () => {
        const dateFrom = threeDaysAgo.toISOString().split('T')[0];
        const dateTo = today.toISOString().split('T')[0];
        let params = `?dateFrom=${dateFrom}&dateTo=${dateTo}`;
        if (selectedTable) params += `&tableId=${selectedTable}`;
        api.get(`/data-entries${params}`).then(d => setEntries(d.entries)).catch(console.error);
    };

    useEffect(() => { load(); }, [selectedTable]);

    return (
        <div>
            <div className="page-header">
                <h2>✅ Data Vetting</h2>
            </div>

            <div className="card mb-xl">
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
                    Reviewing data from the past 3 days ({threeDaysAgo.toLocaleDateString('en-IN')} to {today.toLocaleDateString('en-IN')})
                </p>
                <select className="form-select" style={{ maxWidth: 300 }} value={selectedTable} onChange={e => setSelectedTable(e.target.value)}>
                    <option value="">All Tables</option>
                    {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>

            {entries.length > 0 ? (
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Table</th>
                                <th>Court</th>
                                <th>Entered By</th>
                                <th>Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map(e => (
                                <tr key={e.id}>
                                    <td data-label="Date">{new Date(e.entryDate).toLocaleDateString('en-IN')}</td>
                                    <td data-label="Table"><span className="badge badge-primary">{e.table?.name}</span></td>
                                    <td data-label="Court">{e.court?.name}</td>
                                    <td data-label="Entered By">{e.createdByUser?.name}</td>
                                    <td data-label="Data" style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {Object.entries(e.values || {}).map(([k, v]) => `${k}: ${v !== null && v !== undefined ? v : '—'}`).join(' | ')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="empty-state">
                    <div className="icon">📋</div>
                    <h3>No entries to vet</h3>
                    <p>No data entries found in the past 3 days</p>
                </div>
            )}
        </div>
    );
}
