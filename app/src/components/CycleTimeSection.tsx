import { SectionHeading } from './SectionHeading';
import type { TimeCard } from '../lib/dashboard';

export function CycleTimeSection({ timeCards }: { timeCards: TimeCard[] }) {
  return (
    <>
      <SectionHeading n={2} title="Cycle time — opening, activity & closure" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {timeCards.map((t) => (
          <div key={t.label} style={{ background: '#fff', border: '1px solid #E3E9EF', borderRadius: 10, padding: '18px 20px' }}>
            <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A8C9C', fontWeight: 700 }}>{t.label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-.02em', color: '#0F2238', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
              {t.value}
            </div>
            <div style={{ fontSize: 12, color: '#7A8C9C', marginTop: 2 }}>{t.sub}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: '#EEF6FB',
          border: '1px solid #CFE6F2',
          borderRadius: 10,
          padding: '13px 18px',
          marginTop: 14,
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#1CABE2',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          i
        </div>
        <div style={{ fontSize: 12.5, color: '#2C5A75', lineHeight: 1.55 }}>
          The source export has no <strong>assignment date</strong> or <strong>date a request reached 25%</strong>.
          &ldquo;Time to update&rdquo; uses the single <em>Updated</em> timestamp as a proxy for activity, and{' '}
          <em>Opened</em> equals <em>Created</em> for every record — so true time-to-assignment cannot be measured
          until those events are captured at source.
        </div>
      </div>
    </>
  );
}
