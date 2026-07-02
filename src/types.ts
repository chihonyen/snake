export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Position {
  x: number;
  y: number;
}

export type GameMode = 'CLASSIC' | 'OBSTACLE' | 'PORTAL'; // Classic, With obstacles, Wrap-around (portal)

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface Food {
  position: Position;
  type: 'NORMAL' | 'GOLDEN' | 'CHILI'; // Normal +1, Golden +3, Chili +2 with temporary speed boost
  expiresAt?: number; // For golden and chili which can disappear
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  mode: GameMode;
  difficulty: Difficulty;
  date: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}
