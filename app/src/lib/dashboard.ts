import type { TACase } from '../data/types';
import { STATUS_ORDER, STATUS_COLORS, statusChipStyle } from './status';
import { mean, fmtNum, pct } from './format';
import { groupBy, toBars, optionCounts, type ColoredBarRow } from './aggregate';
import { formatDate, monthIndex2026, MONTHS } from './dates';

export type ViewId = 'overview' | 'quality';

export interface FilterState {
  view: ViewId;
  type: string;
  regions: string[];
  practice: string;
  office: string;
  statuses: string[];
  quarters: string[];
  lead: string;
}

export const INITIAL_FILTERS: FilterState = {
  view: 'overview',
  type: 'All',
  regions: [],
  practice: 'All',
  office: 'All',
  statuses: [],
  quarters: [],
  lead: 'All',
};

export function matchesFilters(c: TACase, s: FilterState): boolean {
  if (s.type !== 'All' && c.type !== s.type) return false;
  if (s.regions.length && !s.regions.includes(c.region)) return false;
  if (s.practice !== 'All' && c.practice !== s.practice) return false;
  if (s.office !== 'All' && c.office !== s.office) return false;
  if (s.statuses.length && !s.statuses.includes(c.status)) return false;
  if (s.quarters.length && !s.quarters.includes(c.q || '')) return false;
  if (s.lead !== 'All' && c.lead !== s.lead) return false;
  return true;
}

export interface SelectOption { value: string; label: string; }
export interface KPI { label: string; value: string; sub: string; accent: string; color: string; }
export interface StatusChip { label: string; dot: string; on: boolean; bg: string; fg: string; bd: string; }
export interface ToggleButton { label: string; on: boolean; bg: string; fg: string; bd?: string; }
export interface StackSeg { w: number; color: string; }
export interface StackedRow { label: string; n: number; barPct: number; segs: StackSeg[]; leads?: number; }
export interface MonthBar { label: string; in: number; done: number; inH: number; doneH: number; hasNote: boolean; }
export interface BucketRow { label: string; n: number; color: string; pct: number; }
export interface LegendItem { label: string; color: string; }
export interface OverdueTableRow {
  id: string; country: string; full: string; practice: string; expDate: string; status: string;
  lead: string; leadColor: string; state: string; stateBg: string; stateFg: string; days: string; stBg: string; stFg: string;
}
export interface NoLeadTableRow { id: string; desc: string; practice: string; region: string; status: string; stBg: string; stFg: string; }
export interface CheckItem { n: string; label: string; sub: string; color: string; }
export interface CompletenessRow { label: string; pct: number; pctLabel: string; color: string; }
export interface QualityRegionRow { label: string; pct: number; pctLabel: string; color: string; }
export interface ObjPracticeRow { label: string; n: number; pct: number; pctLabel: string; color: string; }

export interface Dashboard {
  isOverview: boolean;
  isQuality: boolean;
  viewTabs: ToggleButton[];

  metaTotal: string;
  filterTitle: string;
  total: string;
  pctOfAll: string;

  typeBtns: ToggleButton[];
  statusChips: StatusChip[];
  quarterChips: ToggleButton[];
  regionOpts: SelectOption[];
  practiceOpts: SelectOption[];
  officeOpts: SelectOption[];

  // Performance
  kpis: KPI[];
  ioMonths: MonthBar[];
  ioOpenedTotal: string;
  ioCompletedTotal: string;
  recent: number;
  recentByRegion: ColoredBarRow[];
  recentByPractice: ColoredBarRow[];
  onTrack: number;
  onTrackByRegion: ColoredBarRow[];
  onTrackByPractice: ColoredBarRow[];
  newTable: OverdueTableRow[];

  mgmtKpis: KPI[];

  overdue: number;
  overdueByRegion: ColoredBarRow[];
  overdueByPractice: ColoredBarRow[];
  overdueBuckets: BucketRow[];
  stalledSeverity: LegendItem[];
  stalledByRegionSev: StackedRow[];
  stalledByPracticeSev: StackedRow[];
  stalledCount: string;
  overdueTableFinal: OverdueTableRow[];

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

