import * as THREE from 'three';

/* ==================================================================
   Modelagem procedural do dedo e das camadas da unha.
   Eixos: o dedo aponta para +Z, a unha fica em +Y.
=================================================================== */

const SUPER = 2.6; // expoente da superelipse da seção do dedo
export const TIP_START = 0.45; // onde começa o arredondamento da ponta
export const TIP_END = 1.02;
const BASE_Z = -10;

export const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Raios e centro da seção transversal do dedo em z. */
export function fingerSection(z: number) {
  // Leve afunilamento em direção à ponta
  const taper = lerp(1.07, 1, smooth(BASE_Z, -0.6, z));
  let a = 0.55 * taper;
  let b = 0.45 * taper;
  let yc = 0;
  if (z > TIP_START) {
    const k = Math.min(1, (z - TIP_START) / (TIP_END - TIP_START));
    const s = Math.sqrt(Math.max(0, 1 - k * k));
    a *= Math.pow(s, 0.75);
    b *= s;
    yc = -0.13 * k * k;
  }
  // Articulação da falange: um leve volume perto da base
  const knuckle = Math.exp(-Math.pow((z + 2.6) / 0.5, 2)) * 0.035;
  a += knuckle;
  b += knuckle;
  return { a, b, yc };
}

/** Altura da superfície superior do dedo no ponto (x, z). */
export function fingerTop(x: number, z: number) {
  const { a, b, yc } = fingerSection(z);
  const r = Math.min(0.999, Math.abs(x) / a);
  return yc + b * Math.pow(1 - Math.pow(r, SUPER), 1 / SUPER);
}

