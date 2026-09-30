import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Instruments from './pages/Instruments';
import InstrumentDetail from './pages/InstrumentDetail';
import VerificationForm from './pages/VerificationForm';
import CertificateView from './pages/CertificateView';
import VerifyPublic from './pages/VerifyPublic';
import AuditLogs from './pages/AuditLogs';
import Users from './pages/Users';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/verify/:token" element={<VerifyPublic />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instruments"
        element={
          <ProtectedRoute>
            <Instruments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instruments/:id"
        element={
          <ProtectedRoute>
            <InstrumentDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/verifications/:id"
        element={
          <ProtectedRoute roles={['ADMIN', 'LMO', 'GATC']}>
            <VerificationForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/certificates/:id"
        element={
          <ProtectedRoute>
            <CertificateView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <AuditLogs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute roles={['ADMIN', 'LMO', 'GATC']}>
            <Users />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
