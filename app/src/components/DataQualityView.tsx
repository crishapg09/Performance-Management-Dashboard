import type { Dashboard, CheckItem, CompletenessRow, QualityRegionRow, BucketRow, DqTableRow, TransitionCard } from '../lib/dashboard';
import type { ColoredBarRow } from '../lib/aggregate';
import { Card } from './Card';
import { KpiStrip } from './KpiStrip';

const bigTitle: React.CSSProperties = { fontSize: 13.5, fontWeight: 700 };
const subLabel: React.CSSProperties = { fontSize: 11.5, color: '#9AA7B2', marginBottom: 16 };
const note: React.CSSProperties = { fontSize: 12, color: '#8A98A6', lineHeight: 1.55, marginTop: 14, borderTop: '1px solid #F1F4F7', paddingTop: 12 };

function StageHeading({ n, title, bg }: { n: number; title: string; bg: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '34px 0 6px' }}>
      <div style={{ width: 26, height: 26, borderRadius: 7, background: bg, color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
    </div>
  );
}

function Intro({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, color: '#5B7186', margin: '2px 0 14px', maxWidth: 900, lineHeight: 1.5 }}>{children}</div>;
}

function BucketBars({ rows, labelWidth = 92 }: { rows: BucketRow[]; labelWidth?: number }) {
  return (
    <>
      {rows.map((b) => (
        <div key={b.label} style={{ display: 'grid', gridTemplateColumns: `${labelWidth}px 1fr 44px`, alignItems: 'center', gap: 10, marginBottom: 11 }}>
          <div style={{ fontSize: 12.5, color: '#43586B', fontWeight: 600 }}>{b.label}</div>
          <div style={{ height: 12, background: '#EEF2F6', borderRadius: 6 }}><div style={{ height: '100%', width: `${b.pct}%`, background: b.color, borderRadius: 6 }} /></div>
          <div style={{ fontSize: 13, fontWeight: 700, textAlign: 'right', color: b.color, fontVariantNumeric: 'tabular-nums' }}>{b.n}</div>
        </div>
      ))}
    </>
  );
}

function MetricBars({ rows, labelWidth, trackBg }: { rows: ColoredBarRow[]; labelWidth: number; trackBg: string }) {
  if (!rows.length) return <div style={{ fontSize: 12.5, color: '#9AA7B2' }}>None in the current filter.</div>;
  return (
    <>
      {rows.map((row) => (
        <div key={row.label} style={{ display: 'grid', gridTemplateColumns: `${labelWidth}px 1fr 34px`, alignItems: 'center', gap: 10, marginBottom: 9 }}>
          <div style={{ fontSize: 12, color: '#43586B', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.label}</div>
          <div style={{ height: 9, background: trackBg, borderRadius: 5 }}><div style={{ height: '100%', width: `${row.pct}%`, background: row.color, borderRadius: 5 }} /></div>
          <div style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.n}</div>
        </div>
      ))}
    </>
  );
}

function QualityBars({ rows, labelWidth }: { rows: QualityRegionRow[]; labelWidth: number }) {
  return (
    <>
      {rows.map((row) => (
        <div key={row.label} style={{ display: 'grid', gridTemplateColumns: `${labelWidth}px 1fr 48px`, alignItems: 'center', gap: 10, marginBottom: 11 }}>
          <div style={{ fontSize: 12, color: '#43586B', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.label}</div>
          <div style={{ height: 11, background: '#EEF2F6', borderRadius: 6 }}><div style={{ height: '100%', width: `${row.pct}%`, background: row.color, borderRadius: 6 }} /></div>
          <div style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'right', color: row.color, fontVariantNumeric: 'tabular-nums' }}>{row.pctLabel}</div>
        </div>
      ))}
    </>
  );
}

function Completeness({ rows }: { rows: CompletenessRow[] }) {
  return (
    <>
      {rows.map((row) => (
        <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 48px', alignItems: 'center', gap: 10, marginBottom: 11 }}>
          <div style={{ fontSize: 12.5, color: '#43586B' }}>{row.label}</div>
          <div style={{ height: 9, background: '#EEF2F6', borderRadius: 5 }}><div style={{ height: '100%', width: `${row.pct}%`, background: row.color, borderRadius: 5 }} /></div>
          <div style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'right', color: row.color, fontVariantNumeric: 'tabular-nums' }}>{row.pctLabel}</div>
        </div>
      ))}
    </>
  );
}

