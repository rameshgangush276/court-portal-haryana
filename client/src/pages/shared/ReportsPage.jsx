import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import * as XLSX from 'xlsx';

export default function ReportsPage() {
    const { user } = useAuth();
    const [reportType, setReportType] = useState('district');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [courts, setCourts] = useState([]);
    const [magistrates, setMagistrates] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [tables, setTables] = useState([]);
    const [selectedCourt, setSelectedCourt] = useState('');
    const [selectedMagistrate, setSelectedMagistrate] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedTable, setSelectedTable] = useState('');
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);

    const isStateLevel = ['developer', 'state_admin', 'viewer_state'].includes(user.role);

    useEffect(() => {
        api.get('/courts').then(d => setCourts(d.courts)).catch(console.error);
        api.get('/magistrates').then(d => setMagistrates(d.magistrates)).catch(console.error);
        api.get('/districts').then(d => setDistricts(d.districts)).catch(console.error);
        api.get('/data-tables').then(d => setTables(d.tables)).catch(console.error);
    }, []);

    const generateReport = async () => {
        setLoading(true);
        setReportData(null);
        try {
            let params = '';
            if (dateFrom) params += `&dateFrom=${dateFrom}`;
            if (dateTo) params += `&dateTo=${dateTo}`;
            if (selectedTable) params += `&tableId=${selectedTable}`;

            let data;
            switch (reportType) {
                case 'court':
                    data = await api.get(`/reports/court?courtId=${selectedCourt}${params}`);
                    break;
                case 'magistrate':
                    data = await api.get(`/reports/magistrate?magistrateId=${selectedMagistrate}${params}`);
                    break;
                case 'district':
                    data = await api.get(`/reports/district?districtId=${selectedDistrict || user.districtId}${params}`);
                    break;
                case 'state':
                    data = await api.get(`/reports/state?${params.replace('&', '')}`);
                    break;
            }
            setReportData(data);
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const exportToExcel = () => {
        if (!reportData || !reportData.entries || reportData.entries.length === 0) return;

        const table = tables.find(t => t.id === parseInt(selectedTable));
        const columns = table ? table.columns : [];

        const exportData = reportData.entries.map(entry => {
            const row = {
                'Date': new Date(entry.entryDate).toLocaleDateString('en-IN'),
                'Table Name': entry.table?.name || '—',
                'Court Name': entry.court?.name || '—',
                'Entered By': entry.createdByUser?.name || '—',
            };

            // Add dynamic columns if a specific table is selected
            if (columns.length > 0) {
                columns.forEach(col => {
                    const val = entry.values?.[col.slug];
                    row[col.name] = (val !== undefined && val !== null) ? val : '—';
                });
            } else {
                // Fallback: list all values in one column if no specific table selected
                row['Values'] = Object.entries(entry.values || {}).map(([k, v]) => `${k}: ${v !== null && v !== undefined ? v : '—'}`).join(' | ');
            }

            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

        const fileName = `Report_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    return (
        <div>
            <div className="page-header">
                <h2>📈 Reports</h2>
            </div>

            <div className="card mb-xl">
                <h3 className="card-title mb-lg">Generate Report</h3>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Report Type</label>
                        <select className="form-select" value={reportType} onChange={e => setReportType(e.target.value)}>
                            <option value="court">By Court</option>
                            <option value="magistrate">By Judicial Officer</option>
                            <option value="district">By District</option>
                            {isStateLevel && <option value="state">State Overview</option>}
                        </select>
                    </div>

                    {reportType === 'court' && (
                        <div className="form-group">
                            <label className="form-label">Court</label>
                            <select className="form-select" value={selectedCourt} onChange={e => setSelectedCourt(e.target.value)}>
                                <option value="">Select Court</option>
                                {courts.map(c => <option key={c.id} value={c.id}>{c.courtNo} — {c.name}</option>)}
                            </select>
                        </div>
                    )}

                    {reportType === 'magistrate' && (
                        <div className="form-group">
                            <label className="form-label">Judicial Officer</label>
                            <select className="form-select" value={selectedMagistrate} onChange={e => setSelectedMagistrate(e.target.value)}>
                                <option value="">Select Judicial Officer</option>
                                {magistrates.map(m => <option key={m.id} value={m.id}>{m.name} ({m.designation})</option>)}
                            </select>
                        </div>
                    )}

                    {reportType === 'district' && isStateLevel && (
                        <div className="form-group">
                            <label className="form-label">District</label>
                            <select className="form-select" value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)}>
                                <option value="">Select District</option>
                                {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Table</label>
                        <select className="form-select" value={selectedTable} onChange={e => setSelectedTable(e.target.value)}>
                            <option value="">All Tables</option>
                            {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">From</label>
                        <input className="form-input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">To</label>
                        <input className="form-input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                    </div>
                </div>

                <button className="btn btn-primary" onClick={generateReport} disabled={loading}>
                    {loading ? 'Generating...' : '📊 Generate Report'}
                </button>
            </div>

            {/* Report Results */}
            {reportData && (
                <div className="mt-xl">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                        <h3 style={{ margin: 0 }}>Results</h3>
                        {reportData.entries && reportData.entries.length > 0 && (
                            <button className="btn btn-secondary" onClick={exportToExcel}>
                                📥 Export to Excel
                            </button>
                        )}
                    </div>

                    {/* State Overview */}
                    {reportType === 'state' && reportData.summaries && (
                        <div>
                            <div className="stat-cards">
                                <div className="stat-card">
                                    <div className="stat-icon">🏛️</div>
                                    <div className="stat-value">{reportData.totalDistricts}</div>
                                    <div className="stat-label">Districts</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon">📋</div>
                                    <div className="stat-value">{reportData.totalEntries}</div>
                                    <div className="stat-label">Total Entries</div>
                                </div>
                            </div>

                            <div className="data-table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr><th>District</th><th>Courts</th><th>Total Entries</th></tr>
                                    </thead>
                                    <tbody>
                                        {reportData.summaries.map(s => (
                                            <tr key={s.district.id}>
                                                <td data-label="District">{s.district.name}</td>
                                                <td data-label="Courts">{s.totalCourts}</td>
                                                <td data-label="Total Entries">{s.totalEntries}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* District Summary */}
                    {reportType === 'district' && reportData.summary && (
                        <div>
                            <div className="stat-cards">
                                <div className="stat-card">
                                    <div className="stat-icon">📋</div>
                                    <div className="stat-value">{reportData.summary.totalEntries}</div>
                                    <div className="stat-label">Total Entries</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon">📅</div>
                                    <div className="stat-value">{reportData.summary.datesWithData}</div>
                                    <div className="stat-label">Days with Data</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon">⚖️</div>
                                    <div className="stat-value">{reportData.summary.courtsWithData}</div>
                                    <div className="stat-label">Courts with Data</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Entries Table */}
                    {reportData.entries && reportData.entries.length > 0 && (
                        <div className="data-table-wrapper mt-xl">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Table</th>
                                        <th>Court</th>
                                        <th>Created By</th>
                                        <th>Values</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.entries.slice(0, 100).map(e => (
                                        <tr key={e.id}>
                                            <td data-label="Date">{new Date(e.entryDate).toLocaleDateString('en-IN')}</td>
                                            <td data-label="Table"><span className="badge badge-primary">{e.table?.name}</span></td>
                                            <td data-label="Court">{e.court?.name || '—'}</td>
                                            <td data-label="Created By">{e.createdByUser?.name || '—'}</td>
                                            <td data-label="Values" style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {Object.entries(e.values || {}).map(([k, v]) => `${k}: ${v !== null && v !== undefined ? v : '—'}`).join(' | ')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {reportData.entries?.length === 0 && (
                        <div className="empty-state mt-xl">
                            <div className="icon">📊</div>
                            <h3>No data found</h3>
                            <p>Try adjusting the date range or filters</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
