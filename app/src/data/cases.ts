import rawCases from './cases.json';
import rawToday from './today.json';
import type { TACase } from './types';
import { quarter } from '../lib/dates';

/**
 * Source: UNICEF TA case export, Jan–Jul 2026 (4,429 rows, as of 9 Jul 2026).
 * Dates are Excel serial day numbers (matches the source export).
 * Every record is annotated with its expected-completion quarter (`q`).
 */
export const RAW_CASES = (rawCases as unknown as TACase[]).map((c) => ({ ...c, q: quarter(c.xc) }));

/**
 * The reporting universe for the Performance view: requests with a real region
 * (not blank, not HQ) and not Discontinued. The Data Quality view uses RAW_CASES.
 */
export const CASES = RAW_CASES.filter((c) => c.region && c.region !== 'HQ' && c.status !== 'Discontinued');

/** Selectable expected-completion quarters (2026, ascending). */
export const QUARTERS = [...new Set(CASES.map((c) => c.q).filter(Boolean))]
  .filter((q): q is string => !!q && q.startsWith('2026'))
  .sort();

/** "As of" date for the dataset, as an Excel serial day number. */
export const TODAY = rawToday as unknown as number;
