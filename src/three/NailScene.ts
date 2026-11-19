import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Shell, easeOutCubic, edgeFalloff, lerp, smooth } from './nail';
import { artTexture, baseTexture, colorTexture } from './textures';
import { LAYER_WINDOWS } from './timeline';

export type Quality = 'high' | 'low';

/* ------------------------------------------------------------------
   Camadas, de baixo para cima. Cada uma "desce" e se encaixa na anterior
   quando a rolagem chega na sua janela de tempo (ver timeline.ts).
------------------------------------------------------------------- */
type Fn = (u: number, v: number) => number;

const tBase: Fn = (u, v) => 0.045 * edgeFalloff(u, v, 0.82, 0.06);
const tGel: Fn = (u, v) => {
  // gel com ápice: mais grosso no terço proximal, como no banho de gel real
  const apex = Math.exp(-Math.pow((v - 0.38) / 0.3, 2));
  return (0.022 + 0.05 * apex * smooth(1, 0.55, Math.abs(u))) * edgeFalloff(u, v, 0.78, 0.1);
};
const tColor: Fn = (u, v) => 0.012 * edgeFalloff(u, v, 0.86, 0.06);
const tArt: Fn = () => 0.003;
const tTop: Fn = (u, v) => 0.02 * edgeFalloff(u, v, 0.8, 0.08);

const sum = (...fs: Fn[]): Fn => (u, v) => fs.reduce((a, f) => a + f(u, v), 0);

