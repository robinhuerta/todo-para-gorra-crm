
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Inventory from './pages/Inventory';
import Proformas from './pages/Proformas';
import Store from './pages/Store';
import Documents from './pages/Documents';
import Users from './pages/Users';
import Imports from './pages/Imports';

import { ThemeProvider } from './context/ThemeContext';

// Redirects non-admins away from admin-only routes
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (role !== 'admin') return <Navigate to="/store" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }>
              {/* Admin-only routes */}
              <Route index element={<AdminRoute><Dashboard /></AdminRoute>} />
              <Route path="inventory" element={<AdminRoute><Inventory /></AdminRoute>} />
              <Route path="proformas" element={<AdminRoute><Proformas /></AdminRoute>} />
              <Route path="documents" element={<AdminRoute><Documents /></AdminRoute>} />
              <Route path="users"     element={<AdminRoute><Users /></AdminRoute>} />
              <Route path="imports"  element={<AdminRoute><Imports /></AdminRoute>} />

              {/* Shared routes (admin + vendedor) */}
              <Route path="clients" element={<Clients />} />
              <Route path="store"   element={<Store />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
