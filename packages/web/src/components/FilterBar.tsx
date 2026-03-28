import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import React from "react";
import { availableReposAtom } from "../atoms/derived.js";
import { searchAtom, selectedPipelinesAtom, selectedReposAtom, selectedReviewsAtom } from "../atoms/filters.js";
import { REVIEW_OPTIONS } from "../lib/types.js";
import { ChipFilterPopover } from "./ChipFilterPopover.js";

const PIPELINE_OPTIONS = ["Passing", "Failing", "Pending", "None"];

interface FilterBarProps {
  readonly filterInputRef?: React.RefObject<HTMLInputElement | null>;
  readonly repoFilterRef?: React.RefObject<HTMLButtonElement | null>;
  readonly reviewFilterRef?: React.RefObject<HTMLButtonElement | null>;
}

export function FilterBar({ filterInputRef, repoFilterRef, reviewFilterRef }: FilterBarProps) {
  const search = useAtomValue(searchAtom);
  const selectedRepos = useAtomValue(selectedReposAtom);
  const selectedPipelines = useAtomValue(selectedPipelinesAtom);
  const selectedReviews = useAtomValue(selectedReviewsAtom);
  const availableRepos = useAtomValue(availableReposAtom);
  const setSearch = useAtomSet(searchAtom);
  const setSelectedRepos = useAtomSet(selectedReposAtom);
  const setSelectedPipelines = useAtomSet(selectedPipelinesAtom);
  const setSelectedReviews = useAtomSet(selectedReviewsAtom);

  const searchVal = search._tag === "Some" ? search.value : "";

  function toggleItem(
    set: (fn: (c: ReadonlyArray<string>) => ReadonlyArray<string>) => void,
    value: string,
  ) {
    set((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    );
  }

  function removeItem(
    set: (fn: (c: ReadonlyArray<string>) => ReadonlyArray<string>) => void,
    value: string,
  ) {
    set((current) => current.filter((v) => v !== value));
  }

  const hasActive = selectedRepos.length > 0 || selectedPipelines.length > 0 || selectedReviews.length > 0;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "1ch", alignItems: "end" }}>
        <input
          ref={filterInputRef}
          type="text"
          value={searchVal}
          onChange={(e) => setSearch(Option.some(e.target.value))}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          placeholder="search"
        />

        <ChipFilterPopover
          label="Repos"
          options={[...availableRepos]}
          selected={[...selectedRepos]}
          onToggle={(v) => toggleItem(setSelectedRepos, v)}
          onClear={() => setSelectedRepos([])}
          triggerRef={repoFilterRef}
        />

        <ChipFilterPopover
          label="Review"
          options={[...REVIEW_OPTIONS]}
          selected={[...selectedReviews]}
          onToggle={(v) => toggleItem(setSelectedReviews, v)}
          onClear={() => setSelectedReviews([])}
          triggerRef={reviewFilterRef}
        />

        <ChipFilterPopover
          label="Pipeline"
          options={PIPELINE_OPTIONS}
          selected={[...selectedPipelines]}
          onToggle={(v) => toggleItem(setSelectedPipelines, v)}
          onClear={() => setSelectedPipelines([])}
        />
      </div>

      {hasActive && (
        <div className="flex-wrap gap-0" style={{ marginTop: "calc(var(--line-height) / 2)" }}>
          {selectedRepos.map((repo) => (
            <button
              key={`repo:${repo}`}
              className="chip"
              onClick={() => removeItem(setSelectedRepos, repo)}
              type="button"
            >
              {repo} ×
            </button>
          ))}
          {selectedReviews.map((r) => (
            <button
              key={`review:${r}`}
              className="chip"
              onClick={() => removeItem(setSelectedReviews, r)}
              type="button"
            >
              {r} ×
            </button>
          ))}
          {selectedPipelines.map((p) => (
            <button
              key={`pipeline:${p}`}
              className="chip"
              onClick={() => removeItem(setSelectedPipelines, p)}
              type="button"
            >
              {p} ×
            </button>
          ))}
        </div>
      )}
    </>
  );
}
