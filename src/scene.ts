import * as T from 'three';
import { PLAYER_COLORS, type Seat } from './room-protocol';
import { BALL_RADIUS, BRIDGE, BUMPERS, COURSES, CUP_RADIUS, GATE, gateLift, groundHeight, MILL, type Point } from './golf';
import { decorateCourse, palettes } from './themes';
import { golfBallMaterials, makeEffects, type Burst } from './fx';

const geometry = {
  box: new T.BoxGeometry(),
  sphere: new T.SphereGeometry(1, 24, 16),
  dot: new T.CircleGeometry(1, 12).rotateX(-Math.PI / 2),
};
const matte = (color: number) => new T.MeshStandardMaterial({ color, roughness: 0.92 });
const colors = { yellow: matte(0xffc62c), ink: matte(0x302a1a) };

function mesh(parent: T.Object3D, shape: T.BufferGeometry, material: T.Material, x: number, y: number, z: number) {
  const item = new T.Mesh(shape, material);
  item.position.set(x, y, z);
  item.castShadow = true;
  item.receiveShadow = true;
  parent.add(item);
  return item;
}

function box(parent: T.Object3D, material: T.Material, x: number, y: number, z: number, width: number, height: number, depth: number) {
  const item = mesh(parent, geometry.box, material, x, y, z);
  item.scale.set(width, height, depth);
  return item;
}

function paving(scene: T.Scene) {
  const material = matte(0x9c816c);
  const tileMaterial = matte(0xffffff);
  box(scene, material, 0, -0.55, 3, 48, 0.45, 42);
  const tiles = new T.InstancedMesh(geometry.box, tileMaterial, 169);
  tiles.castShadow = false;
  tiles.receiveShadow = true;
  scene.add(tiles);
  const stamp = new T.Object3D();
  stamp.scale.set(2.77, 0.12, 2.12);
  let index = 0;
  for (let row = -3; row <= 9; row++) {
    for (let column = -6; column <= 6; column++) {
      stamp.position.set(column * 2.8 + (row % 2) * 1.4, -0.38, row * 2.15);
      stamp.updateMatrix();
      tiles.setMatrixAt(index, stamp.matrix);
      tiles.setColorAt(index++, new T.Color().setScalar(0.9 + Math.abs(row * 17 + column * 41) % 5 * 0.024));
    }
  }
  return (color: number) => {
    tileMaterial.color.setHex(color);
    material.color.setHex(color).multiplyScalar(0.82);
  };
}

