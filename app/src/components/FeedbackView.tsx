import { useMemo, useRef, useState } from 'react';
import survey from '../data/survey.json';
import { WORLD_LAND } from '../data/worldLand';
import { Card } from './Card';
import { KpiStrip } from './KpiStrip';
import { SectionHeading } from './SectionHeading';
import type { KPI } from '../lib/dashboard';

/**
 * Feedback: the REACH TA satisfaction survey, reported on its own.
 *
 * The survey identifies requests by a case number (CS…) that does not match the
 * request dataset's identifier (CSR…), so these responses are NOT joined to the
 * request portfolio and this view ignores the filter bar. Everything here is
 * computed by scripts/extract_survey.py; nothing is re-derived at render time.
 */

interface ThemeRow { label: string; n: number }
interface PosByType { label: string; Routine: number; 'Big Ticket': number; Unclassified: number }
interface Quote { t: string; th: string }
interface MapPoint {
  o: string; n: number; x: number; y: number;
  sat: number | null; qual: number | null; time: number | null; r: number;
  g?: Quote; f?: Quote;
}
interface CommentRow { o: string; t: string; x: string; p: string; i: string; f: string; s: number | null }

const S = survey as unknown as {
  kpi: { responses: number; written: number; substantive: number; improvement: number; flags: number };
  avg: { sat: number; qual: number; time: number; rec: number };
  avgN: { sat: number };
  positive: ThemeRow[]; improvement: ThemeRow[]; flags: ThemeRow[];
  posByType: PosByType[];
  map: MapPoint[]; comments: CommentRow[];
  caseTypeCounts: Record<string, number>; officeTotal: number;
};

const GREEN = '#2E7D5B';
const AMBER = '#E0A21E';
const fmt = (n: number) => n.toLocaleString('en-US');
const pct = (a: number, b: number) => Math.round((a / b) * 100);

const TYPE_COLORS: Record<string, string> = { Routine: GREEN, 'Big Ticket': '#17513B', Unclassified: '#A8D5BF' };
const TYPE_PILL: Record<string, { bg: string; fg: string }> = {
  Routine: { bg: '#E7F0F7', fg: '#0B5A8A' },
  'Big Ticket': { bg: '#E4E9EF', fg: '#16385C' },
  Unclassified: { bg: '#F0F2F5', fg: '#7A8C9C' },
};

const BANDS = [
  { id: 'a', min: 4.5, c: GREEN, l: '4.5 – 5.0' },
  { id: 'b', min: 4.0, c: '#5FA98A', l: '4.0 – 4.5' },
  { id: 'c', min: 3.5, c: AMBER, l: '3.5 – 4.0' },
  { id: 'd', min: 0, c: '#C0453F', l: 'below 3.5' },
  { id: 'n', min: null as number | null, c: '#AEBCC7', l: 'no rating' },
];
const bandOf = (v: number | null) => {
  if (v == null) return 'n';
  for (const b of BANDS) if (b.min != null && v >= b.min) return b.id;
  return 'n';
};
const colorOf = (v: number | null) => BANDS.find((b) => b.id === bandOf(v))!.c;

const cardTitle: React.CSSProperties = { fontSize: 13.5, fontWeight: 700 };
const cardSub: React.CSSProperties = { fontSize: 11.5, color: '#9AA7B2', marginBottom: 16 };
const intro: React.CSSProperties = { fontSize: 13, color: '#5B7186', margin: '2px 0 14px', maxWidth: 900, lineHeight: 1.5 };

/** Five stars with the average filled proportionally. */
function Stars({ value, size }: { value: number | null; size: number }) {
  if (value == null) return <span style={{ fontSize: 11.5, color: '#B9C4CD' }}>not rated</span>;
  const base: React.CSSProperties = { fontSize: size, lineHeight: 1, whiteSpace: 'nowrap' };
  return (
    <span role="img" aria-label={`${value.toFixed(2)} out of 5`} style={{ position: 'relative', display: 'inline-block', ...base }}>
      <span style={{ color: '#DDE4EA' }}>★★★★★</span>
      <span style={{ position: 'absolute', left: 0, top: 0, overflow: 'hidden', color: AMBER, width: `${Math.min(100, (value / 5) * 100)}%`, ...base }}>
        ★★★★★
      </span>
    </span>
  );
}

