import type { TACase } from '../data/types';
import { STATUS_ORDER, STATUS_COLORS, statusChipStyle } from './status';
import { mean, median, fmtDays, fmtNum, pct } from './format';
import { groupBy, toBars, optionCounts, type ColoredBarRow } from './aggregate';

export interface FilterState {
  type: string;
  regions: string[];
  practice: string;
  statuses: string[];
  lead: string;
}

export const INITIAL_FILTERS: FilterState = {
  type: 'All',
  regions: [],
  practice: 'All',
  statuses: [],
  lead: 'All',
};

export function matchesFilters(c: TACase, s: FilterState): boolean {
  if (s.type !== 'All' && c.type !== s.type) return false;
  if (s.regions.length && !s.regions.includes(c.region)) return false;
  if (s.practice !== 'All' && c.practice !== s.practice) return false;
  if (s.statuses.length && !s.statuses.includes(c.status)) return false;
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

export interface StatusDistRow {
  label: string;
  n: number;
  color: string;
  pct: number;
  pctLabel: string;
  title: string;
}

export interface OverdueTableRow {
  id: string;
  desc: string;
  practice: string;
  status: string;
  lead: string;
  leadColor: string;
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

export interface TimeCard {
  label: string;
  value: string;
  sub: string;
}

export interface CheckItem {
  n: number;
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

export interface StatusChip {
  label: string;
  dot: string;
  on: boolean;
  bg: string;
  fg: string;
  bd: string;
}

export interface TypeButton {
  label: string;
  on: boolean;
  bg: string;
  fg: string;
}

export interface Dashboard {
  metaTotal: string;
  filterTitle: string;
  total: string;
  pctOfAll: string;

  typeBtns: TypeButton[];
  statusChips: StatusChip[];
  regionOpts: SelectOption[];
  practiceOpts: SelectOption[];
  staffOpts: SelectOption[];

  kpis: KPI[];

  statusDist: StatusDistRow[];
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
  overdueByRegion: ColoredBarRow[];
  overdueByPractice: ColoredBarRow[];
  overdueTable: OverdueTableRow[];

  timeCards: TimeCard[];

  checks: CheckItem[];
  completeness: CompletenessRow[];
  noLeadCount: number;
  noLeadTable: NoLeadTableRow[];
  noLeadEmpty: boolean;

  byPractice: ColoredBarRow[];
  byRegion: ColoredBarRow[];
  topStaff: ColoredBarRow[];
  distinctStaff: number;
  unassigned: number;
}

/**
 * Pure port of the Claude Design prototype's `renderVals()`.
 * All labels, thresholds and rounding match the original dashboard exactly.
 */
export function computeDashboard(allCases: TACase[], today: number, state: FilterState): Dashboard {
  const F = allCases.filter((c) => matchesFilters(c, state));
  const total = F.length;
  const ALL = allCases.length;

  // KPIs
  const done = F.filter((c) => c.status === '100%');
  const activeSet = F.filter((c) => !['100%', 'Discontinued', 'Unassigned'].includes(c.status));
  const overdueSet = activeSet
    .filter((c) => c.xc != null && c.xc < today)
    .sort((a, b) => today - (b.xc as number) - (today - (a.xc as number)));
  const onTrack = activeSet.length - overdueSet.length;
  const closeArr = F.filter((c) => c.cl && c.op).map((c) => (c.cl as number) - (c.op as number));
  const updArr = F.filter((c) => c.up && c.op).map((c) => (c.up as number) - (c.op as number));

  // inconsistency checks
  const advancedStatuses = new Set(['25%', '50%', '75%', '100%']);
  const noLead = F.filter((c) => advancedStatuses.has(c.status) && !c.lead);
  const noClose = done.filter((c) => !c.cl && !c.rs);
  const noRegion = F.filter((c) => !c.region);
  const noObj = F.filter((c) => !c.ho);
  const flagsTotal = noLead.length + noClose.length + noRegion.length;

  // status distribution
  const statusDist: StatusDistRow[] = STATUS_ORDER.map((s) => {
    const n = F.filter((c) => c.status === s).length;
    return {
      label: s,
      n,
      color: STATUS_COLORS[s],
      pct: total ? (n / total) * 100 : 0,
      pctLabel: total ? Math.round((n / total) * 100) + '%' : '0%',
      title: `${s}: ${n}`,
    };
  });

  // completion vs target (completed)
  const compEnd = done.filter((c) => (c.cl || c.rs) && c.xc);
  const onTime = compEnd.filter((c) => (c.cl || c.rs)! <= (c.xc as number)).length;
  const late = compEnd.length - onTime;
  const noEnd = done.filter((c) => !(c.cl || c.rs)).length;
  const dT = done.length || 1;

  // overdue table
  const overdueTable: OverdueTableRow[] = overdueSet.slice(0, 8).map((c) => {
    const chip = statusChipStyle(c.status);
    return {
      id: c.id,
      desc: c.desc || '—',
      practice: c.practice || '—',
      status: c.status,
      lead: c.lead || '— none —',
      leadColor: c.lead ? '#43586B' : '#C0453F',
      days: '+' + Math.round(today - (c.xc as number)),
      stBg: chip.bg,
      stFg: chip.fg,
    };
  });

  // no-lead table
  const noLeadTable: NoLeadTableRow[] = noLead.slice(0, 8).map((c) => {
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

  // filter option chips
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
  const typeBtns: TypeButton[] = ['All', 'Big Ticket', 'Routine'].map((v) => {
    const on = state.type === v;
    return { label: v, on, bg: on ? '#0B6FA4' : 'transparent', fg: on ? '#fff' : '#5B7186' };
  });

  // dynamic filter title
  const anyFilter =
    state.type !== 'All' || state.regions.length > 0 || state.practice !== 'All' || state.statuses.length > 0 || state.lead !== 'All';
  let filterTitle: string;
  if (!anyFilter) {
    filterTitle = 'All TA requests — every region, practice & status';
  } else {
    const parts: string[] = [];
    parts.push(state.type === 'All' ? 'All requests' : state.type + ' requests');
    parts.push(state.regions.length ? state.regions[0] : 'all regions');
    if (state.practice !== 'All') parts.push(state.practice);
    if (state.statuses.length) parts.push(state.statuses.join(', ') + (state.statuses.length > 1 ? ' status' : ' implemented'));
    if (state.lead !== 'All') parts.push('led by ' + state.lead);
    filterTitle = parts.join('  ·  ');
  }

  const kpis: KPI[] = [
    { label: 'Total requests', value: fmtNum(total), sub: 'in current filter', accent: '#0B6FA4', color: '#0F2238' },
    { label: 'In progress', value: fmtNum(activeSet.length), sub: '1–75% implemented', accent: '#3E9CD6', color: '#0F2238' },
    { label: 'Overdue', value: fmtNum(overdueSet.length), sub: 'past target, not done', accent: '#C0453F', color: '#C0453F' },
    { label: 'Completed', value: pct(done.length, total) + '%', sub: fmtNum(done.length) + ' at 100%', accent: '#2E7D5B', color: '#2E7D5B' },
    { label: 'Avg open → close', value: fmtDays(mean(closeArr)), sub: 'median ' + fmtDays(median(closeArr)), accent: '#16385C', color: '#0F2238' },
    { label: 'Data flags', value: fmtNum(flagsTotal), sub: 'inconsistencies', accent: '#E0A21E', color: '#0F2238' },
  ];

  const timeCards: TimeCard[] = [
    { label: 'Avg open → update', value: fmtDays(mean(updArr)), sub: 'median ' + fmtDays(median(updArr)) + ' · proxy for activity' },
    { label: 'Avg open → close', value: fmtDays(mean(closeArr)), sub: 'median ' + fmtDays(median(closeArr)) },
    { label: 'Closed requests', value: fmtNum(closeArr.length), sub: 'have a recorded close date' },
    { label: 'Finalized on time', value: compEnd.length ? pct(onTime, compEnd.length) + '%' : '—', sub: onTime + ' of ' + compEnd.length + ' with a target' },
  ];

  const checks: CheckItem[] = [
    { n: noLead.length, label: 'Advanced status, no TA lead', sub: '≥25% implemented yet unassigned', color: '#C0453F' },
    { n: noClose.length, label: '100% with no close date', sub: 'marked complete, never closed', color: '#E0A21E' },
    { n: overdueSet.length, label: 'Active & past target date', sub: 'expected completion has passed', color: '#C0453F' },
    { n: noRegion.length + noObj.length, label: 'Missing region or objectives', sub: noRegion.length + ' no region · ' + noObj.length + ' no objectives', color: '#E0A21E' },
  ];

  return {
    metaTotal: fmtNum(ALL),
    filterTitle,
    total: fmtNum(total),
    pctOfAll: pct(total, ALL) + '%',

    typeBtns,
    statusChips,
    regionOpts: optionCounts(allCases, 'region').map(([v, n]) => ({ value: v, label: `${v} (${n})` })),
    practiceOpts: optionCounts(allCases, 'practice').map(([v, n]) => ({ value: v, label: `${v} (${n})` })),
    staffOpts: optionCounts(allCases, 'lead').map(([v, n]) => ({ value: v, label: `${v} (${n})` })),

    kpis,

    statusDist,
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
    overdueByRegion: toBars(groupBy(overdueSet, 'region'), '#C0453F', 6),
    overdueByPractice: toBars(groupBy(overdueSet, 'practice'), '#C0453F', 6),
    overdueTable,

    timeCards,

    checks,
    completeness,
    noLeadCount: noLead.length,
    noLeadTable,
    noLeadEmpty: noLead.length === 0,

    byPractice: toBars(groupBy(F, 'practice'), '#3E9CD6', 10),
    byRegion: toBars(groupBy(F.filter((c) => c.region), 'region'), '#0B6FA4', 9),
    topStaff: toBars(groupBy(F.filter((c) => c.lead), 'lead'), '#5BA3D0', 12),
    distinctStaff: new Set(F.filter((c) => c.lead).map((c) => c.lead)).size,
    unassigned: F.filter((c) => !c.lead).length,
  };
}
