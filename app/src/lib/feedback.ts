import survey from '../data/survey.json';
import type { FilterState, SelectOption } from './dashboard';
import { mapOffice } from './regionMap';
import { mapType } from './typeMap';
import { mapPractice } from './practiceMap';
import { mapOffer } from './offerMap';

/**
 * Feedback: the REACH TA satisfaction survey, joined to the request data.
 *
 * Each response carries the request it rates, found by case number (CS…) in
 * scripts/extract_survey.py. The request attributes are normalised here with
 * the same maps as the request data (data/cases.ts), so the filter bar means
 * the same thing on every tab. Status, quarter and lead filters do not apply:
 * the survey is about the service, not the request's delivery state.
 *
 * A response whose case number did not match (e.g. "I really don't remember")
 * keeps its office and region from the survey itself, has type "Unclassified"
 * and no practice or offer, so it drops out as soon as one of those is chosen.
 */

interface RawResponse {
  id: string; o: string; x: string; w: 0 | 1; sb: 0 | 1; p: string; i: string; f: string;
  sat: number | null; qual: number | null; time: number | null; contrib: number | null; rec: number | null;
  c?: { req: string; type: string; reg: string; off: string; pr: string; of: string };
}

export interface Response {
  id: string;
  /** office as the respondent named it; keys the map */
  surveyOffice: string;
  /** request attributes, normalised like the request data */
  type: string; region: string; office: string; practice: string; programmeOffer: string;
  request: string;
  body: string; written: boolean; substantive: boolean;
  pos: string[]; imp: string; flag: string;
  sat: number | null; qual: number | null; time: number | null; contrib: number | null; rec: number | null;
}

const RAW = survey as unknown as { asOf: string; responses: RawResponse[]; coords: Record<string, [number, number]> };

export const SURVEY_AS_OF = RAW.asOf;

export const RESPONSES: Response[] = RAW.responses.map((r) => {
  const place = mapOffice(r.c ? r.c.off : r.o);
  return {
    id: r.id,
    surveyOffice: r.o,
    type: r.c ? mapType(r.c.type) || 'Unclassified' : 'Unclassified',
    region: place.region,
    office: place.office,
    practice: r.c ? mapPractice(r.c.pr) : '',
    programmeOffer: r.c ? mapOffer(r.c.of) : '',
    request: r.c?.req ?? '',
    body: r.x, written: !!r.w, substantive: !!r.sb,
    pos: r.p.split(';').map((s) => s.trim()).filter(Boolean),
    imp: r.i, flag: r.f,
    sat: r.sat, qual: r.qual, time: r.time, contrib: r.contrib, rec: r.rec,
  };
});

export const JOINED = RESPONSES.filter((r) => r.request).length;
export const SURVEY_OFFICES = new Set(RESPONSES.map((r) => r.surveyOffice).filter(Boolean)).size;

export function matchesFeedback(r: Response, s: FilterState): boolean {
  if (s.type !== 'All' && r.type !== s.type) return false;
  if (s.regions.length && !s.regions.includes(r.region)) return false;
  if (s.practice !== 'All' && r.practice !== s.practice) return false;
  if (s.office !== 'All' && r.office !== s.office) return false;
  if (s.programmeOffer !== 'All' && r.programmeOffer !== s.programmeOffer) return false;
  return true;
}

export function feedbackFilterActive(s: FilterState): boolean {
  return s.type !== 'All' || s.regions.length > 0 || s.practice !== 'All' || s.office !== 'All' || s.programmeOffer !== 'All';
}

export function feedbackFilterTitle(s: FilterState): string {
  if (!feedbackFilterActive(s)) return 'All survey responses — every request type, region & practice';
  const parts = [s.type === 'All' ? 'All requests' : `${s.type} requests`, s.regions[0] ?? 'all regions'];
  if (s.practice !== 'All') parts.push(s.practice);
  if (s.office !== 'All') parts.push(s.office);
  if (s.programmeOffer !== 'All') parts.push(s.programmeOffer);
  return parts.join('  ·  ');
}

type Facet = 'region' | 'office' | 'practice' | 'programmeOffer';

/**
 * Options for one dropdown, counted over the responses that match every OTHER
 * active filter. Each list therefore offers only values that still return
 * responses, so no combination of dropdowns can land on an empty tab. The
 * current choice is always kept, so the select never shows blank.
 */
const opts = (s: FilterState, key: Facet, current: string): SelectOption[] => {
  const others: FilterState = {
    ...s,
    ...(key === 'region' ? { regions: [] } : {}),
    ...(key === 'office' ? { office: 'All' } : {}),
    ...(key === 'practice' ? { practice: 'All' } : {}),
    ...(key === 'programmeOffer' ? { programmeOffer: 'All' } : {}),
  };
  const n = new Map<string, number>();
  RESPONSES.filter((r) => matchesFeedback(r, others))
    .forEach((r) => { if (r[key]) n.set(r[key], (n.get(r[key]) ?? 0) + 1); });
  if (current !== 'All' && !n.has(current)) n.set(current, 0);
  return [...n.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([v, c]) => ({ value: v, label: `${v} (${c})` }));
};

