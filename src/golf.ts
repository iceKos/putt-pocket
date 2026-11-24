// Coordinates are in the ground plane. The scene uses the same outline for its curbs.
export type Point = { x: number; z: number };

const GARDEN: readonly Point[] = [
  { x: -5.4, z: -3.75 }, { x: 3.1, z: -3.75 }, { x: 4.45, z: -2.4 },
  { x: 4.45, z: 4.65 },
  { x: 1.75, z: 4.65 }, { x: 1.75, z: -1.2 }, { x: -5.4, z: -1.2 },
];
export const BALL_RADIUS = 0.195;
export const CUP_RADIUS = 0.34;
export const SHOT_LIMIT = 6;
export const HOLE_SECONDS = 75;
export const STEP = 1 / 120;
const MAX_SPEED = 12.6;
const FRICTION = 2.9;
const BOUNCE = 0.83;

const rectangle = (left: number, top: number, right: number, bottom: number): Point[] => [
  { x: left, z: top }, { x: right, z: top }, { x: right, z: bottom }, { x: left, z: bottom },
];
export const BRIDGE = { left: -1.2, right: 1.0, top: -2.05, bottom: 3.45, deckTop: 0.2, deckBottom: 1.16 };
export const MILL = { x: -2.4, z: -0.55, length: 1.55, speed: 1.33, width: 0.26 };
export const BUMPERS = [
  { x: 1.4, z: 0.28, radius: 0.48 },
  { x: -0.65, z: 1.67, radius: 0.57 },
  { x: -2.45, z: -0.72, radius: 0.47 },
] as const;
export const GATE = {
  x: 0, span: [-0.88, 0.88] as const,
  walls: [[-2.48, -0.88], [0.88, 1.77]] as const,
  radius: 0.18,
};
export const gateLift = (elapsed: number): number => {
  const t = elapsed % 4.8;
  return Math.max(0, Math.min(1, (t - 1.35) / 0.55, (4.15 - t) / 0.55)) * 0.96;
};
export function groundHeight(hole: number, x: number, z: number): number {
  if (hole !== 3) return 0;
  const across = Math.max(0, 1 - (x / 2.24) ** 2);
  const lane = Math.max(0, 1 - ((z + 0.25) / 2.66) ** 2);
  return 0.86 * across ** 2 * lane ** 2;
}
const holes = [
  { name: 'Kyoto Stone Garden', country: 'Japan', outline: GARDEN, start: { x: 3.05, z: 3.25 }, cup: { x: -4.38, z: -2.43 } },
  { name: 'Floating Market', country: 'Thailand', outline: rectangle(-5.35, -3.65, 5.35, 3.45), start: { x: 4.25, z: 0.68 }, cup: { x: -4.25, z: 0.68 } },
  { name: 'Tulip Windmill', country: 'Netherlands', outline: [
    { x: -5.3, z: -3.65 }, { x: 2.7, z: -3.65 }, { x: 2.7, z: -1.4 },
    { x: 5.25, z: -1.4 }, { x: 5.25, z: 3.35 }, { x: -5.3, z: 3.35 },
  ], start: { x: 4.14, z: 1.65 }, cup: { x: -4.25, z: -1.12 } },
  { name: 'Highland Ridge', country: 'Scotland', outline: rectangle(-5.35, -3.65, 5.35, 3.45),
    start: { x: 4.15, z: -0.18 }, cup: { x: -3.85, z: -0.18 } },
  { name: 'Barcelona Mosaic', country: 'Spain', outline: [
    { x: -5.35, z: -2.52 }, { x: -4.22, z: -3.64 }, { x: 1.45, z: -3.64 },
    { x: 2.65, z: -2.42 }, { x: 4.1, z: -2.42 }, { x: 5.35, z: -1.32 },
    { x: 5.35, z: 2.33 }, { x: 4.1, z: 3.5 }, { x: -3.28, z: 3.5 }, { x: -5.35, z: 1.52 },
  ], start: { x: 4.02, z: 1.28 }, cup: { x: -4.05, z: -1.88 } },
  { name: 'Gates of the Nile', country: 'Egypt', outline: rectangle(-5.35, -3.65, 5.35, 3.45),
    start: { x: 4.25, z: 0 }, cup: { x: -4.2, z: 0 } },
] as const;
export const COURSES = holes.map((hole, index) => ({
  ...hole,
  initialAngle: index === 0 ? -Math.PI / 2 : Math.PI,
  walls: hole.outline.map((from, index) => {
    const to = hole.outline[(index + 1) % hole.outline.length];
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const length = Math.hypot(dx, dz);
    return { from, dx, dz, length, nx: -dz / length, nz: dx / length };
  }),
}));
export const TURNOVER_SECONDS = 4;
export function waterAt(x: number, z: number): boolean {
  return x > BRIDGE.left && x < BRIDGE.right && z > BRIDGE.top
    && (z < BRIDGE.deckTop || z > BRIDGE.deckBottom);
}

export type Ball = Point & { vx: number; vz: number; sunk: boolean };
export const createBall = (hole = 0): Ball => ({ ...COURSES[hole].start, vx: 0, vz: 0, sunk: false });
export const moving = (ball: Ball) => ball.vx !== 0 || ball.vz !== 0;

export function launch(ball: Ball, angle: number, power: number): void {
  if (ball.sunk || moving(ball) || power <= 0) return;
  const speed = MAX_SPEED * Math.min(power, 1);
  ball.vx = Math.cos(angle) * speed;
  ball.vz = Math.sin(angle) * speed;
}

