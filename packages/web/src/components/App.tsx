import React, { useMemo } from "react"
import { usePRs } from "../hooks/usePRs.js"
import { useFilters } from "../hooks/useFilters.js"
import { filterPRs } from "../lib/filters.js"
import { timeAgo } from "../lib/format.js"
import { FilterBar } from "./FilterBar.js"
import { BucketList } from "./BucketList.js"

export function App() {
  const { prs, loading, error, lastRefreshed, refresh } = usePRs()
  const [filters, setFilters] = useFilters()

  const filtered = useMemo(() => filterPRs(prs, filters), [prs, filters])

  return (
    <>
      <div className="header">
        <div>
          <h1>PR Dashboard</h1>
          <div className="tagline">Triage by urgency, ticket, and repo</div>
        </div>
        <div className="refresh-bar">
          <span id="refresh-status">
            {loading ? (
              <span className="refreshing">
                <span className="spinner spinner-sm" />
                Refreshing...
              </span>
            ) : lastRefreshed ? (
              `Last refreshed ${timeAgo(lastRefreshed)}`
            ) : (
              "Loading..."
            )}
          </span>
          <button onClick={refresh} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <FilterBar filters={filters} onFiltersChange={setFilters} />

      <div id="content">
        {loading && !prs.length && (
          <div className="loading">
            <div className="spinner" />
            Loading...
          </div>
        )}
        {error && <div className="error">Error: {error}</div>}
        {prs.length > 0 && (
          <>
            <p className="count">
              {filtered.length} PR{filtered.length === 1 ? "" : "s"}
            </p>
            <BucketList prs={filtered} group={filters.group} />
          </>
        )}
        {!loading && !error && prs.length === 0 && (
          <p className="count">No PRs found</p>
        )}
      </div>
    </>
  )
}
