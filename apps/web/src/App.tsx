import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserRole } from '@my-cura/shared-types';
import { useAuthStore } from './stores/auth.store';
import { AuthLayout } from './components/layout/AuthLayout';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Auth pages
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { TwoFactorPage } from './pages/auth/TwoFactorPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

// Dashboard pages
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { SchedulingPage } from './pages/scheduling/SchedulingPage';
import { WorkersPage } from './pages/workers/WorkersPage';
import { ServiceUsersPage } from './pages/service-users/ServiceUsersPage';
import { ServiceUserProfilePage } from './pages/service-users/ServiceUserProfilePage';
import { PayrollPage } from './pages/payroll/PayrollPage';
import { MARPage } from './pages/mar/MARPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { FinancePage } from './pages/finance/FinancePage';
import { AnalyticsPage } from './pages/analytics/AnalyticsPage';
import { IncidentsPage } from './pages/incidents/IncidentsPage';
import { MessagingPage } from './pages/messaging/MessagingPage';
import { TrainingPage } from './pages/training/TrainingPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { PoliciesPage } from './pages/policies/PoliciesPage';
import { ImportPage } from './pages/imports/ImportPage';
import { ExpensesPage } from './pages/expenses/ExpensesPage';
import { RecruitmentPage } from './pages/recruitment/RecruitmentPage';
import { WhistleblowingPage } from './pages/whistleblowing/WhistleblowingPage';

// The web portal is for agency staff only; care workers, service users and
// family members use the mobile app.
const PORTAL_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.AGENCY_OWNER, UserRole.MANAGER];

function PortalAccessDenied() {
  const logout = useAuthStore((s) => s.logout);
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          This portal is for agency administrators
        </h1>
        <p className="text-sm text-slate-500" data-testid="portal-denied">
          Your account doesn&apos;t have access to the admin portal. Please use the
          My-Cura mobile app to view your shifts, clock in and out, and request leave.
        </p>
        <button className="text-sm font-medium text-primary-500 hover:underline" onClick={() => logout()}>
          Sign in with a different account
        </button>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && !PORTAL_ROLES.includes(user.role)) return <PortalAccessDenied />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
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
          <Route path="/service-users/:id" element={<ServiceUserProfilePage />} />
          <Route path="/payroll" element={<PayrollPage />} />
          <Route path="/mar" element={<MARPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/policies" element={<PoliciesPage />} />
          <Route path="/whistleblowing" element={<WhistleblowingPage />} />
          <Route path="/messaging" element={<MessagingPage />} />
          <Route path="/training" element={<TrainingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/imports" element={<ImportPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/recruitment" element={<RecruitmentPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
