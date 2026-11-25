import * as T from 'three';
import { PLAYER_COLORS, SEATS, type Seat } from './room-protocol';
import { ALPINE_ICE, ARENA_COLUMNS, ARENA_SAND, BALL_RADIUS, BRIDGE, BUMPERS, COURSES, CUP_RADIUS, FJORD_WIND,
  fjordWind, GATE, gateClearsBall, gateLift, groundHeight, HANOK_GATES, hanokGateLift, SHELTER_ROCKS,
  WALL_SWITCHBACKS, YUCATAN_CHUTE, type CourseLayout, type Point } from './golf';
import { decorateCourse, decorateFloatingMarketPlayfield, decorateKyotoPond, decorateLoyKrathong, decorateSongkran,
  palettes } from './themes';
import { golfBallMaterials, makeEffects, type Burst } from './fx';
import { flyCountryFlag } from './flags';
import { decorateAlternate } from './alternate-scene';

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

function alpineIce(group: T.Group) {
  const lake = new T.MeshStandardMaterial({ color: 0x75bdcf, roughness: 0.28, metalness: 0.035 });
  const rim = matte(0xb7e6e9);
  for (const [inner, offset, material] of [[0, 0.011, lake], [0.963, 0.015, rim]] as const) {
    const sheet = new T.RingGeometry(inner, 1, 84, 22).rotateX(-Math.PI / 2);
    const vertices = sheet.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const x = ALPINE_ICE.x + vertices.getX(i) * ALPINE_ICE.width;
      const z = ALPINE_ICE.z + vertices.getZ(i) * ALPINE_ICE.depth;
      vertices.setXYZ(i, x, groundHeight(3, x, z) + offset, z);
    }
    sheet.computeVertexNormals();
    mesh(group, sheet, material, 0, 0, 0).castShadow = false;
  }
  const frost = new T.LineBasicMaterial({ color: 0xc6eef3, transparent: true, opacity: 0.73 });
  for (const crack of [
    [[-2.32, -0.31], [-1.68, -0.26], [-1.22, -0.65], [-0.61, -0.62]],
    [[-1.68, -0.26], [-1.23, -0.02], [-0.97, 0.22]],
    [[-0.56, 0.46], [0.07, 0.40], [0.56, 0.59], [1.26, 0.42]],
    [[0.54, -0.73], [0.91, -0.41], [1.49, -0.35], [1.91, -0.07], [2.36, -0.14]],
  ]) {
    const points = crack.map(([x, z]) => new T.Vector3(x, groundHeight(3, x, z) + 0.034, z));
    // Subdivide each crack so it follows the slope between corner points.
    const polyline: T.Vector3[] = [];
    for (let i = 1; i < points.length; i++) {
      for (let j = 0; j < 8; j++) {
        const point = points[i - 1].clone().lerp(points[i], j / 8);
        point.y = groundHeight(3, point.x, point.z) + 0.034;
        polyline.push(point);
      }
    }
    polyline.push(points.at(-1)!);
    group.add(new T.Line(new T.BufferGeometry().setFromPoints(polyline), frost));
  }
}

function yucatanTerrace(group: T.Group) {
  const stone = matte(0xb9a371);
  const cap = matte(0xe1c289);
  const jade = matte(0x688775);
  const ramp = new T.PlaneGeometry(4.96, 3.36, 68, 46).rotateX(-Math.PI / 2);
  const vertices = ramp.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i) + 2.858;
    const z = vertices.getZ(i) + 0.02;
    vertices.setXYZ(i, x, groundHeight(8, x, z) + 0.007, z);
  }
  ramp.computeVertexNormals();
  mesh(group, ramp, matte(0xb7a979), 0, 0, 0).castShadow = false;

  const chute = YUCATAN_CHUTE;
  for (const [from, to] of chute.walls) {
    box(group, stone, chute.x, 0.21, (from + to) / 2, chute.radius * 2, 0.42, to - from);
    box(group, cap, chute.x, 0.45, (from + to) / 2, chute.radius * 2.13, 0.072, to - from);
  }
  for (const z of [chute.from - 0.091, chute.to + 0.091]) {
    box(group, stone, chute.x, 0.44, z, 0.40, 0.88, 0.25);
    box(group, jade, chute.x, 0.81, z, 0.41, 0.075, 0.26);
  }
  const center = (chute.from + chute.to) / 2;
  for (let i = 0; i < 3; i++) {
    box(group, i === 1 ? stone : cap, chute.x, 0.879 + i * 0.076, center,
      0.41 - i * 0.06, 0.074, chute.to - chute.from + 0.57 - i * 0.15);
  }
  const divider = chute.divider;
  for (let i = 0; i < 7; i++) {
    const length = (divider.to - divider.from) / 7;
    box(group, i % 2 ? cap : stone, divider.from + (i + 0.5) * length, 0.11, divider.z,
      length - 0.015, 0.22, divider.radius * 2);
  }
  for (const z of [chute.from + 0.13, chute.to - 0.13]) {
    box(group, jade, 0.22, 0.018, z, 0.18, 0.022, 0.063).castShadow = false;
  }
}

