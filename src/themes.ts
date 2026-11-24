import * as T from 'three';

export const palettes = [
  { grass: 0x75933d, curb: 0xaaa190, trim: 0xdbcfb5, paving: 0xc7b79e, sky: 0xadcac2 },
  { grass: 0x5f9d4d, curb: 0x9b6d47, trim: 0xe4bc7c, paving: 0xc3a779, sky: 0x87bbb5 },
  { grass: 0x8da541, curb: 0xa96351, trim: 0xf2c6a2, paving: 0xb9b48f, sky: 0xb0c9c5 },
  { grass: 0x739051, curb: 0x676d67, trim: 0xb7bb9c, paving: 0x929d8c, sky: 0x9eafb9 },
  { grass: 0x699e62, curb: 0x51898d, trim: 0xf7d593, paving: 0xddb596, sky: 0x95c7c8 },
  { grass: 0x86a16c, curb: 0xba884e, trim: 0xf4d5a0, paving: 0xd7b183, sky: 0xe1ba9b },
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

function japan(parent: T.Group) {
  const gate = place(parent, 0.6, -5.65);
  for (const side of [-1, 1]) {
    form(gate, cylinder, 0xb44732, side * 1.03, 0.85, 0, 0.13, 1.7, 0.13);
    form(gate, cylinder, 0x493934, side * 1.03, 0.16, 0, 0.17, 0.32, 0.17);
  }
  block(gate, 0xbb4b35, 0, 1.37, 0, 2.65, 0.12, 0.18);
  block(gate, 0xc35134, 0, 1.78, 0, 3.12, 0.23, 0.33);
  block(gate, 0x443e42, 0, 1.94, 0, 3.31, 0.10, 0.42);
  for (const [x, z] of [[-6.0, -1.2], [5.75, 1.7], [-3.75, 2.9]]) {
    const lantern = place(parent, x, z);
    form(lantern, cylinder, 0x8f9387, 0, 0.35, 0, 0.17, 0.7, 0.17);
    block(lantern, 0xdfbd77, 0, 0.78, 0, 0.31, 0.29, 0.31);
    form(lantern, spike, 0x8b8e81, 0, 1.02, 0, 0.39, 0.30, 0.39).rotation.y = Math.PI / 4;
    stone(lantern, 0x919587, 0.57, 0.10, 0.21, 0.45, 0.24, 0.31);
    stone(lantern, 0x678e4c, -0.47, 0.12, 0.45, 0.52, 0.30, 0.46);
  }
  for (const [x, z] of [[-6.4, -4.65], [5.35, -4.75]]) {
    const tree = place(parent, x, z);
    block(tree, 0x775345, 0, 0.63, 0, 0.17, 1.3, 0.18);
    stone(tree, 0xe29ead, 0, 1.63, 0, 0.82, 0.55, 0.72);
    stone(tree, 0xd77f9b, -0.58, 1.26, 0.12, 0.62, 0.41, 0.48);
    stone(tree, 0xf3bfbb, 0.61, 1.39, -0.13, 0.67, 0.48, 0.58);
  }
  for (let i = 0; i < 14; i++) {
    form(parent, cylinder, i % 2 ? 0x9a978a : 0xb4afa2, -4.4 + (i % 7) * 0.57, -0.26, 0.6 + Math.floor(i / 7) * 0.76, 0.23, 0.09, 0.21);
  }
}

function thaiSign(parent: T.Group, text: string, x: number, y: number, z: number,
  width: number, height: number, background = '#623723') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.round(512 * height / width);
  const context = canvas.getContext('2d');
  if (!context) return;
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#efc077';
  context.lineWidth = 6;
  context.strokeRect(9, 9, canvas.width - 18, canvas.height - 18);
  context.fillStyle = '#fff1cb';
  context.font = `bold ${Math.round(canvas.height * 0.58)}px Tahoma, Thonburi, "Noto Sans Thai", sans-serif`;
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
  }
  const face = form(parent, thaiGableGeometry, 0xa66c46, 0, eave, depth * 0.46, half - 0.08, rise, 1);
  face.castShadow = false;
  block(parent, 0x81513b, 0, eave + rise + 0.043, 0, 0.15, 0.095, depth + 0.18);
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

