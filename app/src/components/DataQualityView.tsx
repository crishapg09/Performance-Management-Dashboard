import { useState, useEffect } from 'react';
import type { Dashboard, CheckItem, CompletenessRow, QualityRegionRow, BucketRow, DqTableRow, ReviewPracticeRow } from '../lib/dashboard';
import type { ColoredBarRow } from '../lib/aggregate';
import { Card } from './Card';
import { KpiStrip } from './KpiStrip';

const SUBTABS = [
  { id: 'received', label: 'Received & in review' },
  { id: 'delivery', label: 'Started & in delivery' },
  { id: 'overdue', label: 'Overdue & closure' },
] as const;
type DqTab = (typeof SUBTABS)[number]['id'];

const bigTitle: React.CSSProperties = { fontSize: 13.5, fontWeight: 700 };
const subLabel: React.CSSProperties = { fontSize: 11.5, color: '#9AA7B2', marginBottom: 16 };
const note: React.CSSProperties = { fontSize: 12, color: '#8A98A6', lineHeight: 1.55, marginTop: 14, borderTop: '1px solid #F1F4F7', paddingTop: 12 };

// Print-to-PDF: a letter-page layout that hides the filter bar, drops the
// horizontal scroll on tables, un-clips scroll boxes, and starts each subtab
// section on a new page. Applied only when printing; screen view is untouched.
const PRINT_CSS = `
@media print {
  @page { size: letter portrait; margin: 0.5in; }
  html, body { background: #fff !important; }
  /* force bar/chip/background colours to print (browsers strip them by default) */
  .dq-print, .dq-print * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .scr-only { display: none !important; }
  /* un-clip only the auto-scroll containers (chart lists, table bodies) so
     everything prints; leave overflow:hidden ellipsis cells truncating. */
  .dq-print [style*="auto"] { overflow: visible !important; max-height: none !important; }
  .dq-inner { min-width: 0 !important; width: 100% !important; }
  /* tighter table columns so all 8 fit a letter page (screen keeps the wide grid) */
  .dq-print .dq-grid { grid-template-columns: 74px 74px 1fr 48px 84px 50px 90px 60px !important; gap: 6px !important; padding-left: 12px !important; padding-right: 12px !important; font-size: 11px !important; }
  .dq-page + .dq-page { break-before: page; }
}
`;

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
          <div style={{ fontSize: 12, color: '#43586B', fontWeight: 600 }}>{row.label}</div>
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

