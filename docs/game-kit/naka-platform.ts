/**
 * NAKALITE platform client for a GAME SERVER. Copy this file into your game server (no dependencies, Node 18+ or any runtime with `fetch`).
 * It does the three things the platform asks of a game server:
 *   1. identify(token)    who holds this launch token, and who else is in the match
 *   2. reportResult(...)  the ranking when the match ends (retried; kept in a store so a restart does not lose it)
 *   3. flushPending()     sends results that could not be delivered earlier (call it at start-up and every minute)
 *
 * Contract: docs/game-integration-guide.md. The platform decides the coins; the game only reports who finished where.
 * The server key must stay on the game server: never in the client, a repository or a log.
 */

export interface RosterPlayer {
  userId: string;
  username: string;
  avatar?: string;
}

export interface PlatformSession {
  sessionId: string;
  status: 'launching' | 'finished';
  game: { slug: string; title: string; players: { min: number; max: number } };
  partyId: string;
  /** In the order the platform lists them: use it as the seat order. */
  roster: RosterPlayer[];
  /** `null` when the game has no payout set: results are still recorded. */
  reward: { mode: string; baseCoins: number; minDurationSec: number } | null;
}

export interface Identity {
  player: RosterPlayer;
  session: PlatformSession;
}

export interface RankedPlayer {
  userId: string;
  /** Whole number from 1. Players who tie share a rank (1, 2, 2, 4). */
  rank: number;
  score?: number;
  ko?: number;
  xp?: number;
  revives?: number;
  hunts?: number;
  /** 0..86400. */
  playtimeSec?: number;
}

export interface MatchResult {
  sessionId: string;
  startedAt: Date | number | string;
  endedAt: Date | number | string;
  /** EVERY player of the roster, once each, also those who left (rank them last). A partial list is recorded but pays nobody. */
  players: RankedPlayer[];
  map?: string;
  mode?: string;
  diff?: string;
}

export type PlatformErrorKind =
  | 'invalid_token' // forged or expired launch token: ask the player to start the match again
  | 'bad_key' // the platform rejected THIS server's key: a setup problem, not the player's
  | 'not_in_match' // the player is not in this session
  | 'match_over' // the session already finished
  | 'not_found' // unknown session (or the platform is older than this kit)
  | 'not_configured' // the platform cannot launch games yet
  | 'unreachable' // network error / timeout
  | 'rejected' // the platform refused the data (a bug in the game's report): do not retry
  | 'server'; // the platform failed: retry later

export class NakaPlatformError extends Error {
  readonly kind: PlatformErrorKind;
  readonly status: number;
  constructor(kind: PlatformErrorKind, status: number, message: string) {
    super(message);
    this.name = 'NakaPlatformError';
    this.kind = kind;
    this.status = status;
  }
}

/** Texts a player can read. Show `error.message` as it is, or map `error.kind` to your own language. */
const PLAYER_TEXT: Record<PlatformErrorKind, string> = {
  invalid_token: 'This launch link expired. Go back and start the match again.',
  bad_key: 'This game server is not set up with a valid key for the platform.',
  not_in_match: 'You are not in this match.',
  match_over: 'This match is already over.',
  not_found: 'The platform does not know this match, or is out of date.',
  not_configured: 'The platform is not set up to launch games yet.',
  unreachable: 'Could not reach the platform.',
  rejected: 'The platform refused this match result.',
  server: 'The platform could not start this match.',
};

/** A result waiting to be delivered. One per session. */
export interface PendingResult {
  id: string;
  body: unknown;
  /** When it was first tried, ms since epoch (to drop very old ones if you want). */
  firstTriedAt: number;
}

/** Where undelivered results are kept. The default is memory: use `fileResultStore` or your own database so a restart does not lose them. */
export interface ResultStore {
  put(job: PendingResult): Promise<void>;
  all(): Promise<PendingResult[]>;
  remove(id: string): Promise<void>;
}

export function memoryResultStore(): ResultStore {
  const jobs = new Map<string, PendingResult>();
  return {
    put: async (job) => void jobs.set(job.id, job),
    all: async () => [...jobs.values()],
    remove: async (id) => void jobs.delete(id),
  };
}

