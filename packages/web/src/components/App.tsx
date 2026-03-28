import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { displayOrderAtom, filteredPrsAtom } from "../atoms/derived.js";
import { groupAtom, searchAtom, selectedPipelinesAtom, selectedReposAtom, selectedReviewsAtom } from "../atoms/filters.js";
import { prsAtom, prsResponseAtom } from "../atoms/prs.js";
import { selectedUrlAtom, sidebarOpenAtom } from "../atoms/selection.js";
import type { ShortcutDef } from "../lib/shortcuts.js";
import { useShortcuts } from "../lib/useShortcuts.js";
import { FilterBar } from "./FilterBar.js";
import { FloatingBar } from "./FloatingBar.js";
import { PRList } from "./PRList.js";
import { ShortcutHelp } from "./ShortcutHelp.js";
import { ActionsModal } from "./ActionsModal.js";
import { Sidebar } from "./Sidebar.js";

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
  const sidebarOpen = useAtomValue(sidebarOpenAtom);
  const setSidebarOpen = useAtomSet(sidebarOpenAtom);

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

  // Manage body class for sidebar layout shift
  useEffect(() => {
    document.body.classList.toggle("sidebar-open", sidebarOpen);
    return () => document.body.classList.remove("sidebar-open");
  }, [sidebarOpen]);

  const selectedPR = selectedIndex >= 0 ? displayOrder[selectedIndex] ?? null : null;

  const [helpOpen, setHelpOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const repoFilterRef = useRef<HTMLButtonElement>(null);
  const reviewFilterRef = useRef<HTMLButtonElement>(null);
  const pipelineFilterRef = useRef<HTMLButtonElement>(null);

  function moveSelection(delta: number) {
    if (displayOrder.length === 0) return;
    if (delta < 0 && (selectedIndex === 0 || selectedIndex === -1)) {
      setSelectedUrl(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const next = selectedIndex === -1
      ? (delta > 0 ? 0 : displayOrder.length - 1)
      : Math.max(0, Math.min(selectedIndex + delta, displayOrder.length - 1));
    setSelectedUrl(displayOrder[next]!.url);
  }

  const shortcuts: ReadonlyArray<ShortcutDef> = useMemo(() => [
    { keys: "j", label: "Move down", action: () => moveSelection(1), group: "Navigation" },
    { keys: "k", label: "Move up / focus search", action: () => moveSelection(-1), group: "Navigation" },
    { keys: "o", label: "Open PR", action: () => { if (selectedPR) window.open(selectedPR.url, "_blank"); }, group: "Navigation" },
    { keys: "p", label: "Open pipeline", action: () => { if (selectedPR?.pipelineUrl) window.open(selectedPR.pipelineUrl, "_blank"); }, group: "Navigation" },
    { keys: "a", label: "Actions", action: () => { if (selectedPR) setActionsOpen(true); }, group: "Navigation" },

    { keys: "g r", label: "Repo", action: () => setGroup(Option.some("repo")), group: "Group by" },
    { keys: "g k", label: "Ticket", action: () => setGroup(Option.some("ticket")), group: "Group by" },
    { keys: "g s", label: "Stack", action: () => setGroup(Option.some("stack")), group: "Group by" },
    { keys: "g n", label: "None", action: () => setGroup(Option.some("none")), group: "Group by" },

    { keys: "z o", label: "Open all folds", action: () => document.querySelectorAll<HTMLDetailsElement>("details.group-fold").forEach((d) => d.open = true), group: "Folds" },
    { keys: "z c", label: "Close all folds", action: () => document.querySelectorAll<HTMLDetailsElement>("details.group-fold").forEach((d) => d.open = false), group: "Folds" },

    { keys: "/", label: "Search", action: () => filterInputRef.current?.focus(), group: "Filters" },
    { keys: "f r", label: "Repo filter", action: () => repoFilterRef.current?.click(), group: "Filters" },
    { keys: "f v", label: "Review filter", action: () => reviewFilterRef.current?.click(), group: "Filters" },
    { keys: "f p", label: "Pipeline filter", action: () => pipelineFilterRef.current?.click(), group: "Filters" },
    { keys: "c f", label: "Clear all filters", action: () => { setSearch(Option.some("")); setSelectedRepos([]); setSelectedPipelines([]); setSelectedReviews([]); }, group: "Filters" },

    { keys: "i", label: "Toggle sidebar", action: () => setSidebarOpen((o) => !o), group: "Navigation" },

    { keys: "?", label: "Shortcuts", action: () => setHelpOpen((o) => !o), group: "General" },
    { keys: "Escape", label: "Close / deselect", enableInInputs: true, action: () => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); setHelpOpen(false); setActionsOpen(false); setSidebarOpen(false); setSelectedUrl(null); }, group: "General" },
  ], [setGroup, setSearch, setSelectedRepos, setSelectedPipelines, setSelectedReviews, setSelectedUrl, setSidebarOpen, displayOrder, selectedIndex, selectedPR]);

  const pending = useShortcuts(shortcuts);

  const loading = AsyncResult.isInitial(response) || AsyncResult.isWaiting(response);
  const error = AsyncResult.isFailure(response) ? String(response.cause) : null;

  return (
    <>
      <FilterBar filterInputRef={filterInputRef} repoFilterRef={repoFilterRef} reviewFilterRef={reviewFilterRef} pipelineFilterRef={pipelineFilterRef} />

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

      <Sidebar />
      <FloatingBar pending={pending} shortcuts={shortcuts} selectedIndex={selectedIndex} />
      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} shortcuts={shortcuts} />
      <ActionsModal pr={selectedPR} open={actionsOpen} onClose={() => setActionsOpen(false)} />
    </>
  );
}