function fjordWindMarkers(group: T.Group) {
  const band = new T.MeshBasicMaterial({ color: 0x83dac0, transparent: true, opacity: 0.19, depthWrite: false });
  const gustTint = new T.MeshBasicMaterial({ color: 0xa3e7e0, transparent: true, depthWrite: false });
  const chevron = new T.Shape([
    new T.Vector2(-0.20, -0.04), new T.Vector2(0, -0.30), new T.Vector2(0.20, -0.04),
    new T.Vector2(0.13, -0.04), new T.Vector2(0, -0.20), new T.Vector2(-0.13, -0.04),
  ]);
  const gustShape = new T.ShapeGeometry(chevron).rotateX(-Math.PI / 2);
  const gustMarks = [-1.6, 0, 1.6].map((x) => mesh(group, gustShape, gustTint, x, 0.018, 1.52));
  gustMarks.forEach((mark) => { mark.castShadow = false; });
  const snow = matte(0x9bbab8);
  const shield = matte(0x586e77);
  const width = FJORD_WIND.right - FJORD_WIND.left;
  const mid = (FJORD_WIND.left + FJORD_WIND.right) / 2;
  for (const z of [FJORD_WIND.top, FJORD_WIND.bottom]) {
    for (let i = 0; i < 13; i++) {
      const x = mid - width / 2 + width * (i + 0.5) / 13;
      box(group, band, x, 0.013, z, 0.28, 0.004, 0.042).castShadow = false;
    }
  }
  for (const [i, rock] of SHELTER_ROCKS.entries()) {
    const obstacle = mesh(group, new T.DodecahedronGeometry(1), shield, rock.x, 0.147, rock.z);
    obstacle.scale.set(rock.radius, 0.23 + i * 0.019, rock.radius);
    const top = mesh(group, new T.DodecahedronGeometry(1), snow, rock.x - 0.05, 0.32 + i * 0.021, rock.z);
    top.scale.set(rock.radius * 0.58, 0.071, rock.radius * 0.56);
  }
  const ribbons = [[-3.33, 2.8], [3.38, 2.8]].map(([x, z]) => {
    mesh(group, new T.CylinderGeometry(0.026, 0.032, 0.74, 8), snow, x, 0.385, z);
    const ribbon = new T.Group();
    ribbon.position.set(x, 0.72, z);
    group.add(ribbon);
    for (let stripe = 0; stripe < 4; stripe++) {
      const section = box(ribbon, new T.MeshBasicMaterial({ color: stripe % 2 ? 0xeeeecc : 0xe9816b }),
        0.068 + stripe * 0.126, -stripe * 0.018, 0, 0.126, 0.14 - stripe * 0.022, 0.033);
      section.rotation.z = -0.13;
      section.castShadow = false;
    }
    return ribbon;
  });
  return (seconds: number) => {
    const gust = fjordWind(seconds);
    const strength = Math.min(1, Math.abs(gust) / 2.45);
    gustTint.opacity = strength * 0.63;
    for (const mark of gustMarks) mark.rotation.y = gust >= 0 ? 0 : Math.PI;
    for (const ribbon of ribbons) {
      ribbon.rotation.y = gust >= 0 ? -Math.PI / 2 : Math.PI / 2;
      ribbon.rotation.z = -0.68 + strength * 0.59;
      ribbon.scale.x = 0.44 + strength * 0.56;
    }
  };
}

