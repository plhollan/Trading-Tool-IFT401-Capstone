import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar   from './components/Navbar';
import Login    from './pages/Login';
import Register from './pages/Register';
import Market   from './pages/Market';
import Portfolio from './pages/Portfolio';
import History  from './pages/History';
import AdminDashboard from './pages/AdminDashboard';
import AdminStocks    from './pages/AdminStocks';
import AdminMarket    from './pages/AdminMarket';
import AdminUsers     from './pages/AdminUsers';
import AdminOrders    from './pages/AdminOrders';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/market" replace />;
  return children;
}

function Layout({ children }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-14">{children}</main>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      <Route path="/login"    element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/market'} /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/market" /> : <Register />} />

      {/* Customer routes */}
      <Route path="/market" element={
        <ProtectedRoute><Layout><Market /></Layout></ProtectedRoute>
      } />
      <Route path="/portfolio" element={
        <ProtectedRoute><Layout><Portfolio /></Layout></ProtectedRoute>
      } />
      <Route path="/history" element={
        <ProtectedRoute><Layout><History /></Layout></ProtectedRoute>
      } />

      {/* Admin routes */}
      <Route path="/admin" element={
        <ProtectedRoute adminOnly><Layout><AdminDashboard /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/stocks" element={
        <ProtectedRoute adminOnly><Layout><AdminStocks /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/market" element={
        <ProtectedRoute adminOnly><Layout><AdminMarket /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute adminOnly><Layout><AdminUsers /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/orders" element={
        <ProtectedRoute adminOnly><Layout><AdminOrders /></Layout></ProtectedRoute>
      } />

      <Route path="*" element={
        <Navigate to={user ? (user.role === 'admin' ? '/admin' : '/market') : '/login'} replace />
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
