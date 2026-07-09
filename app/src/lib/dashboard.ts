import type { TACase } from '../data/types';
import { STATUS_ORDER, STATUS_COLORS, statusChipStyle } from './status';
import { mean, median, p90, fmtDays, fmtNum, pct } from './format';
import { groupBy, toBars, optionCounts, type ColoredBarRow } from './aggregate';
import { formatDate, monthIndex2026, MONTHS } from './dates';

export type ViewId = 'overview' | 'quality';

export interface FilterState {
  view: ViewId;
  type: string;
  regions: string[];
  practice: string;
  statuses: string[];
  quarters: string[];
  lead: string;
  tableView: 'new' | 'overdue';
}

export const INITIAL_FILTERS: FilterState = {
  view: 'overview',
  type: 'All',
  regions: [],
  practice: 'All',
  statuses: [],
  quarters: [],
  lead: 'All',
  tableView: 'new',
};

export function matchesFilters(c: TACase, s: FilterState): boolean {
  if (s.type !== 'All' && c.type !== s.type) return false;
  if (s.regions.length && !s.regions.includes(c.region)) return false;
  if (s.practice !== 'All' && c.practice !== s.practice) return false;
  if (s.statuses.length && !s.statuses.includes(c.status)) return false;
  if (s.quarters.length && !s.quarters.includes(c.q || '')) return false;
  if (s.lead !== 'All' && c.lead !== s.lead) return false;
  return true;
}

export interface SelectOption {
  value: string;
  label: string;
}
export interface KPI {
  label: string;
  value: string;
  sub: string;
  accent: string;
  color: string;
}
export interface StatusChip {
  label: string;
  dot: string;
  on: boolean;
  bg: string;
  fg: string;
  bd: string;
}
export interface ToggleButton {
  label: string;
  on: boolean;
  bg: string;
  fg: string;
  bd?: string;
}
export interface StackSeg {
  w: number;
  color: string;
}
export interface StackedRow {
  label: string;
  n: number;
  barPct: number;
  segs: StackSeg[];
  leads?: number;
}
export interface MonthBar {
  label: string;
  in: number;
  out: number;
  inH: number;
  outH: number;
  hasNote: boolean;
}
export interface TrendMonth {
  label: string;
  medLabel: string;
  nLabel: string;
  h: number;
}
export interface TypeCycleRow {
  label: string;
  nLabel: string;
  med: string;
  p90: string;
  medPct: number;
  p90Pct: number;
}
export interface BucketRow {
  label: string;
  n: number;
  color: string;
  pct: number;
}
export interface OverdueTableRow {
  id: string;
  country: string;
  desc: string;
  full: string;
  practice: string;
  expDate: string;
  status: string;
  lead: string;
  leadColor: string;
  state: string;
  stateBg: string;
  stateFg: string;
  days: string;
  stBg: string;
  stFg: string;
}
export interface NoLeadTableRow {
  id: string;
  desc: string;
  practice: string;
  region: string;
  status: string;
  stBg: string;
  stFg: string;
}
export interface CheckItem {
  n: string;
  label: string;
  sub: string;
  color: string;
}
export interface CompletenessRow {
  label: string;
  pct: number;
  pctLabel: string;
  color: string;
}
export interface QualityRegionRow {
  label: string;
  pct: number;
  pctLabel: string;
  color: string;
}
export interface ObjPracticeRow {
  label: string;
  n: number;
  pct: number;
  pctLabel: string;
  color: string;
}
export interface LegendItem {
  label: string;
  color: string;
}

export interface Dashboard {
  // routing
  isOverview: boolean;
  isQuality: boolean;
  viewTabs: ToggleButton[];

  // header / summary
  metaTotal: string;
  filterTitle: string;
  total: string;
  pctOfAll: string;

  // filters
  typeBtns: ToggleButton[];
  statusChips: StatusChip[];
  quarterChips: ToggleButton[];
  regionOpts: SelectOption[];
  practiceOpts: SelectOption[];