function course(scene: T.Group, index: number) {
  const { layouts, flag } = COURSES[index];
  const palette = palettes[index];
  const curb = matte(palette.curb);
  const cap = matte(palette.trim);
  function stripedTurf(color: number) {
    const turf = matte(color);
    turf.onBeforeCompile = (shader) => {
      shader.vertexShader = 'varying float grassX;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ngrassX = position.x;');
      shader.fragmentShader = 'varying float grassX;\n' + shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(0.88, 1.0, step(0.5, fract(grassX * 0.63)));');
    };
    return turf;
  }
  const turf = stripedTurf(palette.grass);
  const variants = layouts.map(({ cup, outline, walls }, layout) => {
    const group = new T.Group();
    scene.add(group);
    const shape = new T.Shape(outline.map(({ x, z }) => new T.Vector2(x, -z)));
    const hole = new T.Path();
    hole.absarc(cup.x, -cup.z, CUP_RADIUS, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    if (index === 1 && layout === 0) {
      for (const [top, bottom] of [[BRIDGE.top, BRIDGE.deckTop], [BRIDGE.deckBottom, BRIDGE.bottom - 0.012]]) {
        const water = new T.Path([
          new T.Vector2(BRIDGE.left, -top), new T.Vector2(BRIDGE.left, -bottom),
          new T.Vector2(BRIDGE.right, -bottom), new T.Vector2(BRIDGE.right, -top),
          new T.Vector2(BRIDGE.left, -top),
        ]);
        shape.holes.push(water);
      }
    }
    if (layout === 1) {
      for (const zone of layouts[1].zones ?? []) {
        if (zone.kind === 'water') shape.holes.push(new T.Path(zone.outline.map(({ x, z }) => new T.Vector2(x, -z))));
      }
    }
    const turfPaint = layout === 0 ? turf : stripedTurf(new T.Color(palette.grass).lerp(new T.Color(0x468b72), 0.44).getHex());
    const green = mesh(group, new T.ShapeGeometry(shape, 32), turfPaint, 0, 0, 0);
    green.rotation.x = -Math.PI / 2;
    green.castShadow = false;
    mesh(group, new T.CylinderGeometry(CUP_RADIUS, CUP_RADIUS * 0.78, 0.025, 32), colors.ink, cup.x, -0.185, cup.z);
    mesh(group, new T.TorusGeometry(CUP_RADIUS, 0.025, 7, 32), cap, cup.x, 0.006, cup.z).rotation.x = -Math.PI / 2;

    for (const wall of walls) {
      const count = Math.ceil(wall.length / 1.2);
      const length = wall.length / count;
      for (let index = 0; index < count; index++) {
        const t = (index + 0.5) / count;
        const x = wall.from.x + wall.dx * t - wall.nx * 0.15;
        const z = wall.from.z + wall.dz * t - wall.nz * 0.15;
        const angle = -Math.atan2(wall.dz, wall.dx);
        box(group, curb, x, -0.02, z, length - 0.014, 0.59, 0.306).rotation.y = angle;
        box(group, cap, x, 0.26, z, length - 0.024, 0.11, 0.321).rotation.y = angle;
      }
    }
    for (const corner of outline) {
      const joint = mesh(group, new T.CylinderGeometry(0.162, 0.162, 0.612, 8), curb, corner.x, -0.019, corner.z);
      joint.scale.set(0.92, 1, 0.92);
    }
    return group;
  });
  if (index === 3) {
    const hill = new T.PlaneGeometry(4.49, 5.33, 44, 45).rotateX(-Math.PI / 2);
    const vertices = hill.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const z = vertices.getZ(i) - 0.25;
      vertices.setZ(i, z);
      vertices.setY(i, groundHeight(index, vertices.getX(i), z) + 0.0025);
    }
    hill.computeVertexNormals();
    const surface = mesh(variants[0], hill, turf, 0, 0, 0);
    surface.castShadow = true;
    alpineIce(variants[0]);
  }

  const flagAnchor = new T.Group();
  scene.add(flagAnchor);
  mesh(flagAnchor, new T.CylinderGeometry(0.024, 0.024, 1.53, 10), colors.yellow, 0, 0.62, 0);
  mesh(flagAnchor, geometry.sphere, colors.yellow, 0, 1.4, 0).scale.setScalar(0.046);
  return { variants, flagAnchor, flagReady: flyCountryFlag(flagAnchor, flag, { x: 0, z: 0 }) };
}

