import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { displayOrderAtom, filteredPrsAtom } from "../atoms/derived.js";
import { groupAtom, searchAtom, selectedPipelinesAtom, selectedReposAtom, selectedReviewsAtom, selectedTicketsAtom } from "../atoms/filters.js";
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
  const setSelectedTickets = useAtomSet(selectedTicketsAtom);
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

  // Close sidebar when no PR is selected
  useEffect(() => {
    if (!selectedUrl && sidebarOpen) setSidebarOpen(false);
  }, [selectedUrl, sidebarOpen, setSidebarOpen]);

  const selectedPR = selectedIndex >= 0 ? displayOrder[selectedIndex] ?? null : null;

  const [helpOpen, setHelpOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const repoFilterRef = useRef<HTMLButtonElement>(null);
  const reviewFilterRef = useRef<HTMLButtonElement>(null);
  const pipelineFilterRef = useRef<HTMLButtonElement>(null);
  const ticketFilterRef = useRef<HTMLButtonElement>(null);

  function moveSelection(delta: number) {
    if (actionsOpen || helpOpen) return;
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
    { keys: "f t", label: "Ticket filter", action: () => ticketFilterRef.current?.click(), group: "Filters" },
    { keys: "c f", label: "Clear all filters", action: () => { setSearch(Option.some("")); setSelectedRepos([]); setSelectedPipelines([]); setSelectedReviews([]); setSelectedTickets([]); }, group: "Filters" },

    { keys: "i", label: "Toggle sidebar", action: () => setSidebarOpen((o) => !o), group: "Navigation" },

    { keys: "?", label: "Shortcuts", action: () => setHelpOpen((o) => !o), group: "General" },
    {
      keys: "Escape",
      label: "Close / deselect",
      enableInInputs: true,
      group: "General",
      action: () => {
        // Layered dismiss: blur input → close modal → close sidebar → deselect
        if (document.activeElement instanceof HTMLElement && document.activeElement.tagName === "INPUT") {
          document.activeElement.blur();
          return;
        }
        if (helpOpen) { setHelpOpen(false); return; }
        if (actionsOpen) { setActionsOpen(false); return; }
        if (sidebarOpen) { setSidebarOpen(false); return; }
        if (selectedUrl) { setSelectedUrl(null); return; }
      },
    },
  ], [setGroup, setSearch, setSelectedRepos, setSelectedPipelines, setSelectedReviews, setSelectedTickets, setSelectedUrl, setSidebarOpen, displayOrder, selectedIndex, selectedPR, helpOpen, actionsOpen, sidebarOpen, selectedUrl]);

  const pending = useShortcuts(shortcuts);

  const loading = AsyncResult.isInitial(response) || AsyncResult.isWaiting(response);
  const error = AsyncResult.isFailure(response) ? String(response.cause) : null;

  return (
    <>
      <FilterBar filterInputRef={filterInputRef} repoFilterRef={repoFilterRef} reviewFilterRef={reviewFilterRef} pipelineFilterRef={pipelineFilterRef} ticketFilterRef={ticketFilterRef} />

      <div className="app-layout">
        <div className="app-main">
          {loading && !prs.length && (
            <div className="flex"><div className="spinner" /> Loading...</div>
          )}
          {error && <div>Error: {error}</div>}
          {prs.length > 0 && <PRList />}
          {!loading && !error && prs.length === 0 && <div className="muted">No PRs found</div>}
        </div>
        <Sidebar />
      </div>

      <FloatingBar pending={pending} shortcuts={shortcuts} selectedIndex={selectedIndex} />
      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} shortcuts={shortcuts} />
      <ActionsModal pr={selectedPR} open={actionsOpen} onClose={() => setActionsOpen(false)} />
    </>
  );
}
