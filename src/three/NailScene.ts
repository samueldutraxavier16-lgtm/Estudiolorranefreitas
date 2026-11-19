import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Shell,
  createFingerGeometry,
  createFoldGeometry,
  lerp,
  nailBase,
  smooth,
  type NailShape,
} from './geometry';
import { backdropTexture, finishTexture, plateTexture, ridgeTexture, skinBumpTexture } from './textures';

export type Quality = 'high' | 'low';

/* ------------------------------------------------------------------
   Linha do tempo (progresso da rolagem 0 → 1)
   I natural · II preparação · III gel · IV estrutura · V nivelamento · VI resultado
------------------------------------------------------------------- */

const NATURAL: NailShape = { cuticle: -0.6, tip: 0.9, tipCurve: 0.15, tipPow: 2 };
const FILED: NailShape = { cuticle: -0.66, tip: 0.86, tipCurve: 0.035, tipPow: 4 };

// câmera: [progresso, azimute°, elevação°, distância]
const CAM: [number, number, number, number][] = [
  [0.0, -55, 34, 8.2],
  [0.13, -38, 40, 7.0],
  [0.3, -20, 52, 5.6],
  [0.46, 6, 56, 5.2],
  [0.6, 52, 20, 5.0],
  [0.72, 44, 26, 5.1],
  [0.86, 14, 50, 5.4],
  [1.0, -24, 42, 5.9],
];

function sampleCam(p: number) {
  let i = 0;
  while (i < CAM.length - 2 && p > CAM[i + 1][0]) i++;
  const a = CAM[i];
  const b = CAM[i + 1];
  const t = smooth(a[0], b[0], p);
  return { az: lerp(a[1], b[1], t), el: lerp(a[2], b[2], t), r: lerp(a[3], b[3], t) };
}

const window01 = (p: number, a: number, b: number) => smooth(a, b, p);

