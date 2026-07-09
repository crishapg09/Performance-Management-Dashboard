import { Card } from './Card';
import { SectionHeading } from './SectionHeading';
import type { ColoredBarRow } from '../lib/aggregate';

interface WorkloadSectionProps {
  byPractice: ColoredBarRow[];
  byRegion: ColoredBarRow[];
  topStaff: ColoredBarRow[];
  distinctStaff: number;
  unassigned: number;
}

export function WorkloadSection({ byPractice, byRegion, topStaff, distinctStaff, unassigned }: WorkloadSectionProps) {
  return (
    <>
      <SectionHeading n={4} title="Workload — practices, regions & staff" bg="#16385C" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14 }}>Requests by practice</div>
          {byPractice.map((row) => (
            <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '175px 1fr 38px', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: '#43586B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.label}</div>
              <div style={{ height: 9, background: '#EEF2F6', borderRadius: 5 }}>
                <div style={{ height: '100%', width: `${row.pct}%`, background: '#3E9CD6', borderRadius: 5 }} />
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.n}</div>
            </div>
          ))}
        </Card>
        <Card>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14 }}>Requests by region</div>
          {byRegion.map((row) => (
            <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 38px', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: '#43586B', fontWeight: 600 }}>{row.label}</div>
              <div style={{ height: 9, background: '#EEF2F6', borderRadius: 5 }}>
                <div style={{ height: '100%', width: `${row.pct}%`, background: '#0B6FA4', borderRadius: 5 }} />
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.n}</div>
            </div>
          ))}
        </Card>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E3E9EF', borderRadius: 10, padding: '20px 22px', marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Busiest TA lead staff</div>
          <div style={{ fontSize: 12, color: '#7A8C9C' }}>
            {distinctStaff} distinct leads &middot; <span style={{ color: '#C0453F', fontWeight: 700 }}>{unassigned}</span> requests unassigned
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 40px' }}>
          {topStaff.map((row) => (
            <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '185px 1fr 34px', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 12, color: '#43586B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.label}</div>
              <div style={{ height: 8, background: '#EEF2F6', borderRadius: 4 }}>
                <div style={{ height: '100%', width: `${row.pct}%`, background: '#5BA3D0', borderRadius: 4 }} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.n}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
