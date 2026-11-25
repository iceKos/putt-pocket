import { alternateCourses, insideOutline, type CourseRail } from './alternate-courses.ts';

// Coordinates are in the ground plane. The scene uses the same outline for its curbs.
export type Point = { x: number; z: number };
export type CourseLayout = 0 | 1;
export const LAYOUT_LABELS = ['A', 'B'] as const;

const GARDEN: readonly Point[] = [
  { x: -5.4, z: -3.75 }, { x: 3.1, z: -3.75 }, { x: 4.45, z: -2.4 },
  { x: 4.45, z: 4.65 },
  { x: 1.75, z: 4.65 }, { x: 1.75, z: -1.2 }, { x: -5.4, z: -1.2 },
];
export const BALL_RADIUS = 0.195;
export const CUP_RADIUS = 0.34;
export const SHOT_LIMIT = 6;
export const STEP = 1 / 120;
const MAX_SPEED = 12.6;
const FRICTION = 2.9;
const BOUNCE = 0.83;

const rectangle = (left: number, top: number, right: number, bottom: number): Point[] => [
  { x: left, z: top }, { x: right, z: top }, { x: right, z: bottom }, { x: left, z: bottom },
];
export const BRIDGE = { left: -1.2, right: 1.0, top: -2.05, bottom: 3.45, deckTop: -0.13, deckBottom: 0.67 };
export const MARKET_BASKETS = [
  { x: 2.48, z: 1.23, radius: 0.36 },
  { x: -2.39, z: -0.43, radius: 0.36 },
] as const;
export const ARENA_SAND = { x: -0.08, z: 0.02, width: 2.75, depth: 1.86 };
export const ARENA_COLUMNS = [
  { x: 1.53, z: 0.39, radius: 0.39 },
  { x: -1.27, z: -0.82, radius: 0.41 },
  { x: -0.22, z: 1.62, radius: 0.33 },
] as const;
export const ALPINE_ICE = { x: -0.10, z: -0.18, width: 2.95, depth: 1.10 };

function inArenaSand(x: number, z: number): boolean {
  return ((x - ARENA_SAND.x) / ARENA_SAND.width) ** 2 + ((z - ARENA_SAND.z) / ARENA_SAND.depth) ** 2 < 1;
}

function onAlpineIce(x: number, z: number): boolean {
  return ((x - ALPINE_ICE.x) / ALPINE_ICE.width) ** 2 + ((z - ALPINE_ICE.z) / ALPINE_ICE.depth) ** 2 < 1;
}
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
export const WALL_SWITCHBACKS = [
  { x: 1.85, from: -1.65, to: 3.45, radius: 0.20 },
  { x: -1.55, from: -3.65, to: 1.30, radius: 0.20 },
] as const;
export const HANOK_GATES = [
  { x: 1.42, from: 0.23, to: 1.65, phase: 0, radius: 0.17 },
  { x: -1.58, from: -1.61, to: -0.14, phase: 2.75, radius: 0.17 },
] as const;
export const HANOK_CYCLE = 5.5;
export const hanokGateLift = (elapsed: number, phase: number) => {
  const t = (elapsed + phase) % HANOK_CYCLE;
  return Math.max(0, Math.min(1, (t - 0.4) / 0.35, (3.0 - t) / 0.35)) * 0.91;
};
export const gateClearsBall = (lift: number) => lift >= BALL_RADIUS * 2 + 0.04;
export const YUCATAN_CHUTE = {
  x: 0.30, from: -0.70, to: 0.51, radius: 0.16,
  walls: [[-1.69, -0.70], [0.51, 1.70]] as const,
  divider: { from: -2.95, to: -0.52, z: 0.22, radius: 0.15 },
};
export const FJORD_WIND = { left: -2.85, right: 2.95, top: -1.27, bottom: 2.55 };
export const SHELTER_ROCKS = [
  { x: -1.74, z: -1.48, radius: 0.38 },
  { x: -0.30, z: -1.54, radius: 0.45 },
  { x: 1.22, z: -1.57, radius: 0.41 },
] as const;

export function fjordWind(seconds: number): number {
  const swell = Math.sin(seconds * 1.08 + 0.72);
  return Math.sign(swell) * Math.max(0, Math.abs(swell) - 0.23) * 3.20;
}