  // ---- Performance view ----
  kpis: KPI[];
  ioMonths: MonthBar[];
  ioOpenedTotal: string;
  ioClosedTotal: string;
  onTrack: number;
  overdue: number;
  onTrackPct: number;
  overduePct: number;
  onTime: number;
  late: number;
  noEnd: number;
  onTimePct: number;
  latePct: number;
  noEndPct: number;
  recent: number;
  recentByRegion: ColoredBarRow[];
  recentByPractice: ColoredBarRow[];
  onTrackByRegion: ColoredBarRow[];
  onTrackByPractice: ColoredBarRow[];
  overdueByRegion: ColoredBarRow[];
  overdueByPractice: ColoredBarRow[];
  overdueTable: OverdueTableRow[];
  tableTitle: string;
  tableMetric: string;
  tableDaysColor: string;
  tableToggle: ToggleButton[];

  mgmtKpis: KPI[];
  cbpRows: (ColoredBarRow & { label2: string; count: number })[];
  cbpEmpty: boolean;
  trendMonths: TrendMonth[];
  typeCycle: TypeCycleRow[];
  overdueBuckets: BucketRow[];
  stalledByRegion: ColoredBarRow[];
  stalledCount: string;

  byPractice: StackedRow[];
  byRegion: StackedRow[];
  staffBars: StackedRow[];
  staffLegend: LegendItem[];
  loadN: number;
  loadMin: number;
  loadMax: number;
  loadMaxLead: string;
  loadMinCountLabel: string;
  loadAvg: string;
  avgPos: number;
  distinctStaff: number;
  unassigned: number;

  // ---- Data Quality view ----
  dqKpis: KPI[];
  dqChecks: CheckItem[];
  dqTotal: string;
  contradictionPct: string;
  xsBeforeCr: string;
  xsBeforeCrPct: string;
  dupCount: string;
  stale60Count: string;
  staleByRegion: ColoredBarRow[];
  qualityByRegion: QualityRegionRow[];
  objByPractice: ObjPracticeRow[];
  checks: CheckItem[];
  completeness: CompletenessRow[];
  noLeadCount: number;
  noLeadTable: NoLeadTableRow[];
  noLeadEmpty: boolean;
}

/**
 * Pure port of the Claude Design prototype's `renderVals()` (redesigned two-view build).
 * `cases` is the reporting universe (region present, not HQ, not Discontinued);
 * `rawCases` is the full export used by the Data Quality view.
 */
