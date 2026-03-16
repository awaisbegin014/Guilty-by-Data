import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { Layout } from './components/Layout';
import { AdminLayout } from './components/AdminLayout';
import { supabase } from './lib/supabase';

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
  const { authReady, bootstrapApp, team, refreshParticipantData } = useAppStore();
  const location = useLocation();

  useEffect(() => {
    void bootstrapApp();
  }, [bootstrapApp]);

  useEffect(() => {
    if (!team) {
      return;
    }

    void refreshParticipantData();
  }, [location.pathname, refreshParticipantData, team]);

  useEffect(() => {
    if (!team) {
      return;
    }

    const handleFocusRefresh = () => {
      void refreshParticipantData();
    };

    window.addEventListener('focus', handleFocusRefresh);
    document.addEventListener('visibilitychange', handleFocusRefresh);

    return () => {
      window.removeEventListener('focus', handleFocusRefresh);
      document.removeEventListener('visibilitychange', handleFocusRefresh);
    };
  }, [refreshParticipantData, team]);

  useEffect(() => {
    if (!team || !supabase) {
      return;
    }

    const client = supabase;
    const channel = client
      .channel(`participant-sync:${team.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'round_public_state' },
        () => {
          void refreshParticipantData();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leaderboard' },
        () => {
          void refreshParticipantData();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions', filter: `team_id=eq.${team.id}` },
        () => {
          void refreshParticipantData();
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [refreshParticipantData, team]);

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground bg-analytical-grid px-6">
        <div className="dossier-card rounded-2xl px-8 py-8 text-center max-w-lg w-full relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
          <p className="case-label mb-3">Casefile Recovery</p>
          <h1 className="text-2xl font-black text-white uppercase tracking-[0.25em]">Restoring Secure Session</h1>
          <p className="mt-4 text-sm text-slate-300 leading-relaxed">
            Reopening the evidence locker, reattaching your credentials, and checking which investigation files are live.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-[0.65rem] font-mono font-black uppercase tracking-[0.28em] text-primary">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span>Detective Console Initializing</span>
          </div>
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