function course(scene: T.Group, index: number) {
  const { outline, cup: CUP, walls } = COURSES[index];
  const shape = new T.Shape(outline.map(({ x, z }) => new T.Vector2(x, -z)));
  const hole = new T.Path();
  hole.absarc(CUP.x, -CUP.z, CUP_RADIUS, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  if (index === 1) {
    for (const [top, bottom] of [[BRIDGE.top, BRIDGE.deckTop], [BRIDGE.deckBottom, BRIDGE.bottom - 0.012]]) {
      const water = new T.Path([
        new T.Vector2(BRIDGE.left, -top), new T.Vector2(BRIDGE.left, -bottom),
        new T.Vector2(BRIDGE.right, -bottom), new T.Vector2(BRIDGE.right, -top),
        new T.Vector2(BRIDGE.left, -top),
      ]);
      shape.holes.push(water);
    }
  }
  const palette = palettes[index];
  const turf = matte(palette.grass);
  const curb = matte(palette.curb);
  const cap = matte(palette.trim);
  turf.onBeforeCompile = (shader) => {
    shader.vertexShader = 'varying float grassX;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ngrassX = position.x;');
    shader.fragmentShader = 'varying float grassX;\n' + shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(0.88, 1.0, step(0.5, fract(grassX * 0.63)));');
  };
  const green = mesh(scene, new T.ShapeGeometry(shape, 32), turf, 0, 0, 0);
  green.rotation.x = -Math.PI / 2;
  green.castShadow = false;
  if (index === 3) {
    const hill = new T.PlaneGeometry(4.49, 5.33, 44, 45).rotateX(-Math.PI / 2);
    const vertices = hill.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const z = vertices.getZ(i) - 0.25;
      vertices.setZ(i, z);
      vertices.setY(i, groundHeight(index, vertices.getX(i), z) + 0.0025);
    }
    hill.computeVertexNormals();
    const surface = mesh(scene, hill, turf, 0, 0, 0);
    surface.castShadow = true;
  }

  for (const wall of walls) {
    const count = Math.ceil(wall.length / 1.2);
    const length = wall.length / count;
    for (let index = 0; index < count; index++) {
      const t = (index + 0.5) / count;
      const x = wall.from.x + wall.dx * t - wall.nx * 0.15;
      const z = wall.from.z + wall.dz * t - wall.nz * 0.15;
      const angle = -Math.atan2(wall.dz, wall.dx);
      box(scene, curb, x, -0.02, z, length - 0.014, 0.59, 0.306).rotation.y = angle;
      box(scene, cap, x, 0.26, z, length - 0.024, 0.11, 0.321).rotation.y = angle;
    }
  }
  for (const corner of outline) {
    const joint = mesh(scene, new T.CylinderGeometry(0.162, 0.162, 0.612, 8), curb, corner.x, -0.019, corner.z);
    joint.scale.set(0.92, 1, 0.92);
  }

  mesh(scene, new T.CylinderGeometry(CUP_RADIUS, CUP_RADIUS * 0.78, 0.025, 32), colors.ink, CUP.x, -0.185, CUP.z);
  mesh(scene, new T.TorusGeometry(CUP_RADIUS, 0.025, 7, 32), cap, CUP.x, 0.006, CUP.z).rotation.x = -Math.PI / 2;
  mesh(scene, new T.CylinderGeometry(0.024, 0.024, 1.53, 10), colors.yellow, CUP.x, 0.62, CUP.z);
  mesh(scene, geometry.sphere, colors.yellow, CUP.x, 1.4, CUP.z).scale.setScalar(0.046);
  const flagShape = new T.Shape([new T.Vector2(0, 0), new T.Vector2(0.74, -0.17), new T.Vector2(0, -0.36)]);
  const flag = colors.yellow.clone();
  flag.side = T.DoubleSide;
  mesh(scene, new T.ShapeGeometry(flagShape), flag, CUP.x, 1.34, CUP.z).rotation.y = -0.23;
}

function timberBridge(group: T.Group) {
  const water = matte(0x37aab5);
  const foam = matte(0x79cbd0);
  const wood = [matte(0xb87942), matte(0xd69855), matte(0xc4884d)];
  const x = (BRIDGE.left + BRIDGE.right) / 2;
  box(group, water, x, -0.085, (BRIDGE.top + BRIDGE.bottom) / 2,
    BRIDGE.right - BRIDGE.left, 0.04, BRIDGE.bottom - BRIDGE.top);
  for (let i = 0; i < 12; i++) {
    const z = BRIDGE.top + 0.17 + i * 0.44;
    if (z < BRIDGE.deckTop || z > BRIDGE.deckBottom) {
      box(group, foam, x + (i % 3 - 1) * 0.43, -0.061, z, 0.32 + 0.09 * (i % 4), 0.004, 0.035);
    }
  }
  for (let i = 0; i < 10; i++) {
    box(group, wood[i % 3], BRIDGE.left + 0.11 + i * 0.22, 0.006, (BRIDGE.deckTop + BRIDGE.deckBottom) / 2,
      0.215, 0.045, BRIDGE.deckBottom - BRIDGE.deckTop);
  }
  // Short stakes mark the entrance without obstructing the ball.
  for (const x of [BRIDGE.left - 0.1, BRIDGE.right + 0.1]) {
    for (const z of [BRIDGE.deckTop - 0.09, BRIDGE.deckBottom + 0.09]) {
      box(group, wood[0], x, 0.13, z, 0.12, 0.26, 0.12);
    }
  }
}

function windmill(group: T.Group) {
  const wheel = new T.Group();
  wheel.position.set(MILL.x, 0, MILL.z);
  group.add(wheel);
  const clay = matte(0xc76641);
  const cream = matte(0xffdfaa);
  const wood = matte(0x8d5b39);
  const circle = mesh(group, new T.RingGeometry(MILL.length + 0.13, MILL.length + 0.17, 48).rotateX(-Math.PI / 2),
    cream, MILL.x, 0.012, MILL.z);
  circle.castShadow = false;
  mesh(wheel, new T.CylinderGeometry(0.19, 0.25, 0.71, 8), cream, 0, 0.355, 0);
  mesh(wheel, new T.ConeGeometry(0.33, 0.42, 8), clay, 0, 0.86, 0);
  for (let i = 0; i < 4; i++) {
    const arm = new T.Group();
    arm.rotation.y = -i * Math.PI / 2;
    wheel.add(arm);
    box(arm, wood, MILL.length / 2, 0.145, 0, MILL.length, 0.20, MILL.width);
    box(arm, cream, MILL.length * 0.74, 0.257, 0, MILL.length * 0.52, 0.035, MILL.width * 0.88);
    for (let line = 0; line < 4; line++) {
      box(arm, clay, MILL.length * (0.53 + line * 0.14), 0.28, 0, 0.042, 0.018, MILL.width * 0.87);
    }
  }
  return wheel;
}

