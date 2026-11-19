import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Shell, easeOutCubic, edgeFalloff, lerp, smooth } from './nail';
import { baseTexture, finishTexture } from './textures';
import { LAYER_WINDOWS } from './timeline';

export type Quality = 'high' | 'low';

/* ------------------------------------------------------------------
   Três camadas empilhadas, flutuando. Ao rolar, elas se aproximam
   e se fundem em uma unha só. A pessoa pode arrastar para girar.
------------------------------------------------------------------- */
type Fn = (u: number, v: number) => number;

const tBase: Fn = (u, v) => 0.045 * edgeFalloff(u, v, 0.82, 0.06);
const tColor: Fn = (u, v) => 0.016 * edgeFalloff(u, v, 0.86, 0.06);
const tGel: Fn = (u, v) => {
  // gel com ápice: mais grosso no terço proximal, como no banho de gel real
  const apex = Math.exp(-Math.pow((v - 0.38) / 0.3, 2));
  return (0.024 + 0.045 * apex * smooth(1, 0.55, Math.abs(u))) * edgeFalloff(u, v, 0.8, 0.1);
};
const sum = (...fs: Fn[]): Fn => (u, v) => fs.reduce((a, f) => a + f(u, v), 0);

// distância entre as camadas quando separadas (unidades locais)
const GAP_COLOR = 0.5;
const GAP_GEL = 1.0;

