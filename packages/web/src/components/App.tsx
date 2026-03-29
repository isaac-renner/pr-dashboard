import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { filteredPrsAtom, groupedPrsAtom, navItemsAtom } from "../atoms/derived.js";
import { groupAtom, searchAtom, selectedPipelinesAtom, selectedReposAtom, selectedReviewsAtom, selectedTicketsAtom } from "../atoms/filters.js";
import { closedGroupsAtom, closeGroup, toggleGroup } from "../atoms/groups.js";
import { prsAtom, prsResponseAtom } from "../atoms/prs.js";
import { selectedGroupNameAtom, selectedNavIndexAtom, selectedPRAtom, sidebarOpenAtom } from "../atoms/selection.js";
import type { ShortcutDef } from "../lib/shortcuts.js";
import { useShortcuts } from "../lib/useShortcuts.js";
import { ActionsModal } from "./ActionsModal.js";
import { FilterBar } from "./FilterBar.js";
import { FloatingBar } from "./FloatingBar.js";
import { PRList } from "./PRList.js";
import { ReviewQueue } from "./ReviewQueue.js";
import { ShortcutHelp } from "./ShortcutHelp.js";
import { Sidebar } from "./Sidebar.js";

export function App() {
  const response = useAtomValue(prsResponseAtom);
  const prs = useAtomValue(prsAtom);
  const filtered = useAtomValue(filteredPrsAtom);
  const navItems = useAtomValue(navItemsAtom);
  const selectedNavIndex = useAtomValue(selectedNavIndexAtom);
  const setSelectedNavIndex = useAtomSet(selectedNavIndexAtom);
  const selectedPR = useAtomValue(selectedPRAtom);
  const selectedGroupName = useAtomValue(selectedGroupNameAtom);
  const setGroup = useAtomSet(groupAtom);
  const setSearch = useAtomSet(searchAtom);
  const setSelectedRepos = useAtomSet(selectedReposAtom);
  const setSelectedPipelines = useAtomSet(selectedPipelinesAtom);
  const setSelectedReviews = useAtomSet(selectedReviewsAtom);
  const setSelectedTickets = useAtomSet(selectedTicketsAtom);
  const sidebarOpen = useAtomValue(sidebarOpenAtom);
  const setSidebarOpen = useAtomSet(sidebarOpenAtom);
  const setClosedGroups = useAtomSet(closedGroupsAtom);
  const grouped = useAtomValue(groupedPrsAtom);
  const groupedNames = useMemo(() => new Set(grouped.keys()), [grouped]);

  // Clamp selection when navItems changes
  useEffect(() => {
    if (selectedNavIndex >= navItems.length) {
      setSelectedNavIndex(Math.max(navItems.length - 1, -1));
    }
  }, [navItems.length, selectedNavIndex, setSelectedNavIndex]);

  // Close sidebar when nothing selected
  useEffect(() => {
    if (!selectedPR && sidebarOpen) setSidebarOpen(false);
  }, [selectedPR, sidebarOpen, setSidebarOpen]);

  const [helpOpen, setHelpOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const repoFilterRef = useRef<HTMLButtonElement>(null);
  const reviewFilterRef = useRef<HTMLButtonElement>(null);
  const pipelineFilterRef = useRef<HTMLButtonElement>(null);
  const ticketFilterRef = useRef<HTMLButtonElement>(null);

  function moveSelection(delta: number) {
    if (actionsOpen || helpOpen) return;
    if (navItems.length === 0) return;
    if (delta < 0 && (selectedNavIndex <= 0)) {
      setSelectedNavIndex(-1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const next = selectedNavIndex === -1
      ? (delta > 0 ? 0 : navItems.length - 1)
      : Math.max(0, Math.min(selectedNavIndex + delta, navItems.length - 1));
    setSelectedNavIndex(next);
  }

  const selectedItem = selectedNavIndex >= 0 ? navItems[selectedNavIndex] ?? null : null;

  const shortcuts: ReadonlyArray<ShortcutDef> = useMemo(() => [
    { keys: "j", label: "Move down", action: () => moveSelection(1), group: "Navigation" },
    { keys: "k", label: "Move up", action: () => moveSelection(-1), group: "Navigation" },
    {
      keys: "o",
      label: "Open PR",
      action: () => { if (selectedPR) window.open(selectedPR.url, "_blank"); },
      group: "Navigation",
    },
    {
      keys: "p",
      label: "Open pipeline",
      action: () => { if (selectedPR?.pipelineUrl) window.open(selectedPR.pipelineUrl, "_blank"); },
      group: "Navigation",
    },
    {
      keys: "a",
      label: "Actions",
      action: () => { if (selectedPR) setActionsOpen(true); },
      group: "Navigation",
    },
    { keys: "i", label: "Toggle sidebar", action: () => setSidebarOpen((o) => !o), group: "Navigation" },

    { keys: "g r", label: "Repo", action: () => setGroup(Option.some("repo")), group: "Group by" },
    { keys: "g k", label: "Ticket", action: () => setGroup(Option.some("ticket")), group: "Group by" },
    { keys: "g s", label: "Stack", action: () => setGroup(Option.some("stack")), group: "Group by" },
    { keys: "g n", label: "None", action: () => setGroup(Option.some("none")), group: "Group by" },

    {
      keys: "z o",
      label: "Open all groups",
      action: () => setClosedGroups(() => new Set()),
      group: "Folds",
    },
    {
      keys: "z c",
      label: "Close current group",
      action: () => {
        if (selectedGroupName) {
          closeGroup(setClosedGroups, selectedGroupName);
          setSelectedNavIndex(-1);
        }
      },
      group: "Folds",
    },
    {
      keys: "z a",
      label: "Close all groups",
      action: () => { setClosedGroups(() => new Set(groupedNames)); setSelectedNavIndex(-1); },
      group: "Folds",
    },
    {
      keys: "Enter",
      label: "Toggle fold / open PR",
      action: () => {
        if (selectedItem?._tag === "group") {
          toggleGroup(setClosedGroups, selectedItem.name);
        } else if (selectedPR) {
          window.open(selectedPR.url, "_blank");
        }
      },
      group: "Navigation",
    },

    { keys: "/", label: "Search", action: () => filterInputRef.current?.focus(), group: "Filters" },
    { keys: "f r", label: "Repo filter", action: () => repoFilterRef.current?.click(), group: "Filters" },
    { keys: "f v", label: "Review filter", action: () => reviewFilterRef.current?.click(), group: "Filters" },
    { keys: "f p", label: "Pipeline filter", action: () => pipelineFilterRef.current?.click(), group: "Filters" },
    { keys: "f t", label: "Ticket filter", action: () => ticketFilterRef.current?.click(), group: "Filters" },
    { keys: "c f", label: "Clear all filters", action: () => { setSearch(Option.some("")); setSelectedRepos([]); setSelectedPipelines([]); setSelectedReviews([]); setSelectedTickets([]); }, group: "Filters" },

    { keys: "?", label: "Shortcuts", action: () => setHelpOpen((o) => !o), group: "General" },
    {
      keys: "Escape",
      label: "Close / deselect",
      enableInInputs: true,
      group: "General",
      action: () => {
        if (document.activeElement instanceof HTMLElement && document.activeElement.tagName === "INPUT") {
          document.activeElement.blur();
          return;
        }
        if (helpOpen) { setHelpOpen(false); return; }
        if (actionsOpen) { setActionsOpen(false); return; }
        if (sidebarOpen) { setSidebarOpen(false); return; }
        if (selectedNavIndex >= 0) { setSelectedNavIndex(-1); return; }
      },
    },
  ], [setGroup, setSearch, setSelectedRepos, setSelectedPipelines, setSelectedReviews, setSelectedTickets, setSelectedNavIndex, setSidebarOpen, setClosedGroups, navItems, selectedNavIndex, selectedPR, selectedGroupName, selectedItem, groupedNames, helpOpen, actionsOpen, sidebarOpen]);

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
          <ReviewQueue />
          {prs.length > 0 && <PRList />}
          {!loading && !error && prs.length === 0 && <div className="muted">No PRs found</div>}
        </div>
        <Sidebar />
      </div>

      <FloatingBar pending={pending} shortcuts={shortcuts} />
      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} shortcuts={shortcuts} />
      <ActionsModal pr={selectedPR} open={actionsOpen} onClose={() => setActionsOpen(false)} />
    </>
  );
}
