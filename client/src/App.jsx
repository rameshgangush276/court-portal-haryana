import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';

// Shared pages
import ManageDistricts from './pages/shared/ManageDistricts';
import ManageCourts from './pages/shared/ManageCourts';
import ManageMagistrates from './pages/shared/ManageMagistrates';
import ManageNaibCourts from './pages/shared/ManageNaibCourts';
import GrievancesPage from './pages/shared/GrievancesPage';
import ReportsPage from './pages/shared/ReportsPage';
import AlertsPage from './pages/shared/AlertsPage';

// Role dashboards
import DevDashboard from './pages/dev/DevDashboard';
import ManageDataTables from './pages/dev/ManageDataTables';
import StateDashboard from './pages/state/StateDashboard';
import DistrictDashboard from './pages/district/DistrictDashboard';
import DataVetting from './pages/district/DataVetting';
import NaibDataEntry from './pages/naib/NaibDataEntry';
import ViewerDashboard from './pages/viewer/ViewerDashboard';

import './index.css';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" />;
  return children;
}

function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" />;

  const map = {
    developer: '/dev',
    state_admin: '/state',
    district_admin: '/district',
    naib_court: '/naib',
    viewer_district: '/viewer',
    viewer_state: '/viewer',
  };
  return <Navigate to={map[user.role] || '/login'} />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RoleRedirect />} />

          {/* Developer Routes */}
          <Route element={<PrivateRoute roles={['developer']}><Layout /></PrivateRoute>}>
            <Route path="/dev" element={<DevDashboard />} />
            <Route path="/dev/districts" element={<ManageDistricts />} />
            <Route path="/dev/courts" element={<ManageCourts />} />
            <Route path="/dev/magistrates" element={<ManageMagistrates />} />
            <Route path="/dev/naib-courts" element={<ManageNaibCourts />} />
            <Route path="/dev/data-tables" element={<ManageDataTables />} />
            <Route path="/dev/grievances" element={<GrievancesPage />} />
            <Route path="/dev/reports" element={<ReportsPage />} />
          </Route>

          {/* State Admin Routes */}
          <Route element={<PrivateRoute roles={['state_admin']}><Layout /></PrivateRoute>}>
            <Route path="/state" element={<StateDashboard />} />
            <Route path="/state/districts" element={<ManageDistricts />} />
            <Route path="/state/courts" element={<ManageCourts />} />
            <Route path="/state/magistrates" element={<ManageMagistrates />} />
            <Route path="/state/naib-courts" element={<ManageNaibCourts />} />
            <Route path="/state/alerts" element={<AlertsPage />} />
            <Route path="/state/grievances" element={<GrievancesPage />} />
            <Route path="/state/reports" element={<ReportsPage />} />
          </Route>

          {/* District Admin Routes */}
          <Route element={<PrivateRoute roles={['district_admin']}><Layout /></PrivateRoute>}>
            <Route path="/district" element={<DistrictDashboard />} />
            <Route path="/district/courts" element={<ManageCourts />} />
            <Route path="/district/magistrates" element={<ManageMagistrates />} />
            <Route path="/district/naib-courts" element={<ManageNaibCourts />} />
            <Route path="/district/data-vetting" element={<DataVetting />} />
            <Route path="/district/alerts" element={<AlertsPage />} />
            <Route path="/district/grievances" element={<GrievancesPage />} />
            <Route path="/district/reports" element={<ReportsPage />} />
          </Route>

          {/* Naib Court Routes */}
          <Route element={<PrivateRoute roles={['naib_court']}><Layout /></PrivateRoute>}>
            <Route path="/naib" element={<NaibDataEntry />} />
            <Route path="/naib/select-court" element={<NaibDataEntry />} />
            <Route path="/naib/entry" element={<NaibDataEntry />} />
            <Route path="/naib/history" element={<ReportsPage />} />
            <Route path="/naib/grievances" element={<GrievancesPage />} />
            <Route path="/naib/reports" element={<ReportsPage />} />
          </Route>

          {/* Viewer Routes */}
          <Route element={<PrivateRoute roles={['viewer_district', 'viewer_state']}><Layout /></PrivateRoute>}>
            <Route path="/viewer" element={<ViewerDashboard />} />
            <Route path="/viewer/reports" element={<ReportsPage />} />
          </Route>

          <Route path="*" element={<RoleRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
