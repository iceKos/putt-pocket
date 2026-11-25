import * as T from 'three';
import { fjordWind, gateClearsBall, hanokGateLift } from './golf';
import { alternateCourses, type CourseObstacle, type CourseRail, type Zone } from './alternate-courses';

const cube = new T.BoxGeometry();
const colors = {
  cedar: [0x773b31, 0xca614b, 0x463c35],
  marble: [0xc39176, 0xf0d1a5, 0x9d705b],
  sandstone: [0xb37b43, 0xf2c77d, 0x664b33],
  rampart: [0x756f65, 0xc7ac83, 0x7e4434],
  hanok: [0xb5a899, 0xd8bd86, 0x387163],
} as const;
const materials = new Map<number, T.MeshStandardMaterial>();

function material(color: number) {
  let paint = materials.get(color);
  if (!paint) {
    paint = new T.MeshStandardMaterial({ color, roughness: 0.86, flatShading: true });
    materials.set(color, paint);
  }
  return paint;
}

function mesh(parent: T.Object3D, geometry: T.BufferGeometry, color: number, x: number, y: number, z: number) {
  const model = new T.Mesh(geometry, material(color));
  model.position.set(x, y, z);
  model.castShadow = model.receiveShadow = true;
  parent.add(model);
  return model;
}

function box(parent: T.Object3D, color: number, x: number, y: number, z: number, width: number, height: number, depth: number) {
  const model = mesh(parent, cube, color, x, y, z);
  model.scale.set(width, height, depth);
  return model;
}

function barrier(parent: T.Group, { from, to, radius, style }: CourseRail, isGate = false) {
  const group = new T.Group();
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const width = Math.hypot(dx, dz);
  group.position.set((from.x + to.x) / 2, 0, (from.z + to.z) / 2);
  group.rotation.y = -Math.atan2(dz, dx);
  parent.add(group);
  const [body, trim, accent] = colors[style];
  const height = style === 'cedar' ? 0.33 : 0.48;
  box(group, body, 0, height / 2, 0, width, height, radius * 2);
  box(group, trim, 0, height + 0.025, 0, width + 0.10, 0.073, radius * 2.10);
  if (isGate) {
    box(group, accent, 0, 0.26, 0, width, 0.072, radius * 2.06);
    return group;
  }
  const bays = Math.max(2, Math.ceil(width / 0.56));
  for (let i = 0; i <= bays; i++) {
    const x = width * (i / bays - 0.5);
    const postHeight = style === 'rampart' ? 0.67 : style === 'cedar' ? 0.57 : 0.53;
    box(group, i % 2 ? body : trim, x, postHeight * 0.5, 0, 0.18, postHeight, radius * 2.03);
    if (style === 'rampart' && (i === 0 || i === bays)) {
      box(group, accent, x, 0.74, 0, 0.10, 0.22, 0.10);
      mesh(group, new T.SphereGeometry(0.126, 9, 6), 0xe75b3a, x, 0.89, 0);
    }
  }
  if (style === 'hanok') {
    for (const side of [-1, 1]) {
      box(group, accent, 0, 0.53, side * 0.11, width + 0.12, 0.063, 0.27).rotation.x = side * 0.24;
    }
  }
  return group;
}

function sceneryObstacle(parent: T.Group, { x, z, radius, style }: CourseObstacle) {
  if (style === 'glacier' || style === 'stone' || style === 'breakwater') {
    const dark = style === 'stone' ? 0x887653 : style === 'glacier' ? 0x527e90 : 0x587487;
    const light = style === 'stone' ? 0xb19c73 : style === 'glacier' ? 0xc8f0ef : 0x9eb9ba;
    const rock = mesh(parent, new T.DodecahedronGeometry(radius, 0), dark, x, 0.19, z);
    rock.scale.y = 0.86;
    mesh(parent, new T.DodecahedronGeometry(radius * 0.71, 0), light, x - 0.04, 0.37, z - 0.04).scale.y = 0.38;
    return;
  }
  if (style === 'obelisk') {
    mesh(parent, new T.CylinderGeometry(radius * 0.58, radius, 0.20, 4), 0xca9254, x, 0.10, z);
    mesh(parent, new T.CylinderGeometry(radius * 0.41, radius * 0.58, 0.75, 4), 0xdcaf71, x, 0.52, z);
    mesh(parent, new T.ConeGeometry(radius * 0.42, 0.26, 4), 0xf4cd8c, x, 1.01, z);
    return;
  }
  const mosaic = style === 'mosaic';
  const height = mosaic ? 0.17 : 0.59;
  mesh(parent, new T.CylinderGeometry(radius, radius, 0.17, 16), mosaic ? 0x337e80 : 0xb38a6c, x, 0.085, z);
  mesh(parent, new T.CylinderGeometry(radius * 0.85, radius * 0.90, height, 16), mosaic ? 0x216369 : 0xd9b297, x, height / 2 + 0.13, z);
  mesh(parent, new T.CylinderGeometry(radius * 0.87, radius * 0.85, 0.074, 16), mosaic ? 0xe69c57 : 0xf2d5a4, x, height + 0.16, z);
  if (mosaic) {
    for (let i = 0; i < 8; i++) {
      const a = Math.PI * i / 4;
      box(parent, i % 2 ? 0xfcde8a : 0xa8464b, x + radius * .57 * Math.cos(a), 0.38,
        z + radius * .57 * Math.sin(a), 0.13, 0.032, 0.13).rotation.y = -a;
    }
  }
}

