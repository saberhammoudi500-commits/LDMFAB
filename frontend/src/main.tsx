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
import { ReferentielsPage } from './pages/ReferentielsPage';
import { PdpPage } from './pages/PdpPage';
import { FabricationPage } from './pages/FabricationPage';
import { OFDetailPage } from './pages/OFDetailPage';
import { EncoursDdlPage } from './pages/EncoursDdlPage';
import { EffectifsPage } from './pages/EffectifsPage';

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
            <Route path="/referentiels/donneurs" element={<ProtectedRoute perm="ref:read"><ReferentielsPage tab="donneurs" /></ProtectedRoute>} />
            <Route path="/referentiels/produits" element={<ProtectedRoute perm="ref:read"><ReferentielsPage tab="produits" /></ProtectedRoute>} />
            <Route path="/referentiels/equipements" element={<ProtectedRoute perm="ref:read"><ReferentielsPage tab="equipements" /></ProtectedRoute>} />
            <Route path="/referentiels/cadences" element={<ProtectedRoute perm="ref:read"><ReferentielsPage tab="donneurs" /></ProtectedRoute>} />
            <Route path="/referentiels/pcsu" element={<ProtectedRoute perm="ref:read"><ReferentielsPage tab="donneurs" /></ProtectedRoute>} />
            <Route path="/pdp" element={<ProtectedRoute perm="pdp:read"><PdpPage /></ProtectedRoute>} />
            <Route path="/fabrication" element={<ProtectedRoute perm="of:read"><FabricationPage /></ProtectedRoute>} />
            <Route path="/fabrication/:id" element={<ProtectedRoute perm="of:read"><OFDetailPage /></ProtectedRoute>} />
            <Route path="/conditionnement" element={<ProtectedRoute perm="cndt:read"><FabricationPage /></ProtectedRoute>} />
            <Route path="/ddl" element={<ProtectedRoute perm="ddl:read"><EncoursDdlPage mode="ddl" /></ProtectedRoute>} />
            <Route path="/encours" element={<ProtectedRoute perm="of:read"><EncoursDdlPage mode="encours" /></ProtectedRoute>} />
            <Route path="/effectifs" element={<ProtectedRoute perm="hc:read"><EffectifsPage /></ProtectedRoute>} />
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
