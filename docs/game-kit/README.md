# NAKALITE game kit

Everything a game team copies to join the platform. Start with `../game-integration-guide.md`.

| File | Copy it to | What it is |
|---|---|---|
| `GAME-SPEC.template.md` | your docs | the one-page spec to fill in for each game |
| `naka-platform.ts` | your game **server** | identify, report the result (retried, kept in a store), rank helper |
| `naka-platform.client.ts` | your game **client** | read and remove the launch token, `postMessage` to the platform |
| `naka-platform.test.ts` | optional | tests of the kit (`node --experimental-strip-types --test`, Node 22+) |

The kit has no dependencies. Server side, five lines:

```ts
import { createNakaPlatform, fileResultStore } from './naka-platform';
import fs from 'node:fs';

const naka = createNakaPlatform({ apiUrl: process.env.NAKA_API_URL!, serverKey: process.env.NAKA_SERVER_KEY!, store: fileResultStore('./pending-results.json', fs) });
setInterval(() => void naka.flushPending(), 60_000); void naka.flushPending();

// a player joins:  const { player, session } = await naka.identify(launchToken);   // session.roster = who may sit
// the match ends:  await naka.reportResult({ sessionId, startedAt, endedAt, players: [{ userId, rank }, ...] });
```
