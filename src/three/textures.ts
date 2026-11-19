import * as THREE from 'three';

/* Texturas geradas em canvas: zero arquivos extras para baixar.
   Convenção: u (x do canvas) atravessa a unha; v=0 é a cutícula (base do canvas). */

const canvas = (w: number, h = w) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
};

// mapeia v (0 cutícula → 1 ponta) para y do canvas (flipY padrão)
const vy = (v: number, h: number) => (1 - v) * h;

/** Lâmina natural: lúnula, leito rosado, linha do sorriso e borda livre. */
export function plateTexture(size = 512) {
  const [c, g] = canvas(size);
  const H = size;
  g.fillStyle = '#d9968a';
  g.fillRect(0, 0, size, size);

  // variação longitudinal sutil
  const lg = g.createLinearGradient(0, vy(0, H), 0, vy(1, H));
  lg.addColorStop(0, 'rgba(236,196,186,0.9)');
  lg.addColorStop(0.35, 'rgba(229,170,158,0)');
  lg.addColorStop(0.75, 'rgba(214,150,140,0.35)');
  g.fillStyle = lg;
  g.fillRect(0, 0, size, size);

  // lúnula
  g.fillStyle = 'rgba(246,222,212,0.85)';
  g.beginPath();
  g.ellipse(size / 2, vy(0, H), size * 0.33, H * 0.2, 0, Math.PI, 0);
  g.fill();

  // borda livre (acima da linha do sorriso)
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(size, 0);
  for (let i = 0; i <= 40; i++) {
    const u = 1 - i / 40;
    const uu = u * 2 - 1;
    const v = 0.86 - 0.06 * uu * uu;
    g.lineTo(u * size, vy(v, H));
  }
  g.closePath();
  const fe = g.createLinearGradient(0, vy(0.72, H), 0, 0);
  fe.addColorStop(0, '#eadbd0');
  fe.addColorStop(1, '#f7efe8');
  g.fillStyle = fe;
  g.fill();

  // sombra fina na linha do sorriso
  g.strokeStyle = 'rgba(190,120,110,0.35)';
  g.lineWidth = 3;
  g.beginPath();
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    const uu = u * 2 - 1;
    const v = 0.86 - 0.06 * uu * uu;
    if (i === 0) g.moveTo(u * size, vy(v, H));
    else g.lineTo(u * size, vy(v, H));
  }
  g.stroke();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Estrias longitudinais da unha natural (usado como bump). */
export function ridgeTexture(size = 256) {
  const [c, g] = canvas(size);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, size, size);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 70; i++) {
    const x = rnd() * size;
    const w = 1 + rnd() * 3;
    const a = 0.05 + rnd() * 0.12;
    g.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
    g.fillRect(x, 0, w, size);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Granulado fino de pele. */
export function skinBumpTexture(size = 256) {
  const [c, g] = canvas(size);
  const img = g.createImageData(size, size);
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = 118 + rnd() * 20;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = n;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 14);
  return t;
}

/**
 * Esmaltação final inspirada no trabalho real da Lorrane (vídeo enviado):
 * base rosé, francesinha diagonal lilás e uma linha branca fina.
 */
export function finishTexture(size = 1024) {
  const [c, g] = canvas(size);
  const H = size;
  const base = g.createLinearGradient(0, vy(0, H), size, vy(1, H));
  base.addColorStop(0, '#b06c66');
  base.addColorStop(1, '#a8625c');
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);

  // lilás diagonal na ponta: limite v = 0.66 + 0.2·u'
  const edge = (uu: number) => 0.8 + 0.14 * uu;
  g.fillStyle = '#93a5e2';
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(size, 0);
  for (let i = 0; i <= 50; i++) {
    const u = 1 - i / 50;
    g.lineTo(u * size, vy(edge(u * 2 - 1), H));
  }
  g.closePath();
  g.fill();

  // linha branca fina e levemente curva, paralela ao recorte
  g.strokeStyle = '#f7f1ee';
  g.lineWidth = size * 0.007;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i <= 60; i++) {
    const u = 0.04 + (i / 60) * 0.92;
    const uu = u * 2 - 1;
    const v = edge(uu) - 0.075 + 0.025 * Math.sin((u - 0.1) * Math.PI);
    if (i === 0) g.moveTo(u * size, vy(v, H));
    else g.lineTo(u * size, vy(v, H));
  }
  g.stroke();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Fundo: luz quente difusa no centro, cacau nas bordas. */
export function backdropTexture() {
  const [c, g] = canvas(512);
  const r = g.createRadialGradient(256, 210, 10, 256, 256, 380);
  r.addColorStop(0, '#4a3730');
  r.addColorStop(0.45, '#2e231f');
  r.addColorStop(1, '#1e1714');
  g.fillStyle = r;
  g.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
