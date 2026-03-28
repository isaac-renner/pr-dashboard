import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { displayOrderAtom, filteredPrsAtom } from "../atoms/derived.js";
import { groupAtom, searchAtom, selectedPipelinesAtom, selectedReposAtom, selectedReviewsAtom } from "../atoms/filters.js";
import { prsAtom, prsResponseAtom } from "../atoms/prs.js";
import { selectedIndexAtom } from "../atoms/selection.js";
import type { ShortcutDef } from "../lib/shortcuts.js";
import { useShortcuts } from "../lib/useShortcuts.js";
import { FilterBar } from "./FilterBar.js";
import { FloatingBar } from "./FloatingBar.js";
import { PRList } from "./PRList.js";
import { ShortcutHelp } from "./ShortcutHelp.js";

export function App() {
  const response = useAtomValue(prsResponseAtom);
  const prs = useAtomValue(prsAtom);
  const filtered = useAtomValue(filteredPrsAtom);
  const displayOrder = useAtomValue(displayOrderAtom);
  const selectedIndex = useAtomValue(selectedIndexAtom);
  const setSelectedIndex = useAtomSet(selectedIndexAtom);
  const setGroup = useAtomSet(groupAtom);
  const setSearch = useAtomSet(searchAtom);
  const setSelectedRepos = useAtomSet(selectedReposAtom);
  const setSelectedPipelines = useAtomSet(selectedPipelinesAtom);
  const setSelectedReviews = useAtomSet(selectedReviewsAtom);

  // Clamp selection when display order changes (filter/group change)
  useEffect(() => {
    if (selectedIndex >= displayOrder.length) {
      setSelectedIndex(Math.max(displayOrder.length - 1, -1));
    }
  }, [displayOrder.length, selectedIndex, setSelectedIndex]);

  const [helpOpen, setHelpOpen] = useState(false);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const repoFilterRef = useRef<HTMLButtonElement>(null);

  const shortcuts: ReadonlyArray<ShortcutDef> = useMemo(() => [
    // Navigation
    {
      keys: "j",
      label: "Move down",
      action: () => setSelectedIndex((i) => Math.min(i + 1, displayOrder.length - 1)),
    },
    {
      keys: "k",
      label: "Move up",
      action: () => setSelectedIndex((i) => Math.max(i - 1, 0)),
    },
    {
      keys: "o",
      label: "Open PR",
      action: () => {
        if (selectedIndex >= 0 && selectedIndex < displayOrder.length) {
          window.open(displayOrder[selectedIndex]!.url, "_blank");
        }
      },
    },
    {
      keys: "p",
      label: "Open pipeline",
      action: () => {
        if (selectedIndex >= 0 && selectedIndex < displayOrder.length) {
          const pipelineUrl = displayOrder[selectedIndex]!.pipelineUrl;
          if (pipelineUrl) window.open(pipelineUrl, "_blank");
        }
      },
    },

    // Grouping
    { keys: "g r", label: "Group by repo", action: () => setGroup(Option.some("repo")) },
    { keys: "g k", label: "Group by ticket", action: () => setGroup(Option.some("ticket")) },
    { keys: "g s", label: "Group by stack", action: () => setGroup(Option.some("stack")) },

    // Filters
    { keys: "/", label: "Focus search", action: () => filterInputRef.current?.focus() },
    { keys: "f r", label: "Open repo filter", action: () => repoFilterRef.current?.click() },
    {
      keys: "Shift+f",
      label: "Clear all filters",
      action: () => {
        setSearch(Option.some(""));
        setSelectedRepos([]);
        setSelectedPipelines([]);
        setSelectedReviews([]);
      },
    },

    // Help
    { keys: "?", label: "Toggle shortcut help", action: () => setHelpOpen((o) => !o) },
    {
      keys: "Escape",
      label: "Close / deselect",
      enableInInputs: true,
      action: () => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        setHelpOpen(false);
        setSelectedIndex(-1);
      },
    },
  ], [setGroup, setSearch, setSelectedRepos, setSelectedPipelines, setSelectedReviews, setSelectedIndex, displayOrder, selectedIndex]);

  const pending = useShortcuts(shortcuts);

  const loading = AsyncResult.isInitial(response) || AsyncResult.isWaiting(response);
  const error = AsyncResult.isFailure(response) ? String(response.cause) : null;

  return (
    <>
      <FilterBar filterInputRef={filterInputRef} repoFilterRef={repoFilterRef} />

      {loading && !prs.length && (
        <div><span className="spinner" /> Loading...</div>
      )}
      {error && <div>Error: {error}</div>}
      {prs.length > 0 && (
        <>
          <div className="muted">
            {filtered.length} PR{filtered.length === 1 ? "" : "s"}
          </div>
          <PRList />
        </>
      )}
      {!loading && !error && prs.length === 0 && <div className="muted">No PRs found</div>}

      <FloatingBar pending={pending} shortcuts={shortcuts} />
      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} shortcuts={shortcuts} />
    </>
  );
}