export function createFingerGeometry(rings = 90, seg = 72) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    // mais anéis perto da ponta
    const z = lerp(BASE_Z, TIP_END, 1 - Math.pow(1 - t, 1.6));
    const { a, b, yc } = fingerSection(z);
    for (let j = 0; j <= seg; j++) {
      const th = (j / seg) * Math.PI * 2;
      const c = Math.cos(th);
      const s = Math.sin(th);
      const x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / SUPER);
      // a polpa do dedo (parte de baixo) é um pouco mais cheia
      const bb = s < 0 ? b * 1.08 : b;
      const y = yc + bb * Math.sign(s) * Math.pow(Math.abs(s), 2 / SUPER);
      pos.push(x, y, z);
      uv.push(j / seg, t);
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < seg; j++) {
      const p = i * (seg + 1) + j;
      const q = p + seg + 1;
      idx.push(p, q, p + 1, p + 1, q, q + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------------------------
   Contorno da unha
------------------------------------------------------------------- */
export type NailShape = {
  /** posição z da cutícula (borda proximal visível da unha) */
  cuticle: number;
  /** posição z da borda livre no centro */
  tip: number;
  /** quanto a borda livre curva nas laterais (oval = alto, quadrada = baixo) */
  tipCurve: number;
  /** expoente da curva da borda livre (2 = oval, 4+ = squoval) */
  tipPow: number;
};

export const NAIL_HALF_WIDTH = 0.405;
export const HYPONYCHIUM = 0.62; // fim do leito ungueal

/** Ponto da base (sobre o dedo) para coordenadas normalizadas u∈[-1,1], v∈[0,1]. */
export function nailBase(u: number, v: number, s: NailShape, out: THREE.Vector3) {
  const z0 = s.cuticle + 0.1 * u * u;
  const z1 = s.tip - s.tipCurve * Math.pow(Math.abs(u), s.tipPow);
  const z = lerp(z0, z1, v);
  const hw = NAIL_HALF_WIDTH * (0.84 + 0.16 * smooth(0, 0.35, v)) * (1 - 0.05 * smooth(0.75, 1, v));
  const x = u * hw;
  let y: number;
  if (z <= HYPONYCHIUM) {
    y = fingerTop(x, z);
  } else {
    // a borda livre segue a tangente com uma queda suave, descolando do dedo
    const y0 = fingerTop(x, HYPONYCHIUM);
    const slope = (fingerTop(x, HYPONYCHIUM) - fingerTop(x, HYPONYCHIUM - 0.04)) / 0.04;
    const d = z - HYPONYCHIUM;
    y = y0 + slope * d * 0.55 - 0.05 * d * d;
  }
  out.set(x, y + 0.006, z);
  return out;
}

/* ------------------------------------------------------------------
   Casca (shell): uma camada fechada com topo, fundo e laterais.
   Usada para lâmina natural, gel e cor. Atualizada a cada mudança.
------------------------------------------------------------------- */
export type ShellParams = {
  shape: NailShape;
  /** cobertura da cutícula até a ponta (0..1) */
  coverage: number;
  /** começa um pouco depois da cutícula (o gel não encosta na pele) */
  vStart: number;
  /** deslocamento da face inferior acima da base */
  lift: number;
  /** espessura em (u, v) */
  thickness: (u: number, v: number) => number;
  /** ondulação/ruído da superfície superior */
  wave?: (u: number, v: number) => number;
};

export class Shell {
  geometry = new THREE.BufferGeometry();
  private nu: number;
  private nv: number;
  private pos: Float32Array;
  private uvs: Float32Array;
  private tmp = new THREE.Vector3();

  constructor(nu = 40, nv = 64) {
    this.nu = nu;
    this.nv = nv;
    const grid = (nu + 1) * (nv + 1);
    this.pos = new Float32Array(grid * 2 * 3);
    this.uvs = new Float32Array(grid * 2 * 2);
    const idx: number[] = [];
    const top = (i: number, j: number) => j * (nu + 1) + i;
    const bot = (i: number, j: number) => grid + j * (nu + 1) + i;
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        const a = top(i, j), b = top(i + 1, j), c = top(i, j + 1), d = top(i + 1, j + 1);
        idx.push(a, b, c, b, d, c);
        const e = bot(i, j), f = bot(i + 1, j), g = bot(i, j + 1), h = bot(i + 1, j + 1);
        idx.push(e, g, f, f, g, h);
      }
    }
    // paredes: borda proximal (j=0), distal (j=nv), laterais (i=0, i=nu)
    for (let i = 0; i < nu; i++) {
      idx.push(top(i, 0), bot(i, 0), top(i + 1, 0), top(i + 1, 0), bot(i, 0), bot(i + 1, 0));
      idx.push(top(i, nv), top(i + 1, nv), bot(i, nv), top(i + 1, nv), bot(i + 1, nv), bot(i, nv));
    }
    for (let j = 0; j < nv; j++) {
      idx.push(top(0, j), top(0, j + 1), bot(0, j), top(0, j + 1), bot(0, j + 1), bot(0, j));
      idx.push(top(nu, j), bot(nu, j), top(nu, j + 1), top(nu, j + 1), bot(nu, j), bot(nu, j + 1));
    }
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setIndex(idx);
  }

  update(p: ShellParams) {
    const { nu, nv, pos, uvs, tmp } = this;
    const grid = (nu + 1) * (nv + 1);
    const vEnd = Math.max(p.vStart + 0.002, p.coverage);
    for (let j = 0; j <= nv; j++) {
      const v = lerp(p.vStart, vEnd, j / nv);
      // frente de avanço arredondada enquanto a camada é aplicada
      const front = p.coverage < 0.999 ? lerp(0.35, 1, smooth(vEnd, vEnd - 0.08, v)) : 1;
      for (let i = 0; i <= nu; i++) {
        const u = (i / nu) * 2 - 1;
        nailBase(u, v, p.shape, tmp);
        const t = p.thickness(u, v) * front + (p.wave ? p.wave(u, v) : 0);
        const k = j * (nu + 1) + i;
        // topo
        pos[k * 3] = tmp.x;
        pos[k * 3 + 1] = tmp.y + p.lift + Math.max(0.0015, t);
        pos[k * 3 + 2] = tmp.z;
        // fundo
        const kb = grid + k;
        pos[kb * 3] = tmp.x;
        pos[kb * 3 + 1] = tmp.y + p.lift;
        pos[kb * 3 + 2] = tmp.z;
        uvs[k * 2] = uvs[kb * 2] = u * 0.5 + 0.5;
        uvs[k * 2 + 1] = uvs[kb * 2 + 1] = v;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.uv.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingSphere();
  }
}

/** Dobra de pele (eponíquio + dobras laterais) em volta da unha. */
export function createFoldGeometry(shape: NailShape, pushBack: number, radius: number) {
  const pts: THREE.Vector3[] = [];
  const v = new THREE.Vector3();
  const sideEnd = 0.55; // até onde as dobras laterais acompanham
  const N = 28;
  // lateral esquerda (de frente para trás)
  for (let k = 0; k <= N; k++) {
    const t = 1 - k / N;
    nailBase(-1, t * sideEnd, shape, v);
    pts.push(new THREE.Vector3(v.x - 0.012, v.y - 0.01, v.z));
  }
  // arco proximal
  for (let k = 1; k < N; k++) {
    const u = -1 + (2 * k) / N;
    nailBase(u, 0, shape, v);
    pts.push(new THREE.Vector3(v.x * 1.02, v.y + 0.004, v.z - 0.02 - pushBack));
  }
  // lateral direita
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    nailBase(1, t * sideEnd, shape, v);
    pts.push(new THREE.Vector3(v.x + 0.012, v.y - 0.01, v.z));
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const tube = new THREE.TubeGeometry(curve, 160, radius, 12, false);
  // afina as pontas laterais para fundir com o dedo
  const p = tube.attributes.position as THREE.BufferAttribute;
  const segs = 160;
  const radial = 12;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const center = curve.getPointAt(t);
    const taper = Math.min(1, Math.sin(Math.PI * t) * 2.2);
    // o eponíquio (centro) é mais grosso que as laterais
    const prox = 0.75 + 0.5 * Math.exp(-Math.pow((t - 0.5) / 0.16, 2));
    const k = taper * prox;
    for (let r = 0; r <= radial; r++) {
      const idx = i * (radial + 1) + r;
      p.setXYZ(
        idx,
        center.x + (p.getX(idx) - center.x) * k,
        center.y + (p.getY(idx) - center.y) * k,
        center.z + (p.getZ(idx) - center.z) * k,
      );
    }
  }
  tube.computeVertexNormals();
  return tube;
}