function thailand(parent: T.Group) {
  const canal = 0x398d92;
  // Continue the playing canal outside the rail into the market waterfront.
  block(parent, canal, -0.1, -0.267, 5.7, 2.20, 0.10, 4.5);
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
    thaiSign(house, stall.sign, 0, 1.60, 0.94, 1.21, 0.29);
    for (let i = 0; i < 8; i++) thaiFruit(house, (i - 3.5) * 0.19, 1.005, 0.67, i);
  }

  // A long boardwalk connects the stalls and keeps all decoration outside the playing surface.
  for (let i = 0; i < 34; i++) {
    block(parent, i % 3 ? 0xb48759 : 0xc69867, -6.25 + i * 0.37, -0.17, -3.98, 0.357, 0.105, 0.52);
  }
  for (const [x, z, direction] of [[-0.58, 4.64, -0.24], [0.36, 6.16, 0.15], [4.92, -5.17, 1.38]]) {
    const boat = place(parent, x, z, -0.24);
    boat.rotation.y = direction;
    stone(boat, 0x855234, 0, 0.10, 0, 0.29, 0.18, 0.88);
    stone(boat, 0xcc9257, 0, 0.23, 0, 0.265, 0.07, 0.82);
    block(boat, 0x51382e, 0, 0.22, 0.81, 0.078, 0.07, 0.49).rotation.x = -0.36;
    tieProwRibbon(boat, -0.64);
    for (const [row, dz] of [[0, -0.33], [1, -0.03], [2, 0.28]]) {
      form(boat, cylinder, 0x95663c, 0, 0.279, dz, 0.144, 0.085, 0.142);
      for (let i = 0; i < 3; i++) thaiFruit(boat, (i - 1) * 0.106, 0.363, dz + (i % 2) * 0.06, row + i);
    }
  }

  const entrance = place(parent, -3.6, 5.28);
  for (const side of [-1, 1]) block(entrance, 0x8f5838, side * 0.87, 0.54, 0, 0.09, 1.08, 0.12);
  thaiRoof(entrance, 0xa24936, 1.08, 2.18, 0.69, 0.41);
  thaiSign(entrance, 'ตลาดน้ำริมคลอง', 0, 0.84, 0.39, 2.16, 0.43);
  thaiFlag(parent, 5.78, -4.18);

  for (let i = 0; i < 13; i++) {
    const x = -1.02 + (i % 3) * 0.94;
    const z = 3.85 + i * 0.29;
    block(parent, 0x72bac0, x, -0.208, z, 0.20 + (i % 4) * 0.055, 0.004, 0.024);
  }
  for (const [x, z] of [[-1.04, 5.21], [0.72, 4.08], [0.78, 5.44]]) {
    form(parent, cylinder, 0x6b9b58, x, -0.191, z, 0.18, 0.025, 0.13);
    stone(parent, 0xeb9ab4, x, -0.136, z, 0.092, 0.062, 0.085);
  }
  for (let i = 0; i < 9; i++) block(parent, 0xc79b64, -1.80 + i * 0.35, -0.17, 7.0, 0.33, 0.20, 0.93);
}

function tieProwRibbon(boat: T.Group, z: number) {
  for (const [i, color] of [0xd74a4a, 0xf2c956, 0x56a9a1].entries()) {
    block(boat, color, 0, 0.235, z - i * 0.057, 0.30 - i * 0.054, 0.075, 0.045);
  }
}

