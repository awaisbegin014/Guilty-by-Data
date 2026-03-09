export interface Team {
  id: string;
  name: string;
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
  correctOptionId: string;
}

export interface Round {
  id: string;
  title: string;
  description: string;
  objective: string;
  caseBrief: string;
  datasetTitle: string;
  datasetDescription: string;
  documentation: {
    sectionTitle: string;
    content: string;
  }[];
  questions: Question[];
}

export interface RoundProgress {
  roundId: string;
  status: 'locked' | 'available' | 'in_progress' | 'submitted';
  timerStartedAt: number | null;
  timeRemainingMs: number | null;
  answers: Record<string, string>; // questionId -> optionId
  submittedAt: number | null;
  docsVisited: boolean;
  datasetOpened: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  points: number;
  roundsCompleted: number;
  latestSubmissionTime: number;
}

export interface AppSession {
  team: Team | null;
  unlockedRounds: string[]; // array of roundIds
}