export class NailScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  private outer = new THREE.Group();
  private inner = new THREE.Group();
  private clock = new THREE.Clock();
  private layers: { mesh: THREE.Mesh; window: readonly [number, number]; dir: THREE.Vector3; spin: number }[] = [];
  private sweep = new THREE.PointLight('#ffffff', 0, 6, 1.2);

  private progress = 0;
  private smoothP = 0;
  private running = false;
  private disposed = false;

  constructor(private container: HTMLElement, quality: Quality, private reduced: boolean) {
    const high = quality === 'high';
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, high ? 2 : 1.4));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(this.renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
    pmrem.dispose();

    const key = new THREE.DirectionalLight('#fff3ea', 2.2);
    key.position.set(-3, 4, 5);
    const rim = new THREE.DirectionalLight('#f2b8a2', 1.6);
    rim.position.set(4, 2, -3);
    const fill = new THREE.HemisphereLight('#fff6f0', '#c9a596', 0.6);
    this.sweep.position.set(-2, 1.5, 2.5);
    this.scene.add(key, rim, fill, this.sweep);

    const nu = high ? 56 : 36;
    const nv = high ? 84 : 52;
    const shell = (thick: Fn, lift: Fn, grow: number) => new Shell(nu, nv).build({ thickness: thick, lift, grow });

    // 1. unha natural (base)
    const base = new THREE.Mesh(
      shell(tBase, () => 0, 0),
      new THREE.MeshPhysicalMaterial({
        map: baseTexture(),
        roughness: 0.42,
        clearcoat: 0.35,
        clearcoatRoughness: 0.4,
        sheen: 0.4,
        sheenColor: new THREE.Color('#fff2ec'),
        envMapIntensity: 0.7,
      }),
    );

    // 2. gel construtor (transparente, com ápice)
    const gel = new THREE.Mesh(
      shell(tGel, tBase, 0.006),
      new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        roughness: 0.06,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        ior: 1.5,
        envMapIntensity: 1.3,
        ...(high
          ? { transmission: 1, thickness: 0.3, attenuationColor: new THREE.Color('#fff1ea'), attenuationDistance: 0.9 }
          : { transparent: true, opacity: 0.4 }),
      }),
    );

    // 3. cor
    const color = new THREE.Mesh(
      shell(tColor, sum(tBase, tGel), 0.01),
      new THREE.MeshPhysicalMaterial({
        map: colorTexture(),
        roughness: 0.3,
        clearcoat: 0.6,
        clearcoatRoughness: 0.2,
        sheen: 0.3,
        sheenColor: new THREE.Color('#ffd9d2'),
        envMapIntensity: 1,
      }),
    );

    // 4. arte (francesinha diagonal + linha branca, do trabalho real)
    const art = new THREE.Mesh(
      shell(tArt, sum(tBase, tGel, tColor), 0.01),
      new THREE.MeshPhysicalMaterial({
        map: artTexture(high ? 1024 : 512),
        transparent: true,
        alphaTest: 0.4,
        roughness: 0.3,
        clearcoat: 0.6,
        envMapIntensity: 1,
      }),
    );

    // 5. top coat: vidro com brilho espelhado
    const top = new THREE.Mesh(
      shell(tTop, sum(tBase, tGel, tColor, tArt), 0.014),
      new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        roughness: 0.0,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        ior: 1.45,
        envMapIntensity: 0.9,
        ...(high ? { transmission: 1, thickness: 0.02 } : { transparent: true, opacity: 0.15 }),
      }),
    );

    this.inner.add(base);
    const d = (y: number, z: number) => new THREE.Vector3(0, y, z);
    this.layers = [
      { mesh: gel, window: LAYER_WINDOWS.gel, dir: d(1.7, 0.55), spin: 0.5 },
      { mesh: color, window: LAYER_WINDOWS.color, dir: d(1.8, 0.6), spin: -0.45 },
      { mesh: art, window: LAYER_WINDOWS.art, dir: d(1.9, 0.65), spin: 0.4 },
      { mesh: top, window: LAYER_WINDOWS.top, dir: d(2.0, 0.7), spin: -0.35 },
    ];
    this.layers.forEach((l) => this.inner.add(l.mesh));

    // face superior para a câmera, ponta para cima
    this.inner.rotation.set(-Math.PI / 2, 0, Math.PI);
    this.outer.add(this.inner);
    this.outer.scale.setScalar(1.25);
    this.scene.add(this.outer);

    this.resize();
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
    this.renderer.setAnimationLoop(() => this.renderFrame());
  }

  stop() {
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    const wide = w / h > 0.9;
    this.camera.aspect = w / h;
    this.camera.fov = wide ? 26 : 30;
    this.camera.position.set(0, 0, wide ? 6 : 6.4);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.renderFrame();
  }

  private renderFrame() {
    if (this.disposed) return;
    const t = this.clock.getElapsedTime();
    this.smoothP += (this.progress - this.smoothP) * (this.reduced ? 1 : 0.1);
    if (Math.abs(this.progress - this.smoothP) < 0.0003) this.smoothP = this.progress;
    const p = this.smoothP;

    // camadas: descem em diagonal, girando levemente, e se encaixam
    for (const l of this.layers) {
      const k = easeOutCubic(smooth(l.window[0], l.window[1], p));
      const off = 1 - k;
      l.mesh.visible = k > 0.001;
      l.mesh.position.copy(l.dir).multiplyScalar(off);
      l.mesh.rotation.set(off * 0.35, 0, off * l.spin);
    }

    // a unha gira ao longo da rolagem, como uma peça na vitrine
    const idle = this.reduced ? 0 : 1;
    const spin = lerp(-0.55, 0.4, p) + Math.sin(t * 0.6) * 0.06 * idle;
    this.outer.rotation.set(-0.28 + Math.sin(t * 0.45) * 0.03 * idle, spin, -0.38 + Math.sin(t * 0.5) * 0.02 * idle);
    this.outer.position.y = Math.sin(t * 0.8) * 0.04 * idle;

    // reflexo passando pelo top coat no final
    const sw = smooth(0.86, 1, p);
    this.sweep.intensity = Math.sin(sw * Math.PI) * 9;
    this.sweep.position.set(lerp(-2.2, 2.2, sw), 1.6, 2.4);

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (mat)
        (Array.isArray(mat) ? mat : [mat]).forEach((x) => {
          Object.values(x).forEach((v) => v instanceof THREE.Texture && v.dispose());
          x.dispose();
        });
    });
    this.scene.environment?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
