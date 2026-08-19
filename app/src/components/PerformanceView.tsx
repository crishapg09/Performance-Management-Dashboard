import { useState } from 'react';
import type { Dashboard, StackedRow, MetricSquare } from '../lib/dashboard';
import { Card } from './Card';
import { SectionHeading } from './SectionHeading';
import { KpiStrip } from './KpiStrip';
import { BarList } from './BarList';

const fmtInt = (n: number) => n.toLocaleString('en-US');
const bigCardTitle: React.CSSProperties = { fontSize: 13.5, fontWeight: 700 };
const whatSays: React.CSSProperties = {
  fontSize: 12, color: '#8A98A6', lineHeight: 1.55, marginTop: 16, borderTop: '1px solid #F1F4F7', paddingTop: 12,
};

const tableCols = '100px 110px 1.5fr 124px 96px 64px 74px 120px 80px';

interface TableToggle {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}

function RequestTable({ title, rows, metricLabel, daysColor, footer, toggle }: {
  title: string; rows: Dashboard['newTable']; metricLabel: string; daysColor: string; footer?: string; toggle?: TableToggle;
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E3E9EF', borderRadius: 10, padding: '6px 0 4px', marginTop: 16, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 22px 10px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
        {toggle && (
          <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid #D5DEE6', borderRadius: 8, padding: 3, gap: 2 }}>
            {toggle.tabs.map((t) => {
              const on = toggle.active === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => toggle.onChange(t.id)}
                  style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, padding: '5px 13px', borderRadius: 6, background: on ? '#16385C' : 'transparent', color: on ? '#fff' : '#5B7186' }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 900 }}>
          <div style={{ display: 'grid', gridTemplateColumns: tableCols, gap: 10, padding: '8px 22px', background: '#F6F8FA', borderTop: '1px solid #EDF1F4', borderBottom: '1px solid #EDF1F4', fontSize: 10.5, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A8C9C', fontWeight: 700 }}>
            <div>Case</div><div>Country</div><div>Details/Description</div><div>Practice</div><div>Exp. completion</div><div>Status</div><div>State</div><div>TA lead</div><div style={{ textAlign: 'right' }}>{metricLabel}</div>
          </div>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {rows.map((r) => (
              <div key={r.id} style={{ display: 'grid', gridTemplateColumns: tableCols, gap: 10, padding: '11px 22px', borderBottom: '1px solid #F1F4F7', alignItems: 'center', fontSize: 12.5 }}>
                <div style={{ fontWeight: 600, color: '#0B5A8A', fontVariantNumeric: 'tabular-nums' }}>{r.id}</div>
                <div style={{ color: '#43586B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.country}</div>
                <div title={r.full} style={{ color: '#5B7186', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'help' }}>{r.full}</div>
                <div style={{ color: '#43586B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.practice}</div>
                <div style={{ color: '#43586B', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{r.expDate}</div>
                <div><span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: r.stBg, color: r.stFg }}>{r.status}</span></div>
                <div><span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 5, background: r.stateBg, color: r.stateFg }}>{r.state}</span></div>
                <div style={{ color: r.leadColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.lead}</div>
                <div style={{ textAlign: 'right', fontWeight: 700, color: daysColor, fontVariantNumeric: 'tabular-nums' }}>{r.days}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {footer && (
        <div style={{ padding: '12px 22px 14px', fontSize: 11.5, color: '#8A98A6', lineHeight: 1.55, borderTop: '1px solid #F1F4F7' }}>{footer}</div>
      )}
    </div>
  );
}

function StackTrack({ row, height, track = '#EEF2F6' }: { row: StackedRow; height: number; track?: string }) {
  return (
    <div style={{ height, background: track, borderRadius: height / 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${row.barPct}%`, display: 'flex', borderRadius: height / 2, overflow: 'hidden' }}>
        {row.segs.map((s, i) => (
          <div key={i} style={{ width: `${s.w}%`, background: s.color }} />
        ))}
      </div>
    </div>
  );
}

type SortKey = 'n' | 'leads' | 'avg';

const SORT_COLS: { key: SortKey; label: string; color: string; width: number }[] = [
  { key: 'n', label: 'TAs', color: '#0B6FA4', width: 46 },
  { key: 'leads', label: 'Leads', color: '#2E7D5B', width: 56 },
  { key: 'avg', label: 'Avg / lead', color: '#CD6A2E', width: 74 },
];

/**
 * Practice workload: a bar per practice plus TAs / Leads / Avg-per-lead columns.
 * Clicking a column sorts by it and re-draws the bars against that measure, so
 * the chart always matches the column you are reading.
 */
function SolidWorkloadCard({ title, rows, labelW }: { title: string; rows: StackedRow[]; labelW: number }) {
  const [sortBy, setSortBy] = useState<SortKey>('n');
  const valueOf = (r: StackedRow) => (sortBy === 'n' ? r.n : sortBy === 'leads' ? r.leads ?? 0 : r.avg ?? 0);
  const active = SORT_COLS.find((c) => c.key === sortBy)!;
  const sorted = [...rows].sort((a, b) => valueOf(b) - valueOf(a));
  const max = Math.max(1, ...rows.map(valueOf));
  const cols = `${labelW}px 1fr ${SORT_COLS.map((c) => c.width + 'px').join(' ')}`;
  const cell = (r: StackedRow, key: SortKey) =>
    key === 'n' ? fmtInt(r.n) : key === 'leads' ? fmtInt(r.leads ?? 0) : (r.avg ?? 0).toFixed(1);

  return (
    <div style={{ background: '#fff', border: '1px solid #E3E9EF', borderRadius: 10, padding: '20px 22px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <div style={bigCardTitle}>{title}</div>
        <div style={{ fontSize: 11.5, color: '#9AA7B2' }}>sorted by {active.label.toLowerCase()} · click a column to re-sort</div>
      </div>

      {/* column headers double as sort controls */}
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 10, marginBottom: 10 }}>
        <div /><div />
        {SORT_COLS.map((c) => {
          const on = c.key === sortBy;
          return (
            <button
              key={c.key}
              onClick={() => setSortBy(c.key)}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: '2px 0',
                textAlign: 'right',
                fontSize: 10,
                letterSpacing: '.05em',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: on ? c.color : '#9AA7B2',
                borderBottom: `2px solid ${on ? c.color : 'transparent'}`,
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div>
        {sorted.map((row) => (
          <div key={row.label} style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: '#43586B', fontWeight: 600 }}>{row.label}</div>
            <div style={{ height: 10, background: '#EEF2F6', borderRadius: 5, overflow: 'hidden' }}>
              {sortBy === 'n' ? (
                <div style={{ height: '100%', width: `${Math.round((row.n / max) * 100)}%`, display: 'flex', borderRadius: 5, overflow: 'hidden' }}>
                  {row.segs.map((s, i) => (<div key={i} style={{ width: `${s.w}%`, background: s.color }} />))}
                </div>
              ) : (
                <div style={{ height: '100%', width: `${Math.round((valueOf(row) / max) * 100)}%`, background: active.color, borderRadius: 5 }} />
              )}
            </div>
            {SORT_COLS.map((c) => {
              const on = c.key === sortBy;
              return (
                <div
                  key={c.key}
                  style={{
                    fontSize: on ? 13 : 12,
                    fontWeight: 700,
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    color: on ? c.color : '#9AA7B2',
                  }}
                >
                  {cell(row, c.key)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function SeverityLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {items.map((b) => (
        <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 11, height: 11, borderRadius: 3, background: b.color }} />
          <span style={{ fontSize: 11.5, color: '#43586B' }}>{b.label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Metric squares sized by volume (area ∝ number of TAs). Selecting one filters
 * the practice breakdown underneath to that metric.
 */
function MetricExplorer({ squares }: { squares: MetricSquare[] }) {
  const [sel, setSel] = useState(squares[0]?.id ?? '');
  const active = squares.find((s) => s.id === sel) ?? squares[0];
  if (!active) return null;
  const maxSide = Math.max(...squares.map((s) => s.side));

  return (
    <>
      <Card style={{ marginTop: 16 }}>
        <div style={bigCardTitle}>Where the work stands</div>
        <div style={{ fontSize: 11.5, color: '#9AA7B2', marginTop: 4, marginBottom: 16 }}>
          square size reflects the number of TAs · click one to break it down by practice
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
        <div style={{ flex: '1 1 460px', display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'flex-end', justifyContent: 'center', minHeight: maxSide + 34 }}>
          {squares.map((s) => {
            const on = s.id === active.id;
            return (
              <button
                key={s.id}
                onClick={() => setSel(s.id)}
                title={`${s.label}: ${s.nLabel} — ${s.sub}`}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    width: s.side,
                    height: s.side,
                    borderRadius: 8,
                    background: on ? s.color : `${s.color}2E`,
                    border: `2px solid ${on ? s.color : 'transparent'}`,
                    boxShadow: on ? '0 3px 10px rgba(15,34,56,.18)' : 'none',
                    color: on ? '#fff' : s.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: Math.max(15, Math.min(30, s.side / 4)),
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    transition: 'background .15s, box-shadow .15s',
                  }}
                >
                  {s.nLabel}
                </div>
                <div style={{ fontSize: 11.5, fontWeight: on ? 700 : 600, color: on ? '#0F2238' : '#5B7186', maxWidth: Math.max(s.side, 108) }}>
                  {s.label} <span style={{ color: s.color, fontWeight: 700 }}>{s.pctLabel}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div
          style={{
            flex: '1 1 240px',
            maxWidth: 320,
            borderLeft: '3px solid #EEF2F6',
            paddingLeft: 18,
            fontSize: 12.5,
            color: '#5B7186',
            lineHeight: 1.55,
          }}
        >
          <strong style={{ color: '#43586B' }}>On track, Overdue and Completed</strong> cover the whole portfolio.{' '}
          <strong style={{ color: '#43586B' }}>Received in the last 30 days</strong> is a subset, to show inflow of
          requests.
        </div>
        </div>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <div style={bigCardTitle}>
          {active.label} <span style={{ fontWeight: 400, color: '#9AA7B2' }}>by practice</span>
        </div>
        <div style={{ fontSize: 11.5, color: '#9AA7B2', marginTop: 4, marginBottom: 16 }}>
          {active.nLabel} requests · {active.sub}
        </div>
        {active.byPractice.length === 0 ? (
          <div style={{ fontSize: 12.5, color: '#9AA7B2' }}>None in the current filter.</div>
        ) : (
          <div style={{ maxHeight: 330, overflowY: 'auto', paddingRight: 6 }}>
            <BarList rows={active.byPractice} labelWidth={200} trackBg="#EEF2F6" />
          </div>
        )}
        <div style={whatSays}>
          <strong style={{ color: '#5B7186' }}>What this says:</strong> percentages are relative to each practice's own
          total, not to the {active.nLabel} requests above. It shows the portion of this practice's requests that fall
          into this group.
        </div>
      </Card>
    </>
  );
}

export function PerformanceView({ d }: { d: Dashboard }) {
  const [reqTab, setReqTab] = useState<'new' | 'overdue'>('new');
  return (
    <>
      <KpiStrip kpis={d.kpis} />

      {/* ===== SECTION 1: DEMAND & STATUS ===== */}
      <SectionHeading n={1} title="Demand, delivery & status" />

      {/* opened vs completed vs closed by month */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
          <div style={bigCardTitle}>Requests opened vs. completed, by month (2026)</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: '#0B6FA4' }} /><span style={{ fontSize: 11.5, color: '#43586B' }}>Opened</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: '#2E7D5B' }} /><span style={{ fontSize: 11.5, color: '#43586B' }}>Completed</span></div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, padding: '0 6px', minWidth: 320 }}>
          {d.ioMonths.map((m) => (
            <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  {m.hasNote && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#0B6FA4', background: '#EAF2F8', border: '1px solid #CFE0EE', borderRadius: 5, padding: '2px 7px', marginBottom: 2, whiteSpace: 'nowrap' }}>import into REACH</div>
                  )}
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: '#0B6FA4', fontVariantNumeric: 'tabular-nums' }}>{m.in}</div>
                  <div style={{ width: 26, height: m.inH, minHeight: 2, background: '#0B6FA4', borderRadius: '4px 4px 0 0' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: '#2E7D5B', fontVariantNumeric: 'tabular-nums' }}>{m.done}</div>
                  <div style={{ width: 26, height: m.doneH, minHeight: 2, background: '#2E7D5B', borderRadius: '4px 4px 0 0' }} />
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: '#5B7186', fontWeight: 600 }}>{m.label}</div>
            </div>
          ))}
        </div>
        </div>
        <div style={whatSays}>
          <strong style={{ color: '#5B7186' }}>What this says:</strong> every month the blue bar (new demand) towers over the green bar (completed work), the active backlog grows. In the current filter, <strong style={{ color: '#0B6FA4' }}>{d.ioOpenedTotal}</strong> requests were opened since April and <strong style={{ color: '#2E7D5B' }}>{d.ioCompletedTotal}</strong> reached 100%.
        </div>
      </Card>

      {/* metric squares — click to re-break the practice chart */}
      <MetricExplorer squares={d.metricSquares} />

      {/* severity of the overdue tail */}
      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <div style={bigCardTitle}>Overdue severity</div>
          <SeverityLegend items={d.overdueBuckets} />
        </div>
        <div style={{ display: 'flex', height: 30, borderRadius: 6, overflow: 'hidden', border: '1px solid #E3E9EF' }}>
          {d.overdueBuckets.map((b) => (
            <div key={b.label} title={`${b.label}: ${b.n}`} style={{ width: `${b.pct}%`, background: b.color }} />
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 24, marginTop: 10, fontSize: 12.5 }}>
          {d.overdueBuckets.map((b) => (
            <span key={b.label} style={{ color: b.color, fontWeight: 700 }}>{b.n} · {b.label}</span>
          ))}
        </div>
        <div style={whatSays}>
          <strong style={{ color: '#5B7186' }}>What this says:</strong> {d.overdueSeverityNote}
        </div>
      </Card>

      {/* ===== SECTION 4: WORKLOAD ===== */}
      <SectionHeading n={2} title="Workload: practices, regions & staff" bg="#16385C" />
      <SolidWorkloadCard title="Requests by practice" rows={d.byPractice} labelW={225} />

      {/* workload spread */}
      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
          <div style={bigCardTitle}>Requests per TA lead — workload spread</div>
        </div>
        <div style={{ fontSize: 13, color: '#5B7186', marginBottom: 2 }}><span style={{ fontWeight: 700, color: '#0B6FA4', fontSize: 15 }}>{d.loadN}</span> TA lead staff assigned in current filter</div>
        <div style={{ display: 'flex', gap: 12, margin: '16px 0 22px' }}>
          <div style={{ flex: 1, background: '#F6F8FA', border: '1px solid #EDF1F4', borderRadius: 9, padding: '13px 16px' }}>
            <div style={{ fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7A8C9C', fontWeight: 700 }}>Minimum</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#2E7D5B', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15, marginTop: 3 }}>{d.loadMin}</div>
            <div style={{ fontSize: 11, color: '#9AA7B2' }}>held by {d.loadMinCountLabel}</div>
          </div>
          <div style={{ flex: 1, background: '#EEF6FB', border: '1px solid #CFE6F2', borderRadius: 9, padding: '13px 16px' }}>
            <div style={{ fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase', color: '#2C5A75', fontWeight: 700 }}>Average</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#0B6FA4', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15, marginTop: 3 }}>{d.loadAvg}</div>
            <div style={{ fontSize: 11, color: '#7FA6BE' }}>requests per lead</div>
          </div>
          <div style={{ flex: 1, background: '#FBF0EF', border: '1px solid #F0D2CF', borderRadius: 9, padding: '13px 16px' }}>
            <div style={{ fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase', color: '#B0453F', fontWeight: 700 }}>Maximum</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#C0453F', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15, marginTop: 3 }}>{d.loadMax}</div>
            <div style={{ fontSize: 11, color: '#C79490', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.loadMaxLead}</div>
          </div>
        </div>
        <div style={{ position: 'relative', height: 10, borderRadius: 5, margin: '6px 4px 0', background: 'linear-gradient(90deg,#4CA576,#5BA3D0,#C0453F)' }}>
          <div style={{ position: 'absolute', top: -5, left: `${d.avgPos}%`, transform: 'translateX(-50%)', width: 3, height: 20, background: '#0F2238', borderRadius: 2 }} />
        </div>
        {/* Avg sits under the tick, so the label matches the marker's position */}
        <div style={{ position: 'relative', height: 18, margin: '9px 4px 0', fontSize: 11, color: '#7A8C9C' }}>
          <span style={{ position: 'absolute', left: 0 }}>Min {d.loadMin}</span>
          <span
            style={{
              position: 'absolute',
              left: `${d.avgPos}%`,
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap',
              color: '#0F2238',
              fontWeight: 700,
            }}
          >
            Avg {d.loadAvg}
          </span>
          <span style={{ position: 'absolute', right: 0 }}>Max {d.loadMax}</span>
        </div>
      </Card>

      {/* busiest TA lead staff */}
      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={bigCardTitle}>Busiest TA lead staff <span style={{ fontWeight: 400, color: '#9AA7B2', fontSize: 12 }}>— bar coloured by implementation status</span></div>
          <div style={{ fontSize: 12, color: '#7A8C9C' }}>{d.distinctStaff} distinct leads · <span style={{ color: '#C0453F', fontWeight: 700 }}>{d.unassigned}</span> requests unassigned</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px', marginBottom: 16 }}>
          {d.staffLegend.map((s) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: s.color, display: 'inline-block' }} />
              <span style={{ fontSize: 11.5, color: '#43586B' }}>{s.label}</span>
            </div>
          ))}
        </div>
        <div style={{ columnCount: 2, columnGap: 40, maxHeight: 340, overflowY: 'auto', paddingRight: 6 }}>
          {d.staffBars.map((row) => (
            <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '185px 1fr 34px', alignItems: 'center', gap: 10, breakInside: 'avoid', marginBottom: 13 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#43586B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.label}</div>
                {row.sub && (
                  <div style={{ fontSize: 10.5, color: '#9AA7B2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.sub}</div>
                )}
              </div>
              <StackTrack row={row} height={11} />
              <div style={{ fontSize: 12, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.n}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* newest / overdue requests table */}
      <RequestTable
        title={reqTab === 'new' ? 'Newest requests (last 30 days)' : 'Most overdue active requests'}
        rows={reqTab === 'new' ? d.newTable : d.overdueTableFinal}
        metricLabel={reqTab === 'new' ? 'Age (days)' : 'Days over'}
        daysColor={reqTab === 'new' ? '#0B6FA4' : '#C0453F'}
        footer={reqTab === 'new' ? undefined : 'Days over = today \u2212 the request\u2019s Expected Completion Date, counting only active requests (implementation status below 100%) whose target date has already passed.'}
        toggle={{
          tabs: [{ id: 'new', label: 'New requests' }, { id: 'overdue', label: 'Overdue requests' }],
          active: reqTab,
          onChange: (id) => setReqTab(id as 'new' | 'overdue'),
        }}
      />
    </>
  );
}