export class NailScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  private target = new THREE.Vector3(0, 0.36, 0.12);
  private group = new THREE.Group();
  private clock = new THREE.Clock();

  private plate = new Shell();
  private gel: Shell;
  private color: Shell;
  private plateMat: THREE.MeshPhysicalMaterial;
  private gelMat: THREE.MeshPhysicalMaterial;
  private colorMat: THREE.MeshPhysicalMaterial;
  private skinMat: THREE.MeshPhysicalMaterial;
  private fold: THREE.Mesh;
  private gelMesh: THREE.Mesh;
  private colorMesh: THREE.Mesh;
  private dust: THREE.Points;
  private dustSeeds: Float32Array;
  private uvLight = new THREE.PointLight('#8a6bff', 0, 3, 1.6);
  private sweep = new THREE.PointLight('#fff3ea', 0, 4, 1.4);

  private progress = 0;
  private smoothP = 0;
  private lastBuilt = -1;
  private lastFold = '';
  private running = false;
  private disposed = false;
  private reduced: boolean;
  private viewShift = { x: 0, y: 0 };
  private size = { w: 1, h: 1 };

  constructor(private container: HTMLElement, quality: Quality, reduced: boolean) {
    this.reduced = reduced;
    const high = quality === 'high';
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, high ? 2 : 1.35));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.82;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-hidden', 'true');

    this.gel = new Shell(high ? 40 : 28, high ? 64 : 44);
    this.color = new Shell(high ? 40 : 28, high ? 64 : 44);

    // ambiente e luz
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.background = backdropTexture();

    const hemi = new THREE.HemisphereLight('#fff1e6', '#3a2a24', 0.55);
    const key = new THREE.DirectionalLight('#fff0e2', 1.6);
    key.position.set(-2.2, 4, 3);
    const rim = new THREE.DirectionalLight('#f1b49b', 1.7);
    rim.position.set(2.5, 1.2, -3);
    const fill = new THREE.DirectionalLight('#ffe6d6', 0.5);
    fill.position.set(3, 0.5, 2.5);
    this.uvLight.position.set(0, 1.25, 0.1);
    this.sweep.position.set(-1.5, 1.2, 1.5);
    this.scene.add(hemi, key, rim, fill, this.uvLight, this.sweep);

    // dedo
    this.skinMat = new THREE.MeshPhysicalMaterial({
      color: '#a86d55',
      roughness: 0.58,
      sheen: 0.7,
      sheenColor: new THREE.Color('#ffd9c6'),
      sheenRoughness: 0.45,
      clearcoat: 0.08,
      clearcoatRoughness: 0.6,
      bumpMap: skinBumpTexture(),
      bumpScale: 0.6,
      envMapIntensity: 0.35,
    });
    const finger = new THREE.Mesh(createFingerGeometry(high ? 90 : 60, high ? 72 : 48), this.skinMat);
    this.group.add(finger);

    // lâmina natural
    this.plateMat = new THREE.MeshPhysicalMaterial({
      map: plateTexture(),
      roughness: 0.38,
      clearcoat: 0.45,
      clearcoatRoughness: 0.35,
      bumpMap: ridgeTexture(),
      bumpScale: 1.2,
      sheen: 0.3,
      sheenColor: new THREE.Color('#ffffff'),
      envMapIntensity: 0.5,
    });
    this.group.add(new THREE.Mesh(this.plate.geometry, this.plateMat));

    // dobras de pele
    this.fold = new THREE.Mesh(createFoldGeometry(NATURAL, 0, 0.045), this.skinMat);
    this.group.add(this.fold);

    // gel transparente
    this.gelMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      roughness: 0.08,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      ior: 1.5,
      envMapIntensity: 1.2,
      emissive: new THREE.Color('#6b4bff'),
      emissiveIntensity: 0,
      ...(high
        ? { transmission: 1, thickness: 0.25, attenuationColor: new THREE.Color('#fff4ee'), attenuationDistance: 1.2 }
        : { transparent: true, opacity: 0.38 }),
    });
    this.gelMesh = new THREE.Mesh(this.gel.geometry, this.gelMat);
    this.group.add(this.gelMesh);

    // cor final
    this.colorMat = new THREE.MeshPhysicalMaterial({
      map: finishTexture(high ? 1024 : 512),
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.025,
      sheen: 0.2,
      envMapIntensity: 1.1,
    });
    this.colorMesh = new THREE.Mesh(this.color.geometry, this.colorMat);
    this.group.add(this.colorMesh);

    // pó da lixa
    const count = high ? 160 : 80;
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
    this.dustSeeds = new Float32Array(count * 4).map(() => Math.random());
    this.dust = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({ color: '#f6e9df', size: 0.011, transparent: true, opacity: 0, depthWrite: false }),
    );
    this.group.add(this.dust);

    this.group.rotation.set(0.04, 0, 0);
    this.scene.add(this.group);

    this.build(0);
    this.resize();
  }

  /* ---------------- estado por progresso ---------------- */
  private build(p: number) {
    const prep = window01(p, 0.16, 0.24); // cutícula
    const buff = window01(p, 0.2, 0.3); // lixa de superfície
    const file = window01(p, 0.24, 0.32); // formato
    const gelCover = window01(p, 0.34, 0.47);
    const struct = window01(p, 0.5, 0.63);
    const level = window01(p, 0.66, 0.76);
    const colorCover = window01(p, 0.82, 0.9);

    const shape: NailShape = {
      cuticle: lerp(NATURAL.cuticle, FILED.cuticle, prep),
      tip: lerp(NATURAL.tip, FILED.tip, file),
      tipCurve: lerp(NATURAL.tipCurve, FILED.tipCurve, file),
      tipPow: lerp(NATURAL.tipPow, FILED.tipPow, file),
    };

    // lâmina natural
    this.plate.update({
      shape,
      coverage: 1,
      vStart: 0,
      lift: -0.004,
      thickness: (u, v) => 0.03 * (0.35 + 0.65 * smooth(1, 0.82, Math.abs(u)) * smooth(0, 0.05, v)),
    });
    this.plateMat.roughness = lerp(0.36, 0.82, buff);
    this.plateMat.clearcoat = lerp(0.45, 0, buff);
    this.plateMat.bumpScale = lerp(1.2, 0.15, buff);

    // dobra da cutícula: empurrada para trás e afinada na preparação
    const foldKey = `${prep.toFixed(3)}`;
    if (foldKey !== this.lastFold) {
      this.lastFold = foldKey;
      this.fold.geometry.dispose();
      this.fold.geometry = createFoldGeometry(shape, lerp(-0.035, 0.0, prep), lerp(0.05, 0.036, prep));
    }

    // gel: base fina → estrutura com ápice → nivelado
    const apex = 0.075 * struct;
    const waveAmp = 0.011 * struct * (1 - level);
    const gelThick = (u: number, v: number) => {
      const side = smooth(1, 0.78, Math.abs(u));
      const prox = smooth(0.02, 0.12, v);
      const base = 0.016 + 0.006 * struct;
      const hump = apex * Math.exp(-Math.pow((v - 0.4) / 0.3, 2)) * (0.45 + 0.55 * side);
      return (base + hump) * (0.3 + 0.7 * side) * (0.25 + 0.75 * prox);
    };
    const gelWave = waveAmp
      ? (u: number, v: number) =>
          waveAmp *
          (Math.sin(u * 7.3 + v * 3.1) * 0.6 + Math.sin(v * 17.0 - u * 2.0) * 0.4) *
          smooth(1, 0.7, Math.abs(u)) *
          smooth(0.02, 0.2, v)
      : undefined;
    this.gelMesh.visible = gelCover > 0.001;
    if (this.gelMesh.visible) {
      this.gel.update({ shape, coverage: lerp(0.06, 1, gelCover), vStart: 0.025, lift: 0.024, thickness: gelThick, wave: gelWave });
    }
    this.gelMat.roughness = lerp(0.05, 0.1, struct * (1 - level));
    this.gelMat.clearcoatRoughness = lerp(0.03, 0.12, struct * (1 - level));

    // cor
    this.colorMesh.visible = colorCover > 0.001;
    if (this.colorMesh.visible) {
      this.color.update({
        shape,
        coverage: lerp(0.06, 1, colorCover),
        vStart: 0.03,
        lift: 0.024,
        thickness: (u, v) => gelThick(u, v) + 0.006 * smooth(1, 0.8, Math.abs(u)),
      });
    }
    this.gelMesh.visible = this.gelMesh.visible && colorCover < 0.999;

    // pó: espalha sobre a unha enquanto lixa
    const dustOn = window01(p, 0.19, 0.22) * (1 - window01(p, 0.3, 0.34));
    (this.dust.material as THREE.PointsMaterial).opacity = dustOn * 0.85;
    this.dust.visible = dustOn > 0.01;
    this.dustShape = shape;
  }

  private dustShape: NailShape = NATURAL;
  private tmp = new THREE.Vector3();

  private animateDust(t: number) {
    if (!this.dust.visible) return;
    const pos = this.dust.geometry.attributes.position as THREE.BufferAttribute;
    const s = this.dustSeeds;
    for (let i = 0; i < pos.count; i++) {
      const u = s[i * 4] * 2 - 1;
      const v = s[i * 4 + 1];
      nailBase(u * 1.1, v, this.dustShape, this.tmp);
      const life = (t * (0.15 + s[i * 4 + 2] * 0.25) + s[i * 4 + 3]) % 1;
      pos.setXYZ(
        i,
        this.tmp.x + Math.sin(t + i) * 0.02 * life,
        this.tmp.y + 0.03 + life * 0.22,
        this.tmp.z + (s[i * 4 + 2] - 0.5) * 0.08 * life,
      );
    }
    pos.needsUpdate = true;
  }

  /* ---------------- API ---------------- */
  setProgress(p: number) {
    this.progress = Math.min(1, Math.max(0, p));
    if (this.reduced) this.smoothP = this.progress;
    if (!this.running) this.renderFrame();
  }

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.clock.start();
    this.renderer.setAnimationLoop(() => this.renderFrame());
  }

  stop() {
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.size = { w, h };
    this.renderer.setSize(w, h, false);
    const wide = w / h > 1.1 && w >= 900;
    this.camera.aspect = w / h;
    // Desktop: unha à esquerda (texto à direita). Celular: unha mais alta (texto embaixo).
    this.viewShift = wide ? { x: w * 0.17, y: 0 } : { x: 0, y: h * 0.13 };
    this.camera.fov = wide ? 28 : w < 520 ? 40 : 34;
    this.camera.setViewOffset(w, h, this.viewShift.x, this.viewShift.y, w, h);
    this.camera.updateProjectionMatrix();
    this.renderFrame();
  }

  private renderFrame() {
    if (this.disposed) return;
    const t = this.clock.getElapsedTime();
    // amortecimento leve: transições fluidas mesmo com rolagem brusca
    this.smoothP += (this.progress - this.smoothP) * (this.reduced ? 1 : 0.12);
    if (Math.abs(this.progress - this.smoothP) < 0.0004) this.smoothP = this.progress;
    const p = this.smoothP;

    const q = Math.round(p * 2000) / 2000;
    if (q !== this.lastBuilt) {
      this.lastBuilt = q;
      this.build(q);
    }
    this.animateDust(t);

    // câmera
    const c = sampleCam(p);
    const az = THREE.MathUtils.degToRad(c.az + (this.reduced ? 0 : Math.sin(t * 0.35) * 1.2));
    const el = THREE.MathUtils.degToRad(c.el + (this.reduced ? 0 : Math.sin(t * 0.27) * 0.8));
    this.camera.position.set(
      this.target.x + c.r * Math.sin(az) * Math.cos(el),
      this.target.y + c.r * Math.sin(el),
      this.target.z + c.r * Math.cos(az) * Math.cos(el),
    );
    this.camera.lookAt(this.target);

    // luz UV da cabine durante a cura
    const cure = window01(p, 0.7, 0.735) * (1 - window01(p, 0.775, 0.8));
    const pulse = this.reduced ? 1 : 0.85 + 0.15 * Math.sin(t * 6);
    this.uvLight.intensity = cure * 5 * pulse;
    this.gelMat.emissiveIntensity = cure * 0.22 * pulse;

    // brilho final passando pela unha
    const sw = window01(p, 0.9, 1);
    this.sweep.intensity = Math.sin(sw * Math.PI) * 6;
    this.sweep.position.set(lerp(-1.4, 1.4, sw), 1.0, lerp(1.2, -0.2, sw));

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => {
        Object.values(x).forEach((v) => v instanceof THREE.Texture && v.dispose());
        x.dispose();
      });
    });
    (this.scene.background as THREE.Texture | null)?.dispose();
    this.scene.environment?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  get canvasSize() {
    return this.size;
  }
}