function HeroBand({ tone, big, lead, sub, stats }: {
  tone: 'good' | 'fix'; big: string; lead: string; sub: string; stats: { v: string; k: string }[];
}) {
  const t = tone === 'good'
    ? { bg: '#EDF7F1', bd: '#CDE7D8', num: GREEN, lead: '#1F5C43', sub: '#4B6B58' }
    : { bg: '#FCF6EA', bd: '#F0E2C2', num: '#B77A10', lead: '#8A6412', sub: '#6E5A2E' };
  return (
    <div style={{ background: t.bg, border: `1px solid ${t.bd}`, borderRadius: 10, padding: '22px 24px', display: 'flex', alignItems: 'center', gap: 26, flexWrap: 'wrap' }}>
      <div style={{ fontSize: 60, fontWeight: 700, letterSpacing: '-.03em', color: t.num, lineHeight: .95, fontVariantNumeric: 'tabular-nums' }}>{big}</div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: t.lead, lineHeight: 1.35 }}>{lead}</div>
        <div style={{ fontSize: 12.5, color: t.sub, lineHeight: 1.55, marginTop: 5, maxWidth: 470 }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', gap: 26, marginLeft: 'auto', flexWrap: 'wrap' }}>
        {stats.map((s) => (
          <div key={s.k}>
            <div style={{ fontSize: 26, fontWeight: 700, color: t.num, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{s.v}</div>
            <div style={{ fontSize: 11.5, color: t.sub, marginTop: 2 }}>{s.k}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Quotes({ tone, items }: { tone: 'good' | 'fix'; items: { t: string; o: string; c: string }[] }) {
  const rule = tone === 'good' ? GREEN : AMBER;
  const mark = tone === 'good' ? '#A8D5BF' : '#EBCB86';
  const who = tone === 'good' ? GREEN : '#B77A10';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 14, marginTop: 16 }}>
      {items.map((q) => (
        <figure key={q.t} style={{ margin: 0, background: '#fff', border: '1px solid #E3E9EF', borderLeft: `3px solid ${rule}`, borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div aria-hidden="true" style={{ fontSize: 26, lineHeight: .6, color: mark, fontWeight: 700 }}>&ldquo;</div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: '#43586B' }}>{q.t}</p>
          <figcaption style={{ fontSize: 11.5, color: '#9AA7B2', marginTop: 'auto' }}>
            <b style={{ color: who }}>{q.o}</b> &middot; {q.c}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/** A ranked bar row; segments are clickable and drive the comment table. */
function RankedBars({ rows, tone, onPick, active }: {
  rows: { label: string; n: number; segs?: { key: string; n: number; color: string }[]; rank: string }[];
  tone: 'good' | 'fix';
  onPick: (label: string, type?: string) => void;
  active: { label: string; type?: string } | null;
}) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  const badge = tone === 'good'
    ? { on: { background: GREEN, color: '#fff' }, off: { background: '#E4F1EA', color: GREEN } }
    : { on: { background: AMBER, color: '#fff' }, off: { background: '#FAEFD6', color: '#B77A10' } };
  const track = tone === 'good' ? '#EDF2F0' : '#F2EEE6';
  const value = tone === 'good' ? GREEN : '#B77A10';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {rows.map((r, i) => {
        const segs = r.segs ?? [{ key: '', n: r.n, color: tone === 'good' ? GREEN : i === 0 ? '#CD8A12' : AMBER }];
        return (
          <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '26px minmax(0,210px) 1fr 46px', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, fontSize: 11.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', ...(i === 0 && r.rank !== '·' ? badge.on : badge.off) }}>{r.rank}</div>
            <div title={r.label} style={{ fontSize: 12.5, color: i === 0 ? (tone === 'good' ? '#1F5C43' : '#8A6412') : '#43586B', fontWeight: i === 0 ? 700 : 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</div>
            <div style={{ height: 18, background: track, borderRadius: 9, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round((r.n / max) * 100)}%`, display: 'flex', borderRadius: 9, overflow: 'hidden' }}>
                {segs.map((s) => {
                  const on = !!active && active.label === r.label && (active.type ?? '') === s.key;
                  const dim = !!active && !on;
                  return (
                    <button
                      key={s.key}
                      onClick={() => onPick(r.label, s.key || undefined)}
                      title={`${s.n}${s.key ? ' ' + s.key : ''} — click to read these comments`}
                      aria-label={`${r.label}${s.key ? ', ' + s.key : ''}: ${s.n} comments. Show them in the table below.`}
                      style={{ width: `${(s.n / r.n) * 100}%`, background: s.color, border: 'none', padding: 0, height: '100%', display: 'block', cursor: 'pointer', fontFamily: 'inherit', opacity: dim ? .32 : 1, boxShadow: on ? 'inset 0 0 0 2px #0F2238' : undefined }}
                    />
                  );
                })}
              </div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, textAlign: 'right', color: value, fontVariantNumeric: 'tabular-nums' }}>{r.n}</div>
          </div>
        );
      })}
    </div>
  );
}

export function FeedbackView() {
  const [sel, setSel] = useState<{ kind: 'pos' | 'imp' | 'flag'; label: string | null; type?: string } | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  const [band, setBand] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const k = S.kpi;
  const kpis: KPI[] = [
    { label: 'Survey responses', value: fmt(k.responses), sub: `across ${S.officeTotal} country offices`, accent: '#1CABE2', color: '#0F2238' },
    { label: 'Written comments', value: fmt(k.written), sub: `${pct(k.written, k.responses)}% of respondents wrote something`, accent: '#0B6FA4', color: '#0F2238' },
    { label: 'Substantive comments', value: fmt(k.substantive), sub: 'excludes “N/A” and non-answers', accent: '#16385C', color: '#0F2238' },
    { label: 'Improvement opportunities', value: fmt(k.improvement), sub: `${pct(k.improvement, k.written)}% of comments name something to fix`, accent: AMBER, color: '#B77A10' },
    { label: 'Data-quality flags', value: fmt(k.flags), sub: 'cancelled, misassigned or unevaluable', accent: '#C0453F', color: '#C0453F' },
  ];

  const mapPts = useMemo(() => [...S.map].sort((a, b) => b.n - a.n), []);
  const maxN = Math.max(1, ...mapPts.map((p) => p.n));
  const rOf = (n: number) => 3.4 + Math.sqrt(n / maxN) * 13;
  const bandCounts = useMemo(() => {
    const c: Record<string, number> = {};
    mapPts.forEach((p) => { const b = bandOf(p.sat); c[b] = (c[b] ?? 0) + 1; });
    return c;
  }, [mapPts]);

  const posTotal = S.positive.reduce((s, r) => s + r.n, 0);
  const posComments = S.comments.filter((c) => c.p).length;
  const impTop2 = S.improvement.filter((r) => !/^other/i.test(r.label)).slice(0, 2).reduce((s, r) => s + r.n, 0);

  const impRows = useMemo(() => {
    const rows = [...S.improvement].sort((a, b) => {
      const ao = /^other/i.test(a.label), bo = /^other/i.test(b.label);
      if (ao !== bo) return ao ? 1 : -1;      // "Other" always last: it is the least actionable row
      return b.n - a.n;
    });
    return rows.map((r, i) => ({ label: r.label, n: r.n, rank: /^other/i.test(r.label) ? '·' : String(i + 1) }));
  }, []);

  const visible = S.comments.filter((c) => {
    if (!sel) return true;
    if (sel.kind === 'pos') {
      const has = c.p.split(';').map((s) => s.trim()).includes(sel.label ?? '');
      return has && (!sel.type || c.t === sel.type);
    }
    if (sel.kind === 'imp') return c.i === sel.label;
    return sel.label == null ? !!c.f : c.f === sel.label;
  });

  const jump = () => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const pickTheme = (kind: 'pos' | 'imp', label: string, type?: string) => {
    setSel((s) => (s && s.kind === kind && s.label === label && s.type === type ? null : { kind, label, type }));
    jump();
  };
  const selected = pick != null ? mapPts[pick] : null;

  return (
    <>
      <KpiStrip kpis={kpis} />

      {/* average ratings */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(230px, 100%), 1fr))', background: '#fff', border: '1px solid #E3E9EF', borderRadius: 10, overflow: 'hidden', marginTop: 14 }}>
        {[
          { k: 'Overall satisfaction', v: S.avg.sat, of: 'out of 5', big: true },
          { k: 'Quality of the assistance', v: S.avg.qual, of: 'out of 5' },
          { k: 'Timeliness', v: S.avg.time, of: 'out of 5' },
          { k: 'Would recommend', v: S.avg.rec, of: 'out of 10', ten: true },
        ].map((c, i) => (
          <div key={c.k} style={{ padding: '18px 22px', borderLeft: i ? '1px solid #F1F4F7' : undefined, background: c.big ? '#FDFAF4' : undefined }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0F2238' }}>{c.k}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
              <span style={{ fontSize: c.big ? 38 : 27, fontWeight: 700, color: c.big ? '#B77A10' : '#0F2238', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {c.ten ? c.v.toFixed(1) : c.v.toFixed(2)}
              </span>
              <span style={{ fontSize: 12.5, color: '#9AA7B2' }}>{c.of}</span>
            </div>
            <div style={{ marginTop: 9 }}><Stars value={c.ten ? c.v / 2 : c.v} size={c.big ? 30 : 15} /></div>
            <div style={{ fontSize: 11.5, color: '#9AA7B2', marginTop: 7 }}>
              {c.ten ? 'net promoter scale, shown on 5 stars' : `${S.avgN.sat} rated responses`}
            </div>
          </div>
        ))}
      </div>

      {/* 1 — who responded */}
      <SectionHeading n={1} title="Who responded" />
      <div style={intro}>
        {fmt(k.responses)} responses from {S.officeTotal} country offices &mdash; {S.caseTypeCounts.Routine} Routine,{' '}
        {S.caseTypeCounts['Big Ticket']} Big Ticket and {S.caseTypeCounts.Unclassified} whose case type could not be
        matched. Roughly a third of comments in every group raise something to improve, so the picture below holds
        regardless of case type.
      </div>

      <Card>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={cardTitle}>Where responses came from</div>
            <div style={{ ...cardSub, marginBottom: 0 }}>
              {mapPts.length} country offices &middot; size is the number of responses, colour is the average rating &middot; click a bubble to read its feedback
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {BANDS.filter((b) => bandCounts[b.id]).map((b) => {
              const on = band === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => { setBand(on ? null : b.id); if (!on && selected && bandOf(selected.sat) !== b.id) setPick(null); }}
                  aria-pressed={on}
                  title={`Show only offices rated ${b.l}`}
                  style={{ border: `1px solid ${on ? '#0F2238' : 'transparent'}`, background: on ? '#0F2238' : 'transparent', borderRadius: 7, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11.5, color: on ? '#fff' : '#43586B', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: band && !on ? .45 : 1 }}
                >
                  <span style={{ width: 11, height: 11, borderRadius: 3, background: b.c, display: 'inline-block' }} />
                  {b.l} <span style={{ color: on ? '#A9BDCE' : '#9AA7B2', fontVariantNumeric: 'tabular-nums' }}>{bandCounts[b.id]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 316px', gap: 16, marginTop: 16, alignItems: 'start' }}>
          <svg viewBox="0 78 1000 312" role="img" aria-label="World map of survey responses by country office" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto', display: 'block', border: '1px solid #DCE6EE', borderRadius: 10 }}>
            <defs>
              <linearGradient id="seaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F2F8FC" /><stop offset="100%" stopColor="#E4EFF7" /></linearGradient>
              <linearGradient id="landFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#E7EDF2" /><stop offset="100%" stopColor="#D6E0E8" /></linearGradient>
              <filter id="dotShadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#0F2238" floodOpacity=".28" /></filter>
            </defs>
            <rect x="0" y="0" width="1000" height="500" fill="url(#seaFill)" />
            {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lon) => (
              <path key={`v${lon}`} d={`M${(lon + 180) / 360 * 1000} 0L${(lon + 180) / 360 * 1000} 500`} fill="none" stroke="#CFE0EC" strokeWidth=".4" opacity=".65" vectorEffect="non-scaling-stroke" />
            ))}
            {[-60, -30, 0, 30, 60].map((lat) => (
              <path key={`h${lat}`} d={`M0 ${(90 - lat) / 180 * 500}L1000 ${(90 - lat) / 180 * 500}`} fill="none" stroke="#CFE0EC" strokeWidth=".4" opacity=".65" vectorEffect="non-scaling-stroke" />
            ))}
            <path d={WORLD_LAND} fill="url(#landFill)" stroke="#fff" strokeWidth=".4" vectorEffect="non-scaling-stroke" />
            <g filter="url(#dotShadow)">
              {mapPts.map((p, i) => {
                if (band && bandOf(p.sat) !== band) return null;
                const on = pick === i;
                return (
                  <circle
                    key={p.o}
                    cx={p.x} cy={p.y} r={rOf(p.n)}
                    fill={colorOf(p.sat)} fillOpacity={.88}
                    stroke={on ? '#0F2238' : '#fff'} strokeWidth={on ? 2.2 : 1.1}
                    vectorEffect="non-scaling-stroke"
                    tabIndex={0} role="button"
                    aria-label={`${p.o}, ${p.n} response${p.n === 1 ? '' : 's'}${p.sat == null ? ', no rating yet' : `, average ${p.sat} out of 5`}. Select to read its feedback.`}
                    onClick={() => setPick(on ? null : i)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPick(on ? null : i); } }}
                    style={{ cursor: 'pointer', opacity: pick != null && !on ? .3 : 1, transition: 'opacity .15s' }}
                  />
                );
              })}
            </g>
          </svg>

          <aside aria-live="polite" style={{ background: '#FAFCFD', border: '1px solid #E3E9EF', borderRadius: 10, padding: '16px 18px', minHeight: 320, maxHeight: 520, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!selected ? (
              <div style={{ fontSize: 12.5, color: '#9AA7B2', lineHeight: 1.6, margin: 'auto 0', textAlign: 'center' }}>
                <span aria-hidden="true" style={{ display: 'block', fontSize: 26, marginBottom: 8, opacity: .5 }}>☉</span>
                Select a country office on the map to read what colleagues there said worked, and what needs improvement.
              </div>
            ) : (
              <>
                <div>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F2238' }}>{selected.o}</h4>
                  <div style={{ fontSize: 11.5, color: '#9AA7B2', marginTop: 3 }}>
                    {selected.n} response{selected.n === 1 ? '' : 's'}{selected.r ? ` · ${selected.r} rated` : ''}
                  </div>
                </div>
                {selected.sat == null ? (
                  <div style={{ fontSize: 12, color: '#9AA7B2', fontStyle: 'italic' }}>No ratings from this office yet.</div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', padding: '10px 0', borderTop: '1px solid #F1F4F7', borderBottom: '1px solid #F1F4F7' }}>
                      {([['Satisfaction', selected.sat], ['Quality', selected.qual], ['Timeliness', selected.time]] as [string, number | null][])
                        .filter(([, v]) => v != null)
                        .map(([kk, v]) => (
                          <div key={kk}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#0F2238', fontVariantNumeric: 'tabular-nums' }}>{v!.toFixed(2)}</div>
                            <div style={{ fontSize: 10.5, color: '#9AA7B2', textTransform: 'uppercase', letterSpacing: '.05em' }}>{kk}</div>
                          </div>
                        ))}
                    </div>
                    <div><Stars value={selected.sat} size={15} /></div>
                  </>
                )}
                {([['good', 'What worked', selected.g], ['fix', 'What needs improvement', selected.f]] as ['good' | 'fix', string, Quote | undefined][])
                  .map(([tone, hd, q]) => {
                    const st = tone === 'good'
                      ? { background: '#EDF7F1', border: '1px solid #CDE7D8', color: '#2C4C3C', hd: GREEN }
                      : { background: '#FCF6EA', border: '1px solid #F0E2C2', color: '#5E4D22', hd: '#B77A10' };
                    return (
                      <div key={hd} style={{ borderRadius: 8, padding: '11px 13px', fontSize: 12.5, lineHeight: 1.55, background: st.background, border: st.border, color: st.color }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5, color: st.hd }}>{hd}</div>
                        {q ? (<>&ldquo;{q.t}&rdquo;<div style={{ fontSize: 11, marginTop: 6, opacity: .75 }}>{q.th}</div></>)
                          : <span style={{ color: '#9AA7B2', fontStyle: 'italic' }}>No comment recorded.</span>}
                      </div>
                    );
                  })}
              </>
            )}
          </aside>
        </div>
      </Card>

      {/* 2 — what is working well */}
      <SectionHeading n={2} title="What is working well" bg={GREEN} />
      <HeroBand
        tone="good"
        big={fmt(posTotal)}
        lead="things colleagues told us we got right"
        sub={`Across ${k.written} written comments from ${S.officeTotal} country offices. Three in four people who wrote something took the time to name what worked.`}
        stats={[
          { v: fmt(posComments), k: 'colleagues said so' },
          { v: fmt(S.positive[0].n), k: `praised ${S.positive[0].label.toLowerCase().split(' and ')[0]}` },
          { v: fmt(S.positive[2].n), k: 'called us responsive' },
        ]}
      />
      <Quotes tone="good" items={[
        { t: 'Responsive CoE staff who took the time to review the document. We appreciate her support!', o: 'Nigeria', c: 'Routine' },
        { t: "The flexibility from CoE colleagues in adapting to Honduras' specific requirements has been a key factor in meeting the outcomes on time.", o: 'Honduras', c: 'Routine' },
        { t: 'The commitment of the supporting team led to timely submission of the Digital Learning National Strategy.', o: 'Benin', c: 'Big Ticket' },
      ]} />
      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={cardTitle}>What they praised, by case type</div>
            <div style={{ ...cardSub, marginBottom: 0 }}>one comment can carry several themes &middot; click a segment to read those comments</div>
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {(['Routine', 'Big Ticket', 'Unclassified'] as const).map((t) => (
              <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#43586B' }}>
                <span style={{ width: 11, height: 11, borderRadius: 3, background: TYPE_COLORS[t] }} /> {t}
              </span>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <RankedBars
            tone="good"
            rows={S.posByType.map((r, i) => ({
              label: r.label,
              n: r.Routine + r['Big Ticket'] + r.Unclassified,
              rank: String(i + 1),
              segs: (['Routine', 'Big Ticket', 'Unclassified'] as const)
                .filter((t) => r[t])
                .map((t) => ({ key: t, n: r[t], color: TYPE_COLORS[t] })),
            }))}
            onPick={(label, type) => pickTheme('pos', label, type)}
            active={sel?.kind === 'pos' ? { label: sel.label!, type: sel.type } : null}
          />
        </div>
      </Card>

      {/* 3 — what to improve */}
      <SectionHeading n={3} title="What to improve" bg={AMBER} />
      <HeroBand
        tone="fix"
        big={fmt(k.improvement)}
        lead="specific things colleagues asked us to change"
        sub="Seven in ten written comments raised nothing to fix at all. Of those that did, nearly half point at the same two things — so a small number of changes would answer most of them."
        stats={[
          { v: `${pct(impTop2, k.improvement)}%`, k: 'come from two themes' },
          { v: fmt(impRows[0].n), k: 'want earlier engagement' },
          { v: fmt(impRows[1].n), k: 'want closer expertise matching' },
        ]}
      />
      <Quotes tone="fix" items={[
        { t: 'Further ensure that the type of expertise offered fits the needs expressed. The request was very focused; the support provided was quite generic.', o: 'Iraq', c: 'Unclassified' },
        { t: 'What worked: the sharing of documents, information and resource materials. What can be improved: tailor it a bit more to the country context, as it is a bit generic.', o: 'Nepal', c: 'Unclassified' },
        { t: 'Availability of the consultant and experts and strong technical guidance. Area for improvement: language — the experts do not speak French, so they cannot effectively support government partners.', o: 'Niger', c: 'Unclassified' },
      ]} />
      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={cardTitle}>Where colleagues asked for change</div>
            <div style={{ ...cardSub, marginBottom: 0 }}>one primary theme per comment &middot; click a bar to read those comments</div>
          </div>
          <div style={{ fontSize: 11.5, color: '#9AA7B2' }}>&ldquo;Other&rdquo; is listed last</div>
        </div>
        <div style={{ marginTop: 16 }}>
          <RankedBars
            tone="fix"
            rows={impRows}
            onPick={(label) => pickTheme('imp', label)}
            active={sel?.kind === 'imp' ? { label: sel.label! } : null}
          />
        </div>
      </Card>

      {/* 4 — the comments */}
      <SectionHeading n={4} title="In their own words" bg="#16385C" />
      <div style={intro}>
        Every substantive comment, with its rating and the themes it was coded to. Selecting a bar in the sections above
        filters this list; use it to read the raw feedback behind any number on this page.
      </div>

      <div ref={tableRef} style={{ background: '#fff', border: '1px solid #E3E9EF', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 22px 10px', flexWrap: 'wrap' }}>
          <div style={cardTitle}>
            {!sel ? 'All substantive comments' : sel.label == null ? 'Flagged for data quality' : `${sel.label}${sel.type ? ' — ' + sel.type : ''}`}
            <span style={{ color: '#C0453F' }}> ({fmt(visible.length)})</span>
          </div>
          {sel && (
            <button onClick={() => setSel(null)} style={{ border: '1px solid #D5DEE6', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, padding: '6px 13px', borderRadius: 8, color: '#5B7186' }}>
              × Clear selection
            </button>
          )}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr>
                {['Country office', 'Case type', 'Rating', 'Comment'].map((h, i) => (
                  <th key={h} style={{ background: '#F6F8FA', borderTop: '1px solid #EDF1F4', borderBottom: '1px solid #EDF1F4', fontSize: 10.5, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A8C9C', fontWeight: 700, textAlign: 'left', padding: '8px 22px', whiteSpace: 'nowrap', width: [150, 110, 130, undefined][i] }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((c, i) => {
                const p = TYPE_PILL[c.t] ?? TYPE_PILL.Unclassified;
                return (
                  <tr key={`${c.o}-${i}`}>
                    <td style={{ borderBottom: '1px solid #F1F4F7', padding: '11px 22px', fontSize: 12.5, color: '#43586B', verticalAlign: 'top' }}>{c.o}</td>
                    <td style={{ borderBottom: '1px solid #F1F4F7', padding: '11px 22px', verticalAlign: 'top' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: p.bg, color: p.fg, whiteSpace: 'nowrap' }}>{c.t}</span>
                    </td>
                    <td style={{ borderBottom: '1px solid #F1F4F7', padding: '11px 22px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                      <Stars value={c.s} size={13} />
                      {c.s != null && <span style={{ fontSize: 12, fontWeight: 700, color: '#B77A10', fontVariantNumeric: 'tabular-nums', marginLeft: 6 }}>{c.s.toFixed(0)}</span>}
                    </td>
                    <td style={{ borderBottom: '1px solid #F1F4F7', padding: '11px 22px', fontSize: 12.5, verticalAlign: 'top' }}>
                      <div style={{ lineHeight: 1.5, color: '#5B7186', maxWidth: 640 }}>{c.x}</div>
                      {(c.p || c.i || c.f) && (
                        <div style={{ marginTop: 5, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {c.p.split(';').map((t) => t.trim()).filter(Boolean).map((t) => (
                            <span key={t} style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 5, background: '#EDF3F8', color: '#2C5A75', whiteSpace: 'nowrap' }}>{t}</span>
                          ))}
                          {c.i && <span style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 5, background: '#FCF3E4', color: '#8A6412', whiteSpace: 'nowrap' }}>{c.i}</span>}
                          {c.f && <span style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 5, background: '#FBEDEC', color: '#9B3A35', whiteSpace: 'nowrap' }}>{c.f}</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!visible.length && (
                <tr><td colSpan={4} style={{ padding: '18px 22px', fontSize: 12.5, color: '#9AA7B2' }}>No comments match this selection.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 22px 14px', fontSize: 11.5, color: '#8A98A6', lineHeight: 1.55, borderTop: '1px solid #F1F4F7' }}>
          Substantive comments only — blanks and non-answers such as “N/A” or a single punctuation mark are excluded.
          Theme coding is a rapid descriptive synthesis, not formal qualitative research coding. Names and email
          addresses are excluded from the source workbook.
        </div>
      </div>

      {/* data-quality note */}
      <div style={{ background: '#fff', border: '1px solid #E3E9EF', borderLeft: '3px solid #C0453F', borderRadius: 10, padding: '18px 22px', marginTop: 16 }}>
        <div style={{ ...cardTitle, marginBottom: 4 }}>A note on data</div>
        <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#5B7186', lineHeight: 1.6, maxWidth: 760 }}>
          {k.flags} of the {fmt(k.responses)} responses describe requests that were cancelled, misassigned, or that the
          respondent could not evaluate. They are counted separately and excluded from the themes above: reading them as
          dissatisfaction would understate the service, and they belong in the data-quality workstream rather than in
          service feedback.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
          {S.flags.map((f) => (
            <div key={f.label} style={{ border: '1px solid #F1F4F7', borderRadius: 8, padding: '9px 14px', display: 'flex', alignItems: 'baseline', gap: 8, background: '#FCFAFA' }}>
              <span style={{ fontSize: 19, fontWeight: 700, color: '#C0453F', fontVariantNumeric: 'tabular-nums' }}>{f.n}</span>
              <span style={{ fontSize: 12, color: '#43586B' }}>{f.label}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => { setSel({ kind: 'flag', label: null }); jump(); }}
          style={{ marginTop: 14, border: '1px solid #D5DEE6', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, padding: '6px 13px', borderRadius: 8, color: '#5B7186' }}
        >
          View these {k.flags} responses in the table above
        </button>
      </div>
    </>
  );
}
