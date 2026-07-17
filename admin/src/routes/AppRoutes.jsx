import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';
import Login from '../pages/auth/Login';
import Dashboard from '../pages/dashboard/Dashboard';
import Franchises from '../pages/franchises/Franchises';
import CreateFranchise from '../pages/franchises/CreateFranchise';
import Distributors from '../pages/distributors/Distributors';
import AuditLogs from '../pages/audit/AuditLogs';

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="franchises" element={<Franchises />} />
            <Route path="franchises/create" element={<CreateFranchise />} />
            <Route path="distributors" element={<Distributors />} />
            <Route path="audit-logs" element={<AuditLogs />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