function ReviewByPractice({ rows }: { rows: ReviewPracticeRow[] }) {
  if (!rows.length) return <div style={{ fontSize: 12.5, color: '#9AA7B2' }}>None in the current filter.</div>;
  return (
    <div>
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '190px 1fr 40px', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: '#43586B', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</div>
          <div style={{ height: 11, background: '#EEF2F6', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${r.barPct}%`, display: 'flex', borderRadius: 6, overflow: 'hidden' }}>
              <div title={`${r.unassigned} unassigned`} style={{ width: `${(r.unassigned / r.n) * 100}%`, background: '#E0A21E' }} />
              <div title={`${r.zero} at 0%`} style={{ width: `${(r.zero / r.n) * 100}%`, background: '#5BA3D0' }} />
            </div>
          </div>
          <div title={`${r.unassigned} unassigned · ${r.zero} at 0%`} style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.n}</div>
        </div>
      ))}
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

const dqCols = '100px 96px 1.4fr 80px 118px 66px 118px 88px';

interface TableToggle {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}

function DqTable({ title, count, rows, metricLabel, footer, toggle }: { title: string; count?: string; rows: DqTableRow[]; metricLabel: string; footer?: string; toggle?: TableToggle }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E3E9EF', borderRadius: 10, padding: '6px 0 4px', marginTop: 16, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 22px 10px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>
          {title}
          {count != null && <span style={{ color: '#C0453F' }}> ({count})</span>}
        </div>
        {toggle && (
          <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid #D5DEE6', borderRadius: 8, padding: 3, gap: 2 }}>
            {toggle.tabs.map((t) => {
              const on = toggle.active === t.id;
              return (
                <button key={t.id} onClick={() => toggle.onChange(t.id)} style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, padding: '5px 13px', borderRadius: 6, background: on ? '#16385C' : 'transparent', color: on ? '#fff' : '#5B7186' }}>{t.label}</button>
              );
            })}
          </div>
        )}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div className="dq-inner" style={{ minWidth: 940 }}>
          <div className="dq-grid" style={{ display: 'grid', gridTemplateColumns: dqCols, gap: 10, padding: '8px 22px', background: '#F6F8FA', borderTop: '1px solid #EDF1F4', borderBottom: '1px solid #EDF1F4', fontSize: 10.5, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A8C9C', fontWeight: 700 }}>
            <div>Case</div><div>Country</div><div>Details/Description</div><div>Region</div><div>Practice</div><div>Status</div><div>TA lead</div><div style={{ textAlign: 'right' }}>{metricLabel}</div>
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {rows.length === 0 && <div style={{ padding: '18px 22px', fontSize: 12.5, color: '#9AA7B2' }}>None in the current filter. 🎉</div>}
            {rows.map((r) => (
              <div key={r.id} className="dq-grid" style={{ display: 'grid', gridTemplateColumns: dqCols, gap: 10, padding: '11px 22px', borderBottom: '1px solid #F1F4F7', alignItems: 'center', fontSize: 12.5 }}>
                <div style={{ fontWeight: 600, color: '#0B5A8A', fontVariantNumeric: 'tabular-nums' }}>{r.id}</div>
                <div style={{ color: '#43586B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.office}</div>
                <div title={r.full} style={{ color: '#5B7186', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'help' }}>{r.full}</div>
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

export function DataQualityView({ d }: { d: Dashboard }) {
  const dq = d.dq;
  const [tab, setTab] = useState<DqTab>('received');
  const [closureTab, setClosureTab] = useState<'overdue' | 'notclosed'>('overdue');
  const [printing, setPrinting] = useState(false);

  // When printing, render every subtab (below) then open the browser print
  // dialog; reset once the dialog closes so the screen view returns to normal.
  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done);
    const id = window.setTimeout(() => window.print(), 80);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('afterprint', done);
    };
  }, [printing]);

  return (
    <div className="dq-print">
      <style>{PRINT_CSS}</style>
      {!printing && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <button
            onClick={() => setPrinting(true)}
            style={{ border: '1px solid #0B6FA4', background: '#0B6FA4', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, padding: '8px 16px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 7 }}
          >
            <span style={{ fontSize: 14 }}>🖨</span> Print to PDF
          </button>
        </div>
      )}
      <KpiStrip kpis={dq.kpis} />

      <div style={{ background: '#EEF6FB', border: '1px solid #CFE6F2', borderRadius: 10, padding: '13px 18px', marginTop: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#1CABE2', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>i</div>
        <div style={{ fontSize: 12.5, color: '#2C5A75', lineHeight: 1.55 }}>
          <strong>The right concern for the right stage.</strong> While a request is being reviewed (Unassigned → 0%) the record is still being built — missing details or a lead is normal, and the only real risk is <strong>stalling</strong>. Once work formally starts (25%+) the record should be <strong>complete and consistent</strong>, and its timeliness matters against the expected completion date.
        </div>
      </div>

      {/* Sub-tab bar (screen only) */}
      {!printing && (
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #DCE3EA', margin: '22px 0 6px', flexWrap: 'wrap' }}>
        {SUBTABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 16.5,
                fontWeight: 700,
                padding: '12px 20px',
                color: on ? '#0B5A8A' : '#5B7186',
                borderBottom: on ? '3px solid #0B5A8A' : '3px solid transparent',
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      )}

      {(tab === 'received' || printing) && (
      <div className="dq-page">
      {/* ===== ① Received & in review ===== */}
      <StageHeading n={1} title="Received & in review — Unassigned · 0%" bg="#0B6FA4" />
      <Intro>
        <strong>{dq.setupTotal}</strong> requests are still in review. A thin description or missing lead here is expected — they're firmed up during scoping. The concern is requests that <strong>stall</strong> before delivery starts.
      </Intro>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 16 }}>
        <Card>
          <div style={bigTitle}>Setup pipeline</div>
          <div style={subLabel}>where requests sit before delivery</div>
          <BucketBars rows={dq.setupFunnel} labelWidth={92} />
        </Card>
        <Card>
          <div style={bigTitle}>Time in setup</div>
          <div style={subLabel}>Unassigned: days since received · 0%: days since last update</div>
          <BucketBars rows={dq.setupAging} labelWidth={92} />
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 16, marginTop: 16 }}>
        <div style={{ background: '#EDF7F1', border: '1px solid #CDE7D8', borderRadius: 10, padding: '20px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase', color: '#2E7D5B', fontWeight: 700 }}>Ready to advance</div>
          <div style={{ fontSize: 40, fontWeight: 700, color: '#2E7D5B', lineHeight: 1, margin: '8px 0 6px', fontVariantNumeric: 'tabular-nums' }}>{dq.readyCount} <span style={{ fontSize: 16, color: '#7FA98F', fontWeight: 600 }}>/ {dq.readyOf}</span></div>
          <div style={{ fontSize: 12.5, color: '#4B6B58', lineHeight: 1.5 }}>requests at 0% already have a description, a lead and a target date — ready to move to 25%.</div>
        </div>
        <Card>
          <div style={bigTitle}>Setup contradictions</div>
          <div style={{ height: 6 }} />
          <CheckRows items={dq.setupContradictions} />
        </Card>
      </div>

      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={bigTitle}>In review, by practice</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#43586B' }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: '#E0A21E' }} /> Unassigned
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#43586B' }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: '#5BA3D0' }} /> At 0%
            </span>
          </div>
        </div>
        <div style={subLabel}>not yet picked up by a team, or assigned but not started</div>
        <ReviewByPractice rows={dq.reviewByPractice} />
      </Card>

      <DqTable title="All requests in review" count={dq.setupTotal} rows={dq.reviewTable} metricLabel="Days waiting" footer={dq.stallNote} />

      </div>
      )}

      {(tab === 'delivery' || printing) && (
      <div className="dq-page">
      {/* ===== ② Started & in delivery ===== */}
      <StageHeading n={2} title="Started & in delivery — 25% onwards" bg="#16385C" />
      <Intro>
        <strong>{dq.deliveryTotal}</strong> requests have formally started. Their records should now be <strong>complete and consistent</strong> — the flags below are real problems to fix.
      </Intro>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 16 }}>
        <Card>
          <div style={bigTitle}>Field completeness (25%+)</div>
          <div style={subLabel}>should all read close to 100% once work has started</div>
          <Completeness rows={dq.completeness} />
        </Card>
        <div style={{ background: '#fff', border: '1px solid #E3E9EF', borderRadius: 10, padding: '20px 22px', display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 auto' }}>
            <div style={{ fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A8C9C', fontWeight: 700 }}>Record quality score (25%+)</div>
            <div style={{ fontSize: 52, fontWeight: 700, color: dq.deliveryScoreColor, lineHeight: 1, margin: '10px 0 6px', fontVariantNumeric: 'tabular-nums' }}>{dq.deliveryScore}</div>
            <div style={{ fontSize: 12.5, color: '#7A8C9C' }}>{dq.deliveryScoreSub}</div>
          </div>
          <div style={{ flex: '1 1 180px', minWidth: 180, borderLeft: '3px solid #EEF2F6', paddingLeft: 18, fontSize: 12.5, color: '#5B7186', lineHeight: 1.55 }}>
            <strong style={{ color: '#43586B' }}>What this means:</strong> of every request that has started delivery (25%+), this is the share whose record is fully in order — a lead, a target date, a real description and the other key fields all filled in and consistent. A record counts only if it passes <em>every</em> check, so {dq.deliveryScore} is a strict "clean record" rate, not an average.
          </div>
        </div>
      </div>

      <Card style={{ marginTop: 16 }}>
        <div style={bigTitle}>Quality score by practice</div>
        <div style={subLabel}>% of started records that pass every check</div>
        <QualityBars rows={dq.qualityByPractice} labelWidth={225} />
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 16, marginTop: 16 }}>
        <Card>
          <div style={bigTitle}>Flags & inconsistencies (25%+)</div>
          <div style={{ height: 6 }} />
          <CheckRows items={dq.deliveryFlags} />
        </Card>
        <Card style={{ padding: '18px 20px' }}>
          <div style={bigTitle}>Placeholder descriptions</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 12 }}>
            <div style={{ fontSize: 34, fontWeight: 700, color: '#C0453F', fontVariantNumeric: 'tabular-nums' }}>{dq.placeholderCount}</div>
            <div style={{ fontSize: 12.5, color: '#7A8C9C' }}>
              live requests whose Details/Description is filler — &ldquo;test&rdquo;, &ldquo;N/A&rdquo;, &ldquo;please add
              a description&rdquo;. They pass a &ldquo;field is filled&rdquo; check but tell a reader nothing.
            </div>
          </div>
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

      </div>
      )}

      {(tab === 'overdue' || printing) && (
      <div className="dq-page">
      {/* ===== ③ Overdue, at-risk & closure ===== */}
      <StageHeading n={3} title="Overdue, at-risk & closure" bg="#C0453F" />
      <Intro>Timeliness against the expected completion date, plus records that should now be closed.</Intro>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 16 }}>
        <HeroCard bg="#FBF0EF" border="#F0D2CF" labelColor="#B0453F" value={dq.overdueCount} valueColor="#C0453F" label="Overdue" body="active requests past their expected completion date." />
        <HeroCard bg="#FCF6EA" border="#F0E2C2" labelColor="#B77A10" value={dq.atRiskCount} valueColor="#B77A10" label="Upcoming closure (next 30 days)" body="active requests whose expected completion date is within 30 days." />
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

      <Card style={{ marginTop: 16 }}>
        <div style={bigTitle}>Overdue by practice</div>
        <div style={{ height: 8 }} />
        <div style={{ maxHeight: 220, overflowY: 'auto', paddingRight: 6 }}><MetricBars rows={dq.overdueByPractice} labelWidth={150} trackBg="#F2EAE9" /></div>
      </Card>

      {printing ? (
        <>
          <DqTable title="Most overdue active requests" rows={dq.overdueTable} metricLabel="Days over" footer={dq.overdueNote} />
          <DqTable
            title="Completed or discontinued, but not closed"
            count={dq.notClosedCount}
            rows={dq.notClosedTable}
            metricLabel="Reason"
            footer="Once a TA is completed (100%) or discontinued, it should be closed. These records still have no close date."
          />
        </>
      ) : closureTab === 'overdue' ? (
        <DqTable
          title="Most overdue active requests"
          rows={dq.overdueTable}
          metricLabel="Days over"
          footer={dq.overdueNote}
          toggle={{ tabs: [{ id: 'overdue', label: 'Overdue' }, { id: 'notclosed', label: 'Not closed' }], active: closureTab, onChange: (id) => setClosureTab(id as 'overdue' | 'notclosed') }}
        />
      ) : (
        <DqTable
          title="Completed or discontinued, but not closed"
          count={dq.notClosedCount}
          rows={dq.notClosedTable}
          metricLabel="Reason"
          footer="Once a TA is completed (100%) or discontinued, it should be closed. These records still have no close date."
          toggle={{ tabs: [{ id: 'overdue', label: 'Overdue' }, { id: 'notclosed', label: 'Not closed' }], active: closureTab, onChange: (id) => setClosureTab(id as 'overdue' | 'notclosed') }}
        />
      )}
      <div style={note}>&nbsp;</div>
      </div>
      )}
    </div>
  );
}
