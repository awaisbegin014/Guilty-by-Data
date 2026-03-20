import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../../components/ui/Button';
import { Trophy, ArrowLeft, Clock, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getParticipantPrimaryLabel, getParticipantSecondaryLabel } from '../../lib/teamIdentity';

const leaderboardGridClass = 'grid min-w-[980px] grid-cols-[80px_minmax(260px,1.7fr)_88px_88px_88px_110px_100px_130px] items-center gap-4';
const headerLabelClass = 'text-[0.58rem] font-black text-muted-foreground uppercase tracking-[0.2em] font-mono';

const formatTimeAgo = (timestamp: string, now: number) => {
  const diff = Math.max(0, now - new Date(timestamp).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const formatDuration = (seconds: number | null | undefined) => {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
    return '--';
  }

  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const LeaderboardPage: React.FC = () => {
  const { team, leaderboard, serverTimeOffsetMs } = useAppStore();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now() + serverTimeOffsetMs);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setNow(Date.now() + serverTimeOffsetMs);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [serverTimeOffsetMs]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now() + serverTimeOffsetMs);
    }, 30000);

    return () => clearInterval(interval);
  }, [serverTimeOffsetMs]);

  return (
    <div className="pt-8 pb-20">
      <div className="container max-w-[1180px]">
        <div className="mb-12 flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-secondary text-primary shadow-inner-glow">
              <Trophy size={28} />
            </div>
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <Shield size={14} className="text-primary" />
                <span className="case-label">Official Registry</span>
              </div>
              <h2 className="text-2xl font-black uppercase leading-none tracking-tighter text-white sm:text-3xl">
                Investigation Standings
              </h2>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="w-full px-5 text-[0.7rem] font-black uppercase tracking-widest sm:w-auto">
            <ArrowLeft size={14} className="mr-2" />
            Command Center
          </Button>
        </div>

        <div className="dossier-card overflow-hidden rounded-2xl shadow-2xl">
          <div className="overflow-x-auto">
            <div className={cn(leaderboardGridClass, 'border-b border-border bg-slate-900/60 px-5 py-5 sm:px-8')}>
              <div className={headerLabelClass}>Rank</div>
              <div className={headerLabelClass}>Designation</div>
              <div className={cn(headerLabelClass, 'text-right')}>R1</div>
              <div className={cn(headerLabelClass, 'text-right')}>R2</div>
              <div className={cn(headerLabelClass, 'text-right')}>R3</div>
              <div className={cn(headerLabelClass, 'text-right')}>Total</div>
              <div className={cn(headerLabelClass, 'text-right')}>Time</div>
              <div className={cn(headerLabelClass, 'text-right')}>Updated</div>
            </div>

            <div className="divide-y divide-border">
              {leaderboard.map((entry) => {
                const isCurrentTeam = team?.id === entry.teamId || team?.name === entry.teamName;
                const isTop3 = entry.rank <= 3;
                const primaryLabel = getParticipantPrimaryLabel({
                  name: entry.teamName,
                  username: entry.username,
                });
                const secondaryLabel = getParticipantSecondaryLabel({
                  name: entry.teamName,
                  username: entry.username,
                });

                return (
                  <div
                    key={entry.teamId}
                    className={cn(
                      leaderboardGridClass,
                      'px-5 py-6 transition-all sm:px-8',
                      isCurrentTeam ? 'bg-primary/5' : 'hover:bg-slate-900/30',
                    )}
                  >
                    <div className="flex justify-start">
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded border font-mono text-sm font-black transition-all',
                          isTop3
                            ? (entry.rank === 1 ? 'border-primary bg-primary text-white' : 'border-slate-600 bg-secondary text-white')
                            : 'border-border bg-transparent text-muted-foreground',
                        )}
                      >
                        {entry.rank.toString().padStart(2, '0')}
                      </div>
                    </div>

                    <div className="min-w-0 pr-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={cn(
                            'break-words text-base font-black uppercase leading-tight tracking-tight sm:text-lg',
                            isCurrentTeam ? 'text-primary' : 'text-slate-200',
                          )}
                        >
                          {primaryLabel}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          {secondaryLabel && (
                            <span className="font-mono text-[0.58rem] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                              ID // {secondaryLabel}
                            </span>
                          )}
                          {isCurrentTeam && (
                            <span className="font-mono text-[0.55rem] font-bold uppercase tracking-[0.28em] text-primary">
                              Current Team
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {[entry.round1Score, entry.round2Score, entry.round3Score, entry.totalScore].map((score, idx) => (
                      <div key={`${entry.teamId}-${idx}`} className="text-right">
                        <span
                          className={cn(
                            idx === 3 ? 'text-xl' : 'text-base',
                            'font-mono font-black tracking-tighter',
                            isTop3 ? 'text-white' : 'text-slate-300',
                          )}
                        >
                          {score.toLocaleString()}
                        </span>
                      </div>
                    ))}

                    <div className="text-right">
                      <span className="font-mono text-sm font-black tracking-tight text-slate-200">
                        {formatDuration(entry.totalTimeSeconds)}
                      </span>
                    </div>

                    <div className="flex justify-end">
                      <div className="flex items-center gap-1.5 font-mono text-[0.65rem] font-black uppercase tracking-widest text-muted-foreground">
                        <Clock size={12} />
                        <span>{formatTimeAgo(entry.updatedAt, now)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <p className="case-label opacity-30">Investigation Registry v2.4a</p>
          <p className="font-mono text-[0.58rem] font-black uppercase tracking-[0.24em] text-slate-500">
            Tie-break: higher score first, lower total time second
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-6">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-muted-foreground">Live Feed Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-muted-foreground">Sync: Nominal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
