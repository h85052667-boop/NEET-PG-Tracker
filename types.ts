export type ConcentrationLevel = 1 | 2 | 3 | 4 | 5;

export interface StudySession {
  id: string;
  subject: string;
  startTime: number; // timestamp in ms
  endTime: number; // timestamp in ms
  duration: number; // in seconds
  concentration: ConcentrationLevel;
  notes?: string;
}

export interface MCQLog {
  id: string;
  timestamp: number;
  count: number;
  verified: boolean;
  feedback: string;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  totalDuration: number; // minutes
  avgConcentration: number;
  sessionsCount: number;
}

export interface SubjectDistribution {
  name: string;
  value: number; // total duration
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  TIMER = 'TIMER',
  HISTORY = 'HISTORY',
  INSIGHTS = 'INSIGHTS',
  SETTINGS = 'SETTINGS',
  MCQ = 'MCQ',
}