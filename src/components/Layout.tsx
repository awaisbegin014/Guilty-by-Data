import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { UserCircle, Trophy, LogOut, Database } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getParticipantPrimaryLabel } from '../lib/teamIdentity';

export const Layout: React.FC = () => {
  const { team, logout } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isLeaderboard = location.pathname === '/leaderboard';
  const participantLabel = team
    ? getParticipantPrimaryLabel({ name: team.name, username: team.username, email: team.email })
    : '';


  return (
    <div className={`flex h-screen flex-col overflow-hidden text-foreground ${
      location.pathname === '/' ? 'bg-background bg-analytical-grid' : 'bg-general-image'
    }`}>
      <header className="z-40 shrink-0 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            className={`group flex items-center gap-3 ${team ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={() => team && navigate('/dashboard')}
          >
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-border bg-secondary shadow-inner-glow transition-all group-hover:border-primary/50 sm:h-11 sm:w-11">
              <picture>
                <source type="image/webp" srcSet="/logo-96.webp 1x, /logo-160.webp 2x" />
                <source type="image/png" srcSet="/logo-96.png 1x, /logo-160.png 2x" />
                <img src="/logo-96.webp" alt="Guilty By Data Logo" className="h-full w-full object-cover" width="44" height="44" />
              </picture>
            </div>
            <div className="min-w-0">
              <div className="font-black leading-tight tracking-tighter text-white uppercase text-sm sm:text-base">Guilty By Data</div>
              <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[0.52rem] font-bold uppercase tracking-[0.2em] text-muted-foreground sm:text-[0.55rem]">
                <Database size={9} />
                <span>investigation portal</span>
              </div>
            </div>
          </div>

          {team && (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-border bg-slate-900/50 px-4 py-1.5 shadow-sm min-w-0 sm:max-w-[360px]">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-inner-glow">
                  <UserCircle size={14} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[0.8rem] font-black text-white leading-none">
                    {participantLabel}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 sm:gap-3">
                <button
                  onClick={() => navigate(isLeaderboard ? '/dashboard' : '/leaderboard')}
                  className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/10 transition-all hover:brightness-110 active:scale-95"
                >
                  <Trophy size={12} />
                  {isLeaderboard ? 'Dashboard' : 'Leaderboard'}
                </button>

                <button
                  onClick={() => void handleLogout()}
                  title="Secure Logout"
                  className="flex items-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-white"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="relative flex-1 overflow-y-auto pt-4">
        <div className="flex min-h-full flex-col">
          <div className="flex-1 flex flex-col items-stretch">
            <Outlet />
          </div>

          <footer className="mt-auto shrink-0 border-t border-border bg-card/50 py-3">
            <div className="container">
              <div className="flex flex-col items-center justify-between gap-2 md:flex-row">
                <div className="text-left">
                  <p className="case-label mb-0.5">System Status: Active</p>
                  <p className="text-[0.6rem] font-medium uppercase tracking-tight text-muted-foreground">
                    Investigation Terminal v2.4.0 // Secured Protocol Active
                  </p>
                </div>
                <div className="text-center md:text-right">
                  <p className="text-[0.6rem] font-medium uppercase tracking-tight text-muted-foreground">
                    © {new Date().getFullYear()} Guilty By Data · Competitive Analytics Platform
                  </p>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
};
