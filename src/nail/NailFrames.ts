/* ==================================================================
   Unha das camadas se juntando, feita com os quadros reais do vídeo
   de referência (media-src/unha-camadas.mp4 -> scripts/extract-nail-merge.sh).

   - rolar a página: avança o vídeo quadro a quadro (as camadas descem,
     se encaixam e a unha gira até ficar de frente)
   - passar o mouse / arrastar: move a unha para os lados, cima e baixo
=================================================================== */

const BASE = 'media/unha-camadas/';
const COUNT = 67;
const FRAME_W = 640;
const FRAME_H = 704;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export class NailFrames {
  private canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d')!;
  private images: (HTMLImageElement | null)[] = new Array(COUNT).fill(null);
  private raf = 0;
  private running = false;
  private disposed = false;
  private last = performance.now();
  private t = 0;
  private progress = 0;
  private smoothP = 0;
  private off = { x: 0, y: 0, vx: 0, vy: 0 };
  private hover = { x: 0, y: 0, tx: 0, ty: 0 };
  private drag: { id: number; x: number; y: number } | null = null;
  private cleanup: (() => void)[] = [];
  private dpr = 1;
  private size = { w: 1, h: 1 };

  constructor(private container: HTMLElement, private reduced: boolean, private onReady?: () => void) {
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute(
      'aria-label',
      'Unha com as três camadas do banho de gel (unha natural, gel rosa e top coat) se juntando conforme a página rola.',
    );
    container.appendChild(this.canvas);
    this.bindPointer();
    this.resize();
  }

  /** Carrega o primeiro quadro logo; o resto em lotes. */
  async load() {
    const loadOne = (i: number) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
          this.images[i] = img;
          resolve();
        };
        img.onerror = () => resolve();
        img.src = `${BASE}f${String(i + 1).padStart(3, '0')}.webp`;
      });
    await loadOne(0);
    if (this.disposed) return;
    if (!this.images[0]) throw new Error('quadros da unha indisponíveis');
    this.onReady?.();
    this.draw();
    const rest = Array.from({ length: COUNT - 1 }, (_, i) => i + 1);
    for (let k = 0; k < rest.length; k += 8) {
      await Promise.all(rest.slice(k, k + 8).map(loadOne));
      if (this.disposed) return;
      if (!this.running) this.draw();
    }
  }

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
      this.off.x += (e.clientX - this.drag.x) * 0.4;
      if (e.pointerType === 'mouse') this.off.y += (e.clientY - this.drag.y) * 0.4;
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
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

  private tick(dt: number) {
    this.t += dt;
    this.smoothP += (this.progress - this.smoothP) * (this.reduced ? 1 : clamp(dt * 10));
    if (!this.drag) {
      const k = 9;
      this.off.vx += (-this.off.x * k - this.off.vx * 5) * dt;
      this.off.vy += (-this.off.y * k - this.off.vy * 5) * dt;
      this.off.x += this.off.vx * dt;
      this.off.y += this.off.vy * dt;
    }
    this.off.x = clamp(this.off.x, -110, 110);
    this.off.y = clamp(this.off.y, -26, 26);
    this.hover.x += (this.hover.tx - this.hover.x) * clamp(dt * 3);
    this.hover.y += (this.hover.ty - this.hover.y) * clamp(dt * 3);
  }

  private nearest(i: number) {
    if (this.images[i]) return this.images[i];
    for (let d = 1; d < COUNT; d++) {
      if (this.images[i - d]) return this.images[i - d];
      if (this.images[i + d]) return this.images[i + d];
    }
    return null;
  }

  private draw() {
    const { ctx, canvas, size } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // posição contínua no vídeo; entre dois quadros, mistura os dois (sem "degraus")
    // a junção das camadas é o começo do vídeo (~40%): ela ganha a maior parte da rolagem
    const p = clamp(this.smoothP);
    const v = p < 0.75 ? 0.4 * (p / 0.75) : 0.4 + 0.6 * clamp((p - 0.75) / 0.2);
    const f = v * (COUNT - 1);
    const i0 = Math.floor(f);
    const i1 = Math.min(COUNT - 1, i0 + 1);
    const mix = f - i0;
    const img = this.nearest(i0);
    if (!img) return;
    const next = this.images[i1];
    const live = this.reduced ? 0 : 1;
    // altura toda do quadro = altura da moldura (o fundo do vídeo continua no fundo da moldura)
    // um pouco maior que a moldura: ao mover, as bordas do quadro nunca aparecem
    // cobre a altura, mas sem cortar as laterais das camadas
    const scale = Math.min((size.h * 1.12) / FRAME_H, (size.w * 1.04) / FRAME_W);
    const h = FRAME_H * scale;
    const w = FRAME_W * scale;
    const x = (size.w - w) / 2 + this.off.x + this.hover.x * 10 + Math.sin(this.t * 0.5) * 3 * live;
    const y = (size.h - h) / 2 + this.off.y + this.hover.y * 6 + Math.sin(this.t * 0.9) * 5 * live;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = 1;
    ctx.drawImage(img, x, y, w, h);
    if (next && next !== img && mix > 0.01) {
      ctx.globalAlpha = mix;
      ctx.drawImage(next, x, y, w, h);
      ctx.globalAlpha = 1;
    }
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.cleanup.forEach((f) => f());
    this.canvas.remove();
  }
}
