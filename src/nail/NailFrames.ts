/* ==================================================================
   Unha "3D" feita com os quadros reais do vídeo de referência
   (giro de câmera em volta da unha). Cada quadro tem as 3 camadas
   recortadas com transparência (scripts/process-nail-video.py).

   - arrastar na horizontal: gira (troca o ângulo / quadro)
   - arrastar e passar o mouse: move a unha para os lados, cima e baixo
   - rolar a página: o gel e o top coat descem e se juntam na unha
=================================================================== */
import { JOIN } from './timeline';

type Rect = { sx: number; sy: number; w: number; h: number; x: number; y: number };
type Frame = { src: string; layers: Rect[]; join: [number, number] };
type Meta = { width: number; height: number; frames: Frame[] };

const BASE = 'media/unha3d/';
const GEL_SHARE = 0.85; // fração do vetor de separação que leva o gel até a unha

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export class NailFrames {
  private canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d')!;
  private meta!: Meta;
  private images: (HTMLImageElement | null)[] = [];
  private raf = 0;
  private running = false;
  private disposed = false;
  private last = performance.now();
  private t = 0;

  private progress = 0;
  private smoothP = 0;
  // ângulo (índice de quadro contínuo)
  private frame = 0;
  private frameVel = 0;
  // deslocamento por arraste (volta com mola) e por hover
  private off = { x: 0, y: 0, vx: 0, vy: 0 };
  private hover = { x: 0, y: 0, tx: 0, ty: 0 };
  private drag: { id: number; x: number; y: number } | null = null;
  private cleanup: (() => void)[] = [];
  private dpr = 1;
  private size = { w: 1, h: 1 };
  private sparkles = Array.from({ length: 26 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.6 + Math.random() * 1.4,
    s: 0.2 + Math.random() * 0.6,
    p: Math.random() * Math.PI * 2,
  }));

  constructor(private container: HTMLElement, private reduced: boolean, private onReady?: () => void) {
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute(
      'aria-label',
      'Unha com as três camadas do banho de gel: unha natural, gel rosa e top coat. Arraste para girar.',
    );
    container.appendChild(this.canvas);
    this.bindPointer();
    this.resize();
  }

  /** Carrega os dados e as imagens. Mostra o primeiro quadro assim que ele chega. */
  async load() {
    const res = await fetch(BASE + 'meta.json');
    if (!res.ok) throw new Error('meta.json indisponível');
    this.meta = await res.json();
    const n = this.meta.frames.length;
    this.images = new Array(n).fill(null);
    this.frame = Math.round(n * 0.74); // começa num ângulo em que a unha aparece bem
    const order = [this.frame, ...Array.from({ length: n }, (_, i) => i).filter((i) => i !== this.frame)];
    const loadOne = (i: number) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
          this.images[i] = img;
          resolve();
        };
        img.onerror = () => resolve();
        img.src = BASE + this.meta.frames[i].src;
      });
    await loadOne(order[0]);
    if (this.disposed) return;
    this.onReady?.();
    this.draw();
    // o resto em paralelo, em lotes pequenos
    for (let k = 1; k < order.length; k += 6) {
      await Promise.all(order.slice(k, k + 6).map(loadOne));
      if (this.disposed) return;
    }
  }

  /* ---------------- interação ---------------- */
  private bindPointer() {
    const el = this.container;
    const down = (e: PointerEvent) => {
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      el.classList.add('is-dragging');
      if (e.pointerType === 'mouse') el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      this.hover.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      this.hover.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!this.drag || this.drag.id !== e.pointerId) return;
      const dx = e.clientX - this.drag.x;
      const dy = e.clientY - this.drag.y;
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
      // girar: 1 quadro a cada ~7px
      this.frameVel = -dx / 7;
      this.frame += this.frameVel;
      // mover: segue o dedo/mouse com resistência
      this.off.x += dx * 0.35;
      if (e.pointerType === 'mouse') this.off.y += dy * 0.35; // no toque o vertical rola a página
    };
    const up = () => {
      this.drag = null;
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
    this.progress = clamp(p);
    if (this.reduced) this.smoothP = this.progress;
    if (!this.running) this.draw();
  }

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.tick(Math.min(0.05, (now - this.last) / 1000));
      this.last = now;
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private lastW = 0;
  private lastH = 0;
  resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    // ignora a barra de endereço do celular aparecendo/sumindo
    if (this.lastW && Math.abs(w - this.lastW) < 2 && Math.abs(h - this.lastH) < 80) return;
    this.lastW = w;
    this.lastH = h;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.size = { w, h };
    this.draw();
  }

  /* ---------------- animação ---------------- */
  private tick(dt: number) {
    this.t += dt;
    this.smoothP += (this.progress - this.smoothP) * (this.reduced ? 1 : clamp(dt * 7));

    const n = this.meta?.frames.length ?? 1;
    if (!this.drag) {
      // inércia do giro
      this.frame += this.frameVel;
      this.frameVel *= Math.pow(0.04, dt);
      // a unha só gira quando a pessoa arrasta (sem giro automático)
      // mola: volta para o centro
      const k = 9;
      this.off.vx += (-this.off.x * k - this.off.vx * 5) * dt;
      this.off.vy += (-this.off.y * k - this.off.vy * 5) * dt;
      this.off.x += this.off.vx * dt;
      this.off.y += this.off.vy * dt;
    }
    // limites do giro (o vídeo não dá a volta completa): rebate nas pontas
    if (this.frame < 0) {
      this.frame = 0;
      this.frameVel = Math.abs(this.frameVel) * 0.3;
    } else if (this.frame > n - 1) {
      this.frame = n - 1;
      this.frameVel = -Math.abs(this.frameVel) * 0.3;
    }
    this.off.x = clamp(this.off.x, -120, 120);
    this.off.y = clamp(this.off.y, -90, 90);
    this.hover.x += (this.hover.tx - this.hover.x) * clamp(dt * 3);
    this.hover.y += (this.hover.ty - this.hover.y) * clamp(dt * 3);
  }

  private nearestLoaded(i: number) {
    if (this.images[i]) return i;
    for (let d = 1; d < this.images.length; d++) {
      if (this.images[i - d]) return i - d;
      if (this.images[i + d]) return i + d;
    }
    return -1;
  }

  private draw() {
    const { ctx, canvas, size } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!this.meta) return;
    const idx = this.nearestLoaded(Math.round(this.frame));
    if (idx < 0) return;
    const fr = this.meta.frames[idx];
    const img = this.images[idx]!;
    const p = this.smoothP;
    const live = this.reduced ? 0 : 1;

    // encaixa a peça na área disponível
    const M = this.meta;
    const scale = Math.min((size.w * 0.92) / M.width, (size.h * 0.86) / M.height);
    const floatY = Math.sin(this.t * 0.9) * 6 * live;
    const floatX = Math.sin(this.t * 0.5) * 4 * live;
    const ox = (size.w - M.width * scale) / 2 + this.off.x + this.hover.x * 12 + floatX;
    const oy = (size.h - M.height * scale) / 2 + this.off.y + this.hover.y * 8 + floatY;

    // partículas brilhantes ao fundo, como no vídeo
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (const s of this.sparkles) {
      const y = ((s.y - this.t * s.s * 0.02 * live) % 1 + 1) % 1;
      const a = 0.35 + 0.35 * Math.sin(this.t * 1.5 + s.p);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath();
      ctx.arc(s.x * size.w, y * size.h, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // junção: gel desce GEL_SHARE·v; top coat desce (1 + GEL_SHARE)·v
    const kg = easeOut(smooth(JOIN.gel[0], JOIN.gel[1], p));
    const kt = easeOut(smooth(JOIN.top[0], JOIN.top[1], p));
    const [jx, jy] = fr.join;
    const breathe = Math.sin(this.t * 1.4) * 4 * live;
    const shifts = [
      [jx * (GEL_SHARE * kg + kt), jy * (GEL_SHARE * kg + kt) - breathe * 1.6 * (1 - kt)],
      [jx * GEL_SHARE * kg, jy * GEL_SHARE * kg - breathe * (1 - kg)],
      [0, 0],
    ];

    ctx.setTransform(this.dpr * scale, 0, 0, this.dpr * scale, this.dpr * ox, this.dpr * oy);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // sombra suave e elíptica embaixo do dedo
    const L2 = fr.layers[2];
    ctx.save();
    ctx.translate(L2.x + L2.w / 2, L2.y + L2.h + 14);
    ctx.scale(1, 0.16);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, L2.w * 0.5);
    g.addColorStop(0, 'rgba(90,60,50,0.22)');
    g.addColorStop(1, 'rgba(90,60,50,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, L2.w * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // dedo, gel e top coat (de baixo para cima)
    for (const li of [2, 1, 0]) {
      const L = fr.layers[li];
      ctx.drawImage(img, L.sx, L.sy, L.w, L.h, L.x + shifts[li][0], L.y + shifts[li][1], L.w, L.h);
    }
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.cleanup.forEach((f) => f());
    this.canvas.remove();
  }
}
