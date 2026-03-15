import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { Layout } from './components/Layout';
import { AdminLayout } from './components/AdminLayout';

import { TeamLoginPage } from './pages/auth/TeamLoginPage';
import { AdminLoginPage } from './pages/auth/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminRoundManager } from './pages/admin/AdminRoundManager';
import { AdminQuestionManager } from './pages/admin/AdminQuestionManager';

import { DashboardPage } from './pages/dashboard/DashboardPage';
import { LeaderboardPage } from './pages/leaderboard/LeaderboardPage';
import { RoundOverviewPage } from './pages/rounds/RoundOverviewPage';
import { RoundDocsPage } from './pages/rounds/RoundDocsPage';
import { QuestionPage } from './pages/rounds/QuestionPage';
import { RoundSubmissionPage } from './pages/rounds/RoundSubmissionPage';
import { CompetitionCompletePage } from './pages/rounds/CompetitionCompletePage';

// Guard: must be logged in as a team
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { team } = useAppStore();
  const location = useLocation();
  if (!team) return <Navigate to="/" state={{ from: location }} replace />;
  return <>{children}</>;
};

// Guard: must be logged in as admin
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin } = useAppStore();
  const location = useLocation();
  if (!isAdmin) return <Navigate to="/admin/login" state={{ from: location }} replace />;
  return <>{children}</>;
};

// Guard: redirect logged-in teams away from login page
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { team } = useAppStore();
  if (team) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { authReady, bootstrapApp } = useAppStore();

  useEffect(() => {
    void bootstrapApp();
  }, [bootstrapApp]);

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground bg-analytical-grid">
        <div className="dossier-card rounded-xl px-8 py-6 text-center">
          <p className="case-label mb-2">System Bootstrap</p>
          <h1 className="text-xl font-black text-white uppercase tracking-widest">Restoring Session</h1>
        </div>
      </div>
    );
  }

  return (
    <Routes>

      {/* ── ADMIN LOGIN — standalone, no shell ── */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* ── ADMIN PANEL — AdminLayout shell ── */}
      <Route path="/admin" element={
        <AdminRoute>
          <AdminLayout />
        </AdminRoute>
      }>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="rounds" element={<AdminRoundManager />} />
        <Route path="questions" element={<AdminQuestionManager />} />
      </Route>

      {/* ── PARTICIPANT AREA — Layout shell ── */}
      <Route element={<Layout />}>
        <Route path="/" element={
          <PublicRoute>
            <TeamLoginPage />
          </PublicRoute>
        } />

        <Route path="/dashboard" element={
          <PrivateRoute><DashboardPage /></PrivateRoute>
        } />

        <Route path="/leaderboard" element={
          <PrivateRoute><LeaderboardPage /></PrivateRoute>
        } />

        <Route path="/round/:roundId" element={
          <PrivateRoute><RoundOverviewPage /></PrivateRoute>
        } />

        <Route path="/round/:roundId/docs" element={
          <PrivateRoute><RoundDocsPage /></PrivateRoute>
        } />

        <Route path="/round/:roundId/q/:questionIndex" element={
          <PrivateRoute><QuestionPage /></PrivateRoute>
        } />

        <Route path="/round/:roundId/submitted" element={
          <PrivateRoute><RoundSubmissionPage /></PrivateRoute>
        } />

        <Route path="/complete" element={
          <PrivateRoute><CompetitionCompletePage /></PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>

    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