function timberBridge(group: T.Group) {
  const water = matte(0x348e8b);
  const foam = matte(0x80c5b3);
  const wood = [matte(0xb87942), matte(0xd69855), matte(0xc4884d)];
  const x = (BRIDGE.left + BRIDGE.right) / 2;
  box(group, water, x, -0.085, (BRIDGE.top + BRIDGE.bottom) / 2,
    BRIDGE.right - BRIDGE.left, 0.04, BRIDGE.bottom - BRIDGE.top);
  const ripples: { line: T.Mesh; x: number; width: number }[] = [];
  for (let i = 0; i < 25; i++) {
    const z = BRIDGE.top + 0.14 + i * 0.216;
    if (z < BRIDGE.deckTop || z > BRIDGE.deckBottom) {
      const rippleX = x + (i % 4 - 1.5) * 0.42;
      const width = 0.20 + 0.063 * (i % 4);
      const line = box(group, foam, rippleX, -0.061, z, width, 0.004, 0.026);
      line.castShadow = false;
      ripples.push({ line, x: rippleX, width });
    }
  }
  for (let i = 0; i < 10; i++) {
    box(group, wood[i % 3], BRIDGE.left + 0.11 + i * 0.22, 0.006, (BRIDGE.deckTop + BRIDGE.deckBottom) / 2,
      0.215, 0.045, BRIDGE.deckBottom - BRIDGE.deckTop);
  }
  for (const edge of [BRIDGE.deckTop, BRIDGE.deckBottom]) {
    box(group, wood[1], x, 0.033, edge, BRIDGE.right - BRIDGE.left, 0.048, 0.047);
  }
  // Short stakes mark the entrance without obstructing the ball.
  for (const x of [BRIDGE.left - 0.1, BRIDGE.right + 0.1]) {
    for (const z of [BRIDGE.deckTop - 0.09, BRIDGE.deckBottom + 0.09]) {
      box(group, wood[0], x, 0.13, z, 0.12, 0.26, 0.12);
    }
  }
  return (time: number) => {
    ripples.forEach(({ line, x, width }, i) => {
      line.position.x = x + Math.sin(time * 1.2 + i * 1.7) * 0.105;
      line.scale.x = width * (0.90 + Math.sin(time * 1.1 + i) * 0.22);
    });
  };
}

