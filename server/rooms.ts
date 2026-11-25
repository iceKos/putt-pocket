import { randomBytes, randomInt } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { createNakaPlatform, NakaPlatformError, type RosterPlayer } from '../docs/game-kit/naka-platform.ts';
import { COURSES, createBall, launch, moving, SHOT_LIMIT, STEP, stepPutt, TURNOVER_SECONDS, type CourseLayout, type Point } from '../src/golf.ts';
import type { PlayerProfile, PlayerSnapshot, RoomMessage, RoomSnapshot, Seat } from '../src/room-protocol.ts';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_TTL = 5 * 60_000;
type Player = {
  seat: Seat;
  userId?: string;
  profile?: PlayerProfile;
  socket: WebSocket | null;
  token: string;
  ball: ReturnType<typeof createBall>;
  strokes: number;
  score: number | null;
  scores: number[];
  lie: Point;
  waterDrops: number;
  splash: Point | null;
};
type Room = {
  code: string;
  players: Player[];
  phase: RoomSnapshot['phase'];
  deadline: number;
  expires: number;
  hole: number;
  layouts: readonly CourseLayout[];
  startedAt: number;
  elapsedMs: number;
};
type Membership = { room: Room; player: Player };

function send(socket: WebSocket | null, message: RoomMessage) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  if (socket.bufferedAmount > 64_000) {
    socket.terminate();
    return;
  }
  socket.send(JSON.stringify(message));
}

function snapshot(room: Room, now = performance.now()): RoomSnapshot {
  const players: PlayerSnapshot[] = room.players.map((p) => ({
    seat: p.seat, profile: p.profile, strokes: p.strokes, score: p.score,
    scores: p.scores, waterDrops: p.waterDrops, splash: p.splash,
    ball: p.ball, connected: p.socket?.readyState === WebSocket.OPEN,
  }));
  return {
    code: room.code, phase: room.phase, players, hole: room.hole, layouts: room.layouts, elapsedMs: room.elapsedMs,
    remainingMs: room.phase === 'waiting' ? COURSES[room.hole].seconds * 1000 : Math.max(0, room.deadline - now),
  };
}

function broadcast(room: Room, now?: number) {
  const state = snapshot(room, now);
  for (const player of room.players) send(player.socket, { type: 'room', room: state });
}