function CheckRows({ items }: { items: CheckItem[] }) {
  return (
    <>
      {items.map((c) => (
        <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid #F1F4F7' }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: c.color, fontVariantNumeric: 'tabular-nums', minWidth: 54, textAlign: 'right' }}>{c.n}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1F3346' }}>{c.label}</div>
            <div style={{ fontSize: 11.5, color: '#8A98A6' }}>{c.sub}</div>
          </div>
        </div>
      ))}
    </>
  );
}

const dqCols = '104px 120px 1fr 130px 74px 120px 92px';

function DqTable({ title, count, rows, metricLabel, footer }: { title: string; count?: string; rows: DqTableRow[]; metricLabel: string; footer?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E3E9EF', borderRadius: 10, padding: '6px 0 4px', marginTop: 16, overflow: 'hidden' }}>
      <div style={{ fontSize: 13, fontWeight: 700, padding: '16px 22px 10px' }}>
        {title}
        {count != null && <span style={{ color: '#C0453F' }}> ({count})</span>}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 820 }}>
          <div style={{ display: 'grid', gridTemplateColumns: dqCols, gap: 10, padding: '8px 22px', background: '#F6F8FA', borderTop: '1px solid #EDF1F4', borderBottom: '1px solid #EDF1F4', fontSize: 10.5, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A8C9C', fontWeight: 700 }}>
            <div>Case</div><div>Country</div><div>Region</div><div>Practice</div><div>Status</div><div>TA lead</div><div style={{ textAlign: 'right' }}>{metricLabel}</div>
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {rows.length === 0 && <div style={{ padding: '18px 22px', fontSize: 12.5, color: '#9AA7B2' }}>None in the current filter. 🎉</div>}
            {rows.map((r) => (
              <div key={r.id} style={{ display: 'grid', gridTemplateColumns: dqCols, gap: 10, padding: '11px 22px', borderBottom: '1px solid #F1F4F7', alignItems: 'center', fontSize: 12.5 }}>
                <div style={{ fontWeight: 600, color: '#0B5A8A', fontVariantNumeric: 'tabular-nums' }}>{r.id}</div>
                <div style={{ color: '#43586B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.office}</div>
                <div style={{ color: '#43586B' }}>{r.region}</div>
                <div style={{ color: '#43586B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.practice}</div>
                <div><span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: r.stBg, color: r.stFg }}>{r.status}</span></div>
                <div style={{ color: r.leadColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.lead}</div>
                <div style={{ textAlign: 'right', fontWeight: 700, color: r.metricColor, fontVariantNumeric: 'tabular-nums' }}>{r.metric}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {footer && <div style={{ padding: '12px 22px 14px', fontSize: 11.5, color: '#8A98A6', lineHeight: 1.55, borderTop: '1px solid #F1F4F7' }}>{footer}</div>}
    </div>
  );
}

function HeroCard({ bg, border, labelColor, value, valueColor, label, body }: { bg: string; border: string; labelColor: string; value: string; valueColor: string; label: string; body: string }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '20px 22px', height: 200, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase', color: labelColor, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 46, fontWeight: 700, letterSpacing: '-.03em', color: valueColor, lineHeight: 1, margin: '10px 0 6px', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 12.5, color: '#5B7186', lineHeight: 1.5 }}>{body}</div>
    </div>
  );
}

function TransitionCards({ cards }: { cards: TransitionCard[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 16 }}>
      {cards.map((t) => (
        <div key={t.label} style={{ background: '#F7FAFC', border: '1px dashed #C7D6E0', borderRadius: 10, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#43586B' }}>{t.label}</div>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#9AA7B2' }}>coming soon</div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#C7D0D8', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>—</div>
          <div style={{ fontSize: 11.5, color: '#9AA7B2', marginTop: 2 }}>{t.sub}</div>
        </div>
      ))}
    </div>
  );
}

export function DataQualityView({ d }: { d: Dashboard }) {
  const dq = d.dq;
  return (
    <>
      <KpiStrip kpis={dq.kpis} />

      <div style={{ background: '#EEF6FB', border: '1px solid #CFE6F2', borderRadius: 10, padding: '13px 18px', marginTop: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#1CABE2', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>i</div>
        <div style={{ fontSize: 12.5, color: '#2C5A75', lineHeight: 1.55 }}>
          <strong>The right concern for the right stage.</strong> While a request is being set up (Unassigned → 0% → 25%) the record is still being built — missing objectives or a lead is normal, and the only real risk is <strong>stalling</strong>. Once work formally starts (50%+) the record should be <strong>complete and consistent</strong>, and its timeliness matters against the expected completion date.
        </div>
      </div>

      {/* ===== ① Received & in review ===== */}
      <StageHeading n={1} title="Received & in review — Unassigned · 0% · 25%" bg="#0B6FA4" />
      <Intro>
        <strong>{dq.setupTotal}</strong> requests are still being set up. Missing objectives or a lead here is expected — they're defined during scoping. The concern is requests that <strong>stall</strong> before delivery starts.
      </Intro>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <div style={bigTitle}>Setup pipeline</div>
          <div style={subLabel}>where requests sit before delivery</div>
          <BucketBars rows={dq.setupFunnel} labelWidth={92} />
        </Card>
        <Card>
          <div style={bigTitle}>Time in setup</div>
          <div style={subLabel}>Unassigned: days since received · 0%/25%: days since last update</div>
          <BucketBars rows={dq.setupAging} labelWidth={92} />
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <Card>
          <div style={bigTitle}>Stalled in setup, by region</div>
          <div style={subLabel}>Unassigned &gt;14 days · 0%/25% not updated in 30+ days</div>
          <MetricBars rows={dq.stalledByRegion} labelWidth={64} trackBg="#F5EEDF" />
        </Card>
        <Card>
          <div style={bigTitle}>Stalled in setup, by practice</div>
          <div style={subLabel}>&nbsp;</div>
          <div style={{ maxHeight: 160, overflowY: 'auto', paddingRight: 6 }}><MetricBars rows={dq.stalledByPractice} labelWidth={150} trackBg="#F5EEDF" /></div>
        </Card>
      </div>

      <DqTable title="Most stalled setup requests" count={dq.stalledCount} rows={dq.stalledTable} metricLabel="Days stalled" footer={dq.stallNote} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <div style={{ background: '#EDF7F1', border: '1px solid #CDE7D8', borderRadius: 10, padding: '20px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase', color: '#2E7D5B', fontWeight: 700 }}>Ready to advance</div>
          <div style={{ fontSize: 40, fontWeight: 700, color: '#2E7D5B', lineHeight: 1, margin: '8px 0 6px', fontVariantNumeric: 'tabular-nums' }}>{dq.readyCount} <span style={{ fontSize: 16, color: '#7FA98F', fontWeight: 600 }}>/ {dq.readyOf}</span></div>
          <div style={{ fontSize: 12.5, color: '#4B6B58', lineHeight: 1.5 }}>requests at 25% already have objectives, a lead and a target date — ready to move to 50%.</div>
        </div>
        <Card>
          <div style={bigTitle}>Setup contradictions</div>
          <div style={{ height: 6 }} />
          <CheckRows items={dq.setupContradictions} />
        </Card>
      </div>

      <TransitionCards cards={dq.transitionCards} />

      {/* ===== ② Started & in delivery ===== */}
      <StageHeading n={2} title="Started & in delivery — 50% onwards" bg="#16385C" />
      <Intro>
        <strong>{dq.deliveryTotal}</strong> requests have formally started. Their records should now be <strong>complete and consistent</strong> — the flags below are real problems to fix.
      </Intro>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <div style={bigTitle}>Field completeness (50%+)</div>
          <div style={subLabel}>should all read close to 100% once work has started</div>
          <Completeness rows={dq.completeness} />
        </Card>
        <div style={{ background: '#fff', border: '1px solid #E3E9EF', borderRadius: 10, padding: '20px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A8C9C', fontWeight: 700 }}>Record quality score (50%+)</div>
          <div style={{ fontSize: 52, fontWeight: 700, color: dq.deliveryScoreColor, lineHeight: 1, margin: '10px 0 6px', fontVariantNumeric: 'tabular-nums' }}>{dq.deliveryScore}</div>
          <div style={{ fontSize: 12.5, color: '#7A8C9C' }}>{dq.deliveryScoreSub}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <Card>
          <div style={bigTitle}>Quality score by region</div>
          <div style={subLabel}>% of started records that pass every check</div>
          <QualityBars rows={dq.qualityByRegion} labelWidth={64} />
        </Card>
        <Card>
          <div style={bigTitle}>Quality score by practice</div>
          <div style={subLabel}>&nbsp;</div>
          <div style={{ maxHeight: 170, overflowY: 'auto', paddingRight: 6 }}><QualityBars rows={dq.qualityByPractice} labelWidth={150} /></div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <Card>
          <div style={bigTitle}>Flags & inconsistencies (50%+)</div>
          <div style={{ height: 6 }} />
          <CheckRows items={dq.deliveryFlags} />
        </Card>
        <Card style={{ padding: '18px 20px' }}>
          <div style={bigTitle}>Possible duplicate requests</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 12 }}>
            <div style={{ fontSize: 34, fontWeight: 700, color: '#E0A21E', fontVariantNumeric: 'tabular-nums' }}>{dq.dupCount}</div>
            <div style={{ fontSize: 12.5, color: '#7A8C9C' }}>records share the same requester <em>and</em> short description as another — review before reporting totals.</div>
          </div>
        </Card>
      </div>

      <DqTable title="Started records needing cleanup" count={dq.flagCount} rows={dq.flagTable} metricLabel="Missing / issue" />

      {/* ===== ③ Overdue, at-risk & closure ===== */}
      <StageHeading n={3} title="Overdue, at-risk & closure" bg="#C0453F" />
      <Intro>Timeliness against the expected completion date, plus records that should now be closed.</Intro>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <HeroCard bg="#FBF0EF" border="#F0D2CF" labelColor="#B0453F" value={dq.overdueCount} valueColor="#C0453F" label="Overdue" body="active requests past their expected completion date." />
        <HeroCard bg="#FCF6EA" border="#F0E2C2" labelColor="#B77A10" value={dq.atRiskCount} valueColor="#B77A10" label="At risk (next 30 days)" body="active requests whose expected completion date is within 30 days." />
      </div>

      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <div style={bigTitle}>Overdue severity — how far past the target date</div>
          <div style={{ display: 'flex', gap: 16 }}>
            {dq.overdueBuckets.map((b) => (
              <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: b.color }} /><span style={{ fontSize: 11.5, color: '#43586B' }}>{b.label}</span></div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', height: 30, borderRadius: 6, overflow: 'hidden', border: '1px solid #E3E9EF' }}>
          {dq.overdueBuckets.map((b) => (<div key={b.label} title={b.label} style={{ width: `${b.pct}%`, background: b.color }} />))}
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 10, fontSize: 12.5 }}>
          {dq.overdueBuckets.map((b) => (<span key={b.label} style={{ color: b.color, fontWeight: 700 }}>{b.n} · {b.label}</span>))}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <Card>
          <div style={bigTitle}>Overdue by region</div>
          <div style={{ height: 8 }} />
          <MetricBars rows={dq.overdueByRegion} labelWidth={64} trackBg="#F2EAE9" />
        </Card>
        <Card>
          <div style={bigTitle}>Overdue by practice</div>
          <div style={{ height: 8 }} />
          <div style={{ maxHeight: 160, overflowY: 'auto', paddingRight: 6 }}><MetricBars rows={dq.overdueByPractice} labelWidth={150} trackBg="#F2EAE9" /></div>
        </Card>
      </div>

      <DqTable title="Most overdue active requests" rows={dq.overdueTable} metricLabel="Days over" footer={dq.overdueNote} />

      <DqTable
        title="Completed or discontinued, but not closed"
        count={dq.notClosedCount}
        rows={dq.notClosedTable}
        metricLabel="Reason"
        footer="Once a TA is completed (100%) or discontinued, it should be closed. These records still have no close date."
      />
      <div style={note}>&nbsp;</div>
    </>
  );
}
