import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { Layout } from './components/Layout';

import { TeamLoginPage } from './pages/auth/TeamLoginPage';

import { DashboardPage } from './pages/dashboard/DashboardPage';
import { LeaderboardPage } from './pages/leaderboard/LeaderboardPage';
import { RoundOverviewPage } from './pages/rounds/RoundOverviewPage';
import { RoundDocsPage } from './pages/rounds/RoundDocsPage';
import { QuestionPage } from './pages/rounds/QuestionPage';
import { RoundSubmissionPage } from './pages/rounds/RoundSubmissionPage';
import { CompetitionCompletePage } from './pages/rounds/CompetitionCompletePage';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { team } = useAppStore();
  const location = useLocation();

  if (!team) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { team } = useAppStore();
  if (team) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

function App() {
  // Initialize config/state if needed

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>

          <Route path="/" element={
            <PublicRoute>
              <TeamLoginPage />
            </PublicRoute>
          } />

          <Route path="/dashboard" element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          } />

          <Route path="/leaderboard" element={
            <PrivateRoute>
              <LeaderboardPage />
            </PrivateRoute>
          } />

          <Route path="/round/:roundId" element={
            <PrivateRoute>
              <RoundOverviewPage />
            </PrivateRoute>
          } />

          <Route path="/round/:roundId/docs" element={
            <PrivateRoute>
              <RoundDocsPage />
            </PrivateRoute>
          } />

          <Route path="/round/:roundId/q/:questionIndex" element={
            <PrivateRoute>
              <QuestionPage />
            </PrivateRoute>
          } />

          <Route path="/round/:roundId/submitted" element={
            <PrivateRoute>
              <RoundSubmissionPage />
            </PrivateRoute>
          } />

          <Route path="/complete" element={
            <PrivateRoute>
              <CompetitionCompletePage />
            </PrivateRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
