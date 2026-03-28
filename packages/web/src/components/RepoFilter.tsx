import { useAtomSet, useAtomValue } from "@effect/atom-react";
import React, { useEffect, useRef, useState } from "react";
import { availableReposAtom } from "../atoms/derived.js";
import { selectedReposAtom } from "../atoms/filters.js";
import { fuzzyMatch } from "../lib/filters.js";

export function RepoFilter() {
  const availableRepos = useAtomValue(availableReposAtom);
  const selectedRepos = useAtomValue(selectedReposAtom);
  const setSelectedRepos = useAtomSet(selectedReposAtom);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
    }
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggleRepo(repo: string) {
    setSelectedRepos((current) =>
      current.includes(repo)
        ? current.filter((r) => r !== repo)
        : [...current, repo]
    );
  }

  const filtered = query
    ? availableRepos.filter((r) => fuzzyMatch(query, r))
    : availableRepos;

  const label = selectedRepos.length > 0
    ? `Repos (${selectedRepos.length})`
    : "Repos";

  return (
    <div className="repo-filter" ref={containerRef}>
      <button
        className={`repo-filter-trigger${selectedRepos.length > 0 ? " active" : ""}`}
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        {label}
      </button>

      {open && (
        <div className="repo-filter-popover">
          <input
            ref={inputRef}
            type="text"
            className="repo-filter-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="filter repos..."
          />
          <div className="repo-filter-list">
            {filtered.map((repo) => (
              <button
                key={repo}
                className={`repo-chip${selectedRepos.includes(repo) ? " active" : ""}`}
                onClick={() => toggleRepo(repo)}
                type="button"
              >
                {repo}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="repo-filter-empty">No repos match</div>
            )}
          </div>
          {selectedRepos.length > 0 && (
            <button
              className="repo-filter-clear"
              onClick={() => setSelectedRepos([])}
              type="button"
            >
              Clear selection
            </button>
          )}
        </div>
      )}
    </div>
  );
}
