import { lazy } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import AuthLayout from './layouts/AuthLayout.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';

const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Salary = lazy(() => import('./pages/Salary.jsx'));
const Income = lazy(() => import('./pages/Income.jsx'));
const Expenses = lazy(() => import('./pages/Expenses.jsx'));
const ScanReceipt = lazy(() => import('./pages/ScanReceipt.jsx'));
const Budgets = lazy(() => import('./pages/Budgets.jsx'));
const SavingsGoals = lazy(() => import('./pages/SavingsGoals.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <Dashboard /> },
          { path: '/salary', element: <Salary /> },
          { path: '/income', element: <Income /> },
          { path: '/expenses', element: <Expenses /> },
          { path: '/scan-receipt', element: <ScanReceipt /> },
          { path: '/budgets', element: <Budgets /> },
          { path: '/savings-goals', element: <SavingsGoals /> },
          { path: '/reports', element: <Reports /> },
          { path: '/profile', element: <Profile /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
