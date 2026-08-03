import type { KPI } from '../lib/dashboard';

const title: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: '#0F2238',
  letterSpacing: '-.005em',
  minHeight: 18,
};
const subText: React.CSSProperties = {
  fontSize: 11.5,
  color: '#9AA7B2',
  lineHeight: 1.4,
  marginTop: 4,
};

export function KpiStrip({ kpis }: { kpis: KPI[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(190px, 100%), 1fr))', gap: 12, marginTop: 8 }}>
      {kpis.map((k) => (
        <div
          key={k.label}
          style={{
            background: '#fff',
            border: '1px solid #E3E9EF',
            borderTop: `3px solid ${k.accent}`,
            borderRadius: 10,
            padding: '15px 18px',
            boxShadow: '0 1px 2px rgba(15,34,56,.04)',
          }}
        >
          <div style={title}>{k.label}</div>

          {k.split ? (
            <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
              {k.split.map((s, i) => (
                <div
                  key={s.sub}
                  style={{
                    flex: 1,
                    paddingLeft: i > 0 ? 14 : 0,
                    borderLeft: i > 0 ? '1px solid #EDF1F4' : undefined,
                  }}
                >
                  <div
                    style={{
                      fontSize: 30,
                      fontWeight: 700,
                      letterSpacing: '-.02em',
                      color: s.color,
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.1,
                    }}
                  >
                    {s.value}
                  </div>
                  <div style={subText}>{s.sub}</div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  letterSpacing: '-.02em',
                  color: k.color,
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1.1,
                  marginTop: 6,
                }}
              >
                {k.value}
              </div>
              <div style={subText}>{k.sub}</div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
