import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import React from "react";
import { availableReposAtom } from "../atoms/derived.js";
import { groupAtom, pipelineAtom, searchAtom, selectedReposAtom } from "../atoms/filters.js";

interface FilterBarProps {
  readonly filterInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function FilterBar({ filterInputRef }: FilterBarProps) {
  const search = useAtomValue(searchAtom);
  const pipeline = useAtomValue(pipelineAtom);
  const group = useAtomValue(groupAtom);
  const selectedRepos = useAtomValue(selectedReposAtom);
  const availableRepos = useAtomValue(availableReposAtom);
  const setSearch = useAtomSet(searchAtom);
  const setPipeline = useAtomSet(pipelineAtom);
  const setGroup = useAtomSet(groupAtom);
  const setSelectedRepos = useAtomSet(selectedReposAtom);

  const searchVal = search._tag === "Some" ? search.value : "";
  const pipelineVal = pipeline._tag === "Some" ? pipeline.value : "all";
  const groupVal = group._tag === "Some" ? group.value : "ticket";

  function toggleRepo(repo: string) {
    setSelectedRepos((current) =>
      current.includes(repo)
        ? current.filter((r) => r !== repo)
        : [...current, repo]
    );
  }

  return (
    <div className="filters">
      <label>
        Search
        <input
          ref={filterInputRef}
          type="text"
          value={searchVal}
          onChange={(e) => setSearch(Option.some(e.target.value))}
          placeholder="fuzzy search PRs..."
        />
      </label>

      <label>
        Repos
        <div className="repo-filter-list">
          {availableRepos.map((repo) => (
            <button
              key={repo}
              className={`repo-chip${selectedRepos.includes(repo) ? " active" : ""}`}
              onClick={() => toggleRepo(repo)}
              type="button"
            >
              {repo}
            </button>
          ))}
          {selectedRepos.length > 0 && (
            <button
              className="repo-chip repo-chip-clear"
              onClick={() => setSelectedRepos([])}
              type="button"
            >
              clear
            </button>
          )}
        </div>
      </label>

      <label>
        Group by
        <select
          value={groupVal}
          onChange={(e) => setGroup(Option.some(e.target.value))}
        >
          <option value="ticket">Ticket</option>
          <option value="repo">Repo</option>
        </select>
      </label>

      <label>
        Pipeline
        <select
          value={pipelineVal}
          onChange={(e) => setPipeline(Option.some(e.target.value))}
        >
          <option value="all">Any</option>
          <option value="failing">Failing</option>
          <option value="pending">Pending</option>
          <option value="passing">Passing</option>
          <option value="none">No pipeline</option>
        </select>
      </label>
    </div>
  );
}
