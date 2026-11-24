# Putt Pocket

Putt Pocket is a low-poly Three.js mini golf game. Practice any of the six courses solo or play all six with a friend in the same browser room.

Requires Node.js 22.12+.

```sh
npm ci
npm run dev
```

Open `http://localhost:5173/`. Choose **Play with a friend → Create room**, then open the same URL in a second tab and join with the five-character code. The round begins when both players are connected. Each ball plays independently. Reload a tab to reclaim its seat and strokes. The tour visits Japan (Kyoto Stone Garden), Thailand (Floating Market), the Netherlands (Tulip Windmill), Scotland (Highland Ridge), Spain (Barcelona Mosaic), and Egypt (Gates of the Nile). There is a four-second score break between holes. The fewest total strokes wins, and equal totals tie. An unfinished hole scores seven after six strokes or after time expires. Leaving a match scores seven for all unfinished holes.

Use **Practice 1–6** to select a course when playing alone. Drag back from the ball and release to putt. With the course focused, left/right aim, up/down adjust power, and Space putts. Practice starts its timer with the first shot. In a shared match each hole has 75 seconds. Water returns the ball to the previous lie and costs one extra stroke. The rotating blades can deflect a moving ball. The ridge changes ball speed, mosaic bumpers add rebound, and the Nile gate opens and closes on a cycle.

`npm run build && npm start` builds and serves the production client and WebSocket on the same port. Set `PORT` on the host (defaults to 5173). Game rooms live in memory on one server instance and expire after inactivity in the lobby or five minutes after the result. Reloading a tab preserves the seat while the room is available. Restarting the server clears rooms.

This version includes six holes and two-player rooms. NAKALITE accounts, result reporting, and rewards are planned for a later stage. See the [NAKALITE game kit](docs/game-kit/README.md).
