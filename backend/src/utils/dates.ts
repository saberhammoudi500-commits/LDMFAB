// Conversion de formats FR (JJ/MM/AAAA) et nombres a virgule decimale.

/**
 * Parse une date au format JJ/MM/AAAA (ou ISO) vers un objet Date.
 * Retourne null pour les valeurs vides ou "NA".
 */
export function parseFrDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  const raw = String(value).trim();
  if (raw === '' || raw.toUpperCase() === 'NA') return null;

  // Format JJ/MM/AAAA
  const fr = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) {
    const [, d, m, y] = fr;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    return isNaN(date.getTime()) ? null : date;
  }

  // Fallback ISO / autres formats reconnus par Date
  const iso = new Date(raw);
  return isNaN(iso.getTime()) ? null : iso;
}

/** Formate une Date en JJ/MM/AAAA (UTC) pour l'export Excel. */
export function formatFrDate(value: Date | null | undefined): string {
  if (!value) return '';
  const d = String(value.getUTCDate()).padStart(2, '0');
  const m = String(value.getUTCMonth() + 1).padStart(2, '0');
  const y = value.getUTCFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Parse un nombre pouvant contenir des espaces (milliers) et une virgule
 * decimale, ex: " 195 484 " -> 195484 ; "99,64%" -> 99.64 ; "117,14" -> 117.14
 */
export function parseFrNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  let raw = String(value).trim();
  if (raw === '' || raw.toUpperCase() === 'NA') return null;

  raw = raw
    .replace(/%/g, '')
    .replace(/\s| /g, '') // espaces normaux + insecables
    .replace(/ /g, '') // espace fine insecable
    .replace(',', '.');

  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
