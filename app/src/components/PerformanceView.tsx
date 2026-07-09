import type { Dashboard, StackedRow } from '../lib/dashboard';
import { Card } from './Card';
import { SectionHeading } from './SectionHeading';
import { KpiStrip } from './KpiStrip';
import { BarList } from './BarList';

const cardTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, marginBottom: 14 };
const bigCardTitle: React.CSSProperties = { fontSize: 13.5, fontWeight: 700 };
const whatSays: React.CSSProperties = {
  fontSize: 12,
  color: '#8A98A6',
  lineHeight: 1.55,
  marginTop: 14,
  borderTop: '1px solid #F1F4F7',
  paddingTop: 12,
};

function HeroCard({ bg, border, labelColor, value, valueColor, label, body, bodyColor }: {
  bg: string; border: string; labelColor: string; value: number | string; valueColor: string; label: string; body: string; bodyColor: string;
}) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '20px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase', color: labelColor, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: '-.03em', color: valueColor, lineHeight: 1, margin: '10px 0 6px', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 12.5, color: bodyColor, lineHeight: 1.5 }}>{body}</div>
    </div>
  );
}

const tableCols = '100px 110px 1.5fr 124px 96px 64px 74px 120px 80px';

export function PerformanceView({ d, onTableView }: { d: Dashboard; onTableView: (view: 'new' | 'overdue') => void }) {
  return (
    <>
      <KpiStrip kpis={d.kpis} />

      {/* ===== SECTION 1: DEMAND & STATUS ===== */}
      <SectionHeading n={1} title="Demand, delivery & status" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* opened vs closed by month */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            <div style={bigCardTitle}>Requests opened vs. closed, by month (2026)</div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: '#0B6FA4' }} /><span style={{ fontSize: 11.5, color: '#43586B' }}>Opened</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: '#2E7D5B' }} /><span style={{ fontSize: 11.5, color: '#43586B' }}>Closed</span></div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, padding: '0 6px' }}>
            {d.ioMonths.map((m) => (
              <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    {m.hasNote && (
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#0B6FA4', background: '#EAF2F8', border: '1px solid #CFE0EE', borderRadius: 5, padding: '2px 7px', marginBottom: 2, whiteSpace: 'nowrap' }}>import into REACH</div>
                    )}
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: '#0B6FA4', fontVariantNumeric: 'tabular-nums' }}>{m.in}</div>
                    <div style={{ width: 30, height: m.inH, minHeight: 2, background: '#0B6FA4', borderRadius: '4px 4px 0 0' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: '#2E7D5B', fontVariantNumeric: 'tabular-nums' }}>{m.out}</div>
                    <div style={{ width: 30, height: m.outH, minHeight: 2, background: '#2E7D5B', borderRadius: '4px 4px 0 0' }} />
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: '#5B7186', fontWeight: 600 }}>{m.label}</div>
              </div>
            ))}
          </div>
          <div style={whatSays}>
            <strong style={{ color: '#5B7186' }}>What this says:</strong> every month the blue bar (new demand) towers over the green bar (completed work), the active backlog grows. In the current filter, <strong style={{ color: '#0B6FA4' }}>{d.ioOpenedTotal}</strong> requests were opened since April against <strong style={{ color: '#2E7D5B' }}>{d.ioClosedTotal}</strong> closed.
          </div>
        </Card>

        {/* completion vs target */}
        <Card>
          <div style={{ ...bigCardTitle, marginBottom: 14 }}>Completion vs. expected date</div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22, height: 'calc(100% - 34px)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A8C9C', fontWeight: 700, marginBottom: 8 }}>Active requests</div>
              <div style={{ display: 'flex', height: 30, borderRadius: 6, overflow: 'hidden', border: '1px solid #E3E9EF' }}>
                <div title="On track" style={{ width: `${d.onTrackPct}%`, background: '#3E9CD6' }} />
                <div title="Past target" style={{ width: `${d.overduePct}%`, background: '#C0453F' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12 }}>
                <span style={{ color: '#3E9CD6', fontWeight: 700 }}>{d.onTrack} on track</span>
                <span style={{ color: '#C0453F', fontWeight: 700 }}>{d.overdue} overdue</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A8C9C', fontWeight: 700, marginBottom: 8 }}>Completed (100%)</div>
              <div style={{ display: 'flex', height: 30, borderRadius: 6, overflow: 'hidden', border: '1px solid #E3E9EF' }}>
                <div title="On time" style={{ width: `${d.onTimePct}%`, background: '#2E7D5B' }} />
                <div title="Late" style={{ width: `${d.latePct}%`, background: '#E0A21E' }} />
                <div title="No close date" style={{ width: `${d.noEndPct}%`, background: '#D6E0E8' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12 }}>
                <span style={{ color: '#2E7D5B', fontWeight: 700 }}>{d.onTime} on time</span>
                <span style={{ color: '#E0A21E', fontWeight: 700 }}>{d.late} late</span>
              </div>
              <div style={{ fontSize: 11, color: '#9AA7B2', marginTop: 3 }}>{d.noEnd} marked 100% with no close date</div>
            </div>
          </div>
        </Card>
      </div>

      {/* received last 30 days */}
      <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1fr 1fr', gap: 16, marginTop: 16 }}>
        <HeroCard bg="#EAF2F8" border="#CFE0EE" labelColor="#0B6FA4" value={d.recent} valueColor="#0B6FA4" label="Received in last 30 days" body="new TA requests opened between 6 Jun and 6 Jul 2026." bodyColor="#3E6178" />
        <Card><div style={cardTitle}>New by region</div><BarList rows={d.recentByRegion} labelWidth={64} trackBg="#E9F0F6" /></Card>
        <Card><div style={cardTitle}>New by practice</div><BarList rows={d.recentByPractice} labelWidth={150} trackBg="#E9F0F6" /></Card>
      </div>

      {/* active on track */}
      <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1fr 1fr', gap: 16, marginTop: 16 }}>
        <HeroCard bg="#EAF2F8" border="#CFE0EE" labelColor="#3E9CD6" value={d.onTrack} valueColor="#3E9CD6" label="Active & on track" body="requests in progress whose expected completion date has not yet passed." bodyColor="#3E6178" />
        <Card><div style={cardTitle}>On track by region</div><BarList rows={d.onTrackByRegion} labelWidth={64} trackBg="#E4EFF6" /></Card>
        <Card><div style={cardTitle}>On track by practice</div><BarList rows={d.onTrackByPractice} labelWidth={150} trackBg="#E4EFF6" /></Card>
      </div>

      {/* overdue */}
      <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1fr 1fr', gap: 16, marginTop: 16 }}>
        <HeroCard bg="#FBF0EF" border="#F0D2CF" labelColor="#B0453F" value={d.overdue} valueColor="#C0453F" label="Should be closed by now" body="active requests are past their expected completion date but not yet at 100%." bodyColor="#8A5450" />
        <Card><div style={cardTitle}>Overdue by region</div><BarList rows={d.overdueByRegion} labelWidth={64} trackBg="#F2EAE9" /></Card>
        <Card><div style={cardTitle}>Overdue by practice</div><BarList rows={d.overdueByPractice} labelWidth={150} trackBg="#F2EAE9" /></Card>
      </div>

      {/* overdue / new table */}
      <div style={{ background: '#fff', border: '1px solid #E3E9EF', borderRadius: 10, padding: '6px 0 4px', marginTop: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 22px 10px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{d.tableTitle}</div>
          <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid #D5DEE6', borderRadius: 8, padding: 3, gap: 2 }}>
            {d.tableToggle.map((t) => (
              <button key={t.label} onClick={() => onTableView(t.label === 'New (30d)' ? 'new' : 'overdue')} style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, padding: '5px 13px', borderRadius: 6, background: t.bg, color: t.fg }}>{t.label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: tableCols, gap: 10, padding: '8px 22px', background: '#F6F8FA', borderTop: '1px solid #EDF1F4', borderBottom: '1px solid #EDF1F4', fontSize: 10.5, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A8C9C', fontWeight: 700 }}>
          <div>Case</div><div>Country</div><div>Short description</div><div>Practice</div><div>Exp. completion</div><div>Status</div><div>State</div><div>TA lead</div><div style={{ textAlign: 'right' }}>{d.tableMetric}</div>
        </div>
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {d.overdueTable.map((r) => (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: tableCols, gap: 10, padding: '11px 22px', borderBottom: '1px solid #F1F4F7', alignItems: 'center', fontSize: 12.5 }}>
              <div style={{ fontWeight: 600, color: '#0B5A8A', fontVariantNumeric: 'tabular-nums' }}>{r.id}</div>
              <div style={{ color: '#43586B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.country}</div>
              <div title={r.full} style={{ color: '#5B7186', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'help' }}>{r.desc}</div>
              <div style={{ color: '#43586B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.practice}</div>
              <div style={{ color: '#43586B', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{r.expDate}</div>
              <div><span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: r.stBg, color: r.stFg }}>{r.status}</span></div>
              <div><span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 5, background: r.stateBg, color: r.stateFg }}>{r.state}</span></div>
              <div style={{ color: r.leadColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.lead}</div>
              <div style={{ textAlign: 'right', fontWeight: 700, color: d.tableDaysColor, fontVariantNumeric: 'tabular-nums' }}>{r.days}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 22px 14px', fontSize: 11.5, color: '#8A98A6', lineHeight: 1.55, borderTop: '1px solid #F1F4F7' }}>
          <strong style={{ color: '#5B7186' }}>Days over</strong> = today (6 Jul 2026) − the request’s Expected Completion Date, counting only active requests (implementation status below 100%) whose target date has already passed.
        </div>
      </div>

      {/* ===== SECTION 2: CYCLE TIME ===== */}
      <SectionHeading n={2} title="Cycle time — opening, activity & closure" />
      <KpiStrip kpis={d.mgmtKpis} />

      <div style={{ background: '#EEF6FB', border: '1px solid #CFE6F2', borderRadius: 10, padding: '13px 18px', marginTop: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#1CABE2', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>i</div>
        <div style={{ fontSize: 12.5, color: '#2C5A75', lineHeight: 1.55 }}>
          The source export has no <strong>assignment date</strong> or <strong>date a request reached 25%</strong>. &ldquo;Time to update&rdquo; uses the single <em>Updated</em> timestamp as a proxy for activity, and <em>Opened</em> equals <em>Created</em> for every record — so true time-to-assignment cannot be measured until those events are captured at source.
        </div>
      </div>

      {/* avg open->close by practice */}
      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={bigCardTitle}>Average open → close by practice</div>
          <div style={{ fontSize: 11.5, color: '#9AA7B2' }}>days from open to close · practices with ≥3 closed requests</div>
        </div>
        {d.cbpRows.map((row) => (
          <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '200px 1fr 76px', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{ fontSize: 12.5, color: '#43586B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.label}</div>
            <div style={{ height: 11, background: '#EEF2F6', borderRadius: 6 }}><div style={{ height: '100%', width: `${row.pct}%`, background: '#16385C', borderRadius: 6 }} /></div>
            <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}><span style={{ fontSize: 13.5, fontWeight: 700, color: '#0F2238' }}>{row.label2}</span> <span style={{ fontSize: 11, color: '#9AA7B2' }}>(n={row.count})</span></div>
          </div>
        ))}
        {d.cbpEmpty && <div style={{ fontSize: 12.5, color: '#9AA7B2' }}>No closed requests in the current filter.</div>}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 16, marginTop: 16 }}>
        {/* median days to close by month */}
        <Card>
          <div style={{ ...bigCardTitle, marginBottom: 18 }}>Median days to close, by closing month</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, padding: '0 6px' }}>
            {d.trendMonths.map((m) => (
              <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#16385C', fontVariantNumeric: 'tabular-nums' }}>{m.medLabel}</div>
                  <div style={{ width: 34, height: m.h, minHeight: 2, background: '#16385C', borderRadius: '4px 4px 0 0' }} />
                </div>
                <div style={{ fontSize: 11.5, color: '#5B7186', fontWeight: 600 }}>{m.label}</div>
                <div style={{ fontSize: 10, color: '#9AA7B2' }}>{m.nLabel}</div>
              </div>
            ))}
          </div>
          <div style={whatSays}><strong style={{ color: '#5B7186' }}>What this says:</strong> a rising line means requests are taking longer to complete; falling means the team is speeding up. Early months have few closures, so read them with caution.</div>
        </Card>
        {/* cycle time by type */}
        <Card>
          <div style={{ ...bigCardTitle, marginBottom: 18 }}>Cycle time by request type</div>
          {d.typeCycle.map((t) => (
            <div key={t.label} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1F3346' }}>{t.label}</div>
                <div style={{ fontSize: 11, color: '#9AA7B2' }}>{t.nLabel}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 48px', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: '#7A8C9C', fontWeight: 600 }}>median</div>
                <div style={{ height: 11, background: '#EEF2F6', borderRadius: 6 }}><div style={{ height: '100%', width: `${t.medPct}%`, background: '#16385C', borderRadius: 6 }} /></div>
                <div style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{t.med}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 48px', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 11, color: '#7A8C9C', fontWeight: 600 }}>p90</div>
                <div style={{ height: 11, background: '#EEF2F6', borderRadius: 6 }}><div style={{ height: '100%', width: `${t.p90Pct}%`, background: '#9CC6E0', borderRadius: 6 }} /></div>
                <div style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'right', color: '#5B7186', fontVariantNumeric: 'tabular-nums' }}>{t.p90}</div>
              </div>
            </div>
          ))}
          <div style={{ ...whatSays, marginTop: 6 }}><strong style={{ color: '#5B7186' }}>What this says:</strong> the median is the typical request; <strong>p90</strong> is the slowest 10%. A p90 far above the median means a long tail of stuck requests that averages hide.</div>
        </Card>
      </div>

      {/* ===== SECTION 3: RISK ===== */}
      <SectionHeading n={3} title="Risk — how late, and what is stuck" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <div style={{ ...bigCardTitle, marginBottom: 16 }}>Overdue severity — how far past the target date</div>
          {d.overdueBuckets.map((b) => (
            <div key={b.label} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 54px', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 12.5, color: '#43586B', fontWeight: 600 }}>{b.label}</div>
              <div style={{ height: 14, background: '#F2EAE9', borderRadius: 7 }}><div style={{ height: '100%', width: `${b.pct}%`, background: b.color, borderRadius: 7 }} /></div>
              <div style={{ fontSize: 14, fontWeight: 700, textAlign: 'right', color: b.color, fontVariantNumeric: 'tabular-nums' }}>{b.n}</div>
            </div>
          ))}
          <div style={whatSays}><strong style={{ color: '#5B7186' }}>What this says:</strong> most overdue requests are only days late — recoverable. The <strong style={{ color: '#C0453F' }}>&gt;60 days</strong> group is the real escalation list: targets there are no longer credible and need re-planning or closure.</div>
        </Card>
        <Card>
          <div style={{ ...bigCardTitle, marginBottom: 16 }}>Stalled at 0% for 30+ days, by region</div>
          {d.stalledByRegion.map((row) => (
            <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 44px', alignItems: 'center', gap: 10, marginBottom: 11 }}>
              <div style={{ fontSize: 12, color: '#43586B', fontWeight: 600 }}>{row.label}</div>
              <div style={{ height: 11, background: '#F5EEDF', borderRadius: 6 }}><div style={{ height: '100%', width: `${row.pct}%`, background: '#E0A21E', borderRadius: 6 }} /></div>
              <div style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.n}</div>
            </div>
          ))}
          <div style={whatSays}><strong style={{ color: '#5B7186' }}>What this says:</strong> these <strong style={{ color: '#B0453F' }}>{d.stalledCount}</strong> requests were accepted a month or more ago and have shown no progress at all — the earliest warning sign, before anything becomes &ldquo;overdue&rdquo;.</div>
        </Card>
      </div>

      {/* ===== SECTION 4: WORKLOAD ===== */}
      <SectionHeading n={4} title="Workload — practices, regions & staff" bg="#16385C" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <div style={{ ...bigCardTitle, marginBottom: 6 }}>Requests by practice</div>
          <StatusLegend d={d} small />
          <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr', gap: '0 4px', marginBottom: 9, fontSize: 10, letterSpacing: '.05em', textTransform: 'uppercase', color: '#9AA7B2', fontWeight: 700 }}>
            <div /><div style={{ display: 'grid', gridTemplateColumns: '1fr 38px 74px', gap: 10 }}><div /><div style={{ textAlign: 'right' }}>TAs</div><div style={{ textAlign: 'right' }}>Leads</div></div>
          </div>
          {d.byPractice.map((row) => (
            <div key={row.label} style={{ marginBottom: 11 }}>
              <div style={{ fontSize: 12, color: '#43586B', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.label}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 38px 74px', alignItems: 'center', gap: 10 }}>
                <StackTrack row={row} height={10} />
                <div style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.n}</div>
                <div style={{ fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#0B6FA4', fontWeight: 700 }}>{row.leads}</div>
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <div style={{ ...bigCardTitle, marginBottom: 6 }}>Requests by region</div>
          <StatusLegend d={d} small />
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 38px 74px', gap: 10, marginBottom: 9, fontSize: 10, letterSpacing: '.05em', textTransform: 'uppercase', color: '#9AA7B2', fontWeight: 700 }}>
            <div /><div /><div style={{ textAlign: 'right' }}>TAs</div><div style={{ textAlign: 'right' }}>Leads</div>
          </div>
          {d.byRegion.map((row) => (
            <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 38px 74px', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: '#43586B', fontWeight: 600 }}>{row.label}</div>
              <StackTrack row={row} height={10} />
              <div style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.n}</div>
              <div style={{ fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#0B6FA4', fontWeight: 700 }}>{row.leads}</div>
            </div>
          ))}
        </Card>
      </div>

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
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '9px 4px 0', fontSize: 11, color: '#7A8C9C' }}>
          <span>Min {d.loadMin}</span>
          <span style={{ color: '#0F2238', fontWeight: 700 }}>Avg {d.loadAvg}</span>
          <span>Max {d.loadMax}</span>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '11px 40px', maxHeight: 340, overflowY: 'auto', paddingRight: 6 }}>
          {d.staffBars.map((row) => (
            <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '185px 1fr 34px', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 12, color: '#43586B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.label}</div>
              <StackTrack row={row} height={11} />
              <div style={{ fontSize: 12, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.n}</div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function StatusLegend({ d, small }: { d: Dashboard; small?: boolean }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', marginBottom: 16 }}>
      {d.staffLegend.map((s) => (
        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: s.color }} />
          <span style={{ fontSize: small ? 10.5 : 11.5, color: '#5B7186' }}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function StackTrack({ row, height }: { row: StackedRow; height: number }) {
  return (
    <div style={{ height, background: '#EEF2F6', borderRadius: 5, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${row.barPct}%`, display: 'flex', borderRadius: 5, overflow: 'hidden' }}>
        {row.segs.map((s, i) => (
          <div key={i} style={{ width: `${s.w}%`, background: s.color }} />
        ))}
      </div>
    </div>
  );
}
