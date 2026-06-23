export function frDate(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yy = d.getUTCFullYear();
  return `${dd}/${mm}/${yy}`;
}

export function frDateTime(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('fr-FR');
}

export function pct(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(2)} %`;
}

export function num(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('fr-FR');
}

// Convertit une Date ISO -> valeur input[type=date] (AAAA-MM-JJ)
export function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export const STATUS_COLORS: Record<string, string> = {
  CREATION: 'bg-slate-100 text-slate-700',
  EN_COURS: 'bg-blue-100 text-blue-700',
  FABRICATION_TERMINEE: 'bg-indigo-100 text-indigo-700',
  VERIFICATION: 'bg-amber-100 text-amber-700',
  RECTIFICATION: 'bg-orange-100 text-orange-700',
  CLOTURE: 'bg-green-100 text-green-700',
};

export function aqlColor(aql: string | null | undefined): string {
  const v = (aql ?? '').toUpperCase();
  if (v === 'CONFORME') return 'bg-green-100 text-green-700';
  if (v.includes('NON')) return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-600';
}
