# Game spec: <game name>

Copy this file for each new game, fill it in, and give it to the platform team with the request for a server key.
Everything the platform needs to know about a game fits here. The contract itself is in `docs/game-integration-guide.md`.

## 1. Identity

| | |
|---|---|
| Name | |
| Slug (lowercase, dashes) | |
| Game client address (https, the page that runs in the iframe) | |
| Game server address (wss / https) | |
| Team / contact | |

## 2. Mode

- [ ] **placement**: the match ends with a ranking (supported now)
- [ ] **time_only**: no win or lose, rooms that never end (NOT built yet: do not start)

## 3. Players

| | |
|---|---|
| Minimum (2 or more: platform games are multiplayer) | |
| Maximum | |
| Teams? If yes, how are team members ranked (same rank for the whole team is allowed) | |

## 4. How a match ends and how players are ranked

- What ends a match (last one standing, first to a goal, time up...):
- Ranking rule (one line, no exceptions): e.g. "fewest cards left wins; equal hands tie"
- Ties: allowed / not allowed (equal ranks are allowed by the platform)
- A player who leaves mid-match is ranked: (last / by progress / by the rule above) and still appears in the result
- A player who never connects: (the match closes after N seconds, nobody is paid)
- Shortest realistic match (seconds):  ____  (set "Shortest paid match" in the Admin below this, so quitting at once pays nothing)

## 5. Result numbers

The platform stores `score`, `ko`, `xp`, `revives`, `hunts` (whole numbers, 0 when the game has none) and `playtimeSec`.

| Field | What the game sends |
|---|---|
| score | |
| ko | |
| xp | (not turned into levels yet) |
| revives / hunts | |

## 6. Rewards (set in the Admin by the platform team)

| | |
|---|---|
| Base coins per player | (a match pays this x players, shared out by place: 2 players 14/6, 3 players 16/10/4, 4 players 18/12/6/4 at 10) |
| Shortest paid match (seconds) | |

## 7. Server

- Runtime / host (must keep WebSocket or long connections alive; not a serverless host):
- Where undelivered results are kept (file / database) so a restart does not lose them:
- Seat order = the roster order the platform returns

## 8. Done when (copy of the checklist in the guide)

- [ ] token read from `#token=` and removed from the address bar
- [ ] only roster players sit; the table starts by itself when everyone is in
- [ ] one result per match, every roster player listed once
- [ ] result retried and kept across a restart
- [ ] `ready`, `ended`, `leave` sent to the platform
- [ ] runs inside the platform frame (sound, keyboard, mobile)
- [ ] tested locally against a platform (guide section 11) and once on the real host
