import type { Ball, Point } from './golf';

export const PLAYER_COLORS = ['#fff8dc', '#3abef2'] as const;
export type Seat = 0 | 1;
export type PlayerProfile = { username: string; avatar?: string };

export type PlayerSnapshot = {
  seat: Seat;
  profile?: PlayerProfile;
  ball: Ball;
  strokes: number;
  score: number | null;
  connected: boolean;
  scores: number[];
  waterDrops: number;
  splash: Point | null;
};

export type RoomSnapshot = {
  code: string;
  phase: 'waiting' | 'playing' | 'between' | 'finished';
  hole: number;
  elapsedMs: number;
  remainingMs: number;
  players: PlayerSnapshot[];
};

export type RoomCommand =
  | { type: 'create' }
  | { type: 'join'; code: string }
  | { type: 'join-naka'; sessionId: string; token: string }
  | { type: 'resume'; code: string; token: string }
  | { type: 'shot'; angle: number; power: number; stroke: number; hole: number }
  | { type: 'leave' };

export type RoomMessage =
  | { type: 'joined'; code: string; token: string; seat: Seat; room: RoomSnapshot }
  | { type: 'room'; room: RoomSnapshot }
  | { type: 'error'; message: string; fatal?: boolean };