function surface(parent: T.Group, { kind, outline }: Zone, course: number) {
  const shape = new T.Shape(outline.map(({ x, z }) => new T.Vector2(x, -z)));
  const colors = { water: 0x43969b, ice: 0x91c8d4, sand: 0xd9a772, wind: 0x557f7d };
  const paint = kind === 'water' && course === 1 ? 0x2e697e : colors[kind];
  const floor = mesh(parent, new T.ShapeGeometry(shape), paint, 0, kind === 'water' ? -0.025 : 0.010, 0);
  floor.rotation.x = -Math.PI / 2;
  floor.castShadow = false;
  if (kind === 'ice') {
    const [topLeft, , bottomRight] = outline;
    for (let i = 1; i <= 5; i++) {
      const x = T.MathUtils.lerp(topLeft.x, bottomRight.x, i / 6);
      const z = T.MathUtils.lerp(topLeft.z, bottomRight.z, i % 2 ? 0.34 : 0.68);
      box(parent, 0xd3ebec, x, 0.018, z, 0.32, 0.006, 0.025).rotation.y = 0.30;
    }
  }
  if (kind !== 'water') return;
  if (course !== 1) {
    const deep = new T.Mesh(new T.ShapeGeometry(shape), material(0x3c8289));
    deep.scale.set(0.72, 0.70, 1);
    deep.rotation.x = -Math.PI / 2;
    deep.position.y = -0.017;
    parent.add(deep);
  }
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length];
    const dx = b.x - a.x, dz = b.z - a.z;
    box(parent, 0x7cafad, (a.x + b.x) / 2, 0.004, (a.z + b.z) / 2, Math.hypot(dx, dz), 0.006, 0.043)
      .rotation.y = -Math.atan2(dz, dx);
  }
}

export function decorateAlternate(parent: T.Group, index: number) {
  const { rails = [], gates = [], zones = [], obstacles = [] } = alternateCourses[index];
  zones.forEach((zone) => surface(parent, zone, index));
  rails.forEach((rail) => barrier(parent, rail));
  obstacles.forEach((obstacle) => sceneryObstacle(parent, obstacle));
  const animateGates = gates.map((gate) => {
    const door = barrier(parent, gate, true);
    const tint = new T.MeshBasicMaterial({ color: 0xe5b35c });
    const light = new T.Mesh(new T.BoxGeometry(0.15, 0.04, 0.15), tint);
    door.add(light);
    light.position.y = 0.53;
    return (seconds: number) => {
      const lift = hanokGateLift(seconds, gate.phase);
      door.position.y = lift;
      tint.color.setHex(gateClearsBall(lift) ? 0x75e7bd : 0xe5b35c);
    };
  });
  if (index !== 9) return (seconds: number) => animateGates.forEach((animate) => animate(seconds));

  const arrows = [-1.26, 0, 1.25].map((x) => {
    const arrow = new T.Group();
    arrow.position.set(x, 0.023, 0);
    parent.add(arrow);
    box(arrow, 0x9be4d9, -0.091, 0, 0, 0.22, 0.009, 0.045).rotation.y = -0.68;
    box(arrow, 0x9be4d9, 0.091, 0, 0, 0.22, 0.009, 0.045).rotation.y = 0.68;
    return arrow;
  });
  return (seconds: number) => {
    const gust = fjordWind(seconds);
    for (const arrow of arrows) {
      arrow.rotation.y = gust >= 0 ? 0 : Math.PI;
      arrow.visible = Math.abs(gust) > 0.12;
    }
  };
}