function netherlands(parent: T.Group) {
  for (const [row, z] of [[0, -4.2], [1, -4.73], [2, -5.26], [3, 4.17], [4, 4.65]]) {
    for (let i = 0; i < 18; i++) {
      const x = -5.3 + i * 0.59 + (row % 2) * 0.18;
      block(parent, 0x56834e, x, -0.11, z, 0.045, 0.39, 0.045);
      stone(parent, [0xd94b63, 0xf3b140, 0xb06ac0, 0xe76a49][Math.floor(i / 3 + row) % 4],
        x, 0.13 + (i % 2) * 0.045, z, 0.15, 0.19, 0.15);
    }
  }
  const mill = place(parent, 2.25, -6.35);
  form(mill, new T.CylinderGeometry(0.54, 0.85, 2.22, 8), 0xf0d5a3, 0, 1.11, 0, 1, 1, 1);
  form(mill, new T.ConeGeometry(0.73, 0.76, 8), 0x714950, 0, 2.53, 0, 1, 1, 1);
  block(mill, 0x548882, 0, 0.48, 0.79, 0.25, 0.63, 0.04);
  const fan = new T.Group();
  fan.position.set(0, 1.84, 0.63);
  mill.add(fan);
  for (let i = 0; i < 4; i++) {
    const arm = new T.Group();
    arm.rotation.z = i * Math.PI / 2;
    fan.add(arm);
    block(arm, 0x835a4b, 0, 0.53, 0, 0.075, 1.13, 0.09);
    block(arm, 0xffe4ad, 0.10, 0.77, 0.02, 0.18, 0.50, 0.08);
  }
  return fan;
}

function scotland(parent: T.Group) {
  for (let i = 0; i < 20; i++) {
    const x = (i - 9.5) * 0.93;
    const height = 0.55 + (i % 4) * 0.37;
    stone(parent, [0x6e8279, 0x7a8d83, 0x899d8c][i % 3], x, -0.12, -6.05 - (i % 3) * 0.74, 1.2, height, 1.48);
    if (i % 2 === 0) stone(parent, 0x9876a0, x, -0.16, 4.35 + (i % 3) * 0.42, 0.47, 0.29, 0.42);
  }
  const ruin = place(parent, 0.91, -5.4);
  for (const x of [-1.27, 1.27]) {
    block(ruin, 0x798177, x, 0.65, 0, 0.37, 1.3, 0.36);
    for (let i = 0; i < 3; i++) block(ruin, 0x9ea092, x - 0.38 + 0.38 * i, 1.37 + (i % 2) * 0.13, 0, 0.34, 0.25, 0.38);
  }
  block(ruin, 0x93978a, 0, 1.17, 0, 2.9, 0.25, 0.33);
  for (let i = 0; i < 15; i++) {
    block(parent, [0x7d8580, 0x90958a][i % 2], -4.8 + i * 0.57, -0.13, 4.3 + Math.sin(i * 0.5) * 0.38, 0.56, 0.33, 0.39);
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

function egypt(parent: T.Group) {
  block(parent, 0x429eab, -6.9, -0.273, 0, 1.7, 0.08, 13.5);
  for (const [x, z, size] of [[-4.45, -6.6, 1.68], [0.15, -7.6, 2.45], [4.15, -6.15, 1.6]]) {
    form(parent, spike, 0xe2b473, x, size * 0.47 - 0.29, z, size, size * 0.95, size).rotation.y = Math.PI / 4;
  }
  for (const [x, z] of [[-7.8, -0.4], [6.6, 0.9], [5.35, 4.52]]) {
    const palm = place(parent, x, z);
    form(palm, cylinder, 0x96613e, 0, 0.8, 0, 0.10, 1.6, 0.10);
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      const leaf = stone(palm, i % 2 ? 0x799548 : 0x5c8f55, Math.cos(angle) * 0.43, 1.55, Math.sin(angle) * 0.43, 0.65, 0.13, 0.20);
      leaf.rotation.y = -angle;
    }
    stone(palm, 0x688d48, 0, 1.66, 0, 0.34, 0.2, 0.34);
  }
  for (let i = 0; i < 7; i++) {
    stone(parent, 0xdfb783, -4.7 + i * 0.42, -0.19, 4.13 + Math.sin(i) * 0.29, 0.22, 0.17, 0.19);
  }
}

export function decorateCourse(group: T.Group, index: number) {
  switch (index) {
    case 0: return japan(group);
    case 1: return thailand(group);
    case 2: return netherlands(group);
    case 3: return scotland(group);
    case 4: return spain(group);
    case 5: return egypt(group);
  }
}