function ease(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

export function groundHeight(hole: number, x: number, z: number, layout: CourseLayout = 0): number {
  if (layout === 1) return 0;
  if (hole === 8) {
    const rise = ease((x - 0.37) / 1.12);
    const teeEdge = ease((5.34 - x) / 0.84);
    const terraceEdge = ease((1.68 - Math.abs(z - 0.02)) / 0.65);
    return 0.58 * rise * teeEdge * terraceEdge;
  }
  if (hole !== 3) return 0;
  const across = Math.max(0, 1 - (x / 2.24) ** 2);
  const lane = Math.max(0, 1 - ((z + 0.25) / 2.66) ** 2);
  return 0.86 * across ** 2 * lane ** 2;
}
const holes = [
  { name: 'Kyoto Stone Garden', country: 'Japan', flag: 'jp', outline: GARDEN, start: { x: 3.05, z: 3.25 }, cup: { x: -4.38, z: -2.43 } },
  { name: 'Songkran', country: 'Thailand', flag: 'th', outline: rectangle(-5.35, -3.65, 5.35, 3.45), start: { x: 4.25, z: 1.95 }, cup: { x: -4.25, z: -1.02 } },
  { name: 'Colosseum Arena', country: 'Italy', flag: 'it', outline: [
    { x: -5.35, z: -2.12 }, { x: -4.43, z: -3.19 }, { x: -2.54, z: -3.66 },
    { x: 2.55, z: -3.66 }, { x: 4.40, z: -3.18 }, { x: 5.35, z: -2.18 },
    { x: 5.35, z: 2.26 }, { x: 4.36, z: 3.15 }, { x: 2.54, z: 3.52 },
    { x: -2.55, z: 3.52 }, { x: -4.37, z: 3.16 }, { x: -5.35, z: 2.20 },
  ], start: { x: 4.17, z: 1.05 }, cup: { x: -4.21, z: -1.13 } },
  { name: 'Alpine Ice Run', country: 'Switzerland', flag: 'ch', outline: rectangle(-5.35, -3.65, 5.35, 3.45),
    start: { x: 4.15, z: -0.18 }, cup: { x: -3.85, z: -0.76 } },
  { name: 'Barcelona Mosaic', country: 'Spain', flag: 'es', outline: [
    { x: -5.35, z: -2.52 }, { x: -4.22, z: -3.64 }, { x: 1.45, z: -3.64 },
    { x: 2.65, z: -2.42 }, { x: 4.1, z: -2.42 }, { x: 5.35, z: -1.32 },
    { x: 5.35, z: 2.33 }, { x: 4.1, z: 3.5 }, { x: -3.28, z: 3.5 }, { x: -5.35, z: 1.52 },
  ], start: { x: 4.02, z: 1.28 }, cup: { x: -4.05, z: -1.88 } },
  { name: 'Gates of the Nile', country: 'Egypt', flag: 'eg', outline: rectangle(-5.35, -3.65, 5.35, 3.45),
    start: { x: 4.25, z: 0 }, cup: { x: -4.2, z: 0 } },
  { name: 'Great Wall Switchbacks', country: 'China', flag: 'cn', outline: rectangle(-5.35, -3.65, 5.35, 3.45),
    start: { x: 4.25, z: 1.48 }, cup: { x: -4.15, z: -0.72 } },
  { name: 'Hanok Courtyard', country: 'South Korea', flag: 'kr', outline: rectangle(-5.35, -3.65, 5.35, 3.45),
    start: { x: 4.19, z: 1.31 }, cup: { x: -4.16, z: -1.18 } },
  { name: 'Yucatan Temple Terraces', country: 'Mexico', flag: 'mx', outline: rectangle(-5.35, -3.65, 5.35, 3.45),
    start: { x: 4.18, z: 0.65 }, cup: { x: -4.19, z: -0.95 } },
  { name: 'Northern Lights Fjord', country: 'Norway', flag: 'no', outline: [
    { x: -5.35, z: -2.36 }, { x: -4.15, z: -3.65 }, { x: 3.73, z: -3.65 }, { x: 5.35, z: -2.21 },
    { x: 5.35, z: 2.2 }, { x: 4.33, z: 3.40 }, { x: -4.2, z: 3.40 }, { x: -5.35, z: 2.3 },
  ], start: { x: 4.23, z: 0.74 }, cup: { x: -4.22, z: -0.55 } },
] as const;
function boundaryWalls(outline: readonly Point[]) {
  return outline.map((from, index) => {
    const to = outline[(index + 1) % outline.length];
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const length = Math.hypot(dx, dz);
    return { from, dx, dz, length, nx: -dz / length, nz: dx / length };
  });
}

export const COURSES = holes.map((hole, index) => {
  const walls = boundaryWalls(hole.outline);
  const alternate = alternateCourses[index];
  return {
    ...hole,
    layouts: [{ ...hole, walls }, { ...alternate, walls: boundaryWalls(alternate.outline) }] as const,
    initialAngle: index === 0 || index === 6 ? -Math.PI / 2 : Math.PI,
    seconds: index < 6 ? 52 : 67,
    walls,
  };
});
export const TURNOVER_SECONDS = 4;
export function waterAt(x: number, z: number): boolean {
  return x > BRIDGE.left && x < BRIDGE.right && z > BRIDGE.top
    && (z < BRIDGE.deckTop || z > BRIDGE.deckBottom);
}

export type Ball = Point & { vx: number; vz: number; sunk: boolean; impacts?: number };
export const createBall = (hole = 0, layout: CourseLayout = 0): Ball => ({
  ...COURSES[hole].layouts[layout].start, vx: 0, vz: 0, sunk: false,
});
export const moving = (ball: Ball) => ball.vx !== 0 || ball.vz !== 0;

export function launch(ball: Ball, angle: number, power: number): void {
  if (ball.sunk || moving(ball) || power <= 0) return;
  const speed = MAX_SPEED * Math.min(power, 1);
  ball.vx = Math.cos(angle) * speed;
  ball.vz = Math.sin(angle) * speed;
}

export function stepBall(ball: Ball, hole = 0, elapsedSeconds = 0, layout: CourseLayout = 0): void {
  if (!moving(ball) || ball.sunk) return;
  const previousX = ball.x;
  const course = COURSES[hole];
  const alternate = layout === 1 ? course.layouts[1] : null;
  if (!alternate && (hole === 3 || hole === 8)) {
    const sample = 0.015;
    const gravity = 8 * STEP / (2 * sample);
    ball.vx -= gravity * (groundHeight(hole, ball.x + sample, ball.z) - groundHeight(hole, ball.x - sample, ball.z));
    ball.vz -= gravity * (groundHeight(hole, ball.x, ball.z + sample) - groundHeight(hole, ball.x, ball.z - sample));
  }
  if (hole === 9) {
    const exposed = alternate
      ? alternate.zones?.some((zone) => zone.kind === 'wind' && insideOutline(ball, zone.outline))
      : ball.x > FJORD_WIND.left && ball.x < FJORD_WIND.right && ball.z > FJORD_WIND.top && ball.z < FJORD_WIND.bottom;
    if (exposed) ball.vz += fjordWind(elapsedSeconds) * STEP;
  }
  ball.x += ball.vx * STEP;
  ball.z += ball.vz * STEP;

  // The small fixed step keeps the ball within collision range even at full power.
  for (const wall of course.layouts[layout].walls) {
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
      recordImpact(ball, -normalSpeed);
      ball.vx -= (1 + BOUNCE) * normalSpeed * nx;
      ball.vz -= (1 + BOUNCE) * normalSpeed * nz;
    }
  }

  if (alternate) {
    for (const rail of alternate.rails ?? []) bounceOnRail(ball, rail);
    for (const gate of alternate.gates ?? []) {
      if (!gateClearsBall(hanokGateLift(elapsedSeconds, gate.phase))) bounceOnRail(ball, gate);
    }
    for (const obstacle of alternate.obstacles ?? []) {
      bounceOff(ball, obstacle.x, obstacle.z, obstacle.radius, obstacle.rebound ?? 0.66);
    }
  } else {
    applyOriginalObstacles(ball, hole, elapsedSeconds, previousX);
  }
  const cup = course.layouts[layout].cup;
  const speed = Math.hypot(ball.vx, ball.vz);
  if (Math.hypot(ball.x - cup.x, ball.z - cup.z) <= CUP_RADIUS * 0.83 && speed < 3.25) {
    Object.assign(ball, cup, { vx: 0, vz: 0, sunk: true });
    return;
  }
  let friction = FRICTION;
  if (alternate) {
    for (const zone of alternate.zones ?? []) {
      if (zone.kind === 'sand' && insideOutline(ball, zone.outline)) friction = 7.9;
      if (zone.kind === 'ice' && insideOutline(ball, zone.outline)) friction = 0.63;
    }
  } else {
    if (hole === 2 && inArenaSand(ball.x, ball.z)) friction = 7.9;
    if (hole === 3 && onAlpineIce(ball.x, ball.z)) friction = 0.63;
  }
  const remaining = Math.min(MAX_SPEED * 1.1, Math.max(0, speed - friction * STEP));
  const ratio = speed > 0 ? remaining / speed : 0;
  ball.vx *= ratio;
  ball.vz *= ratio;
}