  // Data Quality
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

const notOther = (key: keyof TACase, c: TACase) => !(key === 'practice' && c.practice === 'Other');

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

  // inconsistency checks (reporting universe)
  const adv = new Set(['25%', '50%', '75%', '100%']);
  const noLead = F.filter((c) => adv.has(c.status) && !c.lead);
  const noClose = done.filter((c) => !c.cl && !c.rs);
  const noObj = F.filter((c) => !c.ho);

  // finalized-on-time (KPI)
  const compEnd = done.filter((c) => (c.cl || c.rs) && c.xc);
  const onTime = compEnd.filter((c) => (c.cl || c.rs)! <= (c.xc as number)).length;

  // ---- table rows ----
  const rowFrom = (c: TACase, metric: string): OverdueTableRow => {
    const chip = statusChipStyle(c.status);
    return {
      id: c.id,
      country: c.office || '—',
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
  const newTable = newSet.map((c) => rowFrom(c, String(Math.round(TODAY - (c.cr ?? c.op)!))));
  const overdueTableFinal = overdueSet.map((c) => rowFrom(c, '+' + Math.round(TODAY - (c.xc as number))));

  // no-lead table
  const noLeadTable: NoLeadTableRow[] = noLead.map((c) => {
    const chip = statusChipStyle(c.status);
    return { id: c.id, desc: c.desc || '—', practice: c.practice || '—', region: c.region || '—', status: c.status, stBg: chip.bg, stFg: chip.fg };
  });

  // completeness
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

  // chips + toggles
  const statusChips: StatusChip[] = STATUS_ORDER.map((v) => {
    const on = state.statuses.includes(v);
    return { label: v, dot: STATUS_COLORS[v], on, bg: on ? '#16385C' : '#fff', fg: on ? '#fff' : '#43586B', bd: on ? '#16385C' : '#D5DEE6' };
  });
  const quarterChips: ToggleButton[] = quarters.map((v) => {
    const on = state.quarters.includes(v);
    return { label: v, on, bg: on ? '#0B6FA4' : '#fff', fg: on ? '#fff' : '#43586B', bd: on ? '#0B6FA4' : '#D5DEE6' };
  });
  const typeBtns: ToggleButton[] = ['All', 'Big Ticket', 'Routine'].map((v) => {
    const on = state.type === v;
    return { label: v, on, bg: on ? '#0B6FA4' : 'transparent', fg: on ? '#fff' : '#5B7186' };
  });

  // filter title
  const anyFilter =
    state.type !== 'All' || state.regions.length > 0 || state.practice !== 'All' || state.office !== 'All' ||
    state.statuses.length > 0 || state.quarters.length > 0 || state.lead !== 'All';
  let filterTitle: string;
  if (!anyFilter) {
    filterTitle = 'All TA requests — every region, practice & status';
  } else {
    const parts: string[] = [];
    parts.push(state.type === 'All' ? 'All requests' : state.type + ' requests');
    parts.push(state.regions.length ? state.regions[0] : 'all regions');
    if (state.practice !== 'All') parts.push(state.practice);
    if (state.office !== 'All') parts.push(state.office);
    if (state.statuses.length) parts.push(state.statuses.join(', ') + (state.statuses.length > 1 ? ' status' : ' implemented'));
    if (state.quarters.length) parts.push('due ' + state.quarters.join(', '));
    if (state.lead !== 'All') parts.push('led by ' + state.lead);
    filterTitle = parts.join('  ·  ');
  }

  // staff bars (stacked by status)
  const staffGrp = groupBy(F.filter((c) => c.lead), 'lead');
  const staffMax = Math.max(1, ...staffGrp.map((r) => r.n));
  const staffBars: StackedRow[] = staffGrp.map((r) => {
    const rowCases = F.filter((c) => c.lead === r.label);
    const segs = STATUS_ORDER.map((s) => ({ w: r.n ? (rowCases.filter((c) => c.status === s).length / r.n) * 100 : 0, color: STATUS_COLORS[s] })).filter((seg) => seg.w > 0);
    return { label: r.label, n: r.n, barPct: Math.round((r.n / staffMax) * 100), segs };
  });
  const staffLegend: LegendItem[] = STATUS_ORDER.map((s) => ({ label: s, color: STATUS_COLORS[s] }));

  // requests-by (stacked; rendered as solid bar + TAs/Leads), excluding practice "Other"
  const stackByStatus = (key: keyof TACase, limit: number): StackedRow[] => {
    const groups = groupBy(F.filter((c) => notOther(key, c)), key);
    const max = Math.max(1, ...groups.map((r) => r.n));
    return groups.slice(0, limit).map((r) => {
      const rowCases = F.filter((c) => (((c[key] as string) || '—') === r.label));
      const segs = STATUS_ORDER.map((s) => ({ w: r.n ? (rowCases.filter((c) => c.status === s).length / r.n) * 100 : 0, color: STATUS_COLORS[s] })).filter((seg) => seg.w > 0);
      const leads = new Set(rowCases.filter((c) => c.lead).map((c) => c.lead)).size;
      return { label: r.label, n: r.n, barPct: Math.round((r.n / max) * 100), segs, leads };
    });
  };

  // per-lead load spread
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

  // opened vs completed by month (Apr–Jul)
  const io: { label: string; opened: number; completedN: number }[] = [];
  for (let i = 3; i <= 6; i++) {
    io.push({
      label: MONTHS[i],
      opened: F.filter((c) => monthIndex2026(c.op) === i).length,
      completedN: F.filter((c) => c.status === '100%' && monthIndex2026(c.cl != null ? c.cl : c.rs) === i).length,
    });
  }
  const ioMax = Math.max(1, ...io.map((m) => Math.max(m.opened, m.completedN)));
  const ioMonths: MonthBar[] = io.map((m) => ({
    label: m.label, in: m.opened, done: m.completedN, hasNote: m.label === 'Apr',
    inH: Math.round((m.opened / ioMax) * 140), doneH: Math.round((m.completedN / ioMax) * 140),
  }));
  const ioOpenedTotal = fmtNum(io.reduce((s, m) => s + m.opened, 0));
  const ioCompletedTotal = fmtNum(io.reduce((s, m) => s + m.completedN, 0));

  // overdue severity buckets
  const over1_30 = overdueSet.filter((c) => TODAY - (c.xc as number) <= 30).length;
  const over31_60 = overdueSet.filter((c) => { const d = TODAY - (c.xc as number); return d > 30 && d <= 60; }).length;
  const over60 = overdueSet.filter((c) => TODAY - (c.xc as number) > 60).length;
  const obMax = Math.max(1, over1_30, over31_60, over60);
  const overdueBuckets: BucketRow[] = [
    { label: '1–30 days', n: over1_30, color: '#E0A21E' },
    { label: '31–60 days', n: over31_60, color: '#CD6A2E' },
    { label: '>60 days', n: over60, color: '#C0453F' },
  ].map((b) => ({ ...b, pct: Math.round((b.n / obMax) * 100) }));

  // stalled at 0% > 30 days
  const stalled = activeSet.filter((c) => c.status === '0%' && c.op != null && TODAY - (c.op as number) > 30);
  const stalledByRegion = toBars(groupBy(stalled, 'region'), '#E0A21E', 7);
  const stalledByPractice = toBars(groupBy(stalled.filter((c) => c.practice !== 'Other'), 'practice'), '#E0A21E', 15);
  const stalledBucket = (c: TACase) => (TODAY - (c.op as number) <= 60 ? '31–60 days' : '>60 days');
  const stalledSevColors: Record<string, string> = { '31–60 days': '#CD6A2E', '>60 days': '#C0453F' };
  const stalledSeverity: LegendItem[] = ['31–60 days', '>60 days'].map((label) => ({ label, color: stalledSevColors[label] }));
  const stalledStack = (rows: ColoredBarRow[]): StackedRow[] =>
    rows.map((row) => {
      const cs = stalled.filter((c) => c.region === row.label || c.practice === row.label);
      const segs = ['31–60 days', '>60 days'].map((label) => {
        const n = cs.filter((c) => stalledBucket(c) === label).length;
        return { color: stalledSevColors[label], w: row.n ? Math.round((n / row.n) * 100) : 0 };
      });
      return { label: row.label, n: row.n, barPct: row.pct, segs };
    });
  const stalledByRegionSev = stalledStack(stalledByRegion);
  const stalledByPracticeSev = stalledStack(stalledByPractice);

  const closed30 = F.filter((c) => c.cl != null && (c.cl as number) >= TODAY - 30 && (c.cl as number) <= TODAY).length;

  // full-export match for discontinued + data quality
  const FQ = rawCases.filter((c) => matchesFilters(c, state));
  const disc = FQ.filter((c) => c.status === 'Discontinued').length;
  const discRate = FQ.length ? (disc / FQ.length) * 100 : 0;

  const mgmtKpis: KPI[] = [
    { label: 'Open → assignment', value: 'N/A', sub: 'measure coming soon', accent: '#9AA7B2', color: '#9AA7B2' },
    { label: 'Assignment → first response', value: 'N/A', sub: 'measure coming soon', accent: '#9AA7B2', color: '#9AA7B2' },
    { label: 'Opened last 30 days', value: fmtNum(recentSet.length), sub: 'new requests received', accent: '#0B6FA4', color: '#0F2238' },
    { label: 'Closed last 30 days', value: fmtNum(closed30), sub: 'vs ' + fmtNum(recentSet.length) + ' received — throughput', accent: '#2E7D5B', color: '#0F2238' },
    { label: 'Stalled at 0%', value: fmtNum(stalled.length), sub: 'open >30 days, no progress', accent: '#E0A21E', color: '#E0A21E' },
    { label: 'Discontinued', value: fmtNum(disc), sub: discRate.toFixed(1) + '% requests dropped', accent: '#9AA7B2', color: '#5B7186' },
  ];

  // ---- Data Quality (full export) ----
  const dqN = FQ.length;
  const m100noCl = FQ.filter((c) => c.status === '100%' && c.cl == null).length;
  const clNot100 = FQ.filter((c) => c.cl != null && c.status !== '100%').length;
  const badPair = FQ.filter((c) => c.xc != null && c.xs != null && (c.xc as number) < (c.xs as number)).length;
  const noTarget = FQ.filter((c) => c.xc == null).length;
  const xsBeforeCr = FQ.filter((c) => c.xs != null && c.cr != null && (c.xs as number) < (c.cr as number) - 1).length;
  let dupCount = 0;
  { const seen: Record<string, 1> = {}; for (const c of FQ) { if (!c.reqFor || !c.desc) continue; const k = (c.reqFor + '|' + c.desc).toLowerCase(); if (seen[k]) dupCount++; else seen[k] = 1; } }
  const activeQ = FQ.filter((c) => c.status !== '100%' && c.status !== 'Discontinued' && c.cl == null);
  const stale30 = activeQ.filter((c) => c.up != null && TODAY - (c.up as number) > 30);
  const stale60Count = activeQ.filter((c) => c.up != null && TODAY - (c.up as number) > 60).length;
  const passes = (c: TACase) =>
    !!(c.region && c.office && c.lead && c.desc && c.reqFor && c.offer && c.modality && c.xc != null) &&
    !(c.status === '100%' && c.cl == null) && !(c.cl != null && c.status !== '100%') &&
    !(c.xc != null && c.xs != null && (c.xc as number) < (c.xs as number));
  const passN = FQ.filter(passes).length;
  const qScore = dqN ? Math.round((passN / dqN) * 100) : 0;

  const regGroups = groupBy(FQ.filter((c) => c.region && c.region !== 'HQ'), 'region');
  const qualityByRegion: QualityRegionRow[] = regGroups.map((r) => {
    const cs = FQ.filter((c) => c.region === r.label);
    const p = Math.round((cs.filter(passes).length / cs.length) * 100);
    return { label: r.label, pct: p, pctLabel: p + '%', color: p >= 80 ? '#2E7D5B' : p >= 60 ? '#3E9CD6' : '#E0A21E' };
  }).sort((a, b) => a.pct - b.pct);

  const staleByRegion = toBars(groupBy(stale30, 'region'), '#E0A21E', 7);

  const prGroups = groupBy(FQ.filter((c) => c.practice && c.practice !== 'Other'), 'practice').slice(0, 15);
  const objByPractice: ObjPracticeRow[] = prGroups.map((r) => {
    const cs = FQ.filter((c) => c.practice === r.label);
    const n = cs.filter((c) => !c.ho).length;
    const p = Math.round((n / cs.length) * 100);
    return { label: r.label, n, pct: p, pctLabel: p + '%', color: p >= 30 ? '#C0453F' : p >= 15 ? '#E0A21E' : '#2E7D5B' };
  }).sort((a, b) => b.pct - a.pct);

  const noObjQ = FQ.filter((c) => !c.ho).length;
  const dqKpis: KPI[] = [
    { label: 'Record quality score', value: qScore + '%', sub: fmtNum(passN) + ' of ' + fmtNum(dqN) + ' records pass all checks', accent: qScore >= 80 ? '#2E7D5B' : '#E0A21E', color: qScore >= 80 ? '#2E7D5B' : qScore >= 60 ? '#E0A21E' : '#C0453F' },
    { label: 'Contradictory records', value: fmtNum(m100noCl + clNot100), sub: 'status and close date disagree', accent: '#C0453F', color: '#C0453F' },
    { label: 'Stale > 30 days', value: fmtNum(stale30.length), sub: 'active, but not updated in a month', accent: '#E0A21E', color: '#E0A21E' },
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

  const viewTabs: ToggleButton[] = ([['overview', 'Performance'], ['quality', 'Data Quality Review']] as [ViewId, string][]).map(([v, label]) => ({
    label, on: state.view === v, bg: state.view === v ? '#16385C' : '#fff', fg: state.view === v ? '#fff' : '#43586B', bd: state.view === v ? '#16385C' : '#D5DEE6',
  }));

  const kpis: KPI[] = [
    { label: 'Total requests', value: fmtNum(total), sub: 'in current filter', accent: '#0B6FA4', color: '#0F2238' },
    { label: 'Received last 30 days', value: fmtNum(recentSet.length), sub: 'new since 14 Jun 2026', accent: '#1CABE2', color: '#0F2238' },
    { label: 'Active & on track', value: fmtNum(onTrack), sub: 'in progress, not overdue', accent: '#3E9CD6', color: '#3E9CD6' },
    { label: 'Completed', value: pct(done.length, total) + '%', sub: fmtNum(done.length) + ' at 100%', accent: '#2E7D5B', color: '#2E7D5B' },
    { label: 'Finalized on time', value: compEnd.length ? pct(onTime, compEnd.length) + '%' : '—', sub: onTime + ' of ' + compEnd.length + ' with a target', accent: '#2E7D5B', color: '#2E7D5B' },
    { label: 'Overdue', value: fmtNum(overdueSet.length), sub: 'past target, not done', accent: '#C0453F', color: '#C0453F' },
  ];

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
    officeOpts: optionCounts(cases, 'office').map(([v, n]) => ({ value: v, label: `${v} (${n})` })),

    kpis,
    ioMonths,
    ioOpenedTotal,
    ioCompletedTotal,
    recent: recentSet.length,
    recentByRegion: toBars(groupBy(recentSet, 'region'), '#0B6FA4', 7),
    recentByPractice: toBars(groupBy(recentSet.filter((c) => c.practice !== 'Other'), 'practice'), '#0B6FA4', 15),
    onTrack,
    onTrackByRegion: toBars(groupBy(onTrackSet, 'region'), '#3E9CD6', 7),
    onTrackByPractice: toBars(groupBy(onTrackSet.filter((c) => c.practice !== 'Other'), 'practice'), '#3E9CD6', 15),
    newTable,

    mgmtKpis,

    overdue: overdueSet.length,
    overdueByRegion: toBars(groupBy(overdueSet, 'region'), '#C0453F', 7),
    overdueByPractice: toBars(groupBy(overdueSet.filter((c) => c.practice !== 'Other'), 'practice'), '#C0453F', 15),
    overdueBuckets,
    stalledSeverity,
    stalledByRegionSev,
    stalledByPracticeSev,
    stalledCount: fmtNum(stalled.length),
    overdueTableFinal,

    byPractice: stackByStatus('practice', 15),
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
