import type { ChangeEvent } from 'react';
import type { SelectOption, StatusChip, TypeButton } from '../lib/dashboard';

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: '.12em',
  textTransform: 'uppercase',
  color: '#7A8C9C',
  fontWeight: 700,
  marginBottom: 6,
};

const selectStyle: React.CSSProperties = {
  fontFamily: 'inherit',
  fontSize: 12.5,
  color: '#0F2238',
  backgroundColor: '#fff',
  border: '1px solid #D5DEE6',
  borderRadius: 8,
  padding: '8px 30px 8px 12px',
  cursor: 'pointer',
};

interface FilterBarProps {
  typeBtns: TypeButton[];
  onType: (v: string) => void;
  region: string;
  regionOpts: SelectOption[];
  onRegion: (v: string) => void;
  practice: string;
  practiceOpts: SelectOption[];
  onPractice: (v: string) => void;
  lead: string;
  staffOpts: SelectOption[];
  onLead: (v: string) => void;
  statusChips: StatusChip[];
  onToggleStatus: (v: string) => void;
  onReset: () => void;
}

export function FilterBar({
  typeBtns,
  onType,
  region,
  regionOpts,
  onRegion,
  practice,
  practiceOpts,
  onPractice,
  lead,
  staffOpts,
  onLead,
  statusChips,
  onToggleStatus,
  onReset,
}: FilterBarProps) {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: 'rgba(237,241,244,.93)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #DCE3EA',
      }}
    >
      <div style={{ maxWidth: 1340, margin: '0 auto', padding: '12px 24px' }}>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* Type segmented */}
          <div>
            <div style={labelStyle}>Request type</div>
            <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid #D5DEE6', borderRadius: 8, padding: 3, gap: 2 }}>
              {typeBtns.map((t) => (
                <button
                  key={t.label}
                  onClick={() => onType(t.label)}
                  style={{
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 12.5,
                    fontWeight: 600,
                    padding: '6px 13px',
                    borderRadius: 6,
                    background: t.bg,
                    color: t.fg,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Region select */}
          <div>
            <div style={labelStyle}>Region</div>
            <select
              value={region}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => onRegion(e.target.value)}
              style={{ ...selectStyle, minWidth: 160 }}
            >
              <option value="All">All regions</option>
              {regionOpts.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Practice select */}
          <div>
            <div style={labelStyle}>Practice / sector</div>
            <select
              value={practice}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => onPractice(e.target.value)}
              style={{ ...selectStyle, minWidth: 200 }}
            >
              <option value="All">All practices</option>
              {practiceOpts.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Staff select */}
          <div>
            <div style={labelStyle}>TA lead staff</div>
            <select
              value={lead}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => onLead(e.target.value)}
              style={{ ...selectStyle, minWidth: 210 }}
            >
              <option value="All">All staff</option>
              {staffOpts.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1 }} />
          <button
            onClick={onReset}
            style={{
              border: '1px solid #D5DEE6',
              background: '#fff',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 600,
              color: '#5B7186',
              padding: '8px 14px',
              borderRadius: 8,
              alignSelf: 'flex-end',
            }}
          >
            Reset filters
          </button>
        </div>

        {/* Status chips */}
        <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap', marginTop: 12 }}>
          <div>
            <div style={labelStyle}>Implementation status</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {statusChips.map((ch) => (
                <button
                  key={ch.label}
                  onClick={() => onToggleStatus(ch.label)}
                  style={{
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    padding: '5px 11px',
                    borderRadius: 999,
                    fontSize: 11.5,
                    fontWeight: 600,
                    border: `1px solid ${ch.bd}`,
                    background: ch.bg,
                    color: ch.fg,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: ch.dot, display: 'inline-block' }} />
                  {ch.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