function applyOriginalObstacles(ball: Ball, hole: number, elapsedSeconds: number, previousX: number) {
  if (hole === 1) {
    for (const basket of MARKET_BASKETS) bounceOff(ball, basket.x, basket.z, basket.radius, 0.58);
  }
  if (hole === 2) {
    for (const column of ARENA_COLUMNS) bounceOff(ball, column.x, column.z, column.radius, 0.68);
  }
  if (hole === 4) {
    for (const bumper of BUMPERS) bounceOff(ball, bumper.x, bumper.z, bumper.radius, 1.12);
  }
  if (hole === 5) {
    for (const [from, to] of GATE.walls) bounceOnWall(ball, GATE.x, from, to, GATE.radius);
    if (!gateClearsBall(gateLift(elapsedSeconds))) bounceOnWall(ball, GATE.x, ...GATE.span, GATE.radius);
  }
  if (hole === 6) {
    for (const wall of WALL_SWITCHBACKS) bounceOnWall(ball, wall.x, wall.from, wall.to, wall.radius);
  }
  if (hole === 7) {
    for (const gate of HANOK_GATES) {
      bounceOnWall(ball, gate.x, -3.65, gate.from, gate.radius);
      bounceOnWall(ball, gate.x, gate.to, 3.45, gate.radius);
      if (!gateClearsBall(hanokGateLift(elapsedSeconds, gate.phase))) {
        bounceOnWall(ball, gate.x, gate.from, gate.to, gate.radius);
      }
    }
  }
  if (hole === 8) {
    for (const [from, to] of YUCATAN_CHUTE.walls) {
      bounceOnWall(ball, YUCATAN_CHUTE.x, from, to, YUCATAN_CHUTE.radius);
    }
    const lip = YUCATAN_CHUTE.x - BALL_RADIUS;
    if (previousX <= YUCATAN_CHUTE.x && ball.x >= lip && ball.vx > 0
      && ball.z > YUCATAN_CHUTE.from && ball.z < YUCATAN_CHUTE.to) {
      recordImpact(ball, ball.vx);
      ball.x = lip;
      ball.vx *= -BOUNCE;
    }
    const divider = YUCATAN_CHUTE.divider;
    bounceOff(ball, Math.max(divider.from, Math.min(divider.to, ball.x)), divider.z, divider.radius);
  }
  if (hole === 9) {
    for (const rock of SHELTER_ROCKS) bounceOff(ball, rock.x, rock.z, rock.radius, 0.62);
  }
}

