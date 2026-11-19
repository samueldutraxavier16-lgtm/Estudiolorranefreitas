/** Linha do tempo da unha (progresso da rolagem 0 → 1). */
export const JOIN = {
  /** o gel rosa desce sobre a unha natural */
  gel: [0.08, 0.5],
  /** o top coat desce sobre o gel */
  top: [0.32, 0.82],
} as const;

/** Início de cada etapa exibida no texto. */
export const STAGE_STARTS = [0, 0.28, 0.6];
