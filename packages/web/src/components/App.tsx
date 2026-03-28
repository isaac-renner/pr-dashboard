import React, { useMemo } from "react"
import { usePRs } from "../hooks/usePRs.js"
import { useFilters } from "../hooks/useFilters.js"
import { filterPRs } from "../lib/filters.js"
import { FilterBar } from "./FilterBar.js"
import { BucketList } from "./BucketList.js"

export function App() {
  const { prs, loading, error, lastRefreshed, refresh } = usePRs()
  const [filters, setFilters] = useFilters()

  const filtered = useMemo(() => filterPRs(prs, filters), [prs, filters])

  return (
    <div className="app">
      <header className="header">
        <h1>PR Dashboard</h1>
        <p className="tagline">Triage by urgency, ticket, and repo</p>
        <div className="refresh-bar">
          {lastRefreshed && (
            <span className="last-refreshed">
              Last refreshed: {lastRefreshed}
            </span>
          )}
          <button className="refresh-btn" onClick={refresh} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>

      <FilterBar filters={filters} onFiltersChange={setFilters} />

      <main className="content">
        {loading && <div className="loading">Loading...</div>}
        {error && <div className="error">{error}</div>}
        {!loading && !error && (
          <>
            <BucketList prs={filtered} group={filters.group} />
            <div className="pr-count">{filtered.length} PRs</div>
          </>
        )}
      </main>
    </div>
  )
}
