import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import React from "react";
import { availableReposAtom } from "../atoms/derived.js";
import { groupAtom, searchAtom, selectedPipelinesAtom, selectedReposAtom } from "../atoms/filters.js";
import { ChipFilterPopover } from "./ChipFilterPopover.js";

const PIPELINE_OPTIONS = ["Passing", "Failing", "Pending", "None"];

interface FilterBarProps {
  readonly filterInputRef?: React.RefObject<HTMLInputElement | null>;
  readonly repoFilterRef?: React.RefObject<HTMLButtonElement | null>;
}

export function FilterBar({ filterInputRef, repoFilterRef }: FilterBarProps) {
  const search = useAtomValue(searchAtom);
  const group = useAtomValue(groupAtom);
  const selectedRepos = useAtomValue(selectedReposAtom);
  const selectedPipelines = useAtomValue(selectedPipelinesAtom);
  const availableRepos = useAtomValue(availableReposAtom);
  const setSearch = useAtomSet(searchAtom);
  const setGroup = useAtomSet(groupAtom);
  const setSelectedRepos = useAtomSet(selectedReposAtom);
  const setSelectedPipelines = useAtomSet(selectedPipelinesAtom);

  const searchVal = search._tag === "Some" ? search.value : "";
  const groupVal = group._tag === "Some" ? group.value : "ticket";

  function toggleRepo(repo: string) {
    setSelectedRepos((current) =>
      current.includes(repo)
        ? current.filter((r) => r !== repo)
        : [...current, repo]
    );
  }

  function togglePipeline(pipeline: string) {
    setSelectedPipelines((current) =>
      current.includes(pipeline)
        ? current.filter((p) => p !== pipeline)
        : [...current, pipeline]
    );
  }

  function removeRepo(repo: string) {
    setSelectedRepos((current) => current.filter((r) => r !== repo));
  }

  function removePipeline(pipeline: string) {
    setSelectedPipelines((current) => current.filter((p) => p !== pipeline));
  }

  const hasActiveFilters = selectedRepos.length > 0 || selectedPipelines.length > 0;

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

        <ChipFilterPopover
          label="Repos"
          options={[...availableRepos]}
          selected={[...selectedRepos]}
          onToggle={toggleRepo}
          onClear={() => setSelectedRepos([])}
          triggerRef={repoFilterRef}
        />

        <label>
          Group by
          <select
            value={groupVal}
            onChange={(e) => setGroup(Option.some(e.target.value))}
          >
            <option value="ticket">Ticket</option>
            <option value="repo">Repo</option>
            <option value="stack">Stack</option>
          </select>
        </label>

        <ChipFilterPopover
          label="Pipeline"
          options={PIPELINE_OPTIONS}
          selected={[...selectedPipelines]}
          onToggle={togglePipeline}
          onClear={() => setSelectedPipelines([])}
        />
      </div>

      {hasActiveFilters && (
        <div className="active-filters">
          {selectedRepos.map((repo) => (
            <button
              key={`repo:${repo}`}
              className="active-filter-tag"
              onClick={() => removeRepo(repo)}
              type="button"
            >
              {repo}
              <span className="active-filter-tag-x">×</span>
            </button>
          ))}
          {selectedPipelines.map((p) => (
            <button
              key={`pipeline:${p}`}
              className="active-filter-tag"
              onClick={() => removePipeline(p)}
              type="button"
            >
              {p}
              <span className="active-filter-tag-x">×</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
