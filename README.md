# Putt Pocket

Putt Pocket is a low-poly Three.js mini golf game. Each of the ten countries has an A and a B layout. A shared round shuffles five of each across the ten countries. Both players share the same draw, including after a reconnect. The second layouts have their own board shapes and hazards, from Thailand’s candlelit Loy Krathong canals to Mexico’s cenote ring.

Requires Node.js 22.12+.

```sh
npm ci
npm run dev
```

Open `http://localhost:5173/`. Choose **Play with a friend**, select a room size from **2–6**, and create a room. Other players join with the five-character code. The round begins when everyone is connected. Each ball plays independently. Reload a tab to reclaim its seat and strokes. The tour visits Japan (Kyoto Stone Garden), Thailand (Songkran / Loy Krathong), Italy (Colosseum Arena), Switzerland (Alpine Ice Run), Spain (Barcelona Mosaic), Egypt (Gates of the Nile), China (Great Wall Switchbacks during Lunar New Year), South Korea (Hanok Courtyard), Mexico (Yucatan Temple Terraces), and Norway (Northern Lights Fjord). There is a four-second score break between holes. The fewest total strokes wins, and equal totals tie. An unfinished hole scores seven after six strokes or after time expires. Leaving a match scores seven for all unfinished holes.

Use **Practice 1A–10B** to select a country and layout when playing alone. Pull back from the ball like a slingshot and release to putt. The band and its sound change with the pull. With the course focused, left/right aim, up/down adjust power, and Space putts. Practice starts its timer with the first shot. In a shared match the first six holes have 52 seconds each. The final four have 67 seconds each, keeping the ten-hole time limit including transitions at 10:16, plus the lobby. During Songkran, aim around the fruit baskets and line up with the narrow timber bridge. During Loy Krathong, use the dry island between the candlelit canals. Water returns the ball to the previous lie and costs one extra stroke. In the Colosseum Arena, sand slows the ball and the columns deflect it. In Alpine Ice Run, the ridge changes ball speed and ice stretches the roll. Mosaic bumpers add rebound, and the Nile gate opens and closes on a cycle. On hole 9 the temple passage drops to the lower terrace. On hole 10 gusts steer the ball sideways unless it rolls in the sheltered lane. The speaker button mutes the shot, bounce, splash, and cup sounds. The browser enables sound after your first interaction.

`npm run build && npm start` builds and serves the production client and WebSocket on the same port. Set `PORT` on the host (defaults to 5173). Game rooms live in memory on one server instance and expire after inactivity in the lobby or five minutes after the result. Reloading a tab preserves the seat while the room is available. Restarting the server clears rooms.

The full ten-hole tour supports rooms for 2–6 players. To test a NAKALITE launch, set `PLATFORM=naka`, `NAKA_API_URL` (including `/api`), and `NAKA_SERVER_KEY` on the game server, then open the game from a NAKALITE lobby with 2–6 players. All players join the match from their launch links. The HUD and final standings show the verified usernames and optional avatars, with the assigned ball colors as a fallback for missing images. Direct game links still support practice and room codes. The game server reports the final rankings to NAKALITE, including players who left. The platform manages rewards. Failed submissions are queued in `NAKA_PENDING_FILE` (defaults to `.naka-pending.json`) and retried every minute. Use a persistent volume for recovery across deployments. Render Free is suitable for staging and its local disk is ephemeral. See the [NAKALITE game kit](docs/game-kit/README.md).

The country flags on the hole pins use public-domain flag artwork from [Flagpedia](https://flagpedia.net/download). The images are bundled with the game.