/** Dropdown options counted in responses, each narrowed by the other filters. */
export function feedbackOptions(s: FilterState) {
  return {
    regionOpts: opts(s, 'region', s.regions[0] ?? 'All'),
    practiceOpts: opts(s, 'practice', s.practice),
    offerOpts: opts(s, 'programmeOffer', s.programmeOffer),
    officeOpts: opts(s, 'office', s.office),
  };
}

export interface ThemeRow { label: string; n: number }
export interface PosByType { label: string; Routine: number; 'Big Ticket': number; Unclassified: number }
export interface Quote { t: string; th: string }
export interface MapPoint {
  o: string; n: number; x: number; y: number;
  sat: number | null; qual: number | null; time: number | null; r: number;
  g?: Quote; f?: Quote;
}
export interface CommentRow { o: string; t: string; pr: string; x: string; p: string; i: string; f: string; s: number | null }

export interface Feedback {
  kpi: { responses: number; written: number; substantive: number; improvement: number; flags: number };
  avg: { sat: number | null; qual: number | null; time: number | null; rec: number | null };
  rated: number;
  positive: ThemeRow[]; improvement: ThemeRow[]; flags: ThemeRow[];
  posByType: PosByType[];
  map: MapPoint[];
  comments: CommentRow[];
  typeCounts: Record<string, number>;
  officeTotal: number;
  rows: Response[];
}

const mean = (v: number[]) => (v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100 : null);
const nums = (rows: Response[], k: 'sat' | 'qual' | 'time' | 'rec') =>
  rows.map((r) => r[k]).filter((v): v is number => v != null);
const ranked = (m: Map<string, number>): ThemeRow[] =>
  [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([label, n]) => ({ label, n }));

function clip(s: string, n = 240) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const sp = cut.lastIndexOf(' ');
  return (sp > n * 0.6 ? cut.slice(0, sp) : cut).replace(/[ ,.;:]+$/, '') + '…';
}

export function computeFeedback(s: FilterState): Feedback {
  const rows = RESPONSES.filter((r) => matchesFeedback(r, s));

  const pos = new Map<string, number>(), imp = new Map<string, number>(), flag = new Map<string, number>();
  const byType = new Map<string, PosByType>();
  const typeCounts: Record<string, number> = {};
  for (const r of rows) {
    typeCounts[r.type] = (typeCounts[r.type] ?? 0) + 1;
    for (const th of r.pos) {
      pos.set(th, (pos.get(th) ?? 0) + 1);
      const e = byType.get(th) ?? { label: th, Routine: 0, 'Big Ticket': 0, Unclassified: 0 };
      const t = (r.type in e ? r.type : 'Unclassified') as 'Routine' | 'Big Ticket' | 'Unclassified';
      e[t] += 1;
      byType.set(th, e);
    }
    if (r.imp) imp.set(r.imp, (imp.get(r.imp) ?? 0) + 1);
    if (r.flag) flag.set(r.flag, (flag.get(r.flag) ?? 0) + 1);
  }
  const positive = ranked(pos);

  // map: one bubble per office as the respondent named it
  const offices = new Map<string, Response[]>();
  rows.forEach((r) => { if (r.surveyOffice) offices.set(r.surveyOffice, [...(offices.get(r.surveyOffice) ?? []), r]); });
  const map: MapPoint[] = [];
  for (const [o, rs] of offices) {
    const xy = RAW.coords[o];
    if (!xy) continue;
    const p: MapPoint = { o, n: rs.length, x: xy[0], y: xy[1], sat: mean(nums(rs, 'sat')), qual: mean(nums(rs, 'qual')), time: mean(nums(rs, 'time')), r: nums(rs, 'sat').length };
    const quotable = rs.filter((r) => r.substantive && r.body.length >= 35);
    const good = quotable.filter((r) => r.pos.length).sort((a, b) => (b.sat ?? 0) - (a.sat ?? 0) || a.body.length - b.body.length)[0];
    const fix = quotable.filter((r) => r.imp).sort((a, b) => Math.abs(a.body.length - 150) - Math.abs(b.body.length - 150))[0];
    if (good) p.g = { t: clip(good.body), th: good.pos[0] };
    if (fix) p.f = { t: clip(fix.body), th: fix.imp };
    map.push(p);
  }
  map.sort((a, b) => b.n - a.n);

  return {
    kpi: {
      responses: rows.length,
      written: rows.filter((r) => r.written).length,
      substantive: rows.filter((r) => r.substantive).length,
      improvement: rows.filter((r) => r.imp).length,
      flags: rows.filter((r) => r.flag).length,
    },
    avg: { sat: mean(nums(rows, 'sat')), qual: mean(nums(rows, 'qual')), time: mean(nums(rows, 'time')), rec: mean(nums(rows, 'rec')) },
    rated: nums(rows, 'sat').length,
    positive,
    improvement: ranked(imp),
    flags: ranked(flag),
    posByType: positive.map((p) => byType.get(p.label)!),
    map,
    comments: rows.filter((r) => r.substantive).map((r) => ({
      o: r.surveyOffice, t: r.type, pr: r.practice, x: r.body, p: r.pos.join('; '), i: r.imp, f: r.flag, s: r.sat,
    })),
    typeCounts,
    officeTotal: offices.size,
    rows,
  };
}