export function attachRooms() {
  const server = new WebSocketServer({ noServer: true, maxPayload: 4096 });
  const rooms = new Map<string, Room>();
  const apiUrl = process.env.NAKA_API_URL;
  const serverKey = process.env.NAKA_SERVER_KEY;
  const platform = process.env.PLATFORM === 'naka' && apiUrl && serverKey
    ? createNakaPlatform({ apiUrl, serverKey, log: () => {} }) : null;
  function removePlayer({ room, player }: Membership) {
    player.socket = null;
    player.token = '';
    if (room.phase === 'waiting') {
      rooms.delete(room.code);
      for (const other of room.players) {
        send(other.socket, { type: 'error', message: 'Your friend closed this room.', fatal: true });
        other.socket?.close(1000);
      }
    } else if (room.phase === 'playing' && player.score === null) {
      player.score = SHOT_LIMIT + 1;
      player.ball.vx = player.ball.vz = 0;
    }
    broadcast(room);
  }

  server.on('connection', (socket) => {
    let membership: Membership | undefined;
    let identifying = false;
    let messageCount = 0;
    let windowStart = performance.now();
    let alive = true;
    const reject = (message: string, fatal = false) => send(socket, { type: 'error', message, fatal });
    const heartbeat = setInterval(() => {
      if (!alive) return socket.terminate();
      alive = false;
      socket.ping();
    }, 25_000);
    heartbeat.unref();
    socket.on('pong', () => { alive = true; });
    socket.on('error', () => socket.terminate());

    function connect(room: Room, player: Player) {
      const previous = player.socket;
      player.socket = socket;
      membership = { room, player };
      if (room.phase === 'waiting') {
        player.ball = createBall(room.hole, room.layouts[room.hole]);
        player.lie = { ...player.ball };
      }
      if (room.phase === 'waiting' && room.players.length === 2
        && room.players.every((p) => p.socket?.readyState === WebSocket.OPEN)) {
        beginHole(room, performance.now());
      }
      if (previous && previous !== socket) previous.close(4001, 'Joined from another tab');
      send(socket, { type: 'joined', code: room.code, token: player.token, seat: player.seat, room: snapshot(room) });
      broadcast(room);
    }

    async function joinNaka(sessionId: unknown, token: unknown) {
      if (!platform) return reject('Naka Lite sign-in is unavailable for this game server.', true);
      if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 128
        || typeof token !== 'string' || !token || token.length > 3600) {
        return reject('Open the match again from the Naka Lite lobby.', true);
      }
      identifying = true;
      try {
        const { player, session } = await platform.identify(token);
        if (socket.readyState !== WebSocket.OPEN) return;
        if (session.sessionId !== sessionId || session.status !== 'launching'
          || session.roster.length !== 2 || session.roster[0].userId === session.roster[1].userId
          || !session.roster.some((entry) => entry.userId === player.userId)) {
          return reject('This Naka Lite match needs two verified players.', true);
        }
        const code = `naka:${session.sessionId}`;
        const now = performance.now();
        let room = rooms.get(code);
        if (room && room.expires <= now) return reject('This room has expired.', true);
        if (!room) {
          if (rooms.size >= 250) return reject('All rooms are busy. Try again in a minute.', true);
          const [first, second] = session.roster;
          room = makeRoom(code, [makePlayer(0, first), makePlayer(1, second)], now);
          rooms.set(code, room);
        }
        const member = room.players.find((entry) => entry.userId === player.userId);
        if (!member?.token) return reject('You no longer have a seat in this match.', true);
        const profile = playerProfile(player);
        member.profile = { ...member.profile, ...profile };
        connect(room, member);
      } catch (error) {
        reject(error instanceof NakaPlatformError ? error.message : 'Could not verify this Naka Lite match.', true);
      } finally {
        identifying = false;
      }
    }

    socket.on('message', (raw, binary) => {
      const now = performance.now();
      if (now - windowStart > 1000) {
        messageCount = 0;
        windowStart = now;
      }
      if (++messageCount > 24 || binary) return socket.close(1008);
      let command: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(raw.toString());
        if (!parsed || typeof parsed !== 'object') return;
        command = parsed as Record<string, unknown>;
      } catch {
        return;
      }

      if (membership) {
        const { room, player } = membership;
        if (player.socket !== socket) return;
        if (command.type === 'leave') {
          removePlayer(membership);
          membership = undefined;
          return socket.close(1000);
        }
        if (command.type !== 'shot') return;
        const { angle, power, stroke } = command;
        if (room.phase !== 'playing' || now >= room.deadline || player.score !== null || moving(player.ball)
          || command.hole !== room.hole || stroke !== player.strokes || typeof angle !== 'number' || !Number.isFinite(angle)
          || typeof power !== 'number' || !Number.isFinite(power) || power < 0.035 || power > 1) {
          return send(socket, { type: 'room', room: snapshot(room, now) });
        }
        player.lie = { x: player.ball.x, z: player.ball.z };
        launch(player.ball, angle, power);
        player.strokes++;
        broadcast(room, now);
        return;
      }

      if (identifying) return;
      if (command.type === 'join-naka') {
        void joinNaka(command.sessionId, command.token);
      } else if (command.type === 'create') {
        if (rooms.size >= 250) return reject('All rooms are busy. Try again in a minute.', true);
        let code: string;
        do {
          code = Array.from({ length: 5 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
        } while (rooms.has(code));
        const player = makePlayer(0);
        const room = makeRoom(code, [player], now);
        rooms.set(code, room);
        connect(room, player);
      } else if (command.type === 'join' || command.type === 'resume') {
        const room = typeof command.code === 'string' ? rooms.get(command.code) : undefined;
        if (!room || now >= room.expires) return reject('Room expired or not found.', true);
        if (command.type === 'resume') {
          const player = typeof command.token === 'string' && command.token
            ? room.players.find((p) => p.token === command.token) : undefined;
          if (!player) return reject('Your seat is no longer available.', true);
          return connect(room, player);
        }
        if (room.phase !== 'waiting' || room.players.length === 2) return reject('This room is full or has already started.', true);
        const player = makePlayer(1);
        room.players.push(player);
        connect(room, player);
      }
    });

    socket.on('close', () => {
      clearInterval(heartbeat);
      if (membership?.player.socket !== socket) return;
      membership.player.socket = null;
      broadcast(membership.room);
    });
  });

  let last = performance.now();
  let accumulator = 0;
  let lastBroadcast = last;
  setInterval(() => {
    const now = performance.now();
    accumulator += Math.min((now - last) / 1000, 0.15);
    last = now;
    const steps = Math.floor(accumulator / STEP);
    accumulator -= steps * STEP;
    const shouldBroadcast = now - lastBroadcast >= 50;
    if (shouldBroadcast) lastBroadcast = now;
    for (const [code, room] of rooms) {
      if (now >= room.expires) {
        rooms.delete(code);
        for (const player of room.players) {
          send(player.socket, { type: 'error', message: 'This room has expired.', fatal: true });
          player.socket?.close(1000);
        }
        continue;
      }
      if (room.phase === 'between' && now >= room.deadline) {
        room.hole++;
        beginHole(room, now);
        broadcast(room, now);
      }
      if (room.phase !== 'playing') continue;
      room.elapsedMs = Math.max(0, Math.min(COURSES[room.hole].seconds * 1000, now - room.startedAt));
      for (const player of room.players) {
        if (player.score !== null) continue;
        if (now >= room.deadline) {
          player.score = SHOT_LIMIT + 1;
          player.ball.vx = player.ball.vz = 0;
          continue;
        }
        for (let i = 0; i < steps && moving(player.ball); i++) {
          const elapsed = Math.max(0, room.elapsedMs / 1000 - (steps - 1 - i) * STEP);
          const splash = stepPutt(player.ball, room.hole, elapsed, player.lie, room.layouts[room.hole]);
          if (splash) {
            player.splash = splash;
            player.waterDrops++;
            player.strokes++;
            break;
          }
        }
        if (player.ball.sunk) player.score = player.strokes;
        else if (!moving(player.ball) && player.strokes >= SHOT_LIMIT) player.score = SHOT_LIMIT + 1;
      }
      if (room.players.every((p) => p.score !== null)) {
        for (const player of room.players) player.scores.push(player.score ?? SHOT_LIMIT + 1);
        if (room.hole === COURSES.length - 1) {
          room.phase = 'finished';
          room.deadline = now;
          room.expires = now + ROOM_TTL;
        } else {
          room.phase = 'between';
          room.deadline = now + TURNOVER_SECONDS * 1000;
        }
        broadcast(room, now);
      } else if (shouldBroadcast) {
        broadcast(room, now);
      }
    }
  }, 10).unref();

  return (request: IncomingMessage, socket: Parameters<WebSocketServer['handleUpgrade']>[1], head: Buffer) => {
    // Only browsers on the game origin may open the game's socket.
    try {
      const origin = new URL(request.headers.origin ?? '');
      if (!['https:', 'http:'].includes(origin.protocol) || origin.host !== request.headers.host) throw Error('origin');
    } catch {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      return;
    }
    server.handleUpgrade(request, socket, head, (ws) => server.emit('connection', ws, request));
  };
}

