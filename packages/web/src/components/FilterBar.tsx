import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import React from "react";
import { groupAtom, pipelineAtom, searchAtom, selectedReposAtom } from "../atoms/filters.js";
import { RepoFilter } from "./RepoFilter.js";

interface FilterBarProps {
  readonly filterInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function FilterBar({ filterInputRef }: FilterBarProps) {
  const search = useAtomValue(searchAtom);
  const pipeline = useAtomValue(pipelineAtom);
  const group = useAtomValue(groupAtom);
  const selectedRepos = useAtomValue(selectedReposAtom);
  const setSearch = useAtomSet(searchAtom);
  const setPipeline = useAtomSet(pipelineAtom);
  const setGroup = useAtomSet(groupAtom);
  const setSelectedRepos = useAtomSet(selectedReposAtom);

  const searchVal = search._tag === "Some" ? search.value : "";
  const pipelineVal = pipeline._tag === "Some" ? pipeline.value : "all";
  const groupVal = group._tag === "Some" ? group.value : "ticket";

  function removeRepo(repo: string) {
    setSelectedRepos((current) => current.filter((r) => r !== repo));
  }

  return (
    <>
      <div className="filters">
        <label>
          Search
          <input
            ref={filterInputRef}
            type="text"
            value={searchVal}
            onChange={(e) => setSearch(Option.some(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            placeholder="fuzzy search PRs..."
          />
        </label>

        <RepoFilter />

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

      {selectedRepos.length > 0 && (
        <div className="active-filters">
          {selectedRepos.map((repo) => (
            <button
              key={repo}
              className="active-filter-tag"
              onClick={() => removeRepo(repo)}
              type="button"
            >
              {repo}
              <span className="active-filter-tag-x">×</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
