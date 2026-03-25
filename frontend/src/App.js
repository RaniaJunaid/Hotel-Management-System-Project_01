import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Login        from './pages/Login';
import Dashboard    from './pages/Dashboard';
import Rooms        from './pages/Rooms';
import Guests       from './pages/Guests';
import Reservations from './pages/Reservations';
import Invoices     from './pages/Invoices';
import Users from './pages/Users';
import Housekeeping from './pages/Housekeeping';
import Reports      from './pages/Reports';
import './App.css';

const Layout = ({ children }) => (
  <div className="app-layout">
    <Sidebar />
    <main className="main-content">{children}</main>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          }/>

          <Route path="/rooms" element={
            <ProtectedRoute allowedRoles={['Admin','Manager','Receptionist']}>
              <Layout><Rooms /></Layout>
            </ProtectedRoute>
          }/>

          <Route path="/guests" element={
            <ProtectedRoute allowedRoles={['Admin','Manager','Receptionist']}>
              <Layout><Guests /></Layout>
            </ProtectedRoute>
          }/>

          <Route path="/reservations" element={
            <ProtectedRoute allowedRoles={['Admin','Manager','Receptionist']}>
              <Layout><Reservations /></Layout>
            </ProtectedRoute>
          }/>

          <Route path="/invoices" element={
            <ProtectedRoute allowedRoles={['Admin','Manager']}>
              <Layout><Invoices /></Layout>
            </ProtectedRoute>
          }/>

          <Route path="/users" element={
            <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                <Layout><Users /></Layout>
            </ProtectedRoute>
          }/>

          <Route path="/housekeeping" element={
            <ProtectedRoute allowedRoles={['Admin','Manager','Housekeeping']}>
              <Layout><Housekeeping /></Layout>
            </ProtectedRoute>
          }/>

          <Route path="/reports" element={
            <ProtectedRoute allowedRoles={['Admin','Manager']}>
              <Layout><Reports /></Layout>
            </ProtectedRoute>
          }/>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}