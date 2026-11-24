import * as T from 'three';
import { BRIDGE, MARKET_BASKETS } from './golf';

export const palettes = [
  { grass: 0x779b4c, curb: 0x988c7c, trim: 0xe2cfaa, paving: 0xc4b499, sky: 0xa9c6ba },
  { grass: 0x679c54, curb: 0x896140, trim: 0xe7b878, paving: 0xc9ab82, sky: 0x8abbad },
  { grass: 0x79914d, curb: 0xaf8065, trim: 0xe7bd91, paving: 0xcaa384, sky: 0xb6bfaa },
  { grass: 0x6c994f, curb: 0x758b95, trim: 0xe6ecdf, paving: 0xb4c5c6, sky: 0xa4ced9 },
  { grass: 0x699e62, curb: 0x51898d, trim: 0xf7d593, paving: 0xddb596, sky: 0x95c7c8 },
  { grass: 0x819b63, curb: 0xb98249, trim: 0xf0ca8f, paving: 0xd5ac7c, sky: 0xe7c7a2 },
  { grass: 0x779247, curb: 0x82736b, trim: 0xd7b290, paving: 0xb69981, sky: 0x9eb6a7 },
  { grass: 0x69a16b, curb: 0x586b68, trim: 0xd9c7ab, paving: 0xcabd9d, sky: 0xa7bfbb },
  { grass: 0x779752, curb: 0xaa8b60, trim: 0xddbd86, paving: 0xb3a07c, sky: 0x90b6a1 },
  { grass: 0x497768, curb: 0x4b6877, trim: 0xa5bfbe, paving: 0x3a5668, sky: 0x21374d },
] as const;

const materials = new Map<number, T.MeshStandardMaterial>();
const cube = new T.BoxGeometry();
const rock = new T.DodecahedronGeometry(1, 0);
const spike = new T.ConeGeometry(1, 1, 4);
const cylinder = new T.CylinderGeometry(1, 1, 1, 8);
const material = (color: number) => {
  let value = materials.get(color);
  if (!value) {
    value = new T.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 });
    materials.set(color, value);
  }
  return value;
};

