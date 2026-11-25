import type { Point } from './golf.ts';

type Surface = 'water' | 'sand' | 'ice' | 'wind';
type WallStyle = 'cedar' | 'marble' | 'sandstone' | 'rampart' | 'hanok';
type ObstacleStyle = 'column' | 'glacier' | 'mosaic' | 'obelisk' | 'stone' | 'breakwater';
export type Zone = { kind: Surface; outline: readonly Point[] };
export type CourseRail = { from: Point; to: Point; radius: number; style: WallStyle };
export type CourseGate = CourseRail & { phase: number };
export type CourseObstacle = Point & { radius: number; style: ObstacleStyle; rebound?: number };

type AlternateCourse = {
  name: string;
  hint: string;
  outline: readonly Point[];
  start: Point;
  cup: Point;
  rails?: readonly CourseRail[];
  gates?: readonly CourseGate[];
  obstacles?: readonly CourseObstacle[];
  zones?: readonly Zone[];
};

const point = (x: number, z: number): Point => ({ x, z });
const polygon = (...corners: [number, number][]) => corners.map(([x, z]) => point(x, z));
const patch = (kind: Surface, left: number, top: number, right: number, bottom: number): Zone => ({
  kind, outline: polygon([left, top], [right, top], [right, bottom], [left, bottom]),
});
const rail = (style: WallStyle, x1: number, z1: number, x2: number, z2: number): CourseRail => ({
  style, from: point(x1, z1), to: point(x2, z2), radius: 0.17,
});
const obstacle = (style: ObstacleStyle, x: number, z: number, radius: number, rebound?: number): CourseObstacle => ({
  style, x, z, radius, rebound,
});