export class NailScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  private pivot = new THREE.Group(); // posição flutuante + arraste
  private outer = new THREE.Group(); // inclinação de apresentação
  private inner = new THREE.Group(); // orientação da unha
  private clock = new THREE.Clock();
  private color: THREE.Mesh;
  private gel: THREE.Mesh;

  private progress = 0;
  private smoothP = 0;
  private running = false;
  private disposed = false;

  // interação
  private drag = { active: false, x: 0, y: 0 };
  private rot = { x: 0, y: 0, vx: 0, vy: 0 };
  private hover = { x: 0, y: 0, tx: 0, ty: 0 };
  private cleanup: (() => void)[] = [];

  constructor(private container: HTMLElement, quality: Quality, private reduced: boolean) {
    const high = quality === 'high';
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, high ? 2 : 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(this.renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
    pmrem.dispose();

    const key = new THREE.DirectionalLight('#fff3ea', 2.0);
    key.position.set(-3, 4, 5);
    const rim = new THREE.DirectionalLight('#f2b8a2', 1.4);
    rim.position.set(4, 2, -3);
    const fill = new THREE.HemisphereLight('#fff6f0', '#c9a596', 0.65);
    this.scene.add(key, rim, fill);

    const nu = high ? 56 : 40;
    const nv = high ? 84 : 60;
    const shell = (thick: Fn, lift: Fn, grow: number) => new Shell(nu, nv).build({ thickness: thick, lift, grow });

    // 1. unha natural
    const base = new THREE.Mesh(
      shell(tBase, () => 0, 0),
      new THREE.MeshPhysicalMaterial({
        map: baseTexture(),
        roughness: 0.42,
        clearcoat: 0.3,
        clearcoatRoughness: 0.45,
        sheen: 0.4,
        sheenColor: new THREE.Color('#fff2ec'),
        envMapIntensity: 0.7,
      }),
    );

    // 2. cor com a arte do trabalho real (rosé + francesinha lilás)
    this.color = new THREE.Mesh(
      shell(tColor, tBase, 0.008),
      new THREE.MeshPhysicalMaterial({
        map: finishTexture(high ? 1024 : 512),
        roughness: 0.32,
        clearcoat: 0.5,
        clearcoatRoughness: 0.25,
        sheen: 0.3,
        sheenColor: new THREE.Color('#ffd9d2'),
        envMapIntensity: 0.9,
      }),
    );

    // 3. gel de acabamento: transparente, com ápice e brilho de vidro
    this.gel = new THREE.Mesh(
      shell(tGel, sum(tBase, tColor), 0.014),
      new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        roughness: 0.03,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        ior: 1.48,
        envMapIntensity: 1,
        ...(high
          ? { transmission: 1, thickness: 0.18, attenuationColor: new THREE.Color('#fff4ef'), attenuationDistance: 1.5 }
          : { transparent: true, opacity: 0.3 }),
      }),
    );

    this.inner.add(base, this.color, this.gel);
    this.inner.rotation.set(-Math.PI / 2, 0, Math.PI); // face para a câmera, ponta para cima
    this.outer.add(this.inner);
    this.outer.scale.setScalar(1.05);
    this.pivot.add(this.outer);
    this.scene.add(this.pivot);

    this.bindPointer();
    this.resize();
  }

  /* ---------------- arrastar para girar ---------------- */
  private bindPointer() {
    const el = this.container;
    const down = (e: PointerEvent) => {
      this.drag = { active: true, x: e.clientX, y: e.clientY };
      el.classList.add('is-dragging');
      if (e.pointerType === 'mouse') el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      this.hover.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      this.hover.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!this.drag.active) return;
      const dx = e.clientX - this.drag.x;
      const dy = e.clientY - this.drag.y;
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
      this.rot.vy = dx * 0.012;
      this.rot.vx = e.pointerType === 'mouse' ? dy * 0.01 : 0; // no toque, o vertical continua rolando a página
      this.rot.y += this.rot.vy;
      this.rot.x = Math.max(-0.9, Math.min(0.9, this.rot.x + this.rot.vx));
    };
    const up = () => {
      this.drag.active = false;
      el.classList.remove('is-dragging');
    };
    const leave = () => {
      this.hover.tx = 0;
      this.hover.ty = 0;
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', leave);
    this.cleanup.push(() => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('pointerleave', leave);
    });
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

  private lastW = 0;
  private lastH = 0;
  resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    // ignora variações mínimas (barra de endereço do celular) para não "pular"
    if (Math.abs(w - this.lastW) < 2 && Math.abs(h - this.lastH) < 80 && this.lastW) return;
    this.lastW = w;
    this.lastH = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    const narrow = w / h < 0.9;
    this.camera.fov = narrow ? 27 : 28;
    this.outer.scale.setScalar(narrow ? 1.12 : 1.05);
    this.camera.position.set(0, 0, 6.2);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.renderFrame();
  }

  private renderFrame() {
    if (this.disposed) return;
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;
    const live = this.reduced ? 0 : 1;

    this.smoothP += (this.progress - this.smoothP) * (this.reduced ? 1 : Math.min(1, dt * 7));
    const p = this.smoothP;

    // camadas se juntam com a rolagem
    const kc = easeOutCubic(smooth(LAYER_WINDOWS.color[0], LAYER_WINDOWS.color[1], p));
    const kg = easeOutCubic(smooth(LAYER_WINDOWS.gel[0], LAYER_WINDOWS.gel[1], p));
    // pequena respiração enquanto separadas
    const breathe = Math.sin(t * 1.4) * 0.03 * live;
    this.color.position.set(0, (GAP_COLOR + breathe) * (1 - kc), 0);
    this.gel.position.set(0, (GAP_GEL + breathe * 1.6) * (1 - kg), 0);

    // inércia do arraste e retorno suave
    if (!this.drag.active) {
      this.rot.vy *= 0.92;
      this.rot.y += this.rot.vy;
      this.rot.y *= 1 - Math.min(1, dt * 0.8);
      this.rot.x *= 1 - Math.min(1, dt * 1.6);
    }
    this.hover.x += (this.hover.tx - this.hover.x) * Math.min(1, dt * 3);
    this.hover.y += (this.hover.ty - this.hover.y) * Math.min(1, dt * 3);

    // flutuando no ar, sozinha
    this.pivot.position.set(
      Math.sin(t * 0.5) * 0.06 * live + this.hover.x * 0.12,
      Math.sin(t * 0.9) * 0.08 * live - this.hover.y * 0.1 - lerp(0.25, 0, p),
      0,
    );
    this.pivot.rotation.set(this.rot.x + this.hover.y * 0.08, this.rot.y + this.hover.x * 0.15, 0);

    // inclinação: separada mostra a pilha de lado; montada mostra a face
    const spin = lerp(-0.5, 0.35, p) + Math.sin(t * 0.6) * 0.07 * live;
    this.outer.rotation.set(lerp(-0.95, -0.35, p) + Math.sin(t * 0.45) * 0.03 * live, spin, -0.35);

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.cleanup.forEach((f) => f());
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
