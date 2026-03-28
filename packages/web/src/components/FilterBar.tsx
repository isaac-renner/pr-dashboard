import React, { useState } from "react"
import type { Filters } from "../lib/types.js"

interface FilterBarProps {
  filters: Filters
  onFiltersChange: (f: Filters) => void
}

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const [exclude, setExclude] = useState(filters.exclude)
  const [repo, setRepo] = useState(filters.repo)
  const [group, setGroup] = useState<Filters["group"]>(filters.group)
  const [pipeline, setPipeline] = useState<Filters["pipeline"]>(filters.pipeline)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onFiltersChange({
      ...filters,
      exclude,
      repo,
      group,
      pipeline,
    })
  }

  return (
    <form className="filters" onSubmit={handleSubmit}>
      <label>
        Exclude keywords (comma-separated)
        <input
          type="text"
          value={exclude}
          onChange={(e) => setExclude(e.target.value)}
          placeholder="endpoint audit, loki"
        />
      </label>

      <label>
        Filter by repo
        <input
          type="text"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          placeholder="e.g. frontend"
        />
      </label>

      <label>
        Group by
        <select
          value={group}
          onChange={(e) => setGroup(e.target.value as Filters["group"])}
        >
          <option value="ticket">Ticket</option>
          <option value="repo">Repo</option>
        </select>
      </label>

      <label>
        Pipeline
        <select
          value={pipeline}
          onChange={(e) => setPipeline(e.target.value as Filters["pipeline"])}
        >
          <option value="all">Any</option>
          <option value="failing">Failing</option>
          <option value="pending">Pending</option>
          <option value="passing">Passing</option>
          <option value="none">No pipeline</option>
        </select>
      </label>

      <button type="submit" className="apply-btn">
        Apply
      </button>
    </form>
  )
}
