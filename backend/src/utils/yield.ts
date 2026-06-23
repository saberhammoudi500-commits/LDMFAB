// Calcul des rendements de fabrication.

const SEUIL_RENDEMENT_MIN = 95; // % : en dessous => a surveiller

/**
 * Calcule le rendement total (%) a partir de la quantite reelle (kg)
 * et de la quantite theorique (kg). Retourne null si non calculable.
 */
export function computeRendementTotal(
  quantiteKg: number | null | undefined,
  quantiteTheoriqueKg: number | null | undefined,
): number | null {
  if (
    quantiteKg === null ||
    quantiteKg === undefined ||
    quantiteTheoriqueKg === null ||
    quantiteTheoriqueKg === undefined ||
    quantiteTheoriqueKg === 0
  ) {
    return null;
  }
  const r = (quantiteKg / quantiteTheoriqueKg) * 100;
  return Math.round(r * 100) / 100; // 2 decimales
}

/** Indique si un rendement est en dessous du seuil d'alerte. */
export function isRendementHorsSeuil(rendement: number | null | undefined): boolean {
  if (rendement === null || rendement === undefined) return false;
  return rendement < SEUIL_RENDEMENT_MIN;
}

export const SEUIL = SEUIL_RENDEMENT_MIN;
