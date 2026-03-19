import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
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
import ChangePassword from './pages/shared/ChangePassword';

// Role dashboards
import DevDashboard from './pages/dev/DevDashboard';
import ResetPasswords from './pages/dev/ResetPasswords';
import ManageDataTables from './pages/dev/ManageDataTables';
import ManagePoliceStations from './pages/dev/ManagePoliceStations';
import SystemManagement from './pages/dev/SystemManagement';
import StateDashboard from './pages/state/StateDashboard';
import DistrictDashboard from './pages/district/DistrictDashboard';
import DataVetting from './pages/district/DataVetting';
import NaibDataEntry from './pages/naib/NaibDataEntry';
import NaibDashboard from './pages/naib/NaibDashboard';
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
    naib_court: '/naib/select-court',
    viewer_district: '/viewer',
    viewer_state: '/viewer',
  };
  return <Navigate to={map[user.role] || '/login'} />;
}

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RoleRedirect />} />

          {/* Developer Routes */}
          <Route element={<PrivateRoute roles={['developer']}><Layout /></PrivateRoute>}>
            <Route path="/dev" element={<DevDashboard />} />
            <Route path="/dev/districts" element={<ManageDistricts />} />
            <Route path="/dev/districts/:districtId/police-stations" element={<ManagePoliceStations />} />
            <Route path="/dev/courts" element={<ManageCourts />} />
            <Route path="/dev/magistrates" element={<ManageMagistrates />} />
            <Route path="/dev/naib-courts" element={<ManageNaibCourts />} />
            <Route path="/dev/data-tables" element={<ManageDataTables />} />
            <Route path="/dev/alerts" element={<AlertsPage />} />
            <Route path="/dev/grievances" element={<GrievancesPage />} />
            <Route path="/dev/reports" element={<ReportsPage />} />
            <Route path="/dev/reset-passwords" element={<ResetPasswords />} />
            <Route path="/dev/system" element={<SystemManagement />} />
            <Route path="/dev/change-password" element={<ChangePassword />} />
          </Route>

          {/* State Admin Routes */}
          <Route element={<PrivateRoute roles={['state_admin']}><Layout /></PrivateRoute>}>
            <Route path="/state" element={<StateDashboard />} />
            <Route path="/state/districts" element={<ManageDistricts />} />
            <Route path="/state/districts/:districtId/police-stations" element={<ManagePoliceStations />} />
            <Route path="/state/courts" element={<ManageCourts />} />
            <Route path="/state/magistrates" element={<ManageMagistrates />} />
            <Route path="/state/naib-courts" element={<ManageNaibCourts />} />
            <Route path="/state/alerts" element={<AlertsPage />} />
            <Route path="/state/grievances" element={<GrievancesPage />} />
            <Route path="/state/reports" element={<ReportsPage />} />
            <Route path="/state/change-password" element={<ChangePassword />} />
          </Route>

          {/* District Admin Routes */}
          <Route element={<PrivateRoute roles={['district_admin']}><Layout /></PrivateRoute>}>
            <Route path="/district" element={<DistrictDashboard />} />
            <Route path="/district/police-stations" element={<ManagePoliceStations />} />
            <Route path="/district/courts" element={<ManageCourts />} />
            <Route path="/district/magistrates" element={<ManageMagistrates />} />
            <Route path="/district/naib-courts" element={<ManageNaibCourts />} />
            <Route path="/district/data-vetting" element={<DataVetting />} />
            <Route path="/district/alerts" element={<AlertsPage />} />
            <Route path="/district/grievances" element={<GrievancesPage />} />
            <Route path="/district/reports" element={<ReportsPage />} />
            <Route path="/district/change-password" element={<ChangePassword />} />
          </Route>

          {/* Naib Court Routes */}
          <Route element={<PrivateRoute roles={['naib_court']}><Layout /></PrivateRoute>}>
            <Route path="/naib" element={<Navigate to="/naib/select-court" replace />} />
            <Route path="/naib/dashboard" element={<NaibDashboard />} />
            <Route path="/naib/select-court" element={<NaibDataEntry />} />
            <Route path="/naib/entry" element={<NaibDataEntry />} />
            <Route path="/naib/alerts" element={<AlertsPage />} />
            <Route path="/naib/grievances" element={<GrievancesPage />} />
            <Route path="/naib/reports" element={<ReportsPage />} />
            <Route path="/naib/change-password" element={<ChangePassword />} />
          </Route>

          {/* Viewer Routes */}
          <Route element={<PrivateRoute roles={['viewer_district', 'viewer_state']}><Layout /></PrivateRoute>}>
            <Route path="/viewer" element={<ViewerDashboard />} />
            <Route path="/viewer/reports" element={<ReportsPage />} />
            <Route path="/viewer/change-password" element={<ChangePassword />} />
          </Route>

          <Route path="*" element={<RoleRedirect />} />
        </Routes>
      </AuthProvider>
    </LanguageProvider>
  </BrowserRouter>
  );
}

export default App;
