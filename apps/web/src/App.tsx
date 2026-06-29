import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import { AuthLayout } from './components/layout/AuthLayout';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Auth pages
import { LoginPage } from './pages/auth/LoginPage';
import { TwoFactorPage } from './pages/auth/TwoFactorPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

// Dashboard pages
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { SchedulingPage } from './pages/scheduling/SchedulingPage';
import { WorkersPage } from './pages/workers/WorkersPage';
import { ServiceUsersPage } from './pages/service-users/ServiceUsersPage';
import { PayrollPage } from './pages/payroll/PayrollPage';
import { MARPage } from './pages/mar/MARPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { FinancePage } from './pages/finance/FinancePage';
import { AnalyticsPage } from './pages/analytics/AnalyticsPage';
import { IncidentsPage } from './pages/incidents/IncidentsPage';
import { MessagingPage } from './pages/messaging/MessagingPage';
import { TrainingPage } from './pages/training/TrainingPage';
import { SettingsPage } from './pages/settings/SettingsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/2fa" element={<TwoFactorPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Protected dashboard routes */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/scheduling" element={<SchedulingPage />} />
          <Route path="/workers" element={<WorkersPage />} />
          <Route path="/service-users" element={<ServiceUsersPage />} />
          <Route path="/payroll" element={<PayrollPage />} />
          <Route path="/mar" element={<MARPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/messaging" element={<MessagingPage />} />
          <Route path="/training" element={<TrainingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