function colosseumArena(group: T.Group) {
  const sand = matte(0xd7a45f);
  const border = matte(0xf0c68a);
  const stone = matte(0xc8a382);
  const trim = matte(0xe3c2a0);
  const center = new T.Shape();
  center.absellipse(0, 0, ARENA_SAND.width, ARENA_SAND.depth, 0, Math.PI * 2, false, 0);
  const bed = mesh(group, new T.ShapeGeometry(center, 32).rotateX(-Math.PI / 2), sand, ARENA_SAND.x, 0.009, ARENA_SAND.z);
  bed.castShadow = false;
  const ring = mesh(group, new T.RingGeometry(0.972, 1.0, 72).rotateX(-Math.PI / 2),
    border, ARENA_SAND.x, 0.011, ARENA_SAND.z);
  ring.scale.set(ARENA_SAND.width, 1, ARENA_SAND.depth);
  ring.castShadow = false;
  const rake = matte(0xcfa36b);
  for (let i = 0; i < 6; i++) {
    const z = -1.28 + i * 0.42;
    const length = ARENA_SAND.width * Math.sqrt(1 - (z / ARENA_SAND.depth) ** 2);
    box(group, rake, ARENA_SAND.x, 0.011, ARENA_SAND.z + z, length * 1.8, 0.004, 0.014).castShadow = false;
  }

  for (const [index, column] of ARENA_COLUMNS.entries()) {
    const height = [0.85, 0.72, 0.49][index];
    const { x, z, radius } = column;
    mesh(group, new T.CylinderGeometry(radius, radius, 0.17, 12), trim, x, 0.085, z);
    mesh(group, new T.CylinderGeometry(radius * 0.66, radius * 0.74, height, 12), stone, x, height / 2 + 0.16, z);
    mesh(group, new T.CylinderGeometry(radius * 0.83, radius * 0.77, 0.11, 12), trim, x, height + 0.15, z);
    for (let i = 0; i < 10; i++) {
      const angle = i * Math.PI / 5;
      mesh(group, new T.CylinderGeometry(0.020, 0.025, height * 0.87, 6), trim,
        x + Math.cos(angle) * radius * 0.68, height / 2 + 0.16, z + Math.sin(angle) * radius * 0.68);
    }
  }
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

function greatWall(group: T.Group) {
  const stone = matte(0x8b7469);
  const mortar = matte(0xbaa08a);
  const marker = matte(0xc96040);
  for (const wall of WALL_SWITCHBACKS) {
    const center = (wall.from + wall.to) / 2;
    const length = wall.to - wall.from;
    box(group, stone, wall.x, 0.21, center, wall.radius * 2, 0.43, length);
    box(group, mortar, wall.x, 0.44, center, wall.radius * 2.08, 0.075, length + 0.04);
    const blocks = Math.floor(length / 0.42);
    for (let i = 0; i < blocks; i++) {
      const z = wall.from + length * (i + 0.5) / blocks;
      box(group, mortar, wall.x, 0.53, z, wall.radius * 2, 0.16, 0.21);
      box(group, mortar, wall.x + wall.radius + 0.004, 0.22, z, 0.015, 0.017, 0.14);
    }
    const gapEnd = wall.x > 0 ? wall.from : wall.to;
    box(group, marker, wall.x, 0.28, gapEnd, wall.radius * 2, 0.56, 0.20);
  }
}

function hanokGates(group: T.Group) {
  const plaster = matte(0xd7c7a7);
  const grey = matte(0x56615d);
  const wood = matte(0x9d6645);
  const green = matte(0x416e60);
  const amber = new T.Color(0xffb862);
  const open = new T.Color(0x72f0bc);
  return HANOK_GATES.map((gate) => {
    const closedWidth = gate.to - gate.from;
    const center = (gate.from + gate.to) / 2;
    for (const [from, to] of [[-3.65, gate.from], [gate.to, 3.45]]) {
      box(group, plaster, gate.x, 0.21, (from + to) / 2, gate.radius * 2, 0.42, to - from);
      box(group, grey, gate.x, 0.44, (from + to) / 2, gate.radius * 2.1, 0.07, to - from);
    }
    for (const post of [gate.from - 0.049, gate.to + 0.049]) {
      box(group, wood, gate.x, 0.53, post, 0.25, 1.06, 0.18);
      box(group, green, gate.x, 1.04, post, 0.29, 0.09, 0.22);
    }
    box(group, green, gate.x, 1.14, center, 0.34, 0.15, closedWidth + 0.39);
    const lamp = new T.MeshBasicMaterial({ color: amber });
    mesh(group, geometry.sphere, lamp, gate.x, 1.28, center).scale.setScalar(0.101);

    const shutter = new T.Group();
    shutter.position.set(gate.x, 0, center);
    group.add(shutter);
    box(shutter, wood, 0, 0.28, 0, 0.27, 0.56, closedWidth);
    const laths = 10;
    for (let i = 0; i < laths; i++) {
      box(shutter, plaster, 0.141, 0.29, closedWidth * ((i + 0.5) / laths - 0.5), 0.028, 0.51, 0.026);
    }
    box(shutter, green, 0, 0.53, 0, 0.31, 0.07, closedWidth);
    return (elapsed: number) => {
      const lift = hanokGateLift(elapsed, gate.phase);
      shutter.position.y = lift;
      lamp.color.copy(gateClearsBall(lift) ? open : amber);
    };
  });
}

export function makeScene(canvas: HTMLCanvasElement) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene();
  scene.background = new T.Color(0x93af89);
  scene.fog = new T.Fog(0x93af89, 19, 34);

  const ambient = new T.HemisphereLight(0xfff8ed, 0xaaaa9b, 2.1);
  scene.add(ambient);
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
  const courses = COURSES.map(() => {
    const group = new T.Group();
    scene.add(group);
    return group;
  });
  const boards = courses.map(course);
  const animateScenery = courses.map(decorateCourse);
  const animateAlternate = boards.map(({ variants }, index) => decorateAlternate(variants[1], index));
  const animateKyotoPond = [decorateKyotoPond(boards[0].variants[0], 0), decorateKyotoPond(boards[0].variants[1], 1)] as const;
  const animateBridge = timberBridge(boards[1].variants[0]);
  decorateFloatingMarketPlayfield(boards[1].variants[0]);
  const animateThaiFestival = [decorateSongkran(boards[1].variants[0]), decorateLoyKrathong(boards[1].variants[1])] as const;
  colosseumArena(boards[2].variants[0]);
  pinball(boards[4].variants[0]);
  const gate = nileGate(boards[5].variants[0]);
  greatWall(boards[6].variants[0]);
  const updateHanokGates = hanokGates(boards[7].variants[0]);
  yucatanTerrace(boards[8].variants[0]);
  const updateWind = fjordWindMarkers(boards[9].variants[0]);
  let activeHole = -1;
  let activeLayout: CourseLayout = 0;
  const surfaceAt = (x: number, z: number) => groundHeight(activeHole, x, z, activeLayout);
  function setHole(index: number, layout: CourseLayout = 0) {
    if (activeHole === index && activeLayout === layout) return;
    activeHole = index;
    activeLayout = layout;
    courses.forEach((group, position) => { group.visible = position === index; });
    const { variants, flagAnchor } = boards[index];
    variants.forEach((group, position) => { group.visible = position === layout; });
    const cup = COURSES[index].layouts[layout].cup;
    flagAnchor.position.set(cup.x, 0, cup.z);
    const palette = palettes[index];
    const thaiNight = index === 1 && layout === 1;
    const sky = thaiNight ? 0x253e54 : palette.sky;
    setPaving(thaiNight ? 0x4c6275 : palette.paving);
    (scene.background as T.Color).setHex(sky);
    (scene.fog as T.Fog).color.setHex(sky);
    ambient.color.setHex(index === 9 || thaiNight ? 0xd8ebff : 0xfff8ed);
    ambient.intensity = index === 9 ? 1.6 : 2.1;
    sun.color.setHex(index === 9 || thaiNight ? 0xc1e1ef : 0xffeac9);
    sun.intensity = thaiNight ? 0.90 : index === 9 ? 1.15 : 1.9;
    effects.clear();
    lastBall = null;
    for (const opponent of opponentModels) opponent.previous = null;
    slingRelease = null;
    resize();
  }
  const ballMaterials = golfBallMaterials(['#d99035', '#247ab9', '#9d3a44', '#31863d', '#7144ad', '#af690e']);
  let lastBall: Point | null = null;
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
  const ball = mesh(scene, geometry.sphere, ballMaterials[0], 0, BALL_RADIUS, 0);
  ball.scale.setScalar(BALL_RADIUS);
  const slice = Math.PI * 2 / SEATS.length;
  const opponentModels = SEATS.map((seat) => {
    const model = mesh(scene, geometry.sphere, ballMaterials[seat], 0, BALL_RADIUS, 0);
    model.scale.setScalar(BALL_RADIUS);
    const marker = mesh(scene, new T.RingGeometry(0.34, 0.382, 10, 1, seat * slice, slice - 0.14)
      .rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: PLAYER_COLORS[seat] }), 0, 0.023, 0);
    marker.castShadow = false;
    return { model, marker, previous: null as Point | null };
  });
  const indicator = new T.MeshBasicMaterial({ color: 0x3cf0e1 });
  type Aim = { angle: number; power: number };
  const sling = new T.Group();
  scene.add(sling);
  const rubber = new T.MeshBasicMaterial({ color: 0x46e3c9 });
  const bandGeometry = new T.CylinderGeometry(0.025, 0.025, 1, 7);
  const strands = [new T.Mesh(bandGeometry, rubber), new T.Mesh(bandGeometry, rubber)];
  const anchorGeometry = new T.CylinderGeometry(0.053, 0.072, 0.07, 10);
  const anchorMaterial = new T.MeshBasicMaterial({ color: 0x1c4b46 });
  const anchors = [new T.Mesh(anchorGeometry, anchorMaterial), new T.Mesh(anchorGeometry, anchorMaterial)];
  const grip = new T.Mesh(new T.SphereGeometry(0.08, 14, 10), rubber);
  grip.scale.y = 0.52;
  sling.add(...strands, ...anchors, grip);
  const vertical = new T.Vector3(0, 1, 0);
  const strandVector = new T.Vector3();
  const relaxed = new T.Color(0x46e3c9);
  const taut = new T.Color(0xffc55c);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let slingRelease: { position: Point; aim: Aim; time: number } | null = null;
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
    let scenicHeight = 4.6;
    if (!portrait && [0, 3, 5, 6, 7, 8, 9].includes(activeHole)) scenicHeight = activeHole === 9 ? 5.68 : 5.12;
    const halfHeight = Math.max(scenicHeight, (portrait && activeHole > 0 ? 6.55 : 6.15) / aspect);
    camera.position.set(portrait ? 2.3 : 2.0, portrait ? 14 : 9, 12);
    camera.lookAt(portrait ? -0.45 : 0.85, !portrait && activeHole === 9 ? 0.68 : 0, portrait ? 0.04 : -0.25);
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
    const point = new T.Vector3(x, surfaceAt(x, z) + BALL_RADIUS, z).project(camera);
    return { x: rect.left + (point.x + 1) * rect.width / 2, y: rect.top + (1 - point.y) * rect.height / 2 };
  }

  function emit(kind: Burst, point: Point, seat: Seat) {
    effects.burst(kind, point, surfaceAt(point.x, point.z), PLAYER_COLORS[seat]);
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
    if (trail && distance > 0.035) effects.trail(previous, surfaceAt(previous.x, previous.z), PLAYER_COLORS[seat]);
  }

  function releaseSling(position: Point, aim: Aim) {
    if (!reduceMotion) slingRelease = { position: { ...position }, aim: { ...aim }, time: performance.now() };
  }

  function drawSling(position: Point, aim: Aim) {
    const dx = Math.cos(aim.angle);
    const dz = Math.sin(aim.angle);
    const stretch = aim.power * 1.22;
    rubber.color.copy(relaxed).lerp(taut, Math.pow(aim.power, 1.8));
    grip.position.x = position.x - dx * stretch;
    grip.position.z = position.z - dz * stretch;
    grip.position.y = surfaceAt(grip.position.x, grip.position.z) + 0.099;
    anchors.forEach((anchor, index) => {
      const side = index === 0 ? -0.39 : 0.39;
      anchor.position.x = position.x + dx * 0.10 - dz * side;
      anchor.position.z = position.z + dz * 0.10 + dx * side;
      anchor.position.y = surfaceAt(anchor.position.x, anchor.position.z) + 0.10;
      const strand = strands[index];
      strandVector.subVectors(grip.position, anchor.position);
      strand.position.copy(anchor.position).addScaledVector(strandVector, 0.5);
      strand.scale.y = strandVector.length();
      strand.quaternion.setFromUnitVectors(vertical, strandVector.normalize());
    });
  }

  function render(position: Point, ballHeight: number, aim: Aim | null, ready: boolean,
    seat: Seat = 0, opponents: readonly (Point & { seat: Seat })[] = [], elapsedSeconds = 0) {
    const sceneryTime = reduceMotion ? 0 : elapsedSeconds;
    if (activeLayout === 0) {
      if (activeHole === 5) gate.position.y = gateLift(elapsedSeconds);
      if (activeHole === 7) updateHanokGates.forEach((update) => update(elapsedSeconds));
      if (activeHole === 9) updateWind(elapsedSeconds);
      if (activeHole === 1) animateBridge(sceneryTime);
    } else {
      animateAlternate[activeHole](elapsedSeconds);
    }
    if (activeHole === 0) animateKyotoPond[activeLayout](sceneryTime);
    if (activeHole === 1) animateThaiFestival[activeLayout](sceneryTime);
    animateScenery[activeHole]?.(sceneryTime);
    const now = performance.now();
    sling.visible = false;
    if (ready && aim && aim.power >= 0.035) {
      sling.visible = true;
      drawSling(position, aim);
    } else if (slingRelease) {
      const progress = (now - slingRelease.time) / 140;
      if (progress >= 1) slingRelease = null;
      else {
        sling.visible = true;
        drawSling(slingRelease.position, { angle: slingRelease.aim.angle, power: slingRelease.aim.power * (1 - progress) ** 3 });
      }
    }
    const delta = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    const trail = now - lastTrail >= 52;
    if (trail) lastTrail = now;
    ball.material = ballMaterials[seat];
    for (const [otherSeat, visual] of opponentModels.entries()) {
      const { model, marker } = visual;
      const rival = opponents.find((player) => player.seat === otherSeat);
      model.visible = marker.visible = false;
      if (!rival) {
        visual.previous = null;
        continue;
      }
      const distance = ballHeight > -0.15 ? Math.hypot(rival.x - position.x, rival.z - position.z) : Infinity;
      const nearRival = opponents.some((other) => other.seat !== otherSeat
        && Math.hypot(other.x - rival.x, other.z - rival.z) < BALL_RADIUS * 2);
      const sharedTee = opponents.some((other) => other.seat < otherSeat
        && Math.hypot(other.x - rival.x, other.z - rival.z) < 0.10);
      const overlapping = nearRival || distance < BALL_RADIUS * 2;
      const surface = surfaceAt(rival.x, rival.z);
      model.visible = distance >= 0.10 && !sharedTee;
      model.position.set(rival.x, BALL_RADIUS + surface, rival.z);
      roll(model, visual.previous, rival, rival.seat, trail && model.visible);
      visual.previous = { x: rival.x, z: rival.z };
      model.material = (overlapping ? ghostMaterials : ballMaterials)[rival.seat];
      model.castShadow = !overlapping;
      if (overlapping) {
        marker.position.set(rival.x, surface + 0.023, rival.z);
        marker.visible = true;
      }
    }
    const surface = surfaceAt(position.x, position.z);
    roll(ball, lastBall, position, seat, trail && ballHeight >= BALL_RADIUS);
    lastBall = { ...position };
    ball.position.set(position.x, surface + ballHeight, position.z);
    ball.visible = ballHeight > -0.15;
    ring.position.set(position.x, surface + 0.022, position.z);
    ring.visible = ready;
    const angle = aim?.angle ?? COURSES[activeHole].initialAngle;
    arrow.visible = ready && !sling.visible;
    arrow.position.x = position.x - Math.cos(angle) * 0.74;
    arrow.position.z = position.z - Math.sin(angle) * 0.74;
    arrow.position.y = surfaceAt(arrow.position.x, arrow.position.z) + 0.040;
    arrow.rotation.y = -Math.PI / 2 - angle;
    guide.visible = aim !== null && aim.power > 0.025;
    if (aim && guide.visible) {
      const x = Math.cos(aim.angle);
      const z = Math.sin(aim.angle);
      let limit = 0.6 + aim.power * 6.7;
      for (const wall of COURSES[activeHole].layouts[activeLayout].walls) {
        const normal = x * wall.nx + z * wall.nz;
        if (normal >= -0.0001) continue;
        const distance = (BALL_RADIUS - (position.x - wall.from.x) * wall.nx - (position.z - wall.from.z) * wall.nz) / normal;
        if (distance < 0 || distance > limit) continue;
        const segment = ((position.x + x * distance - wall.from.x) * wall.dx + (position.z + z * distance - wall.from.z) * wall.dz) / wall.length ** 2;
        if (segment >= 0 && segment <= 1) limit = distance;
      }
      const obstacles = activeLayout === 1
        ? COURSES[activeHole].layouts[1].obstacles ?? []
        : activeHole === 2 ? ARENA_COLUMNS : [];
      for (const obstacle of obstacles) {
        const dx = obstacle.x - position.x;
        const dz = obstacle.z - position.z;
        const along = dx * x + dz * z;
        const perpendicular = dx * z - dz * x;
        const radius = obstacle.radius + BALL_RADIUS;
        if (along > 0 && Math.abs(perpendicular) < radius) {
          const contact = along - Math.sqrt(radius * radius - perpendicular * perpendicular);
          limit = Math.min(limit, Math.max(0, contact));
        }
      }
      dots.forEach((dot, index) => {
        const distance = 0.33 + index * 0.27;
        dot.visible = distance <= limit;
        const px = position.x + x * distance;
        const pz = position.z + z * distance;
        dot.position.set(px, surfaceAt(px, pz) + 0.030, pz);
      });
    }
    effects.update(delta);
    renderer.render(scene, camera);
  }

  setHole(0);
  return {
    resize, pointAt, ballScreenPosition, render, setHole, emit, releaseSling,
    async prepare() {
      for (const texture of await Promise.all(boards.map(({ flagReady }) => flagReady))) renderer.initTexture(texture);
      await renderer.compileAsync(scene, camera);
    },
  };
}