export function stepBall(ball: Ball, hole = 0, elapsedSeconds = 0): void {
  if (!moving(ball) || ball.sunk) return;
  if (hole === 3) {
    const sample = 0.015;
    const gravity = 8 * STEP / (2 * sample);
    ball.vx -= gravity * (groundHeight(hole, ball.x + sample, ball.z) - groundHeight(hole, ball.x - sample, ball.z));
    ball.vz -= gravity * (groundHeight(hole, ball.x, ball.z + sample) - groundHeight(hole, ball.x, ball.z - sample));
  }
  ball.x += ball.vx * STEP;
  ball.z += ball.vz * STEP;

  // The small fixed step keeps the ball within collision range even at full power.
  for (const wall of COURSES[hole].walls) {
    const t = Math.max(0, Math.min(1, ((ball.x - wall.from.x) * wall.dx + (ball.z - wall.from.z) * wall.dz) / wall.length ** 2));
    const dx = ball.x - (wall.from.x + wall.dx * t);
    const dz = ball.z - (wall.from.z + wall.dz * t);
    const distance = Math.hypot(dx, dz);
    if (distance >= BALL_RADIUS) continue;

    const onSegment = t > 0 && t < 1;
    const nx = onSegment || distance === 0 ? wall.nx : dx / distance;
    const nz = onSegment || distance === 0 ? wall.nz : dz / distance;
    const overlap = BALL_RADIUS - (dx * nx + dz * nz);
    ball.x += nx * overlap;
    ball.z += nz * overlap;
    const normalSpeed = ball.vx * nx + ball.vz * nz;
    if (normalSpeed < 0) {
      ball.vx -= (1 + BOUNCE) * normalSpeed * nx;
      ball.vz -= (1 + BOUNCE) * normalSpeed * nz;
    }
  }

  if (hole === 2) meetWindmill(ball, elapsedSeconds);
  if (hole === 4) {
    for (const bumper of BUMPERS) bounceOff(ball, bumper.x, bumper.z, bumper.radius, 1.12);
  }
  if (hole === 5) {
    for (const [from, to] of GATE.walls) bounceOff(ball, GATE.x, Math.max(from, Math.min(to, ball.z)), GATE.radius);
    if (gateLift(elapsedSeconds) < BALL_RADIUS * 2 + 0.04) {
      const [from, to] = GATE.span;
      bounceOff(ball, GATE.x, Math.max(from, Math.min(to, ball.z)), GATE.radius);
    }
  }
  const cup = COURSES[hole].cup;
  const speed = Math.hypot(ball.vx, ball.vz);
  if (Math.hypot(ball.x - cup.x, ball.z - cup.z) <= CUP_RADIUS * 0.83 && speed < 3.25) {
    Object.assign(ball, cup, { vx: 0, vz: 0, sunk: true });
    return;
  }
  const remaining = Math.min(MAX_SPEED * 1.1, Math.max(0, speed - FRICTION * STEP));
  const ratio = speed > 0 ? remaining / speed : 0;
  ball.vx *= ratio;
  ball.vz *= ratio;
}

export function stepPutt(ball: Ball, hole: number, elapsedSeconds: number, lie: Point): Point | null {
  stepBall(ball, hole, elapsedSeconds);
  if (hole !== 1 || !waterAt(ball.x, ball.z)) return null;
  const splash = { x: ball.x, z: ball.z };
  Object.assign(ball, lie, { vx: 0, vz: 0 });
  return splash;
}

function bounceOff(ball: Ball, x: number, z: number, radius: number, bounce = BOUNCE) {
  const dx = ball.x - x;
  const dz = ball.z - z;
  const distance = Math.hypot(dx, dz);
  const contact = BALL_RADIUS + radius;
  if (distance >= contact) return;
  const nx = distance > 1e-6 ? dx / distance : -Math.sign(ball.vx || 1);
  const nz = distance > 1e-6 ? dz / distance : 0;
  ball.x += nx * (contact - distance);
  ball.z += nz * (contact - distance);
  const speed = ball.vx * nx + ball.vz * nz;
  if (speed < 0) {
    ball.vx -= (1 + bounce) * speed * nx;
    ball.vz -= (1 + bounce) * speed * nz;
  }
}

function meetWindmill(ball: Ball, elapsed: number) {
  const spin = elapsed * MILL.speed;
  for (let arm = 0; arm < 4; arm++) {
    const angle = spin + arm * Math.PI / 2;
    const ux = Math.cos(angle);
    const uz = Math.sin(angle);
    const distanceAlong = Math.max(0, Math.min(MILL.length, (ball.x - MILL.x) * ux + (ball.z - MILL.z) * uz));
    const dx = ball.x - MILL.x - ux * distanceAlong;
    const dz = ball.z - MILL.z - uz * distanceAlong;
    const distance = Math.hypot(dx, dz);
    const radius = BALL_RADIUS + MILL.width * 0.5;
    if (distance >= radius) continue;
    const nx = distance > 1e-6 ? dx / distance : -uz;
    const nz = distance > 1e-6 ? dz / distance : ux;
    ball.x += nx * (radius - distance);
    ball.z += nz * (radius - distance);
    const armNormalSpeed = MILL.speed * distanceAlong * (-uz * nx + ux * nz);
    const speedIntoArm = ball.vx * nx + ball.vz * nz - armNormalSpeed;
    if (speedIntoArm < 0) {
      ball.vx -= 1.55 * speedIntoArm * nx;
      ball.vz -= 1.55 * speedIntoArm * nz;
    }
  }
}