function makeRoom(code: string, players: Player[], now: number): Room {
  const layouts = COURSES.map<CourseLayout>((_, index) => index < Math.ceil(COURSES.length / 2) ? 0 : 1);
  for (let index = layouts.length - 1; index > 0; index--) {
    const other = randomInt(index + 1);
    [layouts[index], layouts[other]] = [layouts[other], layouts[index]];
  }
  return { code, players, layouts, phase: 'waiting', deadline: 0, expires: now + ROOM_TTL, hole: 0, startedAt: 0, elapsedMs: 0 };
}

function playerProfile(player: RosterPlayer): PlayerProfile {
  const username = typeof player.username === 'string' ? Array.from(player.username.trim()).slice(0, 80).join('') : '';
  if (typeof player.avatar === 'string' && player.avatar.length <= 1024 && URL.canParse(player.avatar)) {
    const url = new URL(player.avatar);
    if (url.protocol === 'https:' && !url.username && !url.password) return { username, avatar: url.href };
  }
  return { username };
}

function makePlayer(seat: Seat, player?: RosterPlayer): Player {
  const ball = createBall();
  return { seat, userId: player?.userId, profile: player && playerProfile(player),
    token: randomBytes(24).toString('hex'), socket: null, ball, lie: { ...ball }, strokes: 0, score: null, scores: [], waterDrops: 0, splash: null };
}

function beginHole(room: Room, now: number) {
  room.phase = 'playing';
  room.startedAt = now;
  room.elapsedMs = 0;
  room.deadline = now + COURSES[room.hole].seconds * 1000;
  room.expires = room.deadline + ROOM_TTL;
  for (const player of room.players) {
    player.ball = createBall(room.hole, room.layouts[room.hole]);
    player.lie = { ...player.ball };
    player.strokes = 0;
    player.waterDrops = 0;
    player.splash = null;
    player.score = player.token ? null : SHOT_LIMIT + 1;
  }
}
