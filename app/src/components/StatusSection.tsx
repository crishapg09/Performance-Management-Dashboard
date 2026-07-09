import { Card } from './Card';
import { SectionHeading } from './SectionHeading';
import type { ColoredBarRow } from '../lib/aggregate';
import type { OverdueTableRow, StatusDistRow } from '../lib/dashboard';

const tableRowCols = '104px 1fr 150px 70px 1fr 92px';

interface StatusSectionProps {
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
}

export function StatusSection({
  statusDist,
  onTrack,
  overdue,
  onTrackPct,
  overduePct,
  onTime,
  late,
  noEnd,
  onTimePct,
  latePct,
  noEndPct,
  overdueByRegion,
  overdueByPractice,
  overdueTable,
}: StatusSectionProps) {
  return (
    <>
      <SectionHeading n={1} title="Implementation status & completion against target date" />

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 16 }}>
        {/* status distribution */}
        <Card>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14 }}>Where the portfolio stands</div>
          <div style={{ display: 'flex', height: 36, borderRadius: 8, overflow: 'hidden', border: '1px solid #E3E9EF' }}>
            {statusDist.map((s) => (
              <div key={s.label} title={s.title} style={{ width: `${s.pct}%`, background: s.color }} />
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 20px', marginTop: 16 }}>
            {statusDist.map((s) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 11, height: 11, borderRadius: 3, background: s.color, display: 'inline-block' }} />
                <span style={{ fontSize: 12.5, color: '#43586B' }}>{s.label}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{s.n}</span>
                <span style={{ fontSize: 11, color: '#9AA7B2' }}>{s.pctLabel}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* completion vs target */}
        <Card>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14 }}>Completion vs. expected date</div>
          <div style={{ display: 'flex', gap: 22 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A8C9C', fontWeight: 700, marginBottom: 8 }}>
                Active requests
              </div>
              <div style={{ display: 'flex', height: 30, borderRadius: 6, overflow: 'hidden', border: '1px solid #E3E9EF' }}>
                <div title="On track" style={{ width: `${onTrackPct}%`, background: '#3E9CD6' }} />
                <div title="Past target" style={{ width: `${overduePct}%`, background: '#C0453F' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12 }}>
                <span style={{ color: '#3E9CD6', fontWeight: 700 }}>{onTrack} on track</span>
                <span style={{ color: '#C0453F', fontWeight: 700 }}>{overdue} overdue</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A8C9C', fontWeight: 700, marginBottom: 8 }}>
                Completed (100%)
              </div>
              <div style={{ display: 'flex', height: 30, borderRadius: 6, overflow: 'hidden', border: '1px solid #E3E9EF' }}>
                <div title="On time" style={{ width: `${onTimePct}%`, background: '#2E7D5B' }} />
                <div title="Late" style={{ width: `${latePct}%`, background: '#E0A21E' }} />
                <div title="No close date" style={{ width: `${noEndPct}%`, background: '#D6E0E8' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12 }}>
                <span style={{ color: '#2E7D5B', fontWeight: 700 }}>{onTime} on time</span>
                <span style={{ color: '#E0A21E', fontWeight: 700 }}>{late} late</span>
              </div>
              <div style={{ fontSize: 11, color: '#9AA7B2', marginTop: 3 }}>{noEnd} marked 100% with no close date</div>
            </div>
          </div>
        </Card>
      </div>

      {/* overdue hero + breakdowns */}
      <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1fr 1fr', gap: 16, marginTop: 16 }}>
        <div
          style={{
            background: '#FBF0EF',
            border: '1px solid #F0D2CF',
            borderRadius: 10,
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase', color: '#B0453F', fontWeight: 700 }}>
            Should be closed by now
          </div>
          <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: '-.03em', color: '#C0453F', lineHeight: 1, margin: '10px 0 6px', fontVariantNumeric: 'tabular-nums' }}>
            {overdue}
          </div>
          <div style={{ fontSize: 12.5, color: '#8A5450', lineHeight: 1.5 }}>
            active requests are past their expected completion date but not yet at 100%.
          </div>
        </div>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Overdue by region</div>
          {overdueByRegion.map((row) => (
            <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 34px', alignItems: 'center', gap: 10, marginBottom: 9 }}>
              <div style={{ fontSize: 12, color: '#43586B', fontWeight: 600 }}>{row.label}</div>
              <div style={{ height: 9, background: '#F2EAE9', borderRadius: 5 }}>
                <div style={{ height: '100%', width: `${row.pct}%`, background: '#C0453F', borderRadius: 5 }} />
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.n}</div>
            </div>
          ))}
        </Card>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Overdue by practice</div>
          {overdueByPractice.map((row) => (
            <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 34px', alignItems: 'center', gap: 10, marginBottom: 9 }}>
              <div style={{ fontSize: 12, color: '#43586B', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {row.label}
              </div>
              <div style={{ height: 9, background: '#F2EAE9', borderRadius: 5 }}>
                <div style={{ height: '100%', width: `${row.pct}%`, background: '#C0453F', borderRadius: 5 }} />
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.n}</div>
            </div>
          ))}
        </Card>
      </div>

      {/* overdue table */}
      <div style={{ background: '#fff', border: '1px solid #E3E9EF', borderRadius: 10, padding: '6px 0 4px', marginTop: 16, overflow: 'hidden' }}>
        <div style={{ fontSize: 13, fontWeight: 700, padding: '16px 22px 10px' }}>Most overdue active requests</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: tableRowCols,
            gap: 10,
            padding: '8px 22px',
            background: '#F6F8FA',
            borderTop: '1px solid #EDF1F4',
            borderBottom: '1px solid #EDF1F4',
            fontSize: 10.5,
            letterSpacing: '.06em',
            textTransform: 'uppercase',
            color: '#7A8C9C',
            fontWeight: 700,
          }}
        >
          <div>Case</div>
          <div>Short description</div>
          <div>Practice</div>
          <div>Status</div>
          <div>TA lead</div>
          <div style={{ textAlign: 'right' }}>Days over</div>
        </div>
        {overdueTable.map((r) => (
          <div
            key={r.id}
            style={{
              display: 'grid',
              gridTemplateColumns: tableRowCols,
              gap: 10,
              padding: '11px 22px',
              borderBottom: '1px solid #F1F4F7',
              alignItems: 'center',
              fontSize: 12.5,
            }}
          >
            <div style={{ fontWeight: 600, color: '#0B5A8A', fontVariantNumeric: 'tabular-nums' }}>{r.id}</div>
            <div style={{ color: '#5B7186', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.desc}</div>
            <div style={{ color: '#43586B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.practice}</div>
            <div>
              <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: r.stBg, color: r.stFg }}>{r.status}</span>
            </div>
            <div style={{ color: r.leadColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.lead}</div>
            <div style={{ textAlign: 'right', fontWeight: 700, color: '#C0453F', fontVariantNumeric: 'tabular-nums' }}>{r.days}</div>
          </div>
        ))}
      </div>
    </>
  );
}
