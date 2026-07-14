import type { Dashboard, CheckItem, CompletenessRow } from '../lib/dashboard';
import { Card } from './Card';
import { KpiStrip } from './KpiStrip';

const whatSays: React.CSSProperties = { fontSize: 12, color: '#8A98A6', lineHeight: 1.55 };

function QHeading({ n, title }: { n: number; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '34px 0 14px' }}>
      <div style={{ width: 26, height: 26, borderRadius: 7, background: '#C0453F', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
    </div>
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

const noLeadCols = '104px 1fr 150px 90px 80px';

export function DataQualityView({ d }: { d: Dashboard }) {
  return (
    <>
      <KpiStrip kpis={d.dqKpis} />

      <div style={{ background: '#EEF6FB', border: '1px solid #CFE6F2', borderRadius: 10, padding: '13px 18px', marginTop: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#1CABE2', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>i</div>
        <div style={{ fontSize: 12.5, color: '#2C5A75', lineHeight: 1.55 }}>
          This view checks the <strong>{d.dqTotal} active Country Office requests</strong> in the current filter (a further <strong>{d.coUnassigned}</strong> have no country office assigned — see the header). A record &ldquo;passes&rdquo; when all core fields are filled and its status and dates do not contradict each other.
        </div>
      </div>

      {/* Q1: contradictions */}
      <QHeading n={1} title="Records that contradict themselves" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14 }}>Status ↔ date contradictions</div>
          <CheckRows items={d.dqChecks} />
          <div style={{ ...whatSays, marginTop: 12 }}><strong style={{ color: '#5B7186' }}>What this says:</strong> each row is a record whose fields cannot both be true. Together, <strong style={{ color: '#C0453F' }}>{d.contradictionPct}</strong> of the portfolio carries a contradiction — these distort every completion metric until corrected in ServiceNow.</div>
        </Card>
        <Card>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14 }}>Flagged inconsistencies</div>
          <CheckRows items={d.checks} />
        </Card>
        <Card>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14 }}>Field completeness</div>
          <Completeness rows={d.completeness} />
        </Card>
        <Card style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 12 }}>Possible duplicate requests</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div style={{ fontSize: 34, fontWeight: 700, color: '#E0A21E', fontVariantNumeric: 'tabular-nums' }}>{d.dupCount}</div>
            <div style={{ fontSize: 12.5, color: '#7A8C9C' }}>records share the same requester <em>and</em> the same short description as another record.</div>
          </div>
          <div style={{ ...whatSays, marginTop: 10 }}><strong style={{ color: '#5B7186' }}>What this says:</strong> some may be legitimate repeat requests, but each duplicate inflates workload counts and should be reviewed before reporting totals.</div>
        </Card>
      </div>

      {/* advanced status no lead table */}
      <div style={{ background: '#fff', border: '1px solid #E3E9EF', borderRadius: 10, padding: '6px 0 4px', marginTop: 16, overflow: 'hidden' }}>
        <div style={{ fontSize: 13, fontWeight: 700, padding: '16px 22px 10px' }}>Advanced implementation status, but no TA lead assigned <span style={{ color: '#C0453F' }}>({d.noLeadCount})</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: noLeadCols, gap: 10, padding: '8px 22px', background: '#F6F8FA', borderTop: '1px solid #EDF1F4', borderBottom: '1px solid #EDF1F4', fontSize: 10.5, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A8C9C', fontWeight: 700 }}>
          <div>Case</div><div>Description</div><div>Practice</div><div>Region</div><div>Status</div>
        </div>
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {d.noLeadTable.map((r) => (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: noLeadCols, gap: 10, padding: '11px 22px', borderBottom: '1px solid #F1F4F7', alignItems: 'center', fontSize: 12.5 }}>
              <div style={{ fontWeight: 600, color: '#0B5A8A', fontVariantNumeric: 'tabular-nums' }}>{r.id}</div>
              <div style={{ color: '#5B7186', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.desc}</div>
              <div style={{ color: '#43586B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.practice}</div>
              <div style={{ color: '#43586B' }}>{r.region}</div>
              <div><span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: r.stBg, color: r.stFg }}>{r.status}</span></div>
            </div>
          ))}
        </div>
        {d.noLeadEmpty && <div style={{ padding: '18px 22px', fontSize: 12.5, color: '#9AA7B2' }}>No such records in the current filter.</div>}
      </div>

      <div style={{ fontSize: 12, color: '#8A98A6', lineHeight: 1.6, marginTop: 14 }}>
        <strong style={{ color: '#5B7186' }}>Note:</strong> {d.xsBeforeCr} records ({d.xsBeforeCrPct}) also have an expected <em>start</em> date earlier than the date the request was created — almost certainly a form default or backfilled dates, so &ldquo;lead time to start&rdquo; cannot be measured from this data. Worth raising with the ServiceNow form owner.
      </div>

      {/* Q2: freshness & ownership */}
      <QHeading n={2} title="Record freshness & quality by region" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>Stale active records, by region</div>
          <div style={{ fontSize: 11.5, color: '#9AA7B2', marginBottom: 16 }}>active requests not updated in 30+ days · {d.stale60Count} of them silent for 60+</div>
          {d.staleByRegion.map((row) => (
            <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 48px', alignItems: 'center', gap: 10, marginBottom: 11 }}>
              <div style={{ fontSize: 12, color: '#43586B', fontWeight: 600 }}>{row.label}</div>
              <div style={{ height: 11, background: '#F5EEDF', borderRadius: 6 }}><div style={{ height: '100%', width: `${row.pct}%`, background: '#E0A21E', borderRadius: 6 }} /></div>
              <div style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.n}</div>
            </div>
          ))}
          <div style={{ ...whatSays, marginTop: 14, borderTop: '1px solid #F1F4F7', paddingTop: 12 }}><strong style={{ color: '#5B7186' }}>What this says:</strong> a stale record either hides real progress (work done but not logged) or hides a stuck request. Either way the dashboard cannot be trusted for these until someone touches the record.</div>
        </Card>
        <Card>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>Record quality score, by region</div>
          <div style={{ fontSize: 11.5, color: '#9AA7B2', marginBottom: 16 }}>% of records with all core fields filled and no contradictions</div>
          {d.qualityByRegion.map((row) => (
            <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 48px', alignItems: 'center', gap: 10, marginBottom: 11 }}>
              <div style={{ fontSize: 12, color: '#43586B', fontWeight: 600 }}>{row.label}</div>
              <div style={{ height: 11, background: '#EEF2F6', borderRadius: 6 }}><div style={{ height: '100%', width: `${row.pct}%`, background: row.color, borderRadius: 6 }} /></div>
              <div style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'right', color: row.color, fontVariantNumeric: 'tabular-nums' }}>{row.pctLabel}</div>
            </div>
          ))}
          <div style={{ ...whatSays, marginTop: 14, borderTop: '1px solid #F1F4F7', paddingTop: 12 }}><strong style={{ color: '#5B7186' }}>What this says:</strong> one number per region that a focal point can own. Raising it means filling missing fields and fixing contradictions — nothing more sophisticated than housekeeping.</div>
        </Card>
      </div>

      {/* Q3: objectives */}
      <QHeading n={3} title="Missing objectives, by practice" />
      <Card>
        <div style={{ fontSize: 11.5, color: '#9AA7B2', marginBottom: 16 }}>% of requests submitted without objectives · practices ranked worst first</div>
        {d.objByPractice.map((row) => (
          <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '200px 1fr 110px', alignItems: 'center', gap: 12, marginBottom: 11 }}>
            <div style={{ fontSize: 12.5, color: '#43586B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.label}</div>
            <div style={{ height: 11, background: '#EEF2F6', borderRadius: 6 }}><div style={{ height: '100%', width: `${row.pct}%`, background: row.color, borderRadius: 6 }} /></div>
            <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}><span style={{ fontSize: 13, fontWeight: 700, color: row.color }}>{row.pctLabel}</span> <span style={{ fontSize: 11, color: '#9AA7B2' }}>({row.n} missing)</span></div>
          </div>
        ))}
        <div style={{ ...whatSays, marginTop: 14, borderTop: '1px solid #F1F4F7', paddingTop: 12 }}><strong style={{ color: '#5B7186' }}>What this says:</strong> without objectives, a request’s success can never be assessed — it can be &ldquo;completed&rdquo; but not evaluated. High percentages here point to where intake discipline needs reinforcing.</div>
      </Card>
    </>
  );
}
