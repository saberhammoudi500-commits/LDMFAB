import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { AuthProvider } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { RealisationsPage } from './pages/RealisationsPage';
import { UsersPage } from './pages/UsersPage';
import { RolesPage } from './pages/RolesPage';
import { AuditPage } from './pages/AuditPage';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/changer-mot-de-passe" element={<ChangePasswordPage />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<ProtectedRoute perm="dashboard:read"><DashboardPage /></ProtectedRoute>} />
            <Route path="/realisations" element={<ProtectedRoute perm="of:read"><RealisationsPage /></ProtectedRoute>} />
            <Route path="/utilisateurs" element={<ProtectedRoute perm="users:read"><UsersPage /></ProtectedRoute>} />
            <Route path="/roles" element={<ProtectedRoute perm="roles:read"><RolesPage /></ProtectedRoute>} />
            <Route path="/audit" element={<ProtectedRoute perm="audit:read"><AuditPage /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>,
);
