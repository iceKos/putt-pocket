# Putt Pocket

Putt Pocket is a low-poly Three.js mini golf game. Practice any of the ten courses solo or play the full ten-hole tour with a friend in the same browser room.

Requires Node.js 22.12+.

```sh
npm ci
npm run dev
```

Open `http://localhost:5173/`. Choose **Play with a friend → Create room**, then open the same URL in a second tab and join with the five-character code. The round begins when both players are connected. Each ball plays independently. Reload a tab to reclaim its seat and strokes. The tour visits Japan (Kyoto Stone Garden), Thailand (Floating Market), Italy (Colosseum Arena), Switzerland (Alpine Ice Run), Spain (Barcelona Mosaic), Egypt (Gates of the Nile), China (Great Wall Switchbacks during Lunar New Year), South Korea (Hanok Courtyard), Mexico (Yucatan Temple Terraces), and Norway (Northern Lights Fjord). There is a four-second score break between holes. The fewest total strokes wins, and equal totals tie. An unfinished hole scores seven after six strokes or after time expires. Leaving a match scores seven for all unfinished holes.

Use **Practice 1–10** to select a course when playing alone. Pull back from the ball like a slingshot and release to putt. The band and its sound change with the pull. With the course focused, left/right aim, up/down adjust power, and Space putts. Practice starts its timer with the first shot. In a shared match the first six holes have 52 seconds each. The final four have 67 seconds each, keeping the ten-hole time limit including transitions at 10:16, plus the lobby. At the Floating Market, aim around the fruit baskets and line up with the narrow timber bridge. Water returns the ball to the previous lie and costs one extra stroke. In the Colosseum Arena, sand slows the ball and the columns deflect it. In Alpine Ice Run, the ridge changes ball speed and ice stretches the roll. Mosaic bumpers add rebound, and the Nile gate opens and closes on a cycle. On hole 9 the temple passage drops to the lower terrace. On hole 10 gusts steer the ball sideways unless it rolls in the sheltered lane. The speaker button mutes the shot, bounce, splash, and cup sounds. The browser enables sound after your first interaction.

`npm run build && npm start` builds and serves the production client and WebSocket on the same port. Set `PORT` on the host (defaults to 5173). Game rooms live in memory on one server instance and expire after inactivity in the lobby or five minutes after the result. Reloading a tab preserves the seat while the room is available. Restarting the server clears rooms.

The full ten-hole tour is played in two-player rooms. To test a NAKALITE launch, set `PLATFORM=naka`, `NAKA_API_URL` (including `/api`), and `NAKA_SERVER_KEY` on the game server, then open the game from a two-player NAKALITE lobby. Both players join the match from their launch links. The HUD and final standings show the verified usernames and optional avatars, with the assigned ball colors as a fallback for missing images. Direct game links still support practice and room codes. Result reporting and rewards are planned for a later stage. See the [NAKALITE game kit](docs/game-kit/README.md).

The country flags on the hole pins use public-domain flag artwork from [Flagpedia](https://flagpedia.net/download). The images are bundled with the game.
