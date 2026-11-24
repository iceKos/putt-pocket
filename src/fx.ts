import * as T from 'three';
import type { Point } from './golf';

export type Burst = 'putt' | 'splash' | 'cup';
const COUNT = 128;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function golfBallMaterials(stripes: readonly string[]) {
  const size = 512;
  const height = size / 2;
  function surface(draw: (context: CanvasRenderingContext2D) => void, color = false) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    draw(context);
    const texture = new T.CanvasTexture(canvas);
    if (color) texture.colorSpace = T.SRGBColorSpace;
    return texture;
  }

  // Staggered small depressions across a printable stripe and an ivory shell.
  const dimples: { x: number; y: number; radius: number }[] = [];
  for (let row = 1; row < 19; row++) {
    const count = Math.round(36 * Math.sin(row * Math.PI / 19));
    for (let column = 0; column < count; column++) {
      dimples.push({ x: (column + (row % 2) / 2) * size / count, y: row * height / 19, radius: Math.min(6, size / count * 0.43) });
    }
  }
  const stampDimples = (context: CanvasRenderingContext2D, tint: string, edge: string) => {
    for (const { x, y, radius } of dimples) {
      for (const wrap of [-size, 0, size]) {
        const spot = context.createRadialGradient(x + wrap, y, 0, x + wrap, y, radius);
        spot.addColorStop(0, tint);
        spot.addColorStop(0.62, tint);
        spot.addColorStop(1, edge);
        context.fillStyle = spot;
        context.fillRect(x + wrap - radius, y - radius, radius * 2, radius * 2);
      }
    }
  };

  const bumpMap = surface((context) => {
    context.fillStyle = '#bcbcbc';
    context.fillRect(0, 0, size, height);
    stampDimples(context, '#4d4d4d', 'transparent');
  });
  return stripes.map((stripe, index) => {
    const map = surface((context) => {
      context.fillStyle = index === 0 ? '#fff4de' : '#d4f4ff';
      context.fillRect(0, 0, size, height);
      context.fillStyle = stripe;
      context.fillRect(0, 82, size, 10);
      context.fillRect(0, 94, size, 40);
      context.fillRect(0, 136, size, 6);
      context.fillStyle = '#fff9ee';
      for (let i = 0; i < 4; i++) {
        context.beginPath();
        context.arc(32 + 128 * i, 114, 10, 0, 2 * Math.PI);
        context.fill();
      }
      stampDimples(context, 'rgba(64,60,79,.21)', 'transparent');
    }, true);
    return new T.MeshStandardMaterial({ map, bumpMap, bumpScale: 0.021, color: 0xffffff, roughness: 0.58 });
  });
}

export function makeEffects(scene: T.Scene) {
  const particles = new T.InstancedMesh(new T.IcosahedronGeometry(1, 0), new T.MeshBasicMaterial(), COUNT);
  particles.frustumCulled = false;
  particles.count = 0;
  particles.instanceMatrix.setUsage(T.DynamicDrawUsage);
  scene.add(particles);
  const active: Array<{
    x: number; y: number; z: number; vx: number; vy: number; vz: number;
    age: number; life: number; gravity: number; size: number; tint: T.Color;
  }> = [];
  const transform = new T.Object3D();
  const tint = new T.Color();
  const reduce = reducedMotion();

  function spawn(particle: typeof active[number]) {
    if (active.length < COUNT) active.push(particle);
  }

  function burst(kind: Burst, point: Point, height: number, playerColor: string) {
    const count = reduce ? 4 : kind === 'cup' ? 24 : 12;
    for (let i = 0; i < count; i++) {
      const angle = (i + Math.random() * 0.5) * Math.PI * 2 / count;
      const spread = kind === 'putt' ? 0.8 : kind === 'splash' ? 1.0 : 1.65;
      const speed = spread * (0.55 + Math.random() * 0.8);
      const colors = kind === 'splash' ? ['#4dd6ec', '#c4ffff', '#64e1e0']
        : kind === 'cup' ? ['#ffe067', '#73e6b4', playerColor, '#ff9c75'] : ['#fff2a1', '#fff9e5', playerColor];
      spawn({
        ...point, y: height + 0.045, vx: Math.cos(angle) * speed, vz: Math.sin(angle) * speed,
        vy: (kind === 'cup' ? 2.9 : 1.35) + Math.random() * 0.9, gravity: 8.5,
        size: (kind === 'cup' ? 0.068 : 0.05) * (0.7 + Math.random() * 0.6),
        tint: new T.Color(colors[i % colors.length]), age: 0, life: kind === 'cup' ? 0.95 : 0.5,
      });
    }
  }

  function trail(point: Point, height: number, color: string) {
    if (reduce) return;
    spawn({ ...point, y: height + 0.06, vx: 0, vy: 0.07, vz: 0, gravity: 0, size: 0.056,
      tint: tint.set(color).clone(), age: 0, life: 0.32 });
  }

  function update(delta: number) {
    let visible = 0;
    for (let i = active.length - 1; i >= 0; i--) {
      const p = active[i];
      p.age += delta;
      if (p.age >= p.life) {
        active.splice(i, 1);
        continue;
      }
      p.x += p.vx * delta;
      p.z += p.vz * delta;
      p.y += p.vy * delta;
      p.vy -= p.gravity * delta;
      if (p.y < 0 && p.gravity > 0) { p.age = p.life; continue; }
      transform.position.set(p.x, p.y, p.z);
      transform.rotation.set(p.age * 5 + i, p.age * 7, i);
      const scale = p.size * (1 - p.age / p.life);
      transform.scale.set(scale, scale * 0.72, scale);
      transform.updateMatrix();
      particles.setMatrixAt(visible, transform.matrix);
      particles.setColorAt(visible++, p.tint);
    }
    particles.count = visible;
    if (visible) {
      particles.instanceMatrix.needsUpdate = true;
      if (particles.instanceColor) particles.instanceColor.needsUpdate = true;
    }
  }

  return { burst, trail, update, clear() { active.length = 0; particles.count = 0; } };
}
