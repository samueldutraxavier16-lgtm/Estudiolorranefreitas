/** Linha do tempo da unha 3D (progresso da rolagem 0 → 1). Sem dependência do Three.js. */
export const LAYER_WINDOWS = {
  gel: [0.12, 0.34],
  color: [0.36, 0.56],
  art: [0.58, 0.72],
  top: [0.72, 0.86],
} as const;

/** Início de cada etapa exibida no texto. */
export const STAGE_STARTS = [0, 0.12, 0.36, 0.58];
