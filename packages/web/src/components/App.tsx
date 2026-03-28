import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import React, { useMemo, useRef, useState } from "react";
import { filteredPrsAtom } from "../atoms/derived.js";
import { filtersAtom, groupAtom, pipelineAtom, searchAtom, selectedReposAtom } from "../atoms/filters.js";
import { lastRefreshedAtom, prsAtom, prsResponseAtom } from "../atoms/prs.js";
import { timeAgo } from "../lib/format.js";
import type { ShortcutDef } from "../lib/shortcuts.js";
import { useShortcuts } from "../lib/useShortcuts.js";
import { FilterBar } from "./FilterBar.js";
import { PRList } from "./PRList.js";
import { ShortcutHelp } from "./ShortcutHelp.js";

export function App() {
  const response = useAtomValue(prsResponseAtom);
  const prs = useAtomValue(prsAtom);
  const filtered = useAtomValue(filteredPrsAtom);
  const lastRefreshed = useAtomValue(lastRefreshedAtom);
  const setGroup = useAtomSet(groupAtom);
  const setSearch = useAtomSet(searchAtom);
  const setSelectedRepos = useAtomSet(selectedReposAtom);
  const setPipeline = useAtomSet(pipelineAtom);

  const [helpOpen, setHelpOpen] = useState(false);
  const filterInputRef = useRef<HTMLInputElement>(null);

  const shortcuts: ReadonlyArray<ShortcutDef> = useMemo(() => [
    // Grouping
    { keys: "g r", label: "Group by repo", action: () => setGroup(Option.some("repo")) },
    { keys: "g k", label: "Group by ticket", action: () => setGroup(Option.some("ticket")) },

    // Actions
    { keys: "/", label: "Focus search", action: () => filterInputRef.current?.focus() },
    {
      keys: "Shift+f",
      label: "Clear all filters",
      action: () => {
        setSearch(Option.some(""));
        setSelectedRepos([]);
        setPipeline(Option.some("all"));
      },
    },

    // Help
    { keys: "?", label: "Toggle shortcut help", action: () => setHelpOpen((o) => !o) },
    { keys: "Escape", label: "Close overlay", action: () => setHelpOpen(false), enableInInputs: true },
  ], [setGroup, setSearch, setSelectedRepos, setPipeline]);

  const pending = useShortcuts(shortcuts);

  const loading = AsyncResult.isInitial(response) || AsyncResult.isWaiting(response);
  const error = AsyncResult.isFailure(response) ? String(response.cause) : null;

  return (
    <>
      <div className="header">
        <div>
          <h1>PR Dashboard</h1>
          <div className="tagline">
            {pending ? <span className="chord-pending">waiting: {pending}...</span> : null}
          </div>
        </div>
        <div className="refresh-bar">
          <span>
            {loading && !prs.length
              ? (
                <span className="refreshing">
                  <span className="spinner spinner-sm" />
                  Loading...
                </span>
              )
              : lastRefreshed
              ? `Updated ${timeAgo(lastRefreshed)}`
              : null}
          </span>
        </div>
      </div>

      <FilterBar filterInputRef={filterInputRef} />

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
            <PRList />
          </>
        )}
        {!loading && !error && prs.length === 0 && <p className="count">No PRs found</p>}
      </div>

      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} shortcuts={shortcuts} />
    </>
  );
}
