import type { Ball, CourseLayout, Point } from './golf';

export const SEATS = [0, 1, 2, 3, 4, 5] as const;
export type Seat = (typeof SEATS)[number];
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = SEATS.length;
export const ROOM_SIZES = [2, 3, 4, 5, 6] as const;
export const PLAYER_COLORS = ['#fff8dc', '#3abef2', '#ff8b81', '#9be988', '#c7a4ff', '#ffd36b'] as const;
export const PLAYER_NAMES = ['White', 'Blue', 'Coral', 'Green', 'Violet', 'Gold'] as const;
export const isSeat = (value: unknown): value is Seat => SEATS.some((seat) => seat === value);
export type PlayerProfile = { username: string; avatar?: string };

export type PlayerSnapshot = {
  seat: Seat;
  profile?: PlayerProfile;
  ball: Ball;
  strokes: number;
  score: number | null;
  connected: boolean;
  forfeited?: boolean;
  scores: number[];
  waterDrops: number;
  splash: Point | null;
};

export function rankPlayers<T extends { scores: number[]; forfeited?: boolean }>(players: readonly T[]) {
  const totals = players.map((player) => ({
    player, score: player.scores.reduce((sum, strokes) => sum + strokes, 0),
  })).sort((a, b) => Number(Boolean(a.player.forfeited)) - Number(Boolean(b.player.forfeited)) || a.score - b.score);
  let rank = 1;
  return totals.map((entry, index) => {
    const previous = totals[index - 1];
    if (previous && (entry.score !== previous.score || !!entry.player.forfeited !== !!previous.player.forfeited)) {
      rank = index + 1;
    }
    return { ...entry, rank };
  });
}

export type RoomSnapshot = {
  code: string;
  capacity: number;
  phase: 'waiting' | 'playing' | 'between' | 'finished';
  hole: number;
  layouts: readonly CourseLayout[];
  elapsedMs: number;
  remainingMs: number;
  players: PlayerSnapshot[];
};

export type RoomCommand =
  | { type: 'create'; capacity?: number }
  | { type: 'join'; code: string }
  | { type: 'join-naka'; sessionId: string; token: string }
  | { type: 'resume'; code: string; token: string }
  | { type: 'shot'; angle: number; power: number; stroke: number; hole: number }
  | { type: 'leave' };

export type RoomMessage =
  | { type: 'joined'; code: string; token: string; seat: Seat; room: RoomSnapshot }
  | { type: 'room'; room: RoomSnapshot }
  | { type: 'error'; message: string; fatal?: boolean };
