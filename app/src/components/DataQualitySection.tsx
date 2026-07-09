import { Card } from './Card';
import { SectionHeading } from './SectionHeading';
import type { CheckItem, CompletenessRow, NoLeadTableRow } from '../lib/dashboard';

const tableRowCols = '104px 1fr 150px 90px 80px';

interface DataQualitySectionProps {
  checks: CheckItem[];
  completeness: CompletenessRow[];
  noLeadCount: number;
  noLeadTable: NoLeadTableRow[];
  noLeadEmpty: boolean;
}

export function DataQualitySection({ checks, completeness, noLeadCount, noLeadTable, noLeadEmpty }: DataQualitySectionProps) {
  return (
    <>
      <SectionHeading n={3} title="Data quality & inconsistencies" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* inconsistency checks */}
        <Card>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14 }}>Flagged inconsistencies</div>
          {checks.map((c) => (
            <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid #F1F4F7' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: c.color, fontVariantNumeric: 'tabular-nums', minWidth: 54, textAlign: 'right' }}>
                {c.n}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1F3346' }}>{c.label}</div>
                <div style={{ fontSize: 11.5, color: '#8A98A6' }}>{c.sub}</div>
              </div>
            </div>
          ))}
        </Card>
        {/* completeness */}
        <Card>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14 }}>Field completeness</div>
          {completeness.map((row) => (
            <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 48px', alignItems: 'center', gap: 10, marginBottom: 11 }}>
              <div style={{ fontSize: 12.5, color: '#43586B' }}>{row.label}</div>
              <div style={{ height: 9, background: '#EEF2F6', borderRadius: 5 }}>
                <div style={{ height: '100%', width: `${row.pct}%`, background: row.color, borderRadius: 5 }} />
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'right', color: row.color, fontVariantNumeric: 'tabular-nums' }}>
                {row.pctLabel}
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* advanced status no lead table */}
      <div style={{ background: '#fff', border: '1px solid #E3E9EF', borderRadius: 10, padding: '6px 0 4px', marginTop: 16, overflow: 'hidden' }}>
        <div style={{ fontSize: 13, fontWeight: 700, padding: '16px 22px 10px' }}>
          Advanced implementation status, but no TA lead assigned <span style={{ color: '#C0453F' }}>({noLeadCount})</span>
        </div>
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
          <div>Region</div>
          <div>Status</div>
        </div>
        {noLeadTable.map((r) => (
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
            <div style={{ color: '#43586B' }}>{r.region}</div>
            <div>
              <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: r.stBg, color: r.stFg }}>{r.status}</span>
            </div>
          </div>
        ))}
        {noLeadEmpty && <div style={{ padding: '18px 22px', fontSize: 12.5, color: '#9AA7B2' }}>No such records in the current filter.</div>}
      </div>
    </>
  );
}