export function computeDashboard(
  cases: TACase[],
  rawCases: TACase[],
  quarters: string[],
  today: number,
  state: FilterState,
): Dashboard {
  const TODAY = today;
  const F = cases.filter((c) => matchesFilters(c, state));
  const total = F.length;
  const ALL = cases.length;

  // core sets
  const done = F.filter((c) => c.status === '100%');
  const activeSet = F.filter((c) => !['100%', 'Discontinued', 'Unassigned'].includes(c.status));
  const overdueSet = activeSet
    .filter((c) => c.xc != null && c.xc < TODAY)
    .sort((a, b) => TODAY - (b.xc as number) - (TODAY - (a.xc as number)));
  const onTrack = activeSet.length - overdueSet.length;
  const onTrackSet = activeSet.filter((c) => !(c.xc != null && c.xc < TODAY));
  const recentSet = F.filter((c) => {
    const t = c.cr ?? c.op;
    return t != null && t >= TODAY - 30 && t <= TODAY;
  });
  const closeArr = F.filter((c) => c.cl && c.op).map((c) => (c.cl as number) - (c.op as number));
  const updArr = F.filter((c) => c.up && c.op).map((c) => (c.up as number) - (c.op as number));

  // inconsistency checks (reporting universe)
  const adv = new Set(['25%', '50%', '75%', '100%']);
  const noLead = F.filter((c) => adv.has(c.status) && !c.lead);
  const noClose = done.filter((c) => !c.cl && !c.rs);
  const noObj = F.filter((c) => !c.ho);

  // completion vs target
  const compEnd = done.filter((c) => (c.cl || c.rs) && c.xc);
  const onTime = compEnd.filter((c) => (c.cl || c.rs)! <= (c.xc as number)).length;
  const late = compEnd.length - onTime;
  const noEnd = done.filter((c) => !(c.cl || c.rs)).length;
  const dT = done.length || 1;

  // ---- overdue / new table (toggle) ----
  const view = state.tableView;
  const rowFrom = (c: TACase, metric: string): OverdueTableRow => {
    const chip = statusChipStyle(c.status);
    return {
      id: c.id,
      country: c.office || '—',
      desc: c.desc || '—',
      full: c.full || c.desc || '—',
      practice: c.practice || '—',
      expDate: formatDate(c.xc),
      status: c.status,
      lead: c.lead || '— none —',
      leadColor: c.lead ? '#43586B' : '#C0453F',
      state: c.cl ? 'Closed' : 'Open',
      stateBg: c.cl ? '#E7EEF3' : '#E6F0EA',
      stateFg: c.cl ? '#0B5A8A' : '#2E7D5B',
      days: metric,
      stBg: chip.bg,
      stFg: chip.fg,
    };
  };
  const newSet = [...recentSet].sort((a, b) => (b.cr ?? b.op)! - (a.cr ?? a.op)!);
  const overdueTable =
    view === 'new'
      ? newSet.map((c) => rowFrom(c, String(Math.round(TODAY - (c.cr ?? c.op)!))))
      : overdueSet.map((c) => rowFrom(c, '+' + Math.round(TODAY - (c.xc as number))));
  const tableTitle = view === 'new' ? 'Newest requests (last 30 days)' : 'Most overdue active requests';
  const tableMetric = view === 'new' ? 'Age (days)' : 'Days over';
  const tableDaysColor = view === 'new' ? '#0B6FA4' : '#C0453F';
  const tableToggle: ToggleButton[] = [
    { label: 'New (30d)', on: view === 'new' },
    { label: 'Overdue', on: view === 'overdue' },
  ].map((t) => ({ ...t, bg: t.on ? '#16385C' : 'transparent', fg: t.on ? '#fff' : '#5B7186' }));

  // no-lead table
  const noLeadTable: NoLeadTableRow[] = noLead.map((c) => {
    const chip = statusChipStyle(c.status);
    return {
      id: c.id,
      desc: c.desc || '—',
      practice: c.practice || '—',
      region: c.region || '—',
      status: c.status,
      stBg: chip.bg,
      stFg: chip.fg,
    };
  });

  // completeness (reporting universe)
  const cFields: [string, (c: TACase) => boolean][] = [
    ['Region', (c) => !!c.region],
    ['TA lead assigned', (c) => !!c.lead],
    ['Expected completion', (c) => c.xc != null],
    ['Objectives', (c) => !!c.ho],
    ['Description', (c) => !!c.hd],
    ['Modality', (c) => !!c.modality],
    ['Programme offer', (c) => !!c.offer],
  ];
  const completeness: CompletenessRow[] = cFields.map(([label, fn]) => {
    const p = total ? Math.round((F.filter(fn).length / total) * 100) : 0;
    const color = p >= 95 ? '#2E7D5B' : p >= 80 ? '#3E9CD6' : '#E0A21E';
    return { label, pct: p, pctLabel: p + '%', color };
  });

  // ---- filter chips ----
  const statusChips: StatusChip[] = STATUS_ORDER.map((v) => {
    const on = state.statuses.includes(v);
    return {
      label: v,
      dot: STATUS_COLORS[v],
      on,
      bg: on ? '#16385C' : '#fff',
      fg: on ? '#fff' : '#43586B',
      bd: on ? '#16385C' : '#D5DEE6',
    };
  });
  const quarterChips: ToggleButton[] = quarters.map((v) => {
    const on = state.quarters.includes(v);
    return { label: v, on, bg: on ? '#0B6FA4' : '#fff', fg: on ? '#fff' : '#43586B', bd: on ? '#0B6FA4' : '#D5DEE6' };
  });
  const typeBtns: ToggleButton[] = ['All', 'Big Ticket', 'Routine'].map((v) => {
    const on = state.type === v;
    return { label: v, on, bg: on ? '#0B6FA4' : 'transparent', fg: on ? '#fff' : '#5B7186' };
  });

  // dynamic filter title
  const anyFilter =
    state.type !== 'All' ||
    state.regions.length > 0 ||
    state.practice !== 'All' ||
    state.statuses.length > 0 ||
    state.quarters.length > 0 ||
    state.lead !== 'All';
  let filterTitle: string;
  if (!anyFilter) {
    filterTitle = 'All TA requests — every region, practice & status';
  } else {
    const parts: string[] = [];
    parts.push(state.type === 'All' ? 'All requests' : state.type + ' requests');
    parts.push(state.regions.length ? state.regions[0] : 'all regions');
    if (state.practice !== 'All') parts.push(state.practice);
    if (state.statuses.length) parts.push(state.statuses.join(', ') + (state.statuses.length > 1 ? ' status' : ' implemented'));
    if (state.quarters.length) parts.push('due ' + state.quarters.join(', '));
    if (state.lead !== 'All') parts.push('led by ' + state.lead);
    filterTitle = parts.join('  ·  ');
  }

  // ---- staff bars segmented by status ----
  const staffGrp = groupBy(F.filter((c) => c.lead), 'lead');
  const staffMax = Math.max(1, ...staffGrp.map((r) => r.n));
  const staffBars: StackedRow[] = staffGrp.map((r) => {
    const rowCases = F.filter((c) => c.lead === r.label);
    const segs = STATUS_ORDER.map((s) => ({
      w: r.n ? (rowCases.filter((c) => c.status === s).length / r.n) * 100 : 0,
      color: STATUS_COLORS[s],
    })).filter((seg) => seg.w > 0);
    return { label: r.label, n: r.n, barPct: Math.round((r.n / staffMax) * 100), segs };
  });
  const staffLegend: LegendItem[] = STATUS_ORDER.map((s) => ({ label: s, color: STATUS_COLORS[s] }));

  // stacked-by-status for a grouping key, with distinct-lead count
  const stackByStatus = (key: keyof TACase, limit: number): StackedRow[] => {
    const groups = groupBy(F, key);
    const max = Math.max(1, ...groups.map((r) => r.n));
    return groups.slice(0, limit).map((r) => {
      const rowCases = F.filter((c) => (((c[key] as string) || '—') === r.label));
      const segs = STATUS_ORDER.map((s) => ({
        w: r.n ? (rowCases.filter((c) => c.status === s).length / r.n) * 100 : 0,
        color: STATUS_COLORS[s],
      })).filter((seg) => seg.w > 0);
      const leads = new Set(rowCases.filter((c) => c.lead).map((c) => c.lead)).size;
      return { label: r.label, n: r.n, barPct: Math.round((r.n / max) * 100), segs, leads };
    });
  };

  // per-lead load distribution
  const allLeads = groupBy(F.filter((c) => c.lead), 'lead');
  const counts = allLeads.map((r) => r.n);
  const loadN = counts.length;
  const loadMin = loadN ? Math.min(...counts) : 0;
  const loadMax = loadN ? Math.max(...counts) : 0;
  const loadAvgNum = loadN ? (mean(counts) as number) : 0;
  const loadMaxLead = loadN ? allLeads[0].label : '';
  const loadMinCount = counts.filter((n) => n === loadMin).length;
  const span = Math.max(1, loadMax - loadMin);
  const avgPos = ((loadAvgNum - loadMin) / span) * 100;

  // ---- opened vs closed by month (Apr–Jul) ----
  const io: { label: string; opened: number; closedN: number }[] = [];
  for (let i = 3; i <= 6; i++) {
    io.push({
      label: MONTHS[i],
      opened: F.filter((c) => monthIndex2026(c.op) === i).length,
      closedN: F.filter((c) => c.cl != null && monthIndex2026(c.cl) === i).length,
    });
  }
  const ioMax = Math.max(1, ...io.map((m) => Math.max(m.opened, m.closedN)));
  const ioMonths: MonthBar[] = io.map((m) => ({
    label: m.label,
    in: m.opened,
    out: m.closedN,
    hasNote: m.label === 'Apr',
    inH: Math.round((m.opened / ioMax) * 140),
    outH: Math.round((m.closedN / ioMax) * 140),
  }));
  const ioOpenedTotal = fmtNum(io.reduce((s, m) => s + m.opened, 0));
  const ioClosedTotal = fmtNum(io.reduce((s, m) => s + m.closedN, 0));

  // ---- cycle time (management) ----
  const closedDur = F.filter((c) => c.cl != null && c.op != null && (c.cl as number) >= (c.op as number));
  const durArr = closedDur.map((c) => (c.cl as number) - (c.op as number));
  const over1_30 = overdueSet.filter((c) => TODAY - (c.xc as number) <= 30).length;
  const over31_60 = overdueSet.filter((c) => {
    const d = TODAY - (c.xc as number);
    return d > 30 && d <= 60;
  }).length;
  const over60 = overdueSet.filter((c) => TODAY - (c.xc as number) > 60).length;
  const stalled = activeSet.filter((c) => c.status === '0%' && c.op != null && TODAY - (c.op as number) > 30);
  const closed30 = F.filter((c) => c.cl != null && (c.cl as number) >= TODAY - 30 && (c.cl as number) <= TODAY).length;

  // full-export match (includes discontinued/HQ) for discontinued rate + data quality
  const FQ = rawCases.filter((c) => matchesFilters(c, state));
  const disc = FQ.filter((c) => c.status === 'Discontinued').length;
  const discRate = FQ.length ? (disc / FQ.length) * 100 : 0;

  // median days to close by closing month (Jan–Jul)
  const tr: { label: string; n: number; med: number }[] = [];
  for (let i = 0; i <= 6; i++) {
    const arr = closedDur.filter((c) => monthIndex2026(c.cl) === i).map((c) => (c.cl as number) - (c.op as number));
    tr.push({ label: MONTHS[i], n: arr.length, med: arr.length ? Math.round(median(arr) as number) : 0 });
  }
  const trMax = Math.max(1, ...tr.map((m) => m.med));
  const trendMonths: TrendMonth[] = tr.map((m) => ({
    label: m.label,
    medLabel: m.n ? m.med + 'd' : '—',
    nLabel: 'n=' + m.n,
    h: Math.round((m.med / trMax) * 140),
  }));

  // cycle time by request type (median / p90)
  const tcMax = Math.max(
    1,
    ...['Big Ticket', 'Routine'].map(
      (t) => (p90(closedDur.filter((c) => c.type === t).map((c) => (c.cl as number) - (c.op as number))) as number) || 0,
    ),
  );
  const typeCycle: TypeCycleRow[] = ['Big Ticket', 'Routine'].map((t) => {
    const arr = closedDur.filter((c) => c.type === t).map((c) => (c.cl as number) - (c.op as number));
    const med = median(arr);
    const p9 = p90(arr);
    return {
      label: t,
      nLabel: 'n=' + arr.length + ' closed',
      med: fmtDays(med),
      p90: fmtDays(p9),
      medPct: med ? Math.round((med / tcMax) * 100) : 0,
      p90Pct: p9 ? Math.round((p9 / tcMax) * 100) : 0,
    };
  });

  const obMax = Math.max(1, over1_30, over31_60, over60);
  const overdueBuckets: BucketRow[] = [
    { label: '1–30 days', n: over1_30, color: '#E0A21E' },
    { label: '31–60 days', n: over31_60, color: '#CD6A2E' },
    { label: '>60 days', n: over60, color: '#C0453F' },
  ].map((b) => ({ ...b, pct: Math.round((b.n / obMax) * 100) }));

  const stalledByRegion = toBars(groupBy(stalled, 'region'), '#E0A21E', 6);

  const mgmtKpis: KPI[] = [
    { label: 'Avg open → update', value: fmtDays(mean(updArr)), sub: 'median ' + fmtDays(median(updArr)) + ' · proxy for activity', accent: '#0B6FA4', color: '#0F2238' },
    { label: 'Avg open → close', value: fmtDays(mean(closeArr)), sub: 'median ' + fmtDays(median(closeArr)), accent: '#16385C', color: '#0F2238' },
    { label: 'Median open → close', value: fmtDays(median(durArr)), sub: 'p90 ' + fmtDays(p90(durArr)) + ' · slowest 10%', accent: '#16385C', color: '#0F2238' },
    { label: 'Closed last 30 days', value: fmtNum(closed30), sub: 'vs ' + fmtNum(recentSet.length) + ' received — throughput', accent: '#2E7D5B', color: '#0F2238' },
    { label: 'Stalled at 0%', value: fmtNum(stalled.length), sub: 'open >30 days, no progress', accent: '#E0A21E', color: '#E0A21E' },
    { label: 'Discontinued', value: discRate.toFixed(1) + '%', sub: fmtNum(disc) + ' requests dropped', accent: '#9AA7B2', color: '#5B7186' },
  ];

  // ---- Data Quality Review (full export) ----
  const dqN = FQ.length;
  const m100noCl = FQ.filter((c) => c.status === '100%' && c.cl == null).length;
  const clNot100 = FQ.filter((c) => c.cl != null && c.status !== '100%').length;
  const badPair = FQ.filter((c) => c.xc != null && c.xs != null && (c.xc as number) < (c.xs as number)).length;
  const noTarget = FQ.filter((c) => c.xc == null).length;
  const xsBeforeCr = FQ.filter((c) => c.xs != null && c.cr != null && (c.xs as number) < (c.cr as number) - 1).length;
  let dupCount = 0;
  {
    const seen: Record<string, 1> = {};
    for (const c of FQ) {
      if (!c.reqFor || !c.desc) continue;
      const k = (c.reqFor + '|' + c.desc).toLowerCase();
      if (seen[k]) dupCount++;
      else seen[k] = 1;
    }
  }
  const activeQ = FQ.filter((c) => c.status !== '100%' && c.status !== 'Discontinued' && c.cl == null);
  const stale30 = activeQ.filter((c) => c.up != null && TODAY - (c.up as number) > 30);
  const stale60Count = activeQ.filter((c) => c.up != null && TODAY - (c.up as number) > 60).length;
  const passes = (c: TACase) =>
    !!(c.region && c.office && c.lead && c.desc && c.reqFor && c.offer && c.modality && c.xc != null) &&
    !(c.status === '100%' && c.cl == null) &&
    !(c.cl != null && c.status !== '100%') &&
    !(c.xc != null && c.xs != null && (c.xc as number) < (c.xs as number));
  const passN = FQ.filter(passes).length;
  const qScore = dqN ? Math.round((passN / dqN) * 100) : 0;

  const regGroups = groupBy(FQ.filter((c) => c.region && c.region !== 'HQ'), 'region');
  const qualityByRegion: QualityRegionRow[] = regGroups
    .map((r) => {
      const cs = FQ.filter((c) => c.region === r.label);
      const p = Math.round((cs.filter(passes).length / cs.length) * 100);
      return { label: r.label, pct: p, pctLabel: p + '%', color: p >= 80 ? '#2E7D5B' : p >= 60 ? '#3E9CD6' : '#E0A21E' };
    })
    .sort((a, b) => a.pct - b.pct);

  const staleByRegion = toBars(groupBy(stale30, 'region'), '#E0A21E', 7);

  const prGroups = groupBy(FQ.filter((c) => c.practice), 'practice').slice(0, 8);
  const objByPractice: ObjPracticeRow[] = prGroups
    .map((r) => {
      const cs = FQ.filter((c) => c.practice === r.label);
      const n = cs.filter((c) => !c.ho).length;
      const p = Math.round((n / cs.length) * 100);
      return { label: r.label, n, pct: p, pctLabel: p + '%', color: p >= 30 ? '#C0453F' : p >= 15 ? '#E0A21E' : '#2E7D5B' };
    })
    .sort((a, b) => b.pct - a.pct);

  const noObjQ = FQ.filter((c) => !c.ho).length;
  const dqKpis: KPI[] = [
    { label: 'Record quality score', value: qScore + '%', sub: fmtNum(passN) + ' of ' + fmtNum(dqN) + ' records pass all checks', accent: qScore >= 80 ? '#2E7D5B' : '#E0A21E', color: qScore >= 80 ? '#2E7D5B' : qScore >= 60 ? '#E0A21E' : '#C0453F' },
    { label: 'Contradictory records', value: fmtNum(m100noCl + clNot100), sub: 'status and close date disagree', accent: '#C0453F', color: '#C0453F' },
    { label: 'Stale >30 days', value: fmtNum(stale30.length), sub: 'active, but not updated in a month', accent: '#E0A21E', color: '#E0A21E' },
    { label: 'Possible duplicates', value: fmtNum(dupCount), sub: 'same requester + description', accent: '#E0A21E', color: '#E0A21E' },
    { label: 'No target date', value: fmtNum(noTarget), sub: 'on-time can never be measured', accent: '#C0453F', color: '#C0453F' },
    { label: 'Missing objectives', value: dqN ? Math.round((noObjQ / dqN) * 100) + '%' : '—', sub: fmtNum(noObjQ) + ' requests, cannot be evaluated', accent: '#E0A21E', color: '#E0A21E' },
  ];
  const dqChecks: CheckItem[] = [
    { n: fmtNum(m100noCl), label: 'Marked 100%, but never closed', sub: 'implementation complete, no close date recorded', color: '#C0453F' },
    { n: fmtNum(clNot100), label: 'Closed, but status below 100%', sub: 'has a close date while still “in progress”', color: '#C0453F' },
    { n: fmtNum(badPair), label: 'Completion target before start', sub: 'expected completion earlier than expected start', color: '#E0A21E' },
    { n: fmtNum(noTarget), label: 'No expected completion date', sub: 'record can never be measured on-time', color: '#E0A21E' },
  ];
  const contradictionPct = dqN ? (((m100noCl + clNot100) / dqN) * 100).toFixed(1) + '%' : '—';

  const viewTabs: ToggleButton[] = ([
    ['overview', 'Performance'],
    ['quality', 'Data Quality Review'],
  ] as [ViewId, string][]).map(([v, label]) => ({
    label,
    on: state.view === v,
    bg: state.view === v ? '#16385C' : '#fff',
    fg: state.view === v ? '#fff' : '#43586B',
    bd: state.view === v ? '#16385C' : '#D5DEE6',
  }));

  const kpis: KPI[] = [
    { label: 'Total requests', value: fmtNum(total), sub: 'in current filter', accent: '#0B6FA4', color: '#0F2238' },
    { label: 'Received last 30 days', value: fmtNum(recentSet.length), sub: 'new since 6 Jun 2026', accent: '#1CABE2', color: '#0F2238' },
    { label: 'Active & on track', value: fmtNum(onTrack), sub: 'in progress, not overdue', accent: '#3E9CD6', color: '#3E9CD6' },
    { label: 'Overdue', value: fmtNum(overdueSet.length), sub: 'past target, not done', accent: '#C0453F', color: '#C0453F' },
    { label: 'Completed', value: pct(done.length, total) + '%', sub: fmtNum(done.length) + ' at 100%', accent: '#2E7D5B', color: '#2E7D5B' },
    { label: 'Finalized on time', value: compEnd.length ? pct(onTime, compEnd.length) + '%' : '—', sub: onTime + ' of ' + compEnd.length + ' with a target', accent: '#2E7D5B', color: '#2E7D5B' },
  ];

  // avg open->close by practice (>=3 closed)
  const cbpMap: Record<string, number[]> = {};
  for (const c of F) {
    if (c.cl && c.op) {
      const k = c.practice || '—';
      (cbpMap[k] = cbpMap[k] || []).push((c.cl as number) - (c.op as number));
    }
  }
  let cbpTmp = Object.entries(cbpMap)
    .map(([label, arr]) => ({ label, days: Math.round(mean(arr) as number), count: arr.length }))
    .filter((r) => r.count >= 3)
    .sort((a, b) => b.days - a.days);
  const cbpMaxV = Math.max(1, ...cbpTmp.map((r) => r.days));
  const cbpRows = cbpTmp.slice(0, 10).map((r) => ({
    label: r.label,
    n: r.days,
    count: r.count,
    color: '#16385C',
    pct: Math.round((r.days / cbpMaxV) * 100),
    label2: `${r.days}d`,
  }));

  const checks: CheckItem[] = [
    { n: String(noLead.length), label: 'Advanced status, no TA lead', sub: '≥25% implemented yet unassigned', color: '#C0453F' },
    { n: String(noClose.length), label: '100% with no close date', sub: 'marked complete, never closed', color: '#E0A21E' },
    { n: String(overdueSet.length), label: 'Active & past target date', sub: 'expected completion has passed', color: '#C0453F' },
    { n: String(noObj.length), label: 'Missing objectives', sub: 'no objectives captured', color: '#E0A21E' },
  ];

  return {
    isOverview: state.view === 'overview',
    isQuality: state.view === 'quality',
    viewTabs,

    metaTotal: fmtNum(ALL),
    filterTitle,
    total: fmtNum(total),
    pctOfAll: pct(total, ALL) + '%',

    typeBtns,
    statusChips,
    quarterChips,
    regionOpts: optionCounts(cases, 'region').map(([v, n]) => ({ value: v, label: `${v} (${n})` })),
    practiceOpts: optionCounts(cases, 'practice').map(([v, n]) => ({ value: v, label: `${v} (${n})` })),

    kpis,
    ioMonths,
    ioOpenedTotal,
    ioClosedTotal,
    onTrack,
    overdue: overdueSet.length,
    onTrackPct: activeSet.length ? (onTrack / activeSet.length) * 100 : 0,
    overduePct: activeSet.length ? (overdueSet.length / activeSet.length) * 100 : 0,
    onTime,
    late,
    noEnd,
    onTimePct: (onTime / dT) * 100,
    latePct: (late / dT) * 100,
    noEndPct: (noEnd / dT) * 100,
    recent: recentSet.length,
    recentByRegion: toBars(groupBy(recentSet, 'region'), '#0B6FA4', 6),
    recentByPractice: toBars(groupBy(recentSet, 'practice'), '#0B6FA4', 6),
    onTrackByRegion: toBars(groupBy(onTrackSet, 'region'), '#3E9CD6', 6),
    onTrackByPractice: toBars(groupBy(onTrackSet, 'practice'), '#3E9CD6', 6),
    overdueByRegion: toBars(groupBy(overdueSet, 'region'), '#C0453F', 6),
    overdueByPractice: toBars(groupBy(overdueSet, 'practice'), '#C0453F', 6),
    overdueTable,
    tableTitle,
    tableMetric,
    tableDaysColor,
    tableToggle,

    mgmtKpis,
    cbpRows,
    cbpEmpty: cbpRows.length === 0,
    trendMonths,
    typeCycle,
    overdueBuckets,
    stalledByRegion,
    stalledCount: fmtNum(stalled.length),

    byPractice: stackByStatus('practice', 10),
    byRegion: stackByStatus('region', 9),
    staffBars,
    staffLegend,
    loadN,
    loadMin,
    loadMax,
    loadMaxLead,
    loadMinCountLabel: loadMinCount + (loadMinCount === 1 ? ' staff member' : ' staff members'),
    loadAvg: loadAvgNum ? loadAvgNum.toFixed(1) : '0',
    avgPos,
    distinctStaff: new Set(F.filter((c) => c.lead).map((c) => c.lead)).size,
    unassigned: F.filter((c) => !c.lead).length,

    dqKpis,
    dqChecks,
    dqTotal: fmtNum(dqN),
    contradictionPct,
    xsBeforeCr: fmtNum(xsBeforeCr),
    xsBeforeCrPct: dqN ? Math.round((xsBeforeCr / dqN) * 100) + '%' : '—',
    dupCount: fmtNum(dupCount),
    stale60Count: fmtNum(stale60Count),
    staleByRegion,
    qualityByRegion,
    objByPractice,
    checks,
    completeness,
    noLeadCount: noLead.length,
    noLeadTable,
    noLeadEmpty: noLead.length === 0,
  };
}
