import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AuthProvider } from '@/context/AuthContext';
import { ConfirmProvider } from '@/context/ConfirmContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { AppLayout } from '@/layouts/AppLayout';
import { FullScreenLoader, GuestRoute, ProtectedRoute } from '@/components/common/RouteGuards';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage, RegisterPage } from '@/pages/AuthPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ReceiptsPage } from '@/pages/ReceiptsPage';
import { ExpensesPage } from '@/pages/ExpensesPage';
import { DailyTrackerPage } from '@/pages/DailyTrackerPage';
import { CategoriesPage } from '@/pages/CategoriesPage';
import { BudgetsPage } from '@/pages/BudgetsPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { SettingsPage } from '@/pages/SettingsPage';

// Heavier pages load on demand (OCR and charts stay out of the first bundle).
const ScanReceiptPage = lazy(() => import('@/pages/ScanReceiptPage').then((m) => ({ default: m.ScanReceiptPage })));
const ReportsPage = lazy(() => import('@/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));

export function AppRoutes() {
  return (
    <Suspense fallback={<FullScreenLoader label="Loading…" />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/scan-receipt" element={<ScanReceiptPage />} />
            <Route path="/receipts" element={<ReceiptsPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/daily-tracker" element={<DailyTrackerPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/budgets" element={<BudgetsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Old .html links keep working. */}
        <Route path="/index.html" element={<Navigate to="/" replace />} />
        <Route path="/login.html" element={<Navigate to="/login" replace />} />
        <Route path="/register.html" element={<Navigate to="/register" replace />} />
        <Route path="/pages/:page" element={<LegacyRedirect />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

function LegacyRedirect() {
  const page = window.location.pathname.split('/').pop()?.replace(/\.html$/, '') ?? 'dashboard';
  return <Navigate to={`/${page}`} replace />;
}

export default function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

  return (
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
          <BrowserRouter basename={basename}>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
