import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { displayOrderAtom, filteredPrsAtom } from "../atoms/derived.js";
import { groupAtom, searchAtom, selectedPipelinesAtom, selectedReposAtom, selectedReviewsAtom } from "../atoms/filters.js";
import { prsAtom, prsResponseAtom } from "../atoms/prs.js";
import { selectedUrlAtom } from "../atoms/selection.js";
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
  const selectedUrl = useAtomValue(selectedUrlAtom);
  const setSelectedUrl = useAtomSet(selectedUrlAtom);
  const setGroup = useAtomSet(groupAtom);
  const setSearch = useAtomSet(searchAtom);
  const setSelectedRepos = useAtomSet(selectedReposAtom);
  const setSelectedPipelines = useAtomSet(selectedPipelinesAtom);
  const setSelectedReviews = useAtomSet(selectedReviewsAtom);

  // Current index of selected URL in display order
  const selectedIndex = useMemo(() => {
    if (!selectedUrl) return -1;
    return displayOrder.findIndex((pr) => pr.url === selectedUrl);
  }, [selectedUrl, displayOrder]);

  // If selected PR disappears from filtered list, clear selection
  useEffect(() => {
    if (selectedUrl && selectedIndex === -1) {
      setSelectedUrl(null);
    }
  }, [selectedUrl, selectedIndex, setSelectedUrl]);

  const selectedPR = selectedIndex >= 0 ? displayOrder[selectedIndex] ?? null : null;

  const [helpOpen, setHelpOpen] = useState(false);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const repoFilterRef = useRef<HTMLButtonElement>(null);

  function moveSelection(delta: number) {
    if (displayOrder.length === 0) return;
    const next = selectedIndex === -1
      ? (delta > 0 ? 0 : displayOrder.length - 1)
      : Math.max(0, Math.min(selectedIndex + delta, displayOrder.length - 1));
    setSelectedUrl(displayOrder[next]!.url);
  }

  const shortcuts: ReadonlyArray<ShortcutDef> = useMemo(() => [
    { keys: "j", label: "Move down", action: () => moveSelection(1) },
    { keys: "k", label: "Move up", action: () => moveSelection(-1) },
    {
      keys: "o",
      label: "Open PR",
      action: () => { if (selectedPR) window.open(selectedPR.url, "_blank"); },
    },
    {
      keys: "p",
      label: "Open pipeline",
      action: () => { if (selectedPR?.pipelineUrl) window.open(selectedPR.pipelineUrl, "_blank"); },
    },

    { keys: "g r", label: "Group by repo", action: () => setGroup(Option.some("repo")) },
    { keys: "g k", label: "Group by ticket", action: () => setGroup(Option.some("ticket")) },
    { keys: "g s", label: "Group by stack", action: () => setGroup(Option.some("stack")) },
    { keys: "g n", label: "No grouping", action: () => setGroup(Option.some("none")) },

    {
      keys: "z o",
      label: "Open all folds",
      action: () => document.querySelectorAll<HTMLDetailsElement>("details.group-fold").forEach((d) => d.open = true),
    },
    {
      keys: "z c",
      label: "Close all folds",
      action: () => document.querySelectorAll<HTMLDetailsElement>("details.group-fold").forEach((d) => d.open = false),
    },

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

    { keys: "?", label: "Toggle shortcut help", action: () => setHelpOpen((o) => !o) },
    {
      keys: "Escape",
      label: "Close / deselect",
      enableInInputs: true,
      action: () => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        setHelpOpen(false);
        setSelectedUrl(null);
      },
    },
  ], [setGroup, setSearch, setSelectedRepos, setSelectedPipelines, setSelectedReviews, setSelectedUrl, displayOrder, selectedIndex, selectedPR]);

  const pending = useShortcuts(shortcuts);

  const loading = AsyncResult.isInitial(response) || AsyncResult.isWaiting(response);
  const error = AsyncResult.isFailure(response) ? String(response.cause) : null;

  return (
    <>
      <FilterBar filterInputRef={filterInputRef} repoFilterRef={repoFilterRef} />

      {loading && !prs.length && (
        <div className="flex"><div className="spinner" /> Loading...</div>
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

      <FloatingBar pending={pending} shortcuts={shortcuts} selectedIndex={selectedIndex} />
      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} shortcuts={shortcuts} />
    </>
  );
}
