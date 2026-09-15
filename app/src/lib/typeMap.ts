/**
 * Request-type normalisation.
 *
 * The source system has used two vocabularies for this field: "Big Ticket" /
 * "Routine" in earlier exports, and "Big Ticket Item" / "Regular" from the
 * September 2026 export onwards. Both are folded onto the labels the dashboard
 * displays, so a rename upstream cannot silently empty the type filter and the
 * big-ticket/routine split again. Applied once at load (see data/cases.ts).
 */
const BIG = 'Big Ticket';
const ROUTINE = 'Routine';

const norm = (s: string) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');

const LOOKUP: Record<string, string> = {
  'big ticket': BIG,
  'big ticket item': BIG,
  'big-ticket': BIG,
  routine: ROUTINE,
  regular: ROUTINE,
};

export function mapType(raw: string): string {
  return LOOKUP[norm(raw)] ?? (raw || '').toString().trim();
}