function pinball(group: T.Group) {
  const base = matte(0x3f748a);
  for (const [i, bumper] of BUMPERS.entries()) {
    const tint = matte([0xeb8b51, 0x57bdbe, 0xe5be52][i]);
    mesh(group, new T.CylinderGeometry(bumper.radius, bumper.radius, 0.27, 20), base, bumper.x, 0.135, bumper.z);
    mesh(group, new T.CylinderGeometry(bumper.radius * 0.91, bumper.radius * 0.94, 0.13, 20), tint, bumper.x, 0.31, bumper.z);
    const ring = mesh(group, new T.TorusGeometry(bumper.radius * 0.64, 0.045, 6, 20),
      matte(0xffedce), bumper.x, 0.39, bumper.z);
    ring.rotation.x = -Math.PI / 2;
    for (let tile = 0; tile < 8; tile++) {
      const angle = tile * Math.PI / 4;
      box(group, tint, bumper.x + Math.cos(angle) * (bumper.radius + 0.12), 0.012,
        bumper.z + Math.sin(angle) * (bumper.radius + 0.12), 0.09, 0.025, 0.09).rotation.y = -angle;
    }
  }
}

function nileGate(group: T.Group) {
  const sandstone = matte(0xc39157);
  const face = matte(0xe8bc7e);
  const jade = matte(0x4b9b94);
  const gold = matte(0xe8af52);
  for (const [from, to] of GATE.walls) {
    const middle = (from + to) / 2;
    box(group, sandstone, GATE.x, 0.265, middle, GATE.radius * 2, 0.53, to - from);
    box(group, face, GATE.x, 0.55, middle, GATE.radius * 2.1, 0.09, to - from);
  }
  for (const z of GATE.span) {
    box(group, sandstone, GATE.x, 0.75, z, 0.40, 1.50, 0.28);
    box(group, face, GATE.x, 1.34, z, 0.48, 0.16, 0.32);
    box(group, jade, GATE.x, 1.49, z, 0.52, 0.09, 0.37);
  }
  box(group, face, GATE.x, 1.54, 0, 0.48, 0.24, 2.17);
  box(group, jade, GATE.x, 1.64, 0, 0.52, 0.15, 2.36);
  const gate = new T.Group();
  gate.position.x = GATE.x;
  group.add(gate);
  box(gate, face, 0, 0.325, 0, GATE.radius * 2, 0.65, GATE.span[1] - GATE.span[0]);
  box(gate, gold, 0.192, 0.48, 0, 0.045, 0.08, 1.58);
  for (const z of [-0.55, -0.28, 0, 0.28, 0.55]) box(gate, sandstone, 0.19, 0.28, z, 0.04, 0.25, 0.055);
  return gate;
}