function form(parent: T.Object3D, geometry: T.BufferGeometry, color: number,
  x: number, y: number, z: number, width: number, height: number, depth: number) {
  const mesh = new T.Mesh(geometry, material(color));
  mesh.position.set(x, y, z);
  mesh.scale.set(width, height, depth);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
const block = (p: T.Object3D, color: number, x: number, y: number, z: number, w: number, h: number, d: number) =>
  form(p, cube, color, x, y, z, w, h, d);
const stone = (p: T.Object3D, color: number, x: number, y: number, z: number, w: number, h: number, d: number) =>
  form(p, rock, color, x, y, z, w, h, d);
function place(parent: T.Object3D, x: number, z: number, y = -0.3) {
  const group = new T.Group();
  group.position.set(x, y, z);
  parent.add(group);
  return group;
}

function torii(parent: T.Group, x: number, z: number, scale: number) {
  const gate = place(parent, x, z);
  gate.scale.setScalar(scale);
  for (const side of [-1, 1]) {
    form(gate, cylinder, 0xb44732, side * 1.03, 0.85, 0, 0.13, 1.7, 0.13);
    form(gate, cylinder, 0x493934, side * 1.03, 0.16, 0, 0.17, 0.32, 0.17);
    block(gate, 0x413c40, side * 1.49, 1.96, 0, 0.45, 0.09, 0.43).rotation.z = side * 0.18;
  }
  block(gate, 0xbb4b35, 0, 1.37, 0, 2.65, 0.12, 0.18);
  block(gate, 0xc35134, 0, 1.78, 0, 3.12, 0.23, 0.33);
  block(gate, 0x413c40, 0, 1.93, 0, 3.12, 0.10, 0.42);
  block(gate, 0xe9b86b, 0, 1.57, 0.12, 0.26, 0.27, 0.07);
}

function kyotoPagoda(parent: T.Group, x: number, z: number) {
  const tower = place(parent, x, z);
  const hip = new T.CylinderGeometry(0.42, 1, 1, 4).rotateY(Math.PI / 4);
  const eaves = new T.CylinderGeometry(0.86, 1, 1, 4).rotateY(Math.PI / 4);
  block(tower, 0x969082, 0, 0.08, 0, 2.58, 0.16, 2.01);
  block(tower, 0xb7a58a, 0, 0.205, 0, 2.33, 0.10, 1.85);
  for (let floor = 0; floor < 5; floor++) {
    const y = 0.23 + floor * 0.402;
    const w = 1.66 - floor * 0.22;
    const depth = w * 0.70;
    block(tower, 0xd1b28a, 0, y + 0.14, 0, w, 0.25, depth);
    block(tower, 0x603d35, 0, y + 0.12, depth / 2 + 0.012, w * 0.58, 0.19, 0.025);
    for (const post of [-0.48, -0.22, 0.22, 0.48]) {
      block(tower, 0xad4b37, w * post, y + 0.14, depth / 2 + 0.028, 0.055, 0.27, 0.047);
    }
    block(tower, 0xb1503e, 0, y + 0.26, 0, w + 0.13, 0.07, depth + 0.11);
    const roof = w * 0.96 + 0.19;
    form(tower, eaves, 0x3f5351, 0, y + 0.317, 0, roof, 0.069, roof * 0.77);
    form(tower, hip, 0x536764, 0, y + 0.399, 0, roof * 0.84, 0.122, roof * 0.65);
    for (const side of [-1, 1]) {
      const corner = block(tower, 0x6e8276, side * roof * 0.713, y + 0.334, roof * 0.53, 0.18, 0.058, 0.084);
      corner.rotation.z = side * 0.30;
    }
  }
  form(tower, cylinder, 0x855b43, 0, 2.40, 0, 0.041, 0.41, 0.041);
  for (let i = 0; i < 4; i++) {
    form(tower, cylinder, 0xd4ab62, 0, 2.31 + i * 0.066, 0, 0.096 - i * 0.015, 0.035, 0.096 - i * 0.015);
  }
  stone(tower, 0xe8c477, 0, 2.59, 0, 0.054, 0.077, 0.054);
}

function sakura(parent: T.Group, x: number, z: number, size: number) {
  const tree = place(parent, x, z);
  tree.scale.setScalar(size);
  form(tree, cylinder, 0x725043, 0, 0.53, 0, 0.10, 1.06, 0.11).rotation.z = -0.17;
  for (const [direction, spread, tint] of [[-1, 0.64, 0xdf8fa9], [1, 0.65, 0xefb3bd], [0, 0.40, 0xf0a0b0]]) {
    const branch = block(tree, 0x775247, 0.25 * direction, 0.97 + spread * 0.11, 0, 0.10, 0.65, 0.10);
    branch.rotation.z = -direction * 0.63;
    stone(tree, tint, direction * spread, 1.23 + (direction === 0 ? 0.34 : 0), -0.05, 0.58, 0.45, 0.54);
    stone(tree, 0xf4c0c4, direction * spread + 0.21, 1.47, 0.27, 0.38, 0.27, 0.36);
    stone(tree, 0xdd8da8, direction * spread - 0.30, 1.16, 0.25, 0.37, 0.25, 0.39);
  }
}

function stoneLantern(parent: T.Group, x: number, z: number, size: number) {
  const lantern = place(parent, x, z);
  lantern.scale.setScalar(size);
  form(lantern, cylinder, 0x8c9786, 0, 0.08, 0, 0.27, 0.16, 0.24);
  form(lantern, cylinder, 0x8f9387, 0, 0.33, 0, 0.13, 0.48, 0.14);
  block(lantern, 0xf0bd67, 0, 0.62, 0, 0.27, 0.21, 0.27);
  for (const dx of [-0.13, 0.13]) {
    block(lantern, 0x7a877a, dx, 0.62, 0.128, 0.044, 0.23, 0.04);
  }
  form(lantern, spike, 0x77877a, 0, 0.83, 0, 0.35, 0.26, 0.35).rotation.y = Math.PI / 4;
  stone(lantern, 0x9a9b86, 0, 0.985, 0, 0.071, 0.075, 0.071);
}

const koiPondCenter = { x: -2.23, z: 1.5 };

function koiPond(parent: T.Group) {
  const pond = place(parent, koiPondCenter.x, koiPondCenter.z, -0.265);
  const disk = new T.CircleGeometry(1, 40).rotateX(-Math.PI / 2);
  const rim = new T.RingGeometry(0.89, 1, 40).rotateX(-Math.PI / 2);
  form(pond, disk, 0x377d74, 0, 0.013, 0, 2.33, 1, 1.82).castShadow = false;
  form(pond, disk, 0x498e84, 0, 0.019, 0, 2.04, 1, 1.50).castShadow = false;
  form(pond, rim, 0x988a72, 0, 0.021, 0, 2.39, 1, 1.87).castShadow = false;
  for (let i = 0; i < 19; i++) {
    const angle = i * Math.PI * 2 / 19;
    stone(pond, [0x9a9a87, 0x808d78, 0xa9a18b][i % 3],
      Math.cos(angle) * 2.33, 0.025, Math.sin(angle) * 1.79, 0.22 + (i % 3) * 0.033, 0.13, 0.16 + (i % 2) * 0.06);
  }
  for (const [x, z] of [[-1.54, -0.3], [1.5, -0.57], [1.57, -0.16], [-1.31, 0.71]]) {
    form(pond, disk, 0x82a264, x, 0.047, z, 0.18, 1, 0.15).castShadow = false;
    stone(pond, 0xe6a6ba, x + 0.03, 0.062, z, 0.069, 0.055, 0.062);
  }
  const fish = [0xeb9b46, 0xf0dcc5, 0xe5a887].map((tint, i) => {
    const koi = place(pond, 0, 0, 0.036);
    const body = stone(koi, tint, 0, 0, 0, 0.195, 0.042, 0.071);
    body.castShadow = false;
    const patch = stone(koi, i === 0 ? 0xffe5c7 : 0xce6546, -0.05, 0.027, 0.01, 0.086, 0.02, 0.05);
    patch.castShadow = false;
    const tail = stone(koi, tint, -0.21, 0.004, 0, 0.075, 0.025, 0.087);
    tail.castShadow = false;
    return { koi, tail };
  });
  return (seconds: number) => {
    fish.forEach(({ koi, tail }, i) => {
      const angle = seconds * 0.43 + 1.35 + i * 2.36;
      const xRadius = 1.2 + i * 0.12;
      const zRadius = 0.75 + i * 0.14;
      koi.position.x = Math.cos(angle) * xRadius;
      koi.position.z = Math.sin(angle) * zRadius;
      koi.rotation.y = -Math.atan2(Math.cos(angle) * zRadius, -Math.sin(angle) * xRadius);
      tail.rotation.y = Math.sin(seconds * 5.7 + i) * 0.32;
    });
  };
}

function moonBridge(parent: T.Group) {
  const bridge = place(parent, -2.24, 1.04, -0.22);
  bridge.rotation.y = -0.22;
  for (let i = -8; i <= 8; i++) {
    const x = i * 0.29;
    const rise = Math.max(0, 1 - (x / 2.45) ** 2) * 0.34;
    const board = block(bridge, i % 3 ? 0xad7450 : 0xbe8255, x, rise + 0.035, 0, 0.287, 0.072, 0.73);
    board.rotation.z = -x * 0.115;
    for (const side of [-1, 1]) {
      const rail = block(bridge, 0xa24432, x, rise + 0.22, side * 0.41, 0.31, 0.045, 0.053);
      rail.rotation.z = board.rotation.z;
      if (i % 2 === 0) block(bridge, 0x873e32, x, rise + 0.105, side * 0.41, 0.052, 0.23, 0.055);
    }
  }
}

function japan(parent: T.Group) {
  torii(parent, -2.35, -4.96, 0.96);
  kyotoPagoda(parent, 3.05, -5.05);
  for (const [x, z, scale] of [[-5.93, -4.34, 0.92], [6.12, -3.63, 0.86], [-5.86, 2.95, 1.10],
    [6.30, 1.94, 0.91], [0.03, -5.72, 0.80]]) {
    sakura(parent, x, z, scale);
  }
  for (const [x, z, scale] of [[-6.02, -1.17, 0.91], [5.78, 0.34, 0.92], [-4.50, 3.95, 0.73], [0.80, 3.76, 0.83]]) {
    stoneLantern(parent, x, z, scale);
  }
  const animateKoi = koiPond(parent);
  moonBridge(parent);
  for (let i = 0; i < 7; i++) {
    const x = -3.78 + i * 0.59;
    form(parent, cylinder, i % 2 ? 0x9a978a : 0xb4afa2, x, -0.269, 4.24 + Math.sin(i * 0.66) * 0.27,
      0.24, 0.067, 0.21);
  }
  for (const [x, z] of [[-5.63, 4.22], [-5.63, -3.83], [5.86, 3.54], [5.77, -2.15], [-4.9, 3.06], [0.7, 2.95]]) {
    stone(parent, 0x789760, x, -0.16, z, 0.47, 0.21, 0.34);
    stone(parent, 0x8d8f80, x + 0.36, -0.20, z - 0.26, 0.24, 0.14, 0.26);
  }
  return animateKoi;
}

function woodSign(parent: T.Group, text: string, x: number, y: number, z: number,
  width: number, height: number, font = 'Tahoma, Thonburi, "Noto Sans Thai", sans-serif', color = '#623723') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.round(512 * height / width);
  const context = canvas.getContext('2d');
  if (!context) return;
  context.fillStyle = color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#efc077';
  context.lineWidth = 6;
  context.strokeRect(9, 9, canvas.width - 18, canvas.height - 18);
  context.fillStyle = '#fff1cb';
  context.font = `bold ${Math.round(canvas.height * 0.58)}px ${font}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height * 0.51, canvas.width - 46);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  block(parent, 0x573826, x, y, z - 0.025, width + 0.045, height + 0.045, 0.045);
  const plaque = new T.Mesh(new T.PlaneGeometry(width, height), new T.MeshBasicMaterial({ map: texture }));
  plaque.position.set(x, y, z);
  parent.add(plaque);
}

const thaiGable = new T.Shape([
  new T.Vector2(-1, 0), new T.Vector2(0, 1), new T.Vector2(1, 0),
]);
const thaiGableGeometry = new T.ShapeGeometry(thaiGable);

function thaiRoof(parent: T.Group, clay: number, eave: number, width: number, depth: number, rise: number) {
  const half = width / 2;
  const length = Math.hypot(half, rise);
  const pitch = Math.atan2(rise, half);
  for (const side of [-1, 1]) {
    const panel = block(parent, clay, side * half * 0.5, eave + rise * 0.5, 0, length + 0.09, 0.12, depth);
    panel.rotation.z = -side * pitch;
    for (let i = 1; i <= 5; i++) {
      const t = i / 6;
      const roofTile = block(parent, i % 2 ? clay : 0x9c5138, side * half * t, eave + rise * (1 - t) + 0.072,
        0, 0.044, 0.028, depth + 0.025);
      roofTile.rotation.z = -side * pitch;
    }
    const bargeboard = block(parent, 0xdba66c, side * half * 0.49, eave + rise * 0.51 + 0.012, depth * 0.51,
      length + 0.16, 0.105, 0.105);
    bargeboard.rotation.z = -side * pitch;
    block(parent, 0xb27e51, side * (half + 0.035), eave + 0.01, depth * 0.51, 0.10, 0.22, 0.11).rotation.z = side * 0.22;
    block(parent, 0xdba66c, side * (half + 0.053), eave + 0.10, depth * 0.52, 0.09, 0.22, 0.095)
      .rotation.z = -side * 0.46;
  }
  const face = form(parent, thaiGableGeometry, 0xa66c46, 0, eave, depth * 0.46, half - 0.08, rise, 1);
  face.castShadow = false;
  block(parent, 0x81513b, 0, eave + rise + 0.043, 0, 0.15, 0.095, depth + 0.18);
  form(parent, new T.ConeGeometry(0.082, 0.23, 6), 0xd7a15b, 0, eave + rise + 0.14, depth * 0.53, 1, 1, 1);
}

function thaiFlag(parent: T.Group, x: number, z: number) {
  const pole = place(parent, x, z);
  form(pole, cylinder, 0x805938, 0, 0.68, 0, 0.033, 1.36, 0.033);
  const rows = [[0xbc3239, 1], [0xfff4dc, 1], [0x2b3f78, 2], [0xfff4dc, 1], [0xbc3239, 1]];
  let y = 1.31;
  for (const [color, units] of rows) {
    const height = 0.055 * units;
    block(pole, color, 0.28, y - height / 2, 0, 0.55, height, 0.012);
    y -= height;
  }
}

function thaiFruit(parent: T.Group, x: number, y: number, z: number, variety: number) {
  const fruit = [0xffbf49, 0xe57548, 0x7ca03c, 0xf3d15c][variety % 4];
  stone(parent, fruit, x, y, z, 0.092, 0.076, 0.086);
  if (variety % 4 === 2) stone(parent, 0xd5d89a, x, y + 0.055, z, 0.062, 0.024, 0.054);
}

function canalPalms(parent: T.Group, x: number, z: number, size: number) {
  const palm = place(parent, x, z);
  palm.scale.setScalar(size);
  form(palm, cylinder, 0x9c7247, 0, 0.66, 0, 0.09, 1.33, 0.09).rotation.z = -0.10;
  for (let i = 0; i < 7; i++) {
    const angle = i * Math.PI * 2 / 7;
    const leaf = stone(palm, i % 2 ? 0x659747 : 0x487e4c,
      Math.cos(angle) * 0.37, 1.32 + (i % 3) * 0.075, Math.sin(angle) * 0.37, 0.58, 0.12, 0.18);
    leaf.rotation.y = -angle;
  }
  stone(palm, 0xa07840, 0.06, 1.24, 0.01, 0.19, 0.16, 0.19);
}

function thaiParasol(parent: T.Group, x: number, z: number, color: number) {
  const parasol = place(parent, x, z);
  form(parasol, cylinder, 0x92633f, 0, 0.62, 0, 0.035, 1.25, 0.035);
  form(parasol, new T.ConeGeometry(0.56, 0.27, 10), color, 0, 1.19, 0, 1, 1, 1);
  form(parasol, cylinder, 0xf1ca86, 0, 1.067, 0, 0.56, 0.045, 0.56);
  stone(parasol, 0xffda91, 0, 1.34, 0, 0.064, 0.061, 0.064);
}

function lotus(parent: T.Group, x: number, z: number, size: number) {
  const bloom = place(parent, x, z, -0.19);
  bloom.scale.setScalar(size);
  form(bloom, cylinder, 0x6c9d61, 0.04, 0, 0.05, 0.23, 0.031, 0.20);
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3;
    const petal = stone(bloom, i % 2 ? 0xffb1bc : 0xea829e,
      Math.cos(angle) * 0.055, 0.06, Math.sin(angle) * 0.055, 0.09, 0.060, 0.041);
    petal.rotation.y = -angle;
  }
  stone(bloom, 0xf6d674, 0, 0.088, 0, 0.042, 0.038, 0.042);
}

function marketBasket(parent: T.Group, x: number, z: number, radius: number, index: number) {
  const basket = place(parent, x, z, 0);
  form(basket, new T.CylinderGeometry(radius, radius * 0.77, 0.21, 12), 0xb18450, 0, 0.106, 0, 1, 1, 1);
  form(basket, new T.CylinderGeometry(radius, radius, 0.05, 12), 0xdcb375, 0, 0.218, 0, 1, 1, 1);
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;
    const strip = block(basket, 0xead093, Math.cos(angle) * radius * 0.91, 0.112, Math.sin(angle) * radius * 0.91,
      0.019, 0.16, 0.027);
    strip.rotation.y = -angle;
  }
  form(basket, cylinder, 0x946840, 0, 0.249, 0, radius * 0.85, 0.02, radius * 0.85);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    thaiFruit(basket, Math.cos(angle) * radius * 0.57, 0.31, Math.sin(angle) * radius * 0.57, i + index);
  }
}

function thailand(parent: T.Group) {
  const canal = 0x2c837e;
  // Continue the playing canal outside the rail into the market waterfront.
  block(parent, canal, -0.1, -0.267, 5.7, 2.70, 0.10, 4.5);
  block(parent, 0x429aa0, 0.2, -0.278, -5.95, 13.8, 0.08, 3.95);
  const stalls = [
    { x: -4.12, z: -4.86, sign: 'ผลไม้สด', roof: 0xbb5740, cloth: 0xb64a42 },
    { x: -0.70, z: -4.95, sign: 'ตลาดน้ำ', roof: 0xa65039, cloth: 0x3b917d },
    { x: 3.06, z: -4.83, sign: 'ขนมไทย', roof: 0xb35c41, cloth: 0xcb8b3c },
  ];

  for (const stall of stalls) {
    const house = place(parent, stall.x, stall.z);
    for (const dx of [-0.97, 0.97]) {
      for (const dz of [-0.46, 0.42]) {
        block(house, 0x73503a, dx, 0.44, dz, 0.13, 0.88, 0.14);
      }
    }
    for (let i = 0; i < 11; i++) {
      block(house, i % 3 ? 0xc99362 : 0xb48155, -1.11 + i * 0.221, 0.67, 0.14, 0.208, 0.14, 1.54);
    }
    block(house, 0xb17e50, 0, 0.99, -0.5, 1.97, 0.71, 0.13);
    for (const side of [-1, 1]) {
      block(house, 0xb78153, side * 0.98, 0.99, -0.03, 0.1, 0.69, 0.91);
      block(house, 0x875637, side * 0.92, 1.04, 0.59, 0.095, 0.86, 0.1);
    }
    block(house, 0x8b5a37, 0, 0.91, 0.54, 1.91, 0.14, 0.39);
    thaiRoof(house, stall.roof, 1.42, 2.45, 1.68, 0.77);
    for (let i = 0; i < 9; i++) {
      const tone = i % 2 ? 0xffe2a1 : stall.cloth;
      block(house, tone, -1.04 + i * 0.26, 1.43, 0.91, 0.259, 0.046, 0.54).rotation.x = 0.24;
      block(house, tone, -1.04 + i * 0.26, 1.31, 1.17, 0.257, 0.11, 0.035);
    }
    woodSign(house, stall.sign, 0, 1.60, 0.94, 1.21, 0.29);
    for (let i = 0; i < 8; i++) thaiFruit(house, (i - 3.5) * 0.19, 1.005, 0.67, i);
  }

  // A long boardwalk connects the stalls and keeps all decoration outside the playing surface.
  for (let i = 0; i < 34; i++) {
    block(parent, i % 3 ? 0xb48759 : 0xc69867, -6.25 + i * 0.37, -0.17, -3.98, 0.357, 0.105, 0.52);
  }
  for (const [left, right] of [[-5.1, -1.42], [1.27, 5.28]]) {
    for (let x = left; x < right; x += 0.27) {
      block(parent, Math.round((x - left) * 4) % 3 ? 0xbb895d : 0xc89a6a, x, -0.235, 4.13, 0.263, 0.10, 1.07);
    }
  }
  const boats = [[-0.58, 4.64, -0.24], [0.36, 6.16, 0.15], [4.92, -5.17, 1.38]].map(([x, z, direction], index) => {
    const boat = place(parent, x, z, -0.24);
    boat.rotation.y = direction;
    stone(boat, 0x855234, 0, 0.10, 0, 0.29, 0.18, 0.88);
    stone(boat, 0xcc9257, 0, 0.23, 0, 0.265, 0.07, 0.82);
    block(boat, 0x51382e, 0, 0.22, 0.81, 0.078, 0.07, 0.49).rotation.x = -0.36;
    tieProwRibbon(boat, -0.64);
    for (const [row, dz] of [[0, -0.41], [1, -0.15]]) {
      form(boat, cylinder, 0x95663c, 0, 0.279, dz, 0.144, 0.085, 0.142);
      for (let i = 0; i < 3; i++) thaiFruit(boat, (i - 1) * 0.106, 0.363, dz + (i % 2) * 0.06, row + i);
    }
    const shirt = [0xf2ad5d, 0x57a093, 0xd07759][index];
    stone(boat, shirt, 0, 0.40, 0.31, 0.15, 0.20, 0.12);
    stone(boat, 0xc18e64, 0, 0.56, 0.31, 0.076, 0.082, 0.075);
    form(boat, new T.ConeGeometry(0.16, 0.11, 9), 0xd6ad70, 0, 0.63, 0.31, 1, 1, 1);
    block(boat, 0xb98959, 0.23, 0.38, 0.37, 0.033, 0.035, 0.62).rotation.y = -0.57;
    return boat;
  });

  const entrance = place(parent, -3.6, 5.28);
  for (const side of [-1, 1]) block(entrance, 0x8f5838, side * 0.87, 0.54, 0, 0.09, 1.08, 0.12);
  thaiRoof(entrance, 0xa24936, 1.08, 2.18, 0.69, 0.41);
  woodSign(entrance, 'ตลาดน้ำริมคลอง', 0, 0.84, 0.39, 2.16, 0.43);
  thaiFlag(parent, 5.78, -4.18);
  thaiParasol(parent, 3.12, 4.42, 0xc97254);
  thaiParasol(parent, 4.68, 4.77, 0x50948d);
  const pavilion = place(parent, 6.32, 2.88);
  pavilion.scale.setScalar(0.76);
  block(pavilion, 0xb6865f, 0, 0.19, 0, 1.74, 0.36, 1.39);
  for (const dx of [-0.73, 0.73]) {
    for (const dz of [-0.48, 0.48]) block(pavilion, 0x884f36, dx, 0.71, dz, 0.087, 1.07, 0.087);
  }
  thaiRoof(pavilion, 0xa24838, 1.22, 2.14, 1.54, 0.53);
  thaiRoof(pavilion, 0xad593f, 1.65, 1.35, 1.09, 0.44);
  canalPalms(parent, -6.1, 3.68, 1.00);
  canalPalms(parent, 6.23, -0.95, 1.18);
  canalPalms(parent, 6.18, 0.43, 0.83);

  const ripples = Array.from({ length: 20 }, (_, i) => {
    const x = i < 13 ? -1.08 + (i % 3) * 0.94 : -4.8 + (i - 13) * 1.49;
    const z = i < 13 ? 3.85 + i * 0.29 : -6.03 - (i % 3) * 0.28;
    const width = 0.20 + (i % 4) * 0.075;
    const line = block(parent, 0x66b6ac, x, -0.208, z, width, 0.004, 0.024);
    line.castShadow = false;
    return { line, x, width };
  });
  for (const [x, z] of [[-1.04, 5.21], [0.72, 4.08], [0.78, 5.44], [-0.92, 6.08], [0.99, 6.41]]) {
    lotus(parent, x, z, 0.79 + Math.abs(x % 0.25));
  }
  for (let i = 0; i < 9; i++) block(parent, 0xc79b64, -1.80 + i * 0.35, -0.17, 7.0, 0.33, 0.20, 0.93);
  for (const [i, basket] of MARKET_BASKETS.entries()) marketBasket(parent, basket.x, basket.z, basket.radius, i);
  const bridge = (BRIDGE.deckTop + BRIDGE.deckBottom) / 2;
  for (const bank of [BRIDGE.left, BRIDGE.right]) {
    for (const side of [-1, 1]) {
      const marker = block(parent, 0xf4cc75, bank + (bank > 0 ? 0.19 : -0.19), 0.016, bridge + side * 0.34, 0.13, 0.019, 0.065);
      marker.castShadow = false;
    }
  }
  return (time: number) => {
    boats.forEach((boat, i) => {
      boat.position.y = -0.24 + Math.sin(time * 1.6 + i * 2) * 0.034;
      boat.rotation.z = Math.sin(time * 1.2 + i * 2) * 0.038;
    });
    ripples.forEach(({ line, x, width }, i) => {
      line.position.x = x + Math.sin(time * 1.1 + i * 1.7) * 0.10;
      line.scale.x = width * (0.88 + Math.sin(time * 1.35 + i) * 0.18);
    });
  };
}

function tieProwRibbon(boat: T.Group, z: number) {
  for (const [i, color] of [0xd74a4a, 0xf2c956, 0x56a9a1].entries()) {
    block(boat, color, 0, 0.235, z - i * 0.057, 0.30 - i * 0.054, 0.075, 0.045);
  }
}

function italy(parent: T.Group) {
  // One masonry section, with a real arched opening between the piers.
  const arch = new T.Shape();
  arch.moveTo(-0.55, 0);
  arch.lineTo(-0.33, 0);
  arch.lineTo(-0.33, 0.56);
  arch.absarc(0, 0.56, 0.33, Math.PI, 0, true);
  arch.lineTo(0.33, 0);
  arch.lineTo(0.55, 0);
  arch.lineTo(0.55, 1.05);
  arch.lineTo(-0.55, 1.05);
  arch.closePath();
  const masonry = new T.ExtrudeGeometry(arch, { depth: 0.26, bevelEnabled: false, curveSegments: 7 });
  const trim = new T.TorusGeometry(0.364, 0.047, 4, 13, Math.PI);

  for (let bay = -5; bay <= 5; bay++) {
    const x = bay * 1.03;
    const z = -5.16 + x ** 2 * 0.043;
    const section = place(parent, x, z);
    section.rotation.y = -Math.atan(0.086 * x);
    const levels = bay > 2 ? 1 : 2;
    for (let level = 0; level < levels; level++) {
      const rise = level * 0.94;
      form(section, masonry, level ? 0xc4a07b : 0xd7b088, 0, rise, 0, 1, 0.89, 1);
      form(section, trim, 0xe5c4a0, 0, rise + 0.5, 0.265, 1, 0.88, 1);
      block(section, 0xa77859, 0, rise + 0.955, 0.125, 1.105, 0.075, 0.43);
      block(section, 0xeacaa2, 0, rise + 0.917, 0.146, 1.102, 0.067, 0.41);
      block(section, 0xe7bd95, -0.49, rise + 0.40, 0.276, 0.12, 0.73, 0.12);
    }
    if (bay >= -4 && bay <= 0) {
      const top = levels * 0.94;
      block(section, 0xc8a27d, 0, top + 0.15, 0.125, 1.095, 0.30, 0.27);
      for (const x of [-0.25, 0.17]) block(section, 0x8f6954, x, top + 0.14, 0.27, 0.12, 0.14, 0.02);
    }
  }
  for (const [x, z, height] of [[-6.3, -1.8, 1.52], [-6.4, 0.1, 1.25], [6.38, -1.26, 1.56], [6.1, 1.4, 1.29]]) {
    block(parent, 0x795943, x, 0.02, z, 0.10, 0.62, 0.10);
    stone(parent, 0x4e6948, x, height * 0.40 - 0.2, z, 0.32, height * 0.63, 0.29);
    stone(parent, 0x6f8251, x, height * 0.75 - 0.20, z, 0.25, height * 0.45, 0.23);
  }
  for (const [x, z] of [[-4.42, 4.75], [-2.62, 4.73], [2.20, 4.88], [4.37, 4.57]]) {
    const ruin = place(parent, x, z);
    block(ruin, 0x9e795d, 0, 0.095, 0, 0.52, 0.18, 0.52);
    form(ruin, cylinder, 0xd3ae87, 0, 0.34, 0, 0.20, 0.48, 0.20);
    form(ruin, cylinder, 0xe8be94, 0, 0.60, 0, 0.25, 0.11, 0.25);
  }
}

function alpinePeak(parent: T.Group, x: number, z: number, height: number, width: number, face: number) {
  const peak = place(parent, x, z);
  peak.rotation.y = Math.PI * 0.14;
  const snowHeight = height * 0.53;
  const snowLine = height - snowHeight;
  const slope = new T.CylinderGeometry(width * 0.47, width, snowLine, 5);
  form(peak, slope, face, 0, snowLine / 2, 0, 1, 1, 0.57);
  // The two meshes share the same edge so the snow line sits flush against the rock.
  const snow = new T.ConeGeometry(width * 0.47, snowHeight, 5);
  form(peak, snow, 0xf0f7f5, 0, snowLine + snowHeight / 2, 0, 1, 1, 0.57);
}

function snowPine(parent: T.Group, x: number, z: number, size: number) {
  const tree = place(parent, x, z);
  tree.scale.setScalar(size);
  form(tree, cylinder, 0x856b56, 0, 0.24, 0, 0.075, 0.48, 0.075);
  for (let tier = 0; tier < 3; tier++) {
    const radius = 0.44 - tier * 0.09;
    const y = 0.58 + tier * 0.28;
    form(tree, new T.ConeGeometry(radius, 0.60, 7), tier % 2 ? 0x3d776c : 0x3a6b5e, 0, y, 0, 1, 1, 1);
    form(tree, new T.ConeGeometry(radius * 0.74, 0.44, 7), 0xe4efea, 0, y + 0.091, 0, 1, 1, 1);
  }
}

function swissChalet(parent: T.Group, x: number, z: number, size: number) {
  const house = place(parent, x, z);
  house.scale.setScalar(size);
  block(house, 0x7d8585, 0, 0.14, 0, 1.89, 0.28, 1.32);
  block(house, 0xe3ccb0, 0, 0.64, 0, 1.71, 1.04, 1.16);
  block(house, 0x604537, 0, 0.91, 0.585, 1.75, 0.47, 0.055);
  for (const side of [-1, 1]) {
    const roof = block(house, 0x635550, side * 0.54, 1.28, 0, 1.27, 0.13, 1.67);
    const snow = block(house, 0xeff8f3, side * 0.54, 1.375, 0, 1.28, 0.10, 1.69);
    roof.rotation.z = snow.rotation.z = -side * 0.49;
    block(house, 0x764b3b, side * 0.54, 0.58, 0.596, 0.47, 0.38, 0.066);
    block(house, 0x87b3bd, side * 0.54, 0.58, 0.637, 0.29, 0.26, 0.022);
    block(house, 0xe8d4b8, side * 0.54, 0.58, 0.652, 0.30, 0.032, 0.020);
  }
  block(house, 0x704c3d, 0, 0.40, 0.60, 0.32, 0.57, 0.067);
  block(house, 0xc2b6a5, 0.53, 1.47, -0.22, 0.25, 0.45, 0.26);
  block(house, 0xe6efeb, 0.53, 1.71, -0.22, 0.30, 0.076, 0.29);
}

function switzerland(parent: T.Group) {
  for (const [x, z, height, width, face] of [
    [-7.0, -6.1, 2.35, 2.25, 0x789aa5], [-3.85, -6.65, 2.90, 2.65, 0x678c9f],
    [-0.05, -6.42, 2.20, 2.45, 0x83a3ac], [3.3, -6.68, 2.95, 2.65, 0x6e93a4],
    [6.6, -6.05, 2.28, 2.28, 0x82a5ad],
  ]) alpinePeak(parent, x, z, height, width, face);

  swissChalet(parent, -3.13, -4.69, 0.99);
  swissChalet(parent, 4.37, -4.82, 0.84);
  for (const [x, z, size] of [[-6.1, -2.9, 1.06], [-5.87, 2.18, 1.0], [1.25, -4.78, 0.92],
    [6.1, -1.69, 1.06], [6.1, 2.81, 0.96], [5.74, 4.25, 0.75]]) snowPine(parent, x, z, size);

  for (let i = 0; i < 13; i++) {
    const x = -5.85 + i * 0.96;
    stone(parent, i % 3 === 0 ? 0xd9ebec : 0xeef5ef, x, -0.29, 4.02 + (i % 3) * 0.23, 0.62, 0.14 + (i % 2) * 0.075, 0.38);
  }
  const flag = place(parent, -3.78, 4.47);
  form(flag, cylinder, 0x667b82, 0, 0.67, 0, 0.027, 1.34, 0.027);
  block(flag, 0xd6343e, 0.28, 0.99, 0, 0.55, 0.55, 0.014);
  for (const z of [-0.012, 0.012]) {
    block(flag, 0xffffff, 0.28, 0.99, z, 0.34, 0.102, 0.007);
    block(flag, 0xffffff, 0.28, 0.99, z, 0.102, 0.34, 0.007);
  }
}

const mosaic = [0xe77b51, 0x3e99a5, 0xf9ca63, 0xece4ce, 0x447bae, 0x75ac87];
function spain(parent: T.Group) {
  for (let i = 0; i < 28; i++) {
    const x = -6.3 + i * 0.47;
    const z = -4.71 - Math.sin(i * 0.23) * 0.35;
    block(parent, 0xd69a80, x, 0.16, z, 0.46, 0.48, 0.47);
    for (let m = 0; m < 3; m++) {
      block(parent, mosaic[(i * 5 + m * 3) % mosaic.length], x - 0.15 + m * 0.15, 0.42, z, 0.14, 0.08, 0.45);
    }
  }
  for (const [x, z] of [[-3.5, 4.8], [3.2, 4.8]]) {
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 7; col++) {
        block(parent, mosaic[(row * 11 + col * 7) % mosaic.length], x - 0.9 + col * 0.29, -0.29, z + (row - 2) * 0.28, 0.27, 0.06, 0.26);
      }
    }
  }
}

function nilePalm(parent: T.Group, x: number, z: number, size: number) {
  const palm = place(parent, x, z);
  palm.scale.setScalar(size);
  form(palm, cylinder, 0x96613e, 0, 0.8, 0, 0.10, 1.6, 0.10).rotation.z = -0.11;
  for (let i = 0; i < 7; i++) {
    const angle = i * Math.PI * 2 / 7;
    const leaf = stone(palm, i % 2 ? 0x77944b : 0x548359, Math.cos(angle) * 0.44, 1.57 + (i % 3) * 0.03,
      Math.sin(angle) * 0.44, 0.64, 0.13, 0.21);
    leaf.rotation.y = -angle;
  }
  stone(palm, 0x688d48, 0, 1.66, 0, 0.34, 0.2, 0.34);
}

function pyramid(parent: T.Group, x: number, z: number, size: number) {
  const monument = place(parent, x, z);
  monument.rotation.y = Math.PI / 9;
  const levels = 16;
  for (let i = 0; i < levels; i++) {
    const base = size * (1 - i / levels);
    const height = size * 0.68 / levels;
    const shade = [0xddaa70, 0xe0b47a, 0xe5b87c, 0xe1ae72][i % 4];
    block(monument, i > 12 ? 0xf1d09c : shade, 0, (i + 0.5) * height, 0, base, height * 1.012, base);
  }
}

function sandstoneTemple(parent: T.Group) {
  const temple = place(parent, 0.21, -4.92);
  const mast = new T.BoxGeometry();
  const vertices = mast.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    if (vertices.getY(i) > 0) vertices.setXYZ(i, vertices.getX(i) * 0.82, vertices.getY(i), vertices.getZ(i) * 0.82);
  }
  mast.computeVertexNormals();
  block(temple, 0xb98452, 0, 0.085, 0, 4.35, 0.17, 1.66);
  block(temple, 0xd8ab77, 0, 0.216, 0.12, 4.03, 0.09, 1.43);
  block(temple, 0x886447, 0, 0.91, -0.37, 1.19, 1.38, 0.22);
  block(temple, 0xe6ba86, 0, 1.59, 0.07, 1.69, 0.22, 0.72);
  block(temple, 0x519c96, 0, 1.72, 0.445, 1.46, 0.08, 0.086);
  for (const side of [-1, 1]) {
    const x = side * 1.32;
    form(temple, mast, 0xcda073, x, 1.09, 0, 1.32, 1.86, 1.10);
    block(temple, 0xe4b882, x, 2.04, 0.02, 1.21, 0.14, 1.03);
    block(temple, 0xecc494, x, 2.17, 0.02, 1.30, 0.15, 1.11);
    block(temple, 0xaf835e, x, 0.24, 0.522, 1.30, 0.084, 0.13);
    for (let i = 0; i < 6; i++) {
      const px = x + (i - 2.5) * 0.155;
      block(temple, i % 2 ? 0xd5a874 : 0xb98458, px, 1.32, 0.494, 0.083, 0.19, 0.017);
      block(temple, 0xdaaf80, px, 0.97, 0.514, 0.071, 0.15 + (i % 3) * 0.10, 0.018);
    }
    for (const px of [side * 0.56, side * 0.86]) {
      form(temple, cylinder, 0xe3bd87, px, 0.67, 0.68, 0.093, 0.98, 0.093);
      form(temple, new T.CylinderGeometry(0.155, 0.09, 0.18, 8), 0x6f9e8c, px, 1.24, 0.68, 1, 1, 1);
      block(temple, 0xf0c992, px, 1.35, 0.68, 0.25, 0.07, 0.25);
    }
  }
}

function obelisk(parent: T.Group, x: number, z: number, height: number) {
  const pillar = place(parent, x, z);
  block(pillar, 0xa97c54, 0, 0.113, 0, 0.69, 0.21, 0.68);
  block(pillar, 0xe7bd8d, 0, 0.263, 0, 0.51, 0.16, 0.51);
  const tapered = new T.CylinderGeometry(0.139, 0.25, height, 4).rotateY(Math.PI / 4);
  form(pillar, tapered, 0xd7a570, 0, 0.33 + height / 2, 0, 1, 1, 1);
  form(pillar, spike, 0xe6af51, 0, height + 0.45, 0, 0.14, 0.23, 0.14).rotation.y = Math.PI / 4;
  for (let i = 0; i < 4; i++) {
    const mark = stone(pillar, 0xb68354, 0, height * (0.23 + i * 0.13) + 0.39, 0.17 - i * 0.011, 0.051, 0.033, 0.012);
    mark.rotation.z = i % 2 ? 0.34 : 0;
  }
}

function felucca(parent: T.Group, x: number, z: number, size: number, yaw: number) {
  const boat = place(parent, x, z, -0.235);
  boat.rotation.y = yaw;
  boat.scale.setScalar(size);
  stone(boat, 0x865840, 0, 0.06, 0, 0.76, 0.105, 0.22);
  stone(boat, 0xc49464, 0, 0.14, 0, 0.66, 0.039, 0.185);
  block(boat, 0x885d44, 0.02, 0.65, 0, 0.038, 1.09, 0.041);
  const cloth = new T.Shape([
    new T.Vector2(-0.31, 1.18), new T.Vector2(0.65, 0.29), new T.Vector2(-0.29, 0.25),
  ]);
  const sail = form(boat, new T.ShapeGeometry(cloth), 0xffe9bb, 0, 0, 0.024, 1, 1, 1);
  sail.material = material(0xffe9bb).clone();
  sail.material.side = T.DoubleSide;
  const yard = block(boat, 0xaa7855, 0.166, 0.745, 0.028, 1.265, 0.025, 0.029);
  yard.rotation.z = -0.745;
  block(boat, 0x469a95, -0.40, 0.147, 0.079, 0.19, 0.052, 0.057);
  return { boat, yaw, x };
}

function egypt(parent: T.Group) {
  const river = new T.Shape([
    [-16, -14], [-7.35, -14], [-6.85, -4.4], [-6.56, -1.0], [-6.62, 2.56], [-6.01, 4.62], [-4.85, 5.25],
    [-2.55, 5.72], [0.23, 5.90], [3.13, 5.52], [6.5, 5.36], [16, 5.45], [16, 11], [-16, 11],
  ].map(([x, z]) => new T.Vector2(x, -z)));
  const water = new T.ShapeGeometry(river).rotateX(-Math.PI / 2);
  form(parent, water, 0x398d92, 0, -0.245, 0, 1, 1, 1).castShadow = false;
  const shore = [[-7.17, -5.7], [-6.84, -3.2], [-6.55, -0.65], [-6.58, 2.85],
    [-5.86, 4.7], [-4.80, 5.24], [-2.43, 5.69], [0.23, 5.89], [3.08, 5.57], [6.45, 5.37]];
  for (let i = 0; i < shore.length - 1; i++) {
    const [x, z] = shore[i];
    const [nx, nz] = shore[i + 1];
    block(parent, 0xe5ba82, (x + nx) / 2, -0.237, (z + nz) / 2,
      Math.hypot(nx - x, nz - z) + 0.06, 0.046, 0.15).rotation.y = -Math.atan2(nz - z, nx - x);
  }

  pyramid(parent, -4.46, -5.84, 2.36);
  pyramid(parent, -2.72, -6.88, 1.60);
  pyramid(parent, 4.3, -5.94, 2.54);
  pyramid(parent, 6.32, -6.96, 1.74);
  sandstoneTemple(parent);
  obelisk(parent, -4.05, 4.11, 1.26);
  obelisk(parent, 4.47, 4.10, 1.10);
  for (const [x, z, scale] of [[-6.03, 2.32, 0.87], [-5.55, -2.86, 0.82], [6.56, 0.22, 0.98],
    [6.13, 2.22, 0.87], [5.86, 4.29, 0.76]]) nilePalm(parent, x, z, scale);
  for (let i = 0; i < 13; i++) {
    const x = -4.15 + i * 0.61;
    const z = 4.63 + Math.sin(i * 0.47) * 0.17;
    stone(parent, i % 3 ? 0xd8aa75 : 0xcfa27a, x, -0.274, z, 0.22, 0.085, 0.14);
  }

  const boats = [felucca(parent, -2.39, 6.17, 0.84, -0.20), felucca(parent, -7.24, 0.52, 0.72, -0.95)];
  const ripples = Array.from({ length: 26 }, (_, i) => {
    const x = i < 17 ? -5.1 + (i % 9) * 1.52 : -7.4 - (i % 2) * 0.38;
    const z = i < 17 ? 6.24 + (i % 3) * 0.46 + (i > 8 ? 0.77 : 0) : -4.75 + (i - 17) * 1.00;
    const width = 0.19 + (i % 6) * 0.085;
    const line = block(parent, 0x7cbbb0, x, -0.233, z, width, 0.003, 0.029);
    line.castShadow = false;
    return { line, x, width };
  });
  return (time: number) => {
    boats.forEach(({ boat, yaw, x }, i) => {
      boat.position.y = -0.235 + Math.sin(time * 1.25 + i * 2) * 0.033;
      boat.position.x = x + Math.sin(time * 0.25 + i) * 0.09;
      boat.rotation.y = yaw + Math.sin(time * 0.77 + i) * 0.035;
    });
    ripples.forEach(({ line, x, width }, i) => {
      line.position.x = x + Math.sin(time * 1.12 + i * 1.7) * 0.10;
      line.scale.x = width * (0.91 + Math.sin(time * 1.15 + i) * 0.22);
    });
  };
}

function springLantern(parent: T.Group, x: number, y: number, z: number, size: number) {
  const lantern = place(parent, x, z, y);
  lantern.scale.setScalar(size);
  stone(lantern, 0xe54431, 0, 0, 0, 0.23, 0.28, 0.23);
  for (const height of [-0.22, 0.22]) {
    form(lantern, cylinder, 0xe9b443, 0, height, 0, 0.12, 0.055, 0.12);
  }
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const seam = block(lantern, 0xcc392d, Math.cos(angle) * 0.219, 0, Math.sin(angle) * 0.219, 0.018, 0.31, 0.021);
    seam.rotation.y = -angle;
  }
  block(lantern, 0xe1a743, 0, -0.32, 0, 0.035, 0.16, 0.035);
  block(lantern, 0xa34631, 0, 0.34, 0, 0.029, 0.20, 0.029);
  return lantern;
}

function chineseRoof(parent: T.Group, y: number, width: number, depth: number, tint: number) {
  const skirt = new T.CylinderGeometry(0.80, 1, 0.11, 4).rotateY(Math.PI / 4);
  const roof = new T.CylinderGeometry(0.49, 1, 0.25, 4).rotateY(Math.PI / 4);
  form(parent, skirt, 0x634a3f, 0, y, 0, width, 1, depth);
  form(parent, roof, tint, 0, y + 0.16, 0, width * 0.82, 1, depth * 0.82);
  block(parent, 0xca985a, 0, y + 0.3, 0, width * 0.97, 0.062, 0.09);
  for (const side of [-1, 1]) {
    block(parent, 0xd3a368, side * width * 0.70, y + 0.028, depth * 0.69,
      0.28, 0.067, 0.095).rotation.z = side * 0.40;
    block(parent, 0x8a6345, side * width * 0.48, y + 0.316, 0, 0.15, 0.063, 0.082).rotation.z = side * 0.24;
  }
}

function springWatchtower(parent: T.Group, point: T.Vector3, scale: number, sign: boolean) {
  const tower = place(parent, point.x, point.z, point.y);
  tower.scale.setScalar(scale);
  block(tower, 0x8e7364, 0, 0.47, 0, 1.23, 0.98, 0.92);
  block(tower, 0xb49a85, 0, 0.96, 0, 1.42, 0.13, 1.04);
  for (let j = 0; j < 4; j++) {
    block(tower, 0xc0a58f, -0.50 + j * 0.335, 1.09, 0.45, 0.21, 0.19, 0.23);
  }
  block(tower, 0xb56a4c, 0, 1.16, 0, 1.02, 0.44, 0.68);
  for (const j of [-1, 1]) {
    block(tower, 0x5c4035, j * 0.23, 1.23, 0.351, 0.166, 0.19, 0.028);
    springLantern(tower, j * 0.61, 0.77, 0.59, 0.62);
  }
  chineseRoof(tower, 1.40, 1.10, 0.73, 0x795747);
  if (sign) woodSign(tower, '长城', 0, 0.63, 0.48, 0.56, 0.22, '"PingFang SC", "Noto Sans SC", sans-serif', '#a72e24');
}

function scenicGreatWall(parent: T.Group) {
  const path = new T.CatmullRomCurve3([
    new T.Vector3(-7.20, -0.13, -4.84),
    new T.Vector3(-4.36, 0.19, -5.35),
    new T.Vector3(-2.28, 0.12, -6.44),
    new T.Vector3(0.06, 0.39, -6.44),
    new T.Vector3(2.42, 0.20, -5.31),
    new T.Vector3(5.93, 0.06, -4.63),
    new T.Vector3(7.65, -0.10, -5.07),
  ]);
  const axis = new T.Vector3(1, 0, 0);
  const steps = 34;
  for (let i = 0; i < steps; i++) {
    const a = path.getPointAt(i / steps);
    const b = path.getPointAt((i + 1) / steps);
    const mid = a.clone().lerp(b, 0.5);
    const direction = b.clone().sub(a);
    const length = direction.length() + 0.037;
    const wall = block(parent, i % 3 === 0 ? 0x8a7467 : 0x9d8574,
      mid.x, mid.y + 0.26, mid.z, length, 0.55, 0.60);
    wall.quaternion.setFromUnitVectors(axis, direction.normalize());
    const stoneCap = block(parent, 0xc1a38a, mid.x, mid.y + 0.548, mid.z, length, 0.075, 0.70);
    stoneCap.quaternion.copy(wall.quaternion);
    const front = new T.Vector3(-direction.z, 0, direction.x);
    for (const side of [-1, 1]) {
      const crenel = mid.clone().addScaledVector(front, side * 0.287);
      const merlon = block(parent, 0xc5aa90, crenel.x, mid.y + 0.65, crenel.z, length * 0.48, 0.16, 0.13);
      merlon.quaternion.copy(wall.quaternion);
    }
    if (i % 4 === 0) {
      const pillar = mid.clone().addScaledVector(front, 0.31);
      const course = block(parent, 0xbea187, pillar.x, mid.y + 0.35, pillar.z, length * 0.43, 0.038, 0.02);
      course.quaternion.copy(wall.quaternion);
    }
  }
  springWatchtower(parent, path.getPoint(1 / 6), 0.95, false);
  springWatchtower(parent, path.getPoint(3 / 6), 1.08, true);
  springWatchtower(parent, path.getPoint(5 / 6), 0.91, false);
}

function dragonCurve(parent: T.Group, points: T.Vector3[], radius: number, tint: number) {
  const spine = new T.CatmullRomCurve3(points);
  form(parent, new T.TubeGeometry(spine, Math.max(12, points.length * 6), radius, 8, false),
    tint, 0, 0, 0, 1, 1, 1);
  return spine;
}

function festivalDragon(parent: T.Group) {
  const area = place(parent, -3.16, 5.36, -0.24);
  const points = [
    [-2.02, 0.57, 0.31], [-1.56, 0.66, -0.05], [-0.91, 0.90, -0.25], [-0.34, 0.68, 0.33],
    [0.33, 0.52, 0.40], [1.03, 0.83, 0.14], [1.60, 1.01, -0.35],
  ].map(([x, y, z]) => new T.Vector3(x, y, z));
  const red = 0xcc4232;
  const gold = 0xf4bc57;
  const spine = dragonCurve(area, points, 0.145, red);
  const belly = points.map(point => point.clone().add(new T.Vector3(0, -0.09, 0.063)));
  dragonCurve(area, belly, 0.087, 0xe79b46);
  for (let i = 1; i < 16; i++) {
    const t = i / 17;
    const point = spine.getPointAt(t);
    const fin = stone(area, i % 3 ? gold : 0xffd887,
      point.x, point.y + 0.13, point.z, 0.058, 0.080, 0.041);
    fin.rotation.z = -0.25;
    if (i % 2) {
      block(area, 0x824c38, point.x, point.y * 0.53, point.z, 0.039, point.y, 0.041);
      block(area, 0x9a5c3d, point.x, 0.022, point.z, 0.20, 0.044, 0.15);
    }
  }
  stone(area, gold, -2.08, 0.61, 0.30, 0.22, 0.068, 0.068).rotation.z = 0.56;
  const head = place(area, 1.71, -0.36, 1.015);
  stone(head, red, 0, 0.01, 0, 0.24, 0.18, 0.187);
  stone(head, 0xe65736, 0.20, -0.031, 0.015, 0.19, 0.113, 0.158);
  stone(head, gold, 0.21, -0.105, 0.01, 0.181, 0.041, 0.123);
  for (const side of [-1, 1]) {
    const z = side * 0.145;
    stone(head, 0xffe3a1, 0.035, 0.066, z, 0.073, 0.066, 0.051);
    stone(head, 0x573e32, 0.074, 0.069, side * 0.181, 0.025, 0.035, 0.022);
    stone(head, gold, -0.104, 0.16, z, 0.046, 0.19, 0.041).rotation.z = 0.37;
    stone(head, 0xf1a141, -0.17, 0.01, side * 0.165, 0.14, 0.112, 0.073).rotation.z = 0.32;
    dragonCurve(head, [
      new T.Vector3(0.25, -0.012, z), new T.Vector3(0.41, 0.02, side * 0.20),
      new T.Vector3(0.52, 0.12, side * 0.27),
    ], 0.013, gold);
  }
}

function china(parent: T.Group) {
  const font = '"PingFang SC", "Noto Sans SC", sans-serif';
  for (let i = 0; i < 15; i++) {
    const x = -10.1 + i * 1.39;
    const z = -6.44 - (i % 3) * 0.63;
    stone(parent, [0x82977d, 0x9a9e7b, 0x6f8c7a][i % 3], x, -0.25, z, 1.43, 0.80 + (i % 4) * 0.32, 1.32);
  }
  scenicGreatWall(parent);

  const arch = place(parent, 3.68, 5.36);
  for (const side of [-1, 1]) {
    block(arch, 0xaa312a, side * 1.06, 0.68, 0, 0.14, 1.38, 0.14);
    block(arch, 0xe5aa3e, side * 1.06, 0.10, 0, 0.22, 0.20, 0.23);
    woodSign(arch, side < 0 ? '春' : '福', side * 1.06, 0.57, 0.082, 0.24, 0.34, font, '#a72e24');
  }
  block(arch, 0xb8342d, 0, 1.31, 0, 2.90, 0.14, 0.22);
  chineseRoof(arch, 1.51, 2.22, 0.61, 0x973d2f);
  for (const x of [-0.70, 0.70]) block(arch, 0x9f4c38, x, 1.34, 0.29, 0.12, 0.12, 0.43);
  woodSign(arch, '新春快乐', 0, 1.23, 0.53, 1.66, 0.35, font, '#b82f28');
  const swinging = [
    springLantern(arch, -1.45, 1.02, 0.20, 0.91),
    springLantern(arch, 1.45, 1.02, 0.20, 0.91),
  ];
  for (const [x, z] of [[-6.17, -0.92], [6.09, -1.74], [6.18, 1.27], [-6.04, 2.18]]) {
    block(parent, 0x7e543f, x, 0.44, z, 0.08, 1.48, 0.08);
    block(parent, 0x9f633d, x - 0.16, 1.18, z, 0.34, 0.075, 0.082);
    swinging.push(springLantern(parent, x - 0.29, 0.84, z, 0.86));
  }
  festivalDragon(parent);
  for (let i = 0; i < 11; i++) {
    const x = -5.62 + i * 0.53;
    const z = 4.26 + Math.sin(i * 0.7) * 0.24;
    stone(parent, [0xb18d70, 0xc5a183, 0xc4a788][i % 3], x, -0.247, z, 0.25, 0.049, 0.19);
  }
  for (const [x, z] of [[-6.08, 4.64], [5.61, 4.44], [5.89, -3.51], [-5.87, -3.59]]) {
    const group = place(parent, x, z);
    form(group, cylinder, 0xa36e43, 0, 0.163, 0, 0.25, 0.33, 0.23);
    for (let i = 0; i < 6; i++) {
      const t = i * Math.PI / 3;
      stone(group, i % 2 ? 0xe8a04e : 0xdb7646, Math.cos(t) * 0.156, 0.47 + (i % 3) * 0.08,
        Math.sin(t) * 0.152, 0.14, 0.13, 0.13);
    }
  }
  return (time: number) => {
    swinging.forEach((lantern, i) => {
      lantern.rotation.z = Math.sin(time * 1.7 + i * 1.32) * 0.077;
    });
  };
}

function hanokRoof(parent: T.Group, height: number, width: number, depth: number) {
  for (let i = -7; i <= 7; i++) {
    const along = i / 7;
    const lift = 0.22 * Math.abs(along) ** 4;
    for (const side of [-1, 1]) {
      const roof = block(parent, i % 2 ? 0x445459 : 0x4c5d62, along * width * 0.467, height + lift,
        side * depth * 0.235, width * 0.070, 0.085, depth * 0.55);
      roof.rotation.x = side * 0.33;
      block(parent, 0x35565b, along * width * 0.467, height - 0.138 + lift,
        side * depth * 0.506, width * 0.071, 0.069, 0.083);
    }
  }
  block(parent, 0x344347, 0, height + 0.16, 0, width * 0.97, 0.085, 0.14);
  for (const side of [-1, 1]) {
    block(parent, 0x3a4c51, side * width * 0.46, height + 0.184, 0, width * 0.13, 0.067, 0.146)
      .rotation.z = side * 0.21;
  }
}

function palaceTrim(parent: T.Group, height: number, width: number, z: number) {
  block(parent, 0x527e65, 0, height, z, width, 0.16, 0.11);
  block(parent, 0xb25944, 0, height - 0.093, z + 0.034, width, 0.058, 0.065);
  for (let i = 0; i < 13; i++) {
    const x = width * (i / 13 - 0.46);
    const pattern = block(parent, i % 2 ? 0x86b19a : 0xe0bd7c, x, height + 0.01, z + 0.06, 0.071, 0.071, 0.025);
    pattern.rotation.z = Math.PI / 4;
  }
}

function hanokHouse(parent: T.Group, x: number, z: number, scale: number) {
  const house = place(parent, x, z);
  house.scale.setScalar(scale);
  block(house, 0x929087, 0, 0.09, 0, 2.36, 0.18, 1.34);
  block(house, 0xead9bc, 0, 0.60, 0, 2.00, 0.84, 1.05);
  for (let i = 0; i < 5; i++) {
    const post = -0.95 + i * 0.475;
    block(house, 0x71513d, post, 0.62, 0.56, 0.071, 0.88, 0.07);
    if (i < 4) {
      block(house, 0x82a29b, post + 0.24, 0.68, 0.55, 0.29, 0.39, 0.04);
      block(house, 0x80644c, post + 0.24, 0.68, 0.585, 0.29, 0.035, 0.035);
      block(house, 0x80644c, post + 0.24, 0.68, 0.585, 0.034, 0.38, 0.035);
    }
  }
  palaceTrim(house, 1.05, 2.24, 0.56);
  hanokRoof(house, 1.26, 2.50, 1.81);
}

function koreanPalaceGate(parent: T.Group) {
  const gate = place(parent, 0.68, -5.27);
  block(gate, 0x888c82, 0, 0.085, 0, 3.84, 0.17, 1.48);
  const archFace = new T.Shape();
  archFace.moveTo(-0.53, 0);
  archFace.lineTo(-0.31, 0);
  archFace.lineTo(-0.31, 0.33);
  archFace.absarc(0, 0.33, 0.31, Math.PI, 0, true);
  archFace.lineTo(0.31, 0);
  archFace.lineTo(0.53, 0);
  archFace.lineTo(0.53, 0.75);
  archFace.lineTo(-0.53, 0.75);
  archFace.closePath();
  const masonry = new T.ExtrudeGeometry(archFace, { depth: 0.70, bevelEnabled: false, curveSegments: 6 });
  const curve = new T.TorusGeometry(0.326, 0.043, 4, 12, Math.PI);
  const recess = new T.Shape();
  recess.moveTo(-0.30, 0);
  recess.lineTo(-0.30, 0.33);
  recess.absarc(0, 0.33, 0.30, Math.PI, 0, true);
  recess.lineTo(0.30, 0);
  recess.closePath();
  const recessFace = new T.ShapeGeometry(recess, 8);
  for (const x of [-1.07, 0, 1.07]) {
    form(gate, masonry, 0xa7a99a, x, 0.155, -0.36, 1.03, 1, 1);
    form(gate, curve, 0xc7c8b7, x, 0.485, 0.352, 1, 1, 1);
    form(gate, recessFace, 0x546054, x, 0.155, 0.28, 1, 1, 1).castShadow = false;
  }
  block(gate, 0xc2c0ad, 0, 0.88, 0, 3.48, 0.145, 1.18);
  block(gate, 0x9f5e42, 0, 1.00, 0, 3.12, 0.10, 0.88);
  block(gate, 0x7b7159, 0, 1.22, 0, 2.89, 0.42, 0.79);
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 0.42;
    block(gate, 0xa55b43, x, 1.25, 0.421, 0.07, 0.45, 0.092);
    if (i < 6) block(gate, 0x496756, x + 0.21, 1.22, 0.414, 0.24, 0.22, 0.033);
  }
  palaceTrim(gate, 1.44, 3.0, 0.49);
  hanokRoof(gate, 1.61, 3.61, 1.55);
  block(gate, 0x836b51, 0, 1.83, -0.015, 1.92, 0.24, 0.65);
  for (const x of [-0.89, -0.44, 0.44, 0.89]) {
    block(gate, 0xa55b43, x, 1.84, 0.346, 0.065, 0.27, 0.07);
  }
  palaceTrim(gate, 1.99, 2.05, 0.374);
  hanokRoof(gate, 2.10, 2.69, 1.28);
  woodSign(gate, '한옥마당', 0, 1.75, 0.51, 0.85, 0.23, '"Apple SD Gothic Neo", "Noto Sans KR", sans-serif');
}

function courtyardLantern(parent: T.Group, x: number, z: number, size: number) {
  const lamp = place(parent, x, z);
  lamp.scale.setScalar(size);
  block(lamp, 0x848d83, 0, 0.093, 0, 0.30, 0.18, 0.30);
  block(lamp, 0x718579, 0, 0.32, 0, 0.12, 0.32, 0.12);
  block(lamp, 0xf1cf89, 0, 0.58, 0, 0.23, 0.23, 0.22);
  for (const dx of [-0.11, 0.11]) block(lamp, 0x945642, dx, 0.58, 0.113, 0.029, 0.25, 0.026);
  block(lamp, 0x4a6362, 0, 0.73, 0, 0.32, 0.067, 0.32);
  form(lamp, spike, 0x516767, 0, 0.80, 0, 0.22, 0.15, 0.22).rotation.y = Math.PI / 4;
}

function autumnPine(parent: T.Group, x: number, z: number, size: number, amber: boolean) {
  const tree = place(parent, x, z);
  tree.scale.setScalar(size);
  form(tree, cylinder, 0x82604d, 0, 0.52, 0, 0.075, 1.03, 0.083).rotation.z = 0.15;
  for (let i = 0; i < 5; i++) {
    const side = i % 2 ? -1 : 1;
    stone(tree, (amber ? [0xc77850, 0xdb9a58] : [0x5b8062, 0x72966b])[i % 2],
      side * (0.29 - i * 0.035), 0.72 + i * 0.16, -0.03 + i * 0.031, 0.39 - i * 0.034, 0.20, 0.31);
  }
}

function korea(parent: T.Group) {
  koreanPalaceGate(parent);
  hanokHouse(parent, -3.83, -4.97, 0.91);
  hanokHouse(parent, 4.76, -5.04, 0.78);
  for (const [x, z, size, autumn] of [
    [-6.16, -2.73, 1.07, true], [6.01, -2.56, 1.02, false], [6.22, 1.76, 0.87, true],
    [-5.88, 3.25, 0.95, false], [-2.35, -5.57, 0.77, true], [3.15, -5.67, 0.83, true],
  ] as const) autumnPine(parent, x, z, size, autumn);

  for (const [x, z] of [[-4.95, 4.85], [4.76, 4.66]]) {
    const pots = place(parent, x, z);
    block(pots, 0xc3aa89, 0, 0.025, 0, 1.22, 0.09, 1.02);
    for (let i = 0; i < 4; i++) {
      const dx = (i % 2 - 0.5) * 0.53;
      const dz = (Math.floor(i / 2) - 0.5) * 0.51;
      const size = i % 3 ? 0.82 : 1;
      stone(pots, 0x72503b, dx, 0.23, dz, 0.23 * size, 0.26 * size, 0.23 * size);
      form(pots, cylinder, 0x95654a, dx, 0.23 + 0.202 * size, dz, 0.14 * size, 0.066, 0.14 * size);
    }
  }
  for (const [x, z, scale] of [[-5.90, -0.89, 0.88], [5.84, -0.52, 0.91], [-3.66, 4.20, 0.88], [3.69, 4.18, 0.88]]) {
    courtyardLantern(parent, x, z, scale);
  }
  for (let i = 0; i < 17; i++) {
    stone(parent, i % 3 ? 0xb1af98 : 0xc5b89c, -4.26 + i * 0.53, -0.252,
      4.4 + Math.sin(i * 0.43) * 0.17, 0.22, 0.077, 0.21);
  }
  const courtyard = place(parent, 0, 5.33, -0.281);
  for (let row = 0; row < 3; row++) {
    for (let tile = 0; tile < 9; tile++) {
      const x = (tile - 4) * 0.50;
      const z = row * 0.39;
      const tint = (row + tile) % 3 === 0 ? 0xae9981 : 0xc0ac91;
      block(courtyard, tint, x, 0, z, 0.47, 0.047, 0.35);
    }
  }
}

function yucatanPyramid(parent: T.Group, x: number, z: number, size: number) {
  const temple = place(parent, x, z);
  temple.scale.setScalar(size);
  const stoneColors = [0xcaae78, 0xbda171, 0xd1b785, 0xc0a476];
  for (let level = 0; level < 7; level++) {
    const width = 3.1 - level * 0.327;
    const height = level * 0.207;
    block(temple, stoneColors[level % stoneColors.length], 0, height + 0.103, 0, width, 0.204, width * 0.69);
    block(temple, 0xa58c60, 0, height + 0.039, width * 0.351, width * 0.96, 0.064, 0.038);
    block(temple, 0xdfbe84, 0, height + 0.19, width * 0.354, width * 1.01, 0.043, 0.07);
    for (const side of [-1, 1]) {
      block(temple, stoneColors[(level + 1) % stoneColors.length], side * 0.41, height + 0.105,
        1.205 - level * 0.135, 0.13, 0.235, 0.27);
    }
  }
  for (let step = 0; step < 14; step++) {
    block(temple, 0xdcbb83, 0, 0.051 + step * 0.1035, 1.30 - step * 0.077, 0.72, 0.111, 0.116);
  }
  block(temple, 0xb39a6c, 0, 1.685, -0.035, 1.02, 0.47, 0.65);
  block(temple, 0x655d40, 0, 1.67, 0.295, 0.33, 0.29, 0.019);
  block(temple, 0xdfc18e, 0, 1.93, -0.035, 1.13, 0.098, 0.73);
}

function mexico(parent: T.Group) {
  for (let i = 0; i < 12; i++) {
    const x = (i - 5.5) * 1.39;
    stone(parent, [0x547953, 0x6b8957, 0x4b7052][i % 3], x, -0.11, -6.27 - (i % 3) * 0.41,
      0.98, 0.40 + (i % 4) * 0.22, 0.89);
  }
  yucatanPyramid(parent, 0.2, -5.07, 1.28);
  yucatanPyramid(parent, -4.59, -4.96, 0.71);
  for (const [x, z, size] of [[-6.26, -2.45, 0.85], [6.08, -2.63, 1.10], [5.96, 3.37, 0.94], [-6.0, 2.43, 1.02]]) {
    nilePalm(parent, x, z, size);
  }
  const cenote = place(parent, -2.93, 5.13, -0.24);
  const water = new T.CircleGeometry(1, 40).rotateX(-Math.PI / 2);
  form(cenote, water, 0x529a8e, 0, 0, 0, 1.62, 1, 0.94).castShadow = false;
  form(cenote, water, 0x387d73, 0.07, 0.004, 0.04, 1.22, 1, 0.66).castShadow = false;
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8;
    stone(cenote, [0x859375, 0xb8ac83, 0xa3a07b][i % 3],
      Math.cos(a) * 1.62, -0.016, Math.sin(a) * 0.91, 0.28, 0.12, 0.17);
  }

  for (const [x, z] of [[2.88, 4.98], [5.25, 4.37], [-5.65, 4.45]]) {
    const ruin = place(parent, x, z);
    block(ruin, 0xad956b, 0, 0.068, 0, 0.69, 0.13, 0.53);
    for (const side of [-1, 1]) {
      block(ruin, 0xb9a07b, side * 0.25, 0.30, 0, 0.19, 0.46, 0.35);
      block(ruin, 0x739272, side * 0.24, 0.46, 0.18, 0.15, 0.09, 0.032);
    }
    block(ruin, 0xd2b78f, 0, 0.56, 0, 0.79, 0.13, 0.39);
  }
}

const cabinWindow = new T.MeshBasicMaterial({ color: 0xffbc6c });

function fjordCabin(parent: T.Group, x: number, z: number, scale: number, paint: number) {
  const cabin = place(parent, x, z);
  cabin.scale.setScalar(scale);
  for (const dx of [-0.47, 0.47]) {
    for (const dz of [-0.29, 0.29]) block(cabin, 0x714e43, dx, 0.17, dz, 0.073, 0.34, 0.075);
  }
  block(cabin, 0x8a6451, 0, 0.34, 0, 1.27, 0.12, 0.91);
  block(cabin, paint, 0, 0.68, -0.04, 1.06, 0.64, 0.73);
  const gable = form(cabin, thaiGableGeometry, paint, 0, 0.985, 0.34, 0.54, 0.36, 1);
  gable.castShadow = false;
  for (const side of [-1, 1]) {
    block(cabin, 0x3e4a50, side * 0.31, 1.15, -0.032, 0.73, 0.077, 1.01).rotation.z = -side * 0.52;
    block(cabin, 0xcbb08b, side * 0.36, 0.70, 0.33, 0.25, 0.27, 0.036);
    const window = new T.Mesh(cube, cabinWindow);
    window.position.set(side * 0.36, 0.71, 0.352);
    window.scale.set(0.16, 0.18, 0.018);
    cabin.add(window);
  }
  block(cabin, 0x744e43, 0, 0.554, 0.342, 0.28, 0.39, 0.033);
}

function auroraCurtain(parent: T.Group, height: number, depth: number, tint: number, phase: number) {
  const geometry = new T.PlaneGeometry(17.6, 1.56, 48, 10);
  const points = geometry.attributes.position;
  for (let i = 0; i < points.count; i++) {
    const x = points.getX(i);
    const y = points.getY(i);
    points.setXYZ(i, x, height + y + Math.sin(x * 0.43 + phase) * 0.36 + Math.sin(x * 0.9) * 0.09,
      depth + Math.sin(x * 0.49 + phase) * 0.43 + y * 0.42);
  }
  const uniforms = { clock: { value: 0 }, tint: { value: new T.Color(tint) } };
  const glow = new T.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    blending: T.AdditiveBlending,
    vertexShader: `
      varying vec2 ribbon;
      uniform float clock;
      void main() {
        ribbon = uv;
        vec3 point = position;
        point.y += sin(uv.x * 12.0 + clock * 0.50) * 0.075;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(point, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 ribbon;
      uniform float clock;
      uniform vec3 tint;
      void main() {
        float mask = smoothstep(0.06, 0.22, ribbon.y) * (1.0 - smoothstep(0.23, 0.98, ribbon.y));
        mask *= smoothstep(0.0, 0.15, ribbon.x) * (1.0 - smoothstep(0.83, 1.0, ribbon.x));
        float strands = 0.73 + sin(ribbon.x * 134.0 + clock * 0.35 + ribbon.y * 4.0) * 0.17;
        gl_FragColor = vec4(tint, mask * strands * 0.62);
      }
    `,
  });
  parent.add(new T.Mesh(geometry, glow));
  return (time: number) => { uniforms.clock.value = time; };
}

function norway(parent: T.Group) {
  const water = new T.Shape([
    [-16, -15], [-6.5, -15], [-6.16, -4.1], [-5.84, -1.4], [-5.87, 2.33], [-5.43, 4.16], [-3.94, 5.31],
    [-1.07, 5.76], [2.3, 5.31], [5.16, 4.96], [16, 5.52], [16, 12], [-16, 12],
  ].map(([x, z]) => new T.Vector2(x, -z)));
  form(parent, new T.ShapeGeometry(water).rotateX(-Math.PI / 2), 0x35677a, 0, -0.243, 0, 1, 1, 1).castShadow = false;

  const cliffColor = [0x405e6a, 0x516a77, 0x5e7380, 0x3f5969];
  for (const [i, x, z, height, width] of [
    [0, -7.3, -5.73, 1.82, 2.20], [1, -4.75, -6.55, 2.3, 2.48], [2, -1.32, -6.62, 1.72, 2.39],
    [3, 2.36, -6.69, 2.09, 2.24], [4, 5.56, -6.39, 2.31, 2.42], [5, 8.04, -5.88, 1.76, 2.12],
  ]) {
    stone(parent, cliffColor[i % 4], x, height * 0.40 - 0.28, z, width, height * 0.54, 1.08);
    stone(parent, 0xa6b6b4, x - 0.13, height * 0.77 - 0.22, z, width * 0.44, height * 0.20, 0.39);
  }
  for (const [x, z, size, paint] of [[-4.26, -4.42, 0.86, 0xaa594e], [-2.75, -4.65, 0.69, 0xae7f54],
    [4.15, -4.48, 0.81, 0xa55046], [5.66, -4.29, 0.72, 0xb28156]]) fjordCabin(parent, x, z, size, paint);
  for (let i = 0; i < 12; i++) {
    const x = -4.9 + i * 0.79;
    stone(parent, cliffColor[i % 4], x, -0.19, 4.10 + (i % 4) * 0.21, 0.40, 0.19 + (i % 3) * 0.06, 0.32);
  }
  for (let i = 0; i < 16; i++) {
    const x = -5.8 + i * 0.20;
    block(parent, i % 2 ? 0xa28768 : 0x94785d, x, -0.105, 5.54, 0.186, 0.057, 0.59);
  }
  const glow = [
    auroraCurtain(parent, 1.90, -6.5, 0x51e6b4, 0.26),
    auroraCurtain(parent, 2.14, -7.1, 0x78a1f6, 1.14),
  ];
  const stars = Array.from({ length: 29 }, (_, i) => new T.Vector3(
    -8.3 + ((i * 29) % 97) / 97 * 16.5, 1.85 + ((i * 17) % 23) * 0.062, -7.3 - (i % 4) * 0.20,
  ));
  parent.add(new T.Points(new T.BufferGeometry().setFromPoints(stars),
    new T.PointsMaterial({ color: 0xcaddf0, size: 0.047, transparent: true, opacity: 0.67 })));
  return (time: number) => glow.forEach((animate) => animate(time));
}

export function decorateCourse(group: T.Group, index: number) {
  switch (index) {
    case 0: return japan(group);
    case 1: return thailand(group);
    case 2: return italy(group);
    case 3: return switzerland(group);
    case 4: return spain(group);
    case 5: return egypt(group);
    case 6: return china(group);
    case 7: return korea(group);
    case 8: return mexico(group);
    case 9: return norway(group);
  }
}
