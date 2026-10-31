import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Printers } from './pages/Printers';
import { History } from './pages/History';
import { Monitoring } from './pages/Monitoring';
import { Reports } from './pages/Reports';
import { Users } from './pages/Users';
import { ProtectedRoute } from './ProtectedRoute';

export default createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/', element: <Layout><Dashboard /></Layout> },
      { path: '/printers', element: <Layout><Printers /></Layout> },
      { path: '/history', element: <Layout><History /></Layout> },
      { path: '/monitoring', element: <Layout><Monitoring /></Layout> },
      { path: '/reports', element: <Layout><Reports /></Layout> },
      { path: '/users', element: <Layout><Users /></Layout> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
