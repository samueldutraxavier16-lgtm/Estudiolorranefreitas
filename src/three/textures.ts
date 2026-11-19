import * as THREE from 'three';

/* Texturas geradas em canvas: nenhum arquivo extra para baixar.
   u = x do canvas (atravessa a unha); v = 0 na cutícula (base do canvas). */

const make = (w: number, h = w) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
};
const vy = (v: number, h: number) => (1 - v) * h;
const tex = (c: HTMLCanvasElement, srgb = true) => {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

/** Unha natural: nude rosado, lúnula clara e borda livre mais branca. */
export function baseTexture(size = 512) {
  const [c, g] = make(size);
  const H = size;
  const body = g.createLinearGradient(0, vy(0, H), 0, vy(1, H));
  body.addColorStop(0, '#f1d3c8');
  body.addColorStop(0.3, '#e9bfb2');
  body.addColorStop(0.72, '#e4b4a7');
  body.addColorStop(1, '#e4b4a7');
  g.fillStyle = body;
  g.fillRect(0, 0, size, size);

  g.fillStyle = 'rgba(250,234,226,0.75)';
  g.beginPath();
  g.ellipse(size / 2, vy(0, H), size * 0.34, H * 0.18, 0, Math.PI, 0);
  g.fill();

  // borda livre
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(size, 0);
  for (let i = 0; i <= 48; i++) {
    const u = 1 - i / 48;
    const uu = u * 2 - 1;
    g.lineTo(u * size, vy(0.8 - 0.07 * uu * uu, H));
  }
  g.closePath();
  const fe = g.createLinearGradient(0, vy(0.74, H), 0, 0);
  fe.addColorStop(0, '#f4e8df');
  fe.addColorStop(1, '#faf4ef');
  g.fillStyle = fe;
  g.fill();

  // estrias longitudinais muito sutis
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '160,100,90'},${0.03 + rnd() * 0.05})`;
    g.fillRect(rnd() * size, 0, 1 + rnd() * 2.5, size);
  }
  return tex(c);
}

/** Cor principal: rosé do trabalho real da Lorrane, com leve profundidade. */
export function colorTexture(size = 512) {
  const [c, g] = make(size);
  const lg = g.createLinearGradient(0, vy(0, size), 0, vy(1, size));
  lg.addColorStop(0, '#b77570');
  lg.addColorStop(0.5, '#b06a65');
  lg.addColorStop(1, '#a9625d');
  g.fillStyle = lg;
  g.fillRect(0, 0, size, size);
  return tex(c);
}

/** Arte: francesinha diagonal lilás e linha branca fina (fundo transparente). */
export function artTexture(size = 1024) {
  const [c, g] = make(size);
  const H = size;
  const edge = (uu: number) => 0.78 + 0.15 * uu;
  g.clearRect(0, 0, size, size);
  g.fillStyle = '#97a8e4';
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(size, 0);
  for (let i = 0; i <= 60; i++) {
    const u = 1 - i / 60;
    g.lineTo(u * size, vy(edge(u * 2 - 1), H));
  }
  g.closePath();
  g.fill();

  g.strokeStyle = '#fbf6f3';
  g.lineWidth = size * 0.008;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i <= 80; i++) {
    const u = 0.03 + (i / 80) * 0.94;
    const uu = u * 2 - 1;
    const v = edge(uu) - 0.07 + 0.03 * Math.sin((u - 0.05) * Math.PI);
    if (i === 0) g.moveTo(u * size, vy(v, H));
    else g.lineTo(u * size, vy(v, H));
  }
  g.stroke();
  return tex(c);
}

/** Cor rosé com a arte (francesinha lilás + linha branca) já aplicada. */
export function finishTexture(size = 1024) {
  const [c, g] = make(size);
  const lg = g.createLinearGradient(0, vy(0, size), 0, vy(1, size));
  lg.addColorStop(0, '#b77570');
  lg.addColorStop(0.5, '#b06a65');
  lg.addColorStop(1, '#a9625d');
  g.fillStyle = lg;
  g.fillRect(0, 0, size, size);
  const art = artTexture(size);
  g.drawImage(art.image as HTMLCanvasElement, 0, 0);
  art.dispose();
  return tex(c);
}