export function makeScene(canvas: HTMLCanvasElement) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene();
  scene.background = new T.Color(0x93af89);
  scene.fog = new T.Fog(0x93af89, 19, 34);

  scene.add(new T.HemisphereLight(0xfff8ed, 0xaaaa9b, 2.1));
  const sun = new T.DirectionalLight(0xffeac9, 1.9);
  sun.position.set(-4.9, 10, -4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -13;
  sun.shadow.camera.right = 13;
  sun.shadow.camera.top = 12;
  sun.shadow.camera.bottom = -12;
  sun.shadow.normalBias = 0.025;
  sun.shadow.bias = -0.00015;
  scene.add(sun);

  const camera = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 65);
  const raycast = new T.Raycaster();
  const ground = new T.Plane(new T.Vector3(0, 1, 0), 0);
  const setPaving = paving(scene);
  const effects = makeEffects(scene);
  const courses = COURSES.map((_, index) => {
    const group = new T.Group();
    scene.add(group);
    course(group, index);
    return group;
  });
  const decorations = courses.map(decorateCourse);
  timberBridge(courses[1]);
  const wheel = windmill(courses[2]);
  pinball(courses[4]);
  const gate = nileGate(courses[5]);
  let activeHole = -1;
  function setHole(index: number) {
    if (activeHole === index) return;
    activeHole = index;
    courses.forEach((group, position) => { group.visible = position === index; });
    const palette = palettes[index];
    setPaving(palette.paving);
    (scene.background as T.Color).setHex(palette.sky);
    (scene.fog as T.Fog).color.setHex(palette.sky);
    effects.clear();
    lastBall = lastRival = null;
    resize();
  }
  const ballMaterials = golfBallMaterials(['#d99035', '#247ab9']);
  let lastBall: Point | null = null;
  let lastRival: Point | null = null;
  let lastFrame = performance.now();
  let lastTrail = 0;
  const rollAxis = new T.Vector3();
  const turn = new T.Quaternion();
  const ghostMaterials = ballMaterials.map((material) => {
    const ghost = material.clone();
    ghost.transparent = true;
    ghost.opacity = 0.48;
    ghost.depthWrite = false;
    return ghost;
  });
  const rivalOutlineMaterials = PLAYER_COLORS.map((color) => new T.MeshBasicMaterial({ color }));
  const ball = mesh(scene, geometry.sphere, ballMaterials[0], 0, BALL_RADIUS, 0);
  const opponent = mesh(scene, geometry.sphere, ballMaterials[1], 0, BALL_RADIUS, 0);
  const opponentOutline = mesh(scene, new T.RingGeometry(0.302, 0.325, 32).rotateX(-Math.PI / 2),
    rivalOutlineMaterials[1], 0, 0.021, 0);
  opponentOutline.castShadow = false;
  ball.scale.setScalar(BALL_RADIUS);
  opponent.scale.setScalar(BALL_RADIUS);
  const indicator = new T.MeshBasicMaterial({ color: 0x3cf0e1 });
  const ring = mesh(scene, new T.RingGeometry(0.25, 0.284, 32).rotateX(-Math.PI / 2), indicator, 0, 0.022, 0);
  ring.castShadow = false;
  const arrowShape = new T.Shape([
    new T.Vector2(-0.052, 0), new T.Vector2(0.052, 0), new T.Vector2(0.052, 0.20),
    new T.Vector2(0.135, 0.20), new T.Vector2(0, 0.37), new T.Vector2(-0.135, 0.20),
    new T.Vector2(-0.052, 0.20),
  ]);
  const arrow = mesh(scene, new T.ShapeGeometry(arrowShape).rotateX(-Math.PI / 2), indicator, 0, 0.025, 0);
  arrow.castShadow = false;
  const guide = new T.Group();
  scene.add(guide);
  const white = new T.MeshBasicMaterial({ color: 0xfffae8 });
  const dots = Array.from({ length: 24 }, () => {
    const dot = mesh(guide, geometry.dot, white, 0, 0.02, 0);
    dot.scale.setScalar(0.032);
    dot.castShadow = false;
    return dot;
  });

  function resize() {
    const width = canvas.clientWidth;
    const height = Math.max(1, canvas.clientHeight);
    const aspect = width / height;
    const portrait = aspect < 0.95;
    const halfHeight = Math.max(4.6, (portrait && activeHole > 0 ? 6.55 : 6.15) / aspect);
    camera.position.set(portrait ? 2.3 : 2.0, portrait ? 14 : 9, 12);
    camera.lookAt(portrait ? -0.45 : 0.85, 0, portrait ? 0.04 : -0.25);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    renderer.setSize(width, height, false);
  }

  function pointAt(clientX: number, clientY: number): Point | null {
    const rect = canvas.getBoundingClientRect();
    raycast.setFromCamera(new T.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      1 - ((clientY - rect.top) / rect.height) * 2,
    ), camera);
    return raycast.ray.intersectPlane(ground, new T.Vector3());
  }

  function ballScreenPosition(x: number, z: number) {
    const rect = canvas.getBoundingClientRect();
    const point = new T.Vector3(x, groundHeight(activeHole, x, z) + BALL_RADIUS, z).project(camera);
    return { x: rect.left + (point.x + 1) * rect.width / 2, y: rect.top + (1 - point.y) * rect.height / 2 };
  }

  function emit(kind: Burst, point: Point, seat: Seat) {
    effects.burst(kind, point, groundHeight(activeHole, point.x, point.z), PLAYER_COLORS[seat]);
  }

  function roll(mesh: T.Mesh, previous: Point | null, current: Point, seat: Seat, trail: boolean) {
    if (!previous) {
      mesh.rotation.set(0.28, 0, -0.24);
      return;
    }
    const dx = current.x - previous.x;
    const dz = current.z - previous.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.002 || distance > 0.7) return;
    rollAxis.set(dz, 0, -dx).normalize();
    mesh.quaternion.premultiply(turn.setFromAxisAngle(rollAxis, distance / BALL_RADIUS));
    if (trail && distance > 0.035) effects.trail(previous, groundHeight(activeHole, previous.x, previous.z), PLAYER_COLORS[seat]);
  }

  function render(position: Point, ballHeight: number, aim: { angle: number; power: number } | null, ready: boolean,
    seat: Seat = 0, rival?: Point & { sunk: boolean }, elapsedSeconds = 0) {
    if (activeHole === 2) {
      wheel.rotation.y = -elapsedSeconds * MILL.speed;
      const sails = decorations[2];
      if (sails) sails.rotation.z = elapsedSeconds * 0.56 + 0.25;
    }
    if (activeHole === 5) gate.position.y = gateLift(elapsedSeconds);
    const now = performance.now();
    const delta = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    const trail = now - lastTrail >= 52;
    if (trail) lastTrail = now;
    ball.material = ballMaterials[seat];
    opponent.visible = Boolean(rival && !rival.sunk);
    opponentOutline.visible = false;
    if (rival && opponent.visible) {
      const overlapping = ballHeight > -0.15 && Math.hypot(rival.x - position.x, rival.z - position.z) < BALL_RADIUS * 2;
      // Indicate overlap with color and transparency while keeping the rival at its true position.
      const surface = groundHeight(activeHole, rival.x, rival.z);
      opponent.position.set(rival.x, BALL_RADIUS + surface, rival.z);
      roll(opponent, lastRival, rival, (1 - seat) as Seat, trail);
      lastRival = { ...rival };
      opponent.material = (overlapping ? ghostMaterials : ballMaterials)[1 - seat];
      opponent.castShadow = !overlapping;
      if (overlapping) {
        opponentOutline.material = rivalOutlineMaterials[1 - seat];
        opponentOutline.position.set(rival.x, surface + 0.021, rival.z);
        opponentOutline.visible = true;
      }
    } else lastRival = null;
    const surface = groundHeight(activeHole, position.x, position.z);
    roll(ball, lastBall, position, seat, trail && ballHeight >= BALL_RADIUS);
    lastBall = { ...position };
    ball.position.set(position.x, surface + ballHeight, position.z);
    ball.visible = ballHeight > -0.15;
    ring.position.set(position.x, surface + 0.022, position.z);
    ring.visible = ready;
    const angle = aim?.angle ?? COURSES[activeHole].initialAngle;
    arrow.visible = ready;
    arrow.position.x = position.x - Math.cos(angle) * 0.74;
    arrow.position.z = position.z - Math.sin(angle) * 0.74;
    arrow.position.y = groundHeight(activeHole, arrow.position.x, arrow.position.z) + 0.040;
    arrow.rotation.y = -Math.PI / 2 - angle;
    guide.visible = aim !== null && aim.power > 0.025;
    if (aim && guide.visible) {
      const x = Math.cos(aim.angle);
      const z = Math.sin(aim.angle);
      let limit = 0.6 + aim.power * 6.7;
      for (const wall of COURSES[activeHole].walls) {
        const normal = x * wall.nx + z * wall.nz;
        if (normal >= -0.0001) continue;
        const distance = (BALL_RADIUS - (position.x - wall.from.x) * wall.nx - (position.z - wall.from.z) * wall.nz) / normal;
        if (distance < 0 || distance > limit) continue;
        const segment = ((position.x + x * distance - wall.from.x) * wall.dx + (position.z + z * distance - wall.from.z) * wall.dz) / wall.length ** 2;
        if (segment >= 0 && segment <= 1) limit = distance;
      }
      dots.forEach((dot, index) => {
        const distance = 0.33 + index * 0.27;
        dot.visible = distance <= limit;
        const px = position.x + x * distance;
        const pz = position.z + z * distance;
        dot.position.set(px, groundHeight(activeHole, px, pz) + 0.030, pz);
      });
    }
    effects.update(delta);
    renderer.render(scene, camera);
  }

  setHole(0);
  return { resize, pointAt, ballScreenPosition, render, setHole, emit };
}
