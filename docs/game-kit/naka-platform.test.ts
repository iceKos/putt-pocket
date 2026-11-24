// Run: node --experimental-strip-types --test docs/game-kit/naka-platform.test.ts   (Node 22+)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNakaPlatform, memoryResultStore, NakaPlatformError, rankByValue } from './naka-platform.ts';

type Call = { url: string; method: string; headers: Record<string, string>; body: any };
const reply = (status: number, json: unknown = {}) => ({ status, json: async () => json }) as unknown as Response;

function kit(handler: (c: Call, n: number) => Response | Promise<Response>, extra: Record<string, unknown> = {}) {
  const calls: Call[] = [];
  const logs: string[] = [];
  const fetchFn = (async (url: string, init: RequestInit) => {
    calls.push({ url, method: String(init.method), headers: init.headers as Record<string, string>, body: init.body ? JSON.parse(String(init.body)) : undefined });
    return handler(calls[calls.length - 1], calls.length);
  }) as unknown as typeof fetch;
  const store = memoryResultStore();
  const platform = createNakaPlatform({ apiUrl: 'http://api.test/api/', serverKey: 'KEY', fetch: fetchFn, sleep: async () => {}, retryDelaysMs: [1, 1], log: (m) => logs.push(m), store, ...extra });
  return { platform, calls, logs, store };
}

const session = { sessionId: 's1', status: 'launching', game: { slug: 'g', title: 'G', players: { min: 2, max: 4 } }, partyId: 'p', roster: [{ userId: 'u1', username: 'A' }, { userId: 'u2', username: 'B' }], reward: null };
const result = { sessionId: 's1', startedAt: '2026-11-11T10:00:00Z', endedAt: '2026-11-11T10:05:00Z', players: [{ userId: 'u1', rank: 2 }, { userId: 'u2', rank: 1, score: 7 }] };

test('identify sends the token with the key and returns the player and roster', async () => {
  const { platform, calls } = kit(() => reply(200, { data: { player: session.roster[0], session } }));
  const id = await platform.identify('tok');
  assert.equal(id.player.userId, 'u1');
  assert.equal(id.session.roster.length, 2);
  assert.equal(calls[0].url, 'http://api.test/api/internal/game-sessions/identify');
  assert.equal(calls[0].headers.authorization, 'Bearer KEY');
  assert.deepEqual(calls[0].body, { token: 'tok' });
});

test('identify errors have a kind and a text a player can read', async () => {
  const cases: [number, unknown, string][] = [[401, { message: 'Invalid or expired launch token' }, 'invalid_token'], [401, { message: 'Invalid game server key' }, 'bad_key'], [403, {}, 'not_in_match'], [409, {}, 'match_over'], [404, {}, 'not_found'], [503, {}, 'not_configured'], [500, {}, 'server']];
  for (const [status, json, kind] of cases) {
    const { platform } = kit(() => reply(status, json));
    await assert.rejects(platform.identify('t'), (e: NakaPlatformError) => e.kind === kind && e.status === status && e.message.length > 10, `${status} ${kind}`);
  }
  const down = kit(() => { throw new Error('ECONNREFUSED'); });
  await assert.rejects(down.platform.identify('t'), (e: NakaPlatformError) => e.kind === 'unreachable');
});

test('reportResult fills the numbers the platform needs and derives playtime from the times', async () => {
  const { platform, calls } = kit(() => reply(200, { data: { replayed: false, payouts: [{ userId: 'u2', rank: 1, coins: 14 }] } }));
  const out = await platform.reportResult(result);
  assert.deepEqual([out.delivered, out.queued, out.payouts?.[0].coins], [true, false, 14]);
  assert.deepEqual(calls[0].body.players[1], { userId: 'u2', rank: 1, score: 7, ko: 0, xp: 0, revives: 0, hunts: 0, playtimeSec: 300 });
  assert.equal(calls[0].body.startedAt, '2026-11-11T10:00:00.000Z');
});

test('reportResult refuses bad data before sending anything', async () => {
  const { platform, calls } = kit(() => reply(200));
  await assert.rejects(platform.reportResult({ ...result, players: [{ userId: 'u1', rank: 0 }] }), RangeError);
  await assert.rejects(platform.reportResult({ ...result, players: [{ userId: 'u1', rank: 1 }, { userId: 'u1', rank: 2 }] }), RangeError);
  await assert.rejects(platform.reportResult({ ...result, endedAt: '2026-11-11T09:00:00Z' }), RangeError);
  assert.equal(calls.length, 0);
});

test('reportResult retries a failing platform, then keeps the result and flushPending delivers it later', async () => {
  let up = false;
  const { platform, calls, store } = kit(() => (up ? reply(200, { data: {} }) : reply(503)));
  const first = await platform.reportResult(result);
  assert.deepEqual([first.delivered, first.queued], [false, true]);
  assert.equal(calls.length, 3); // first try + 2 retries
  assert.equal((await store.all()).length, 1);
  up = true;
  assert.equal(await platform.flushPending(), 1);
  assert.equal((await store.all()).length, 0);
});

test('a result the platform refuses is not retried and not kept', async () => {
  const { platform, calls, store } = kit(() => reply(400, { message: 'bad rank' }));
  await assert.rejects(platform.reportResult(result), (e: NakaPlatformError) => e.kind === 'rejected' && /bad rank/.test(e.message));
  assert.equal(calls.length, 1);
  assert.equal((await store.all()).length, 0);
});

test('a rejected server key keeps the result for when the key is fixed', async () => {
  const { platform, store } = kit(() => reply(401, { message: 'Invalid game server key' }));
  const out = await platform.reportResult(result);
  assert.equal(out.queued, true);
  assert.equal((await store.all()).length, 1);
});

test('a repeat answered as replayed counts as delivered', async () => {
  const { platform } = kit(() => reply(200, { data: { replayed: true, payouts: [] } }));
  const out = await platform.reportResult(result);
  assert.deepEqual([out.delivered, out.replayed], [true, true]);
});

test('rankByValue ties share a rank, in either direction', () => {
  const e = [{ userId: 'a', value: 10 }, { userId: 'b', value: 7 }, { userId: 'c', value: 7 }, { userId: 'd', value: 1 }];
  assert.deepEqual(rankByValue(e).map((r) => r.rank), [1, 2, 2, 4]);
  assert.deepEqual(rankByValue(e, false).map((r) => r.rank), [4, 2, 2, 1]);
});
