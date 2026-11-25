import * as T from 'three';
import jp from './assets/flags/jp.png?inline';
import th from './assets/flags/th.png?inline';
import it from './assets/flags/it.png?inline';
import ch from './assets/flags/ch.png?inline';
import es from './assets/flags/es.png?inline';
import eg from './assets/flags/eg.png?inline';
import cn from './assets/flags/cn.png?inline';
import kr from './assets/flags/kr.png?inline';
import mx from './assets/flags/mx.png?inline';
import no from './assets/flags/no.png?inline';
import type { Point } from './golf';

const images = { jp, th, it, ch, es, eg, cn, kr, mx, no };
const loader = new T.TextureLoader();
const cloth = new T.PlaneGeometry(1, 1, 16, 1);
const vertices = cloth.attributes.position;
for (let i = 0; i < vertices.count; i++) {
  const distanceFromPole = vertices.getX(i) + 0.5;
  vertices.setZ(i, Math.sin(distanceFromPole * Math.PI * 2.5) * distanceFromPole * 0.047);
}
cloth.computeVertexNormals();

export async function flyCountryFlag(group: T.Group, country: keyof typeof images, cup: Point) {
  const flag = new T.Mesh(cloth, new T.MeshBasicMaterial({ side: T.DoubleSide, toneMapped: false }));
  flag.rotation.y = -0.17;
  flag.visible = false;
  group.add(flag);
  const texture = await loader.loadAsync(images[country]);
  texture.colorSpace = T.SRGBColorSpace;
  const image = texture.image as HTMLImageElement;
  await image.decode();
  const ratio = image.naturalWidth / image.naturalHeight;
  const width = Math.min(0.99, 0.60 * ratio);
  const height = width / ratio;
  flag.material.map = texture;
  flag.material.needsUpdate = true;
  flag.scale.set(width, height, 1);
  flag.position.set(cup.x + Math.cos(flag.rotation.y) * width / 2, 1.345 - height / 2,
    cup.z - Math.sin(flag.rotation.y) * width / 2);
  flag.visible = true;
  return texture;
}
