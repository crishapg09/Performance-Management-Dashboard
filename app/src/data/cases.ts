import rawCases from './cases.json';
import rawToday from './today.json';
import type { TACase } from './types';

/**
 * Source: UNICEF TA case export, Jan–Jun 2026 (4,160 rows).
 * Dates are Excel serial day numbers (matches the source export).
 */
export const ALL_CASES = rawCases as unknown as TACase[];

/** Requests with a blank region, region = HQ, or status = Discontinued are out of scope. */
export const CASES = ALL_CASES.filter((c) => c.region && c.region !== 'HQ' && c.status !== 'Discontinued');

/** "As of" date for the dataset, as an Excel serial day number. */
export const TODAY = rawToday as unknown as number;
