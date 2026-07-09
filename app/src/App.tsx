import { useMemo, useState } from 'react';
import { CASES, TODAY } from './data/cases';
import { computeDashboard, INITIAL_FILTERS, type FilterState } from './lib/dashboard';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { KpiStrip } from './components/KpiStrip';
import { StatusSection } from './components/StatusSection';
import { CycleTimeSection } from './components/CycleTimeSection';
import { DataQualitySection } from './components/DataQualitySection';
import { WorkloadSection } from './components/WorkloadSection';

function App() {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const d = useMemo(() => computeDashboard(CASES, TODAY, filters), [filters]);

  const setType = (v: string) => setFilters((f) => ({ ...f, type: v }));
  const onRegion = (v: string) => setFilters((f) => ({ ...f, regions: v === 'All' ? [] : [v] }));
  const onPractice = (v: string) => setFilters((f) => ({ ...f, practice: v }));
  const onLead = (v: string) => setFilters((f) => ({ ...f, lead: v }));
  const onToggleStatus = (v: string) =>
    setFilters((f) => ({ ...f, statuses: f.statuses.includes(v) ? f.statuses.filter((x) => x !== v) : [...f.statuses, v] }));
  const onReset = () => setFilters(INITIAL_FILTERS);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#EDF1F4',
        fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif",
        color: '#0F2238',
        WebkitFontSmoothing: 'antialiased',
        paddingBottom: 60,
      }}
    >
      <Header metaTotal={d.metaTotal} />

      <FilterBar
        typeBtns={d.typeBtns}
        onType={setType}
        region={filters.regions[0] || 'All'}
        regionOpts={d.regionOpts}
        onRegion={onRegion}
        practice={filters.practice}
        practiceOpts={d.practiceOpts}
        onPractice={onPractice}
        lead={filters.lead}
        staffOpts={d.staffOpts}
        onLead={onLead}
        statusChips={d.statusChips}
        onToggleStatus={onToggleStatus}
        onReset={onReset}
      />

      <div style={{ maxWidth: 1340, margin: '0 auto', padding: '0 24px' }}>
        {/* Active filter summary */}
        <div style={{ padding: '20px 2px 4px' }}>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.01em', color: '#0F2238' }}>{d.filterTitle}</div>
          <div style={{ fontSize: 13, color: '#5B7186', marginTop: 5 }}>
            Showing <span style={{ fontWeight: 700, color: '#0F2238' }}>{d.total}</span> requests{' '}
            <span style={{ color: '#9AA7B2' }}>({d.pctOfAll} of all)</span>
          </div>
        </div>

        <KpiStrip kpis={d.kpis} />

        <StatusSection
          statusDist={d.statusDist}
          onTrack={d.onTrack}
          overdue={d.overdue}
          onTrackPct={d.onTrackPct}
          overduePct={d.overduePct}
          onTime={d.onTime}
          late={d.late}
          noEnd={d.noEnd}
          onTimePct={d.onTimePct}
          latePct={d.latePct}
          noEndPct={d.noEndPct}
          overdueByRegion={d.overdueByRegion}
          overdueByPractice={d.overdueByPractice}
          overdueTable={d.overdueTable}
        />

        <CycleTimeSection timeCards={d.timeCards} />

        <DataQualitySection
          checks={d.checks}
          completeness={d.completeness}
          noLeadCount={d.noLeadCount}
          noLeadTable={d.noLeadTable}
          noLeadEmpty={d.noLeadEmpty}
        />

        <WorkloadSection
          byPractice={d.byPractice}
          byRegion={d.byRegion}
          topStaff={d.topStaff}
          distinctStaff={d.distinctStaff}
          unassigned={d.unassigned}
        />
      </div>
    </div>
  );
}

export default App;
