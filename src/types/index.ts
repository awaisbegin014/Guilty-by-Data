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

export interface CompetitionConfig {
  totalRounds: number;
  questionsPerRound: number;
  timerMinutesPerRound: number;
  timerStartMode: 'round_open' | 'mcq_start';
  questionNavigationMode: 'bidirectional' | 'one_way';
  sequentialRoundUnlock: boolean;
  leaderboardEnabled: boolean;
  showScoresImmediately: boolean;
}

export interface Option {
  id: string;
  text: string;
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
  datasetTitle: string;
  datasetDescription: string;
  datasetLink?: string;
  datasetVisible?: boolean;
  datasetPassword?: string | null;
  documentation: {
    sectionTitle: string;
    content: string;
  }[];
  status: 'draft' | 'open' | 'closed';
  timerMinutes: number;
  startsAt: string | null;
  endsAt: string | null;
  questions: Question[];
}

export interface RoundProgress {
  roundId: string;
  status: 'locked' | 'available' | 'in_progress' | 'submitted';
  answers: Record<string, string>; // questionId -> optionId
  submittedAt: string | null;
  docsVisited: boolean;
  datasetOpened: boolean;
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
  updatedAt: string;
}

export interface AppSession {
  team: Team | null;
  draftProgressByRound: Record<string, Pick<RoundProgress, 'answers' | 'docsVisited' | 'datasetOpened'>>;
}

export interface RoundSubmission {
  id: string;
  roundId: string;
  submittedAt: string;
  totalScore: number | null;
  status: 'accepted' | 'rejected';
}
