import React, { useState } from "react"
import { useAtomValue, useAtomSet } from "@effect/atom-react"
import { Option } from "effect"
import {
  excludeAtom,
  repoAtom,
  pipelineAtom,
  groupAtom,
  filtersAtom,
} from "../atoms/filters.js"
import type { Filters } from "../lib/types.js"

export function FilterBar() {
  const filters = useAtomValue(filtersAtom)
  const setExclude = useAtomSet(excludeAtom)
  const setRepo = useAtomSet(repoAtom)
  const setPipeline = useAtomSet(pipelineAtom)
  const setGroup = useAtomSet(groupAtom)

  // Local form state — only commits to atoms on Apply
  const [localExclude, setLocalExclude] = useState(filters.exclude)
  const [localRepo, setLocalRepo] = useState(filters.repo)
  const [localPipeline, setLocalPipeline] = useState(filters.pipeline)
  const [localGroup, setLocalGroup] = useState(filters.group)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setExclude(Option.some(localExclude))
    setRepo(Option.some(localRepo))
    setPipeline(Option.some(localPipeline))
    setGroup(Option.some(localGroup))
  }

  return (
    <form className="filters" onSubmit={handleSubmit}>
      <label>
        Exclude keywords (comma-separated)
        <input
          type="text"
          value={localExclude}
          onChange={(e) => setLocalExclude(e.target.value)}
          placeholder="endpoint audit, loki"
        />
      </label>

      <label>
        Filter by repo
        <input
          type="text"
          value={localRepo}
          onChange={(e) => setLocalRepo(e.target.value)}
          placeholder="e.g. frontend"
        />
      </label>

      <label>
        Group by
        <select
          value={localGroup}
          onChange={(e) => setLocalGroup(e.target.value as Filters["group"])}
        >
          <option value="ticket">Ticket</option>
          <option value="repo">Repo</option>
        </select>
      </label>

      <label>
        Pipeline
        <select
          value={localPipeline}
          onChange={(e) => setLocalPipeline(e.target.value as Filters["pipeline"])}
        >
          <option value="all">Any</option>
          <option value="failing">Failing</option>
          <option value="pending">Pending</option>
          <option value="passing">Passing</option>
          <option value="none">No pipeline</option>
        </select>
      </label>

      <button type="submit">Apply</button>
    </form>
  )
}