export function stepPutt(ball: Ball, hole: number, elapsedSeconds: number, lie: Point, layout: CourseLayout = 0): Point | null {
  stepBall(ball, hole, elapsedSeconds, layout);
  const inWater = layout === 1
    ? COURSES[hole].layouts[1].zones?.some((zone) => zone.kind === 'water' && insideOutline(ball, zone.outline))
    : hole === 1 && waterAt(ball.x, ball.z);
  if (!inWater) return null;
  const splash = { x: ball.x, z: ball.z };
  Object.assign(ball, lie, { vx: 0, vz: 0 });
  return splash;
}

function recordImpact(ball: Ball, speed: number) {
  if (speed >= 0.55) ball.impacts = (ball.impacts ?? 0) + 1;
}

function bounceOnWall(ball: Ball, x: number, from: number, to: number, radius: number) {
  bounceOff(ball, x, Math.max(from, Math.min(to, ball.z)), radius);
}

function bounceOnRail(ball: Ball, { from, to, radius }: CourseRail) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const t = Math.max(0, Math.min(1, ((ball.x - from.x) * dx + (ball.z - from.z) * dz) / (dx * dx + dz * dz)));
  bounceOff(ball, from.x + t * dx, from.z + t * dz, radius);
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
    recordImpact(ball, -speed);
    ball.vx -= (1 + bounce) * speed * nx;
    ball.vz -= (1 + bounce) * speed * nz;
  }
}
