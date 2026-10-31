import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './services/auth';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <main className="loading">Carregando sessão…</main>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
