/**
 * Practice / sector normalisation.
 *
 * The source export carries two catch-all practices, "Other" and "Innovation",
 * that are too small and too vague to stand on their own in a breakdown. They
 * are folded into "Programme Policy & Strategy", which is where this kind of
 * cross-cutting work belongs. Applied once at load (see data/cases.ts) so every
 * chart, filter and table agrees.
 */
const CANONICAL = 'Programme Policy & Strategy';

const norm = (s: string) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');

const FOLD_INTO_CANONICAL = new Set(['other', 'innovation']);

export function mapPractice(raw: string): string {
  const key = norm(raw);
  if (FOLD_INTO_CANONICAL.has(key)) return CANONICAL;
  return (raw || '').toString().trim();
}