export const alternateCourses: readonly AlternateCourse[] = [
  {
    name: 'Torii Zigzag', hint: 'Go around the cedar rail, then angle the ball back toward the shrine.',
    outline: polygon([-5.3,-2.7],[-4.4,-3.55],[-2.4,-3.55],[-1.60,-2.65],[0.70,-2.65],[1.48,-3.55],[4.50,-3.55],[5.30,-2.70],[5.30,2.52],[4.43,3.46],[1.3,3.46],[0.42,2.65],[-1.4,2.65],[-2.15,3.46],[-4.5,3.46],[-5.3,2.70]),
    start: point(4.29,2.10), cup: point(-4.21,-2.14),
    rails: [rail('cedar',1.82,3.42,1.07,-0.82),rail('cedar',-1.65,-2.63,-1.72,0.05)],
  },
  {
    name: 'Loy Krathong', hint: 'Use the middle island to change direction between the two canals.',
    outline: polygon([-5.38,-2.35],[-4.55,-3.49],[-2.8,-3.49],[-1.9,-3.12],[2.36,-3.12],[3.27,-3.55],[4.63,-3.55],[5.38,-2.55],[5.38,2.65],[4.50,3.50],[1.2,3.50],[0.43,2.95],[-2.12,2.95],[-3.31,3.49],[-4.56,3.49],[-5.38,2.45]),
    start: point(4.22,-1.38), cup: point(-4.22,1.25),
    zones: [patch('water',0.94,-2.71,2.85,0.49),patch('water',-2.8,-0.36,-0.94,2.55)],
  },
  {
    name: 'Roman Archway', hint: 'Bank around the marble divider or cross the sand with extra power.',
    outline: polygon([-5.3,-1.64],[-4.21,-2.75],[-2.48,-3.50],[2.42,-3.50],[4.14,-2.75],[5.30,-1.65],[5.30,1.65],[4.16,2.74],[2.44,3.48],[-2.43,3.48],[-4.16,2.74],[-5.3,1.67]),
    start: point(4.16,-1.33), cup: point(-4.12,1.53),
    zones: [patch('sand',-2.44,-0.56,2.29,0.92)],
    rails: [rail('marble',1.05,-2.62,0.02,-0.82),rail('marble',-0.12,1.12,-1.19,2.63)],
    obstacles: [obstacle('column',-2.77,-0.60,.39),obstacle('column',2.54,1.32,.40)],
  },
  {
    name: 'Glacier Slalom', hint: 'Ice carries the ball through the narrow pass. Choose a side around the rocks.',
    outline: polygon([-5.3,-2.40],[-4.38,-3.50],[-2.61,-3.50],[-1.55,-2.03],[1.50,-2.03],[2.50,-3.50],[4.40,-3.50],[5.3,-2.40],[5.3,2.40],[4.40,3.46],[2.55,3.46],[1.48,2.03],[-1.54,2.03],[-2.58,3.46],[-4.38,3.46],[-5.3,2.40]),
    start: point(4.17,1.70), cup: point(-4.19,-1.55),
    zones: [patch('ice',-2.03,-1.18,2.01,1.13),patch('ice',-3.69,-1.83,-2.60,-0.21)],
    obstacles: [obstacle('glacier',1.53,.50,.47),obstacle('glacier',-.06,-.53,.48),obstacle('glacier',-1.43,.45,.44)],
  },
  {
    name: 'Mosaic Pinwheel', hint: 'The bright tile bumpers kick the ball harder. Try banking around the middle.',
    outline: polygon([-5.35,-1.48],[-4.16,-2.12],[-2.90,-1.98],[-2.08,-3.44],[1.58,-3.44],[2.33,-1.98],[4.48,-2.18],[5.35,-1.40],[5.35,1.57],[4.21,2.33],[2.36,2.04],[1.55,3.46],[-1.99,3.46],[-2.73,2.05],[-4.18,2.20],[-5.35,1.51]),
    start: point(4.17,-0.85), cup: point(-4.05,1.13),
    obstacles: [obstacle('mosaic',2.20,-.41,.53,1.12),obstacle('mosaic',.79,1.21,.54,1.12),obstacle('mosaic',-.72,-1.21,.54,1.12),obstacle('mosaic',-2.14,.34,.56,1.12)],
  },
  {
    name: 'Obelisk Causeway', hint: 'Watch the raised gate or use the broad path past the obelisks.',
    outline: polygon([-5.30,-2.45],[-4.42,-3.50],[-2.59,-3.50],[-1.56,-2.76],[2.52,-2.76],[3.52,-3.50],[4.51,-3.50],[5.30,-2.65],[5.30,2.58],[4.48,3.47],[-0.23,3.47],[-1.22,2.66],[-2.77,2.66],[-3.76,3.45],[-4.48,3.45],[-5.30,2.64]),
    start: point(4.24,-1.62), cup: point(-4.18,1.30),
    rails: [rail('sandstone',0,-2.75,0,-1.57),rail('sandstone',0,-.20,0,1.37)],
    gates: [{...rail('sandstone',0,-1.57,0,-.20), phase:1.05}],
    obstacles: [obstacle('obelisk',2.27,1.39,.42),obstacle('obelisk',-2.22,-1.13,.46)],
  },
  {
    name: 'Lantern Ramparts', hint: 'Bank around opposite ends of the two diagonal ramparts.',
    outline: polygon([-5.34,-2.59],[-4.68,-3.43],[-1.26,-3.43],[-.57,-2.72],[1.03,-2.72],[1.88,-3.52],[4.69,-3.52],[5.34,-2.63],[5.34,2.61],[4.73,3.48],[1.85,3.48],[.96,2.78],[-.81,2.78],[-1.66,3.49],[-4.69,3.49],[-5.34,2.61]),
    start: point(4.22,-1.60), cup: point(-4.19,1.58),
    rails: [rail('rampart',2.31,-3.50,1.01,1.05),rail('rampart',-.93,-.94,-2.05,3.45)],
  },
  {
    name: 'Hanok Moon Gates', hint: 'Pick an opening in the courtyard wall. The two gates open at different times.',
    outline: polygon([-5.28,-2.76],[-4.53,-3.51],[-1.71,-3.51],[-.97,-2.93],[1.50,-2.93],[2.20,-3.51],[4.53,-3.51],[5.28,-2.77],[5.28,2.76],[4.53,3.50],[2.18,3.50],[1.51,2.93],[-1.36,2.93],[-2.19,3.50],[-4.52,3.50],[-5.28,2.75]),
    start: point(4.16,0.22), cup: point(-4.18,-.38),
    rails: [rail('hanok',0,-2.92,0,-2.37),rail('hanok',0,-1.04,0,.72),rail('hanok',0,2.06,0,2.92)],
    gates: [{...rail('hanok',0,-2.37,0,-1.04),phase:0},{...rail('hanok',0,.72,0,2.06),phase:2.75}],
  },
  {
    name: 'Cenote Ring', hint: 'Circle the cenote along either ledge, then turn toward the flag.',
    outline: polygon([-5.30,-1.80],[-4.24,-3.00],[-2.13,-3.53],[2.13,-3.53],[4.28,-2.98],[5.30,-1.78],[5.30,1.78],[4.28,2.98],[2.13,3.53],[-2.13,3.53],[-4.24,3.00],[-5.30,1.80]),
    start: point(4.16,1.09), cup: point(-4.16,-1.06),
    zones: [{kind:'water',outline: Array.from({length:24},(_,i)=>point(2.38*Math.cos(i*Math.PI/12),1.65*Math.sin(i*Math.PI/12)))}],
    obstacles: [obstacle('stone',.16,2.55,.37),obstacle('stone',-.38,-2.54,.36)],
  },
  {
    name: 'Aurora Breakwater', hint: 'Watch the gust arrows across the narrow strait. The boulders offer a route around it.',
    outline: polygon([-5.32,-2.54],[-4.38,-3.49],[-2.05,-3.49],[-.83,-2.78],[.94,-2.15],[2.53,-2.15],[3.56,-2.91],[4.57,-2.91],[5.30,-2.13],[5.30,2.38],[4.42,3.35],[2.44,3.35],[1.23,2.80],[-.79,2.17],[-2.53,2.17],[-3.46,2.96],[-4.54,2.96],[-5.32,2.12]),
    start: point(4.18,1.48), cup: point(-4.17,-1.58),
    zones: [patch('wind',-1.82,-1.61,1.88,1.69)],
    obstacles: [obstacle('breakwater',1.26,-.64,.45),obstacle('breakwater',-.84,.59,.49)],
  },
];

export function insideOutline({ x, z }: Point, outline: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const a = outline[i], b = outline[j];
    if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}
