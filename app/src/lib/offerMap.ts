/**
 * Canonical Programme Offer.
 *
 * The source "Primary Programme Offer" field is free-ish text and has drifted:
 * the same offer appears with different casing, hyphens, double spaces, a
 * non-breaking space, and outright typos ("Humantiarian"). This folds those
 * variants onto one canonical label so the filter and any breakdown by offer
 * count them together.
 *
 * Values that the mapping does not recognise fall through unchanged, so a new
 * variant shows up in the filter list rather than silently disappearing.
 */

/** Lower-case, replace non-breaking spaces and hyphens, collapse runs of spaces. */
function norm(s: string | null | undefined): string {
  return (s || '')
    .toString()
    .replace(/ /g, ' ')
    .replace(/-/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const HUMANITARIAN = 'Humanitarian Action and Resilience';
const WORKFORCE = 'Workforce Development and Institution Building';
// note: two spaces after "Reform" — the canonical spelling used downstream
const POLICY = 'Policy Reform  and Programme Design';
const SCALE_UP = 'Programme Management Scale Up Support';
const NOT_SPECIFIED = 'Not specified';

const LOOKUP: Record<string, string> = {
  'digital and infrastructure': 'Digital and Infrastructure',
  'equity and demand generation': 'Equity and Demand Generation',
  'financing for scale': 'Financing for Scale',

  'humanitarian action and resilience': HUMANITARIAN,
  'humanitarian and resilience': HUMANITARIAN,
  'humantiarian and resilience': HUMANITARIAN,

  'institution building': WORKFORCE,
  'workforce development and institution building': WORKFORCE,

  'policy reform and programme design': POLICY,
  'policy reform and program design': POLICY,
  'programme design for a potential ecm funding': POLICY,

  'programme management and scale up': SCALE_UP,
  'programme management for scale up': SCALE_UP,
  'programme management scale up': SCALE_UP,
  'programme management scale up support': SCALE_UP,

  // "offer to governments", an explicit N/A and a blank all mean the same
  // thing for reporting: no programme offer was recorded.
  'programme offer to governments and other stakeholders': NOT_SPECIFIED,
  'n/a': NOT_SPECIFIED,
  '': NOT_SPECIFIED,
};

/** Canonical Programme Offer for a raw "Primary Programme Offer" value. */
export function mapOffer(raw: string | null | undefined): string {
  const key = norm(raw);
  return LOOKUP[key] ?? (raw || '').toString().trim();
}