export interface NakaPlatformOptions {
  /** The platform API including /api, e.g. https://api.example.com/api */
  apiUrl: string;
  /** This game's server key (Admin -> Games -> the game -> Game server key). Server side only. */
  serverKey: string;
  store?: ResultStore;
  /** Waits (ms) between attempts to deliver a result right away. Default 1s, 3s, 10s. */
  retryDelaysMs?: number[];
  timeoutMs?: number;
  log?: (message: string) => void;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export interface ReportOutcome {
  /** True once the platform has the result (a repeat counts: `replayed`). */
  delivered: boolean;
  /** True when it could not be delivered now and is in the store for `flushPending`. */
  queued: boolean;
  replayed?: boolean;
  /** What the platform paid, when it paid now. Show coins from the platform's own result card, not from this. */
  payouts?: { userId: string; rank: number; coins: number }[];
}

const iso = (t: Date | number | string) => new Date(t).toISOString();
const RETRYABLE = (status: number) => status >= 500 || status === 408 || status === 429;

export function createNakaPlatform(opts: NakaPlatformOptions) {
  const base = opts.apiUrl.replace(/\/+$/, '');
  const fetchFn = opts.fetch ?? fetch;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = opts.now ?? Date.now;
  const store = opts.store ?? memoryResultStore();
  const delays = opts.retryDelaysMs ?? [1000, 3000, 10_000];
  const log = opts.log ?? ((m: string) => console.log(m));

  async function call(method: 'GET' | 'POST', path: string, body?: unknown): Promise<{ status: number; json: any }> {
    const res = await fetchFn(`${base}${path}`, {
      method,
      headers: { authorization: `Bearer ${opts.serverKey}`, 'content-type': 'application/json' },
      signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: res.status, json: await res.json().catch(() => ({})) };
  }

  const fail = (kind: PlatformErrorKind, status: number) => new NakaPlatformError(kind, status, PLAYER_TEXT[kind]);

  /** Who holds this launch token (the `#token=` of the URL), plus the match they were launched into. */
  async function identify(launchToken: string): Promise<Identity> {
    let r: { status: number; json: any };
    try {
      r = await call('POST', '/internal/game-sessions/identify', { token: launchToken });
    } catch {
      throw fail('unreachable', 0);
    }
    if (r.status === 200 && r.json?.data) return r.json.data as Identity;
    log(`[naka] identify answered ${r.status}: ${r.json?.message ?? '(no message)'}`);
    if (r.status === 401) throw fail(/server key/i.test(String(r.json?.message ?? '')) ? 'bad_key' : 'invalid_token', 401);
    if (r.status === 403) throw fail('not_in_match', 403);
    if (r.status === 409) throw fail('match_over', 409);
    if (r.status === 404) throw fail('not_found', 404);
    if (r.status === 503) throw fail('not_configured', 503);
    throw fail('server', r.status);
  }

  /** The roster and reward rules again (after a game server restart, say). */
  async function getSession(sessionId: string): Promise<PlatformSession> {
    let r: { status: number; json: any };
    try {
      r = await call('GET', `/internal/game-sessions/${encodeURIComponent(sessionId)}`);
    } catch {
      throw fail('unreachable', 0);
    }
    if (r.status === 200 && r.json?.data) return r.json.data as PlatformSession;
    throw fail(r.status === 401 ? 'bad_key' : r.status === 404 ? 'not_found' : r.status === 503 ? 'not_configured' : 'server', r.status);
  }

  function toBody(result: MatchResult) {
    if (new Date(result.endedAt).getTime() < new Date(result.startedAt).getTime()) throw new RangeError('endedAt is before startedAt');
    if (result.players.length === 0) throw new RangeError('a result needs at least one player');
    const ids = new Set<string>();
    for (const p of result.players) {
      if (!Number.isInteger(p.rank) || p.rank < 1) throw new RangeError(`rank of ${p.userId} must be a whole number from 1`);
      if (ids.has(p.userId)) throw new RangeError(`${p.userId} is listed twice`);
      ids.add(p.userId);
    }
    const seconds = Math.max(0, Math.min(86_400, Math.round((new Date(result.endedAt).getTime() - new Date(result.startedAt).getTime()) / 1000)));
    return {
      players: result.players.map((p) => ({
        userId: p.userId,
        rank: p.rank,
        score: p.score ?? 0,
        ko: p.ko ?? 0,
        xp: p.xp ?? 0,
        revives: p.revives ?? 0,
        hunts: p.hunts ?? 0,
        playtimeSec: Math.max(0, Math.min(86_400, Math.round(p.playtimeSec ?? seconds))),
      })),
      startedAt: iso(result.startedAt),
      endedAt: iso(result.endedAt),
      ...(result.map ? { map: result.map } : {}),
      ...(result.mode ? { mode: result.mode } : {}),
      ...(result.diff ? { diff: result.diff } : {}),
    };
  }

  /** One attempt. Returns the platform's answer, or throws a NakaPlatformError (`rejected` = do not retry, others = retryable). */
  async function send(sessionId: string, body: unknown): Promise<ReportOutcome> {
    let r: { status: number; json: any };
    try {
      r = await call('POST', `/internal/game-sessions/${encodeURIComponent(sessionId)}/result`, body);
    } catch {
      throw fail('unreachable', 0);
    }
    if (r.status === 200) return { delivered: true, queued: false, replayed: !!r.json?.data?.replayed, payouts: r.json?.data?.payouts };
    log(`[naka] result of ${sessionId} answered ${r.status}: ${r.json?.message ?? '(no message)'}`);
    if (r.status === 401) throw fail('bad_key', 401);
    if (RETRYABLE(r.status)) throw fail('server', r.status);
    throw new NakaPlatformError('rejected', r.status, `${PLAYER_TEXT.rejected} ${r.json?.message ?? ''}`.trim());
  }

  /**
   * Report a finished match ONCE. It retries a few times; if the platform stays unreachable the result goes to the store and `queued` is true
   * (call `flushPending` later). A result the platform REFUSES (400/404/409...) throws `rejected`: fix the data, repeating it will not help.
   * Sending the same match twice is safe (the platform answers `replayed`), so being unsure whether it arrived is never a reason to skip it.
   */
  async function reportResult(result: MatchResult): Promise<ReportOutcome> {
    const body = toBody(result);
    for (let attempt = 0; ; attempt++) {
      try {
        return await send(result.sessionId, body);
      } catch (error) {
        const e = error as NakaPlatformError;
        if (e.kind === 'rejected') throw e;
        if (e.kind === 'bad_key') {
          // a wrong key will not fix itself, but the result is still worth keeping for when the key is fixed
          await store.put({ id: result.sessionId, body, firstTriedAt: now() });
          return { delivered: false, queued: true };
        }
        if (attempt >= delays.length) {
          await store.put({ id: result.sessionId, body, firstTriedAt: now() });
          log(`[naka] result of ${result.sessionId} kept for later (${e.kind})`);
          return { delivered: false, queued: true };
        }
        await sleep(delays[attempt]);
      }
    }
  }

  /** Tries every kept result once. Returns how many were delivered. Call at start-up and every minute or so. */
  async function flushPending(): Promise<number> {
    let delivered = 0;
    for (const job of await store.all()) {
      try {
        await send(job.id, job.body);
        await store.remove(job.id);
        delivered++;
      } catch (error) {
        // a result the platform refuses will never be accepted: drop it so it does not retry forever
        if ((error as NakaPlatformError).kind === 'rejected') await store.remove(job.id);
      }
    }
    return delivered;
  }

  return { identify, getSession, reportResult, flushPending };
}

/**
 * Ranks by a number (score, time, cards left...). Equal values tie and share a rank: 1, 2, 2, 4.
 * `higherIsBetter` false for "lowest wins" (a time, cards left in hand).
 */
export function rankByValue(entries: { userId: string; value: number }[], higherIsBetter = true): { userId: string; rank: number }[] {
  return entries.map((e) => ({
    userId: e.userId,
    rank: 1 + entries.filter((o) => (higherIsBetter ? o.value > e.value : o.value < e.value)).length,
  }));
}

/** A store that keeps undelivered results in a JSON file (Node). Fine for one server; use a database for several. */
export function fileResultStore(path: string, fs: { readFileSync(p: string, enc: 'utf8'): string; writeFileSync(p: string, data: string): void }): ResultStore {
  const read = (): PendingResult[] => {
    try {
      return JSON.parse(fs.readFileSync(path, 'utf8')) as PendingResult[];
    } catch {
      return [];
    }
  };
  const write = (jobs: PendingResult[]) => fs.writeFileSync(path, JSON.stringify(jobs));
  return {
    put: async (job) => write([...read().filter((j) => j.id !== job.id), job]),
    all: async () => read(),
    remove: async (id) => write(read().filter((j) => j.id !== id)),
  };
}
