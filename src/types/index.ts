export interface Team {
  id: string;
  name: string;
  username: string;
  email?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface Option {
  id: string;
  text: string;
  score: number;
  orderIndex?: number;
}

export interface Question {
  id: string;
  roundId: string;
  questionIndex: number;
  text: string;
  options: Option[];
  correctOptionId?: string | null;
  type?: 'mcq' | 'blank';
  inputType?: 'int' | 'float' | 'string' | null;
}

export interface Round {
  id: string;
  orderIndex: number;
  title: string;
  description: string;
  objective: string;
  caseBrief: string;
  zipPassword: string | null;
  documentation: {
    sectionTitle: string;
    content: string;
  }[];
  status: 'draft' | 'open' | 'closed';
  timerMinutes: number;
  timerState: 'idle' | 'running' | 'paused' | 'expired';
  timerDurationSeconds: number;
  timerRemainingSeconds: number | null;
  startsAt: string | null;
  endsAt: string | null;
  questionCount: number;
  contentVisible: boolean;
  questions: Question[];
}

export interface RoundProgress {
  roundId: string;
  status: 'locked' | 'not_started' | 'available' | 'in_progress' | 'paused' | 'expired' | 'submitted';
  answers: Record<string, string>; // questionId -> optionId
  submittedAt: string | null;
  timeTakenSeconds: number | null;
  docsVisited: boolean;
  resourceViewed: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  username: string;
  round1Score: number;
  round2Score: number;
  round3Score: number;
  totalScore: number;
  totalTimeSeconds: number | null;
  updatedAt: string;
}

export interface AppSession {
  team: Team | null;
  draftProgressByRound: Record<string, Pick<RoundProgress, 'answers' | 'docsVisited' | 'resourceViewed'>>;
}

export interface RoundSubmission {
  id: string;
  roundId: string;
  submittedAt: string;
  totalScore: number | null;
  timeTakenSeconds: number | null;
  status: 'accepted' | 'rejected';
}
