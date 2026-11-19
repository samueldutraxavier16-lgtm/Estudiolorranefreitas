import * as THREE from 'three';

/* ==================================================================
   Unha isolada (sem dedo), modelada proceduralmente.
   Eixos locais: comprimento em +Z (ponta), face superior em +Y.
=================================================================== */

export const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

const LEN = 0.82; // meia-extensão
const HALF_W = 0.44;

/**
 * Superfície base da unha: curvatura C (transversal) e arco longitudinal,
 * contorno com cutícula arredondada e ponta squoval.
 * u ∈ [-1, 1] atravessa a unha, v ∈ [0, 1] vai da cutícula à ponta.
 */
export function nailSurface(u: number, v: number, grow: number, out: THREE.Vector3) {
  const z0 = -LEN + 0.15 * u * u; // cutícula em arco
  const z1 = LEN - 0.12 * Math.pow(Math.abs(u), 3); // ponta squoval
  const z = lerp(z0, z1, v);
  const hw = (HALF_W + grow) * (0.82 + 0.18 * smooth(0, 0.32, v)) * (1 - 0.08 * smooth(0.7, 1, v));
  const x = u * hw;
  const zn = z / LEN;
  // curvatura C mais forte perto da cutícula, arco longitudinal suave
  const c = 0.11 + 0.04 * (1 - v);
  const y = -c * Math.pow(Math.abs(x) / HALF_W, 2.2) - 0.07 * Math.pow(zn + 0.15, 2);
  out.set(x, y, z);
  return out;
}

export type ShellParams = {
  /** deslocamento da face inferior acima da base (soma das camadas de baixo) */
  lift: (u: number, v: number) => number;
  /** quanto o contorno cresce (camadas superiores cobrem as bordas) */
  grow: number;
  thickness: (u: number, v: number) => number;
};

/** Camada fechada (topo, fundo e laterais) com UV cobrindo a unha inteira. */
export class Shell {
  geometry = new THREE.BufferGeometry();
  private pos: Float32Array;
  private uvs: Float32Array;
  private tmp = new THREE.Vector3();

  constructor(private nu = 48, private nv = 72) {
    const grid = (nu + 1) * (nv + 1);
    this.pos = new Float32Array(grid * 2 * 3);
    this.uvs = new Float32Array(grid * 2 * 2);
    const idx: number[] = [];
    const top = (i: number, j: number) => j * (nu + 1) + i;
    const bot = (i: number, j: number) => grid + j * (nu + 1) + i;
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        idx.push(top(i, j), top(i, j + 1), top(i + 1, j), top(i + 1, j), top(i, j + 1), top(i + 1, j + 1));
        idx.push(bot(i, j), bot(i + 1, j), bot(i, j + 1), bot(i + 1, j), bot(i + 1, j + 1), bot(i, j + 1));
      }
    }
    for (let i = 0; i < nu; i++) {
      idx.push(top(i, 0), top(i + 1, 0), bot(i, 0), top(i + 1, 0), bot(i + 1, 0), bot(i, 0));
      idx.push(top(i, nv), bot(i, nv), top(i + 1, nv), top(i + 1, nv), bot(i, nv), bot(i + 1, nv));
    }
    for (let j = 0; j < nv; j++) {
      idx.push(top(0, j), bot(0, j), top(0, j + 1), top(0, j + 1), bot(0, j), bot(0, j + 1));
      idx.push(top(nu, j), top(nu, j + 1), bot(nu, j), top(nu, j + 1), bot(nu, j + 1), bot(nu, j));
    }
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2));
    this.geometry.setIndex(idx);
  }

  build(p: ShellParams) {
    const { nu, nv, pos, uvs, tmp } = this;
    const grid = (nu + 1) * (nv + 1);
    for (let j = 0; j <= nv; j++) {
      const v = j / nv;
      for (let i = 0; i <= nu; i++) {
        const u = (i / nu) * 2 - 1;
        nailSurface(u, v, p.grow, tmp);
        const t = Math.max(0.002, p.thickness(u, v));
        const l = p.lift(u, v);
        const k = j * (nu + 1) + i;
        const kb = grid + k;
        pos[k * 3] = tmp.x;
        pos[k * 3 + 1] = tmp.y + l + t;
        pos[k * 3 + 2] = tmp.z;
        pos[kb * 3] = tmp.x;
        pos[kb * 3 + 1] = tmp.y + l;
        pos[kb * 3 + 2] = tmp.z;
        uvs[k * 2] = uvs[kb * 2] = u * 0.5 + 0.5;
        uvs[k * 2 + 1] = uvs[kb * 2 + 1] = v;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingSphere();
    return this.geometry;
  }
}

/** Afinamento das bordas: as camadas ficam mais finas nas laterais e na cutícula. */
export const edgeFalloff = (u: number, v: number, side = 0.8, prox = 0.08) =>
  (0.3 + 0.7 * smooth(1, side, Math.abs(u))) * (0.35 + 0.65 * smooth(0, prox, v)) * (0.6 + 0.4 * smooth(1, 0.94, v));
