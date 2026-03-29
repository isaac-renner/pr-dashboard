import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import React, { createRef, useEffect, useMemo, useRef, useState } from "react";
import { filteredPrsAtom, groupedPrsAtom, navItemsAtom } from "../atoms/derived.js";
import { groupAtom, searchAtom, selectedPipelinesAtom, selectedReposAtom, selectedReviewsAtom, selectedTicketsAtom } from "../atoms/filters.js";
import { closedGroupsAtom, closeGroup, toggleGroup } from "../atoms/groups.js";
import { prsAtom, prsResponseAtom } from "../atoms/prs.js";
import { selectedGroupNameAtom, selectedNavIndexAtom, selectedPRAtom, sidebarOpenAtom } from "../atoms/selection.js";
import { viewModeAtom } from "../atoms/view.js";
import { FILTER_DEFS } from "../lib/filterDefs.js";
import { VIEW_DEFS } from "../lib/viewDefs.js";
import type { ShortcutDef } from "../lib/shortcuts.js";
import { useShortcuts } from "../lib/useShortcuts.js";
import { ActionsModal } from "./ActionsModal.js";
import { FilterBar } from "./FilterBar.js";
import { FloatingBar } from "./FloatingBar.js";
import { PRList } from "./PRList.js";
import { ShortcutHelp } from "./ShortcutHelp.js";
import { Sidebar } from "./Sidebar.js";

export function App() {
  const response = useAtomValue(prsResponseAtom);
  const prs = useAtomValue(prsAtom);
  const navItems = useAtomValue(navItemsAtom);
  const selectedNavIndex = useAtomValue(selectedNavIndexAtom);
  const setSelectedNavIndex = useAtomSet(selectedNavIndexAtom);
  const selectedPR = useAtomValue(selectedPRAtom);
  const selectedGroupName = useAtomValue(selectedGroupNameAtom);
  const setGroup = useAtomSet(groupAtom);
  const setSearch = useAtomSet(searchAtom);
  const sidebarOpen = useAtomValue(sidebarOpenAtom);
  const setSidebarOpen = useAtomSet(sidebarOpenAtom);
  const setClosedGroups = useAtomSet(closedGroupsAtom);
  const setViewMode = useAtomSet(viewModeAtom);
  const grouped = useAtomValue(groupedPrsAtom);
  const groupedNames = useMemo(() => new Set(grouped.keys()), [grouped]);

  // Clamp selection
  useEffect(() => {
    if (selectedNavIndex >= navItems.length) setSelectedNavIndex(Math.max(navItems.length - 1, -1));
  }, [navItems.length, selectedNavIndex, setSelectedNavIndex]);

  // Close sidebar when fully deselected
  useEffect(() => {
    if (selectedNavIndex === -1 && sidebarOpen) setSidebarOpen(false);
  }, [selectedNavIndex, sidebarOpen, setSidebarOpen]);

  const [helpOpen, setHelpOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  // Refs
  const filterInputRef = useRef<HTMLInputElement>(null);
  const filterRefs = useMemo(() => {
    const refs: Record<string, React.RefObject<HTMLButtonElement | null>> = {};
    for (const def of FILTER_DEFS) {
      refs[def.id] = createRef<HTMLButtonElement>();
    }
    return refs;
  }, []);

  // Navigation
  function moveSelection(delta: number) {
    if (actionsOpen || helpOpen) return;
    if (navItems.length === 0) return;
    if (delta < 0 && selectedNavIndex <= 0) {
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

  // --- Shortcuts (composed from features) ---

  const navigationShortcuts: ShortcutDef[] = useMemo(() => [
    { keys: "j", label: "Move down", action: () => moveSelection(1), group: "Navigation" },
    { keys: "k", label: "Move up", action: () => moveSelection(-1), group: "Navigation" },
    { keys: "o", label: "Open PR", action: () => { if (selectedPR) window.open(selectedPR.url, "_blank"); }, group: "Navigation" },
    { keys: "p", label: "Open pipeline", action: () => { if (selectedPR?.pipelineUrl) window.open(selectedPR.pipelineUrl, "_blank"); }, group: "Navigation" },
    { keys: "a", label: "Actions", action: () => { if (selectedPR) setActionsOpen(true); }, group: "Navigation" },
    { keys: "i", label: "Toggle sidebar", action: () => setSidebarOpen((o) => !o), group: "Navigation" },
    { keys: "g g", label: "Go to top", action: () => { setSelectedNavIndex(navItems.length > 0 ? 0 : -1); window.scrollTo({ top: 0, behavior: "smooth" }); }, group: "Navigation" },
    { keys: "Shift+g", label: "Go to bottom", action: () => { setSelectedNavIndex(navItems.length > 0 ? navItems.length - 1 : -1); }, group: "Navigation" },
    {
      keys: "Enter", label: "Toggle fold / open PR", group: "Navigation",
      action: () => {
        if (selectedItem?._tag === "group") toggleGroup(setClosedGroups, selectedItem.name);
        else if (selectedPR) window.open(selectedPR.url, "_blank");
      },
    },
  ], [navItems, selectedNavIndex, selectedPR, selectedItem, helpOpen, actionsOpen]);

  const viewShortcuts: ShortcutDef[] = useMemo(() =>
    VIEW_DEFS.map((def) => ({
      keys: def.shortcutKey,
      label: def.label,
      group: "Views",
      action: () => { setViewMode(def.id as any); setSelectedNavIndex(-1); setClosedGroups(() => new Set()); },
    })),
  []);

  const groupShortcuts: ShortcutDef[] = useMemo(() => [
    { keys: "g r", label: "Repo", action: () => setGroup(Option.some("repo")), group: "Group by" },
    { keys: "g k", label: "Ticket", action: () => setGroup(Option.some("ticket")), group: "Group by" },
    { keys: "g s", label: "Stack", action: () => setGroup(Option.some("stack")), group: "Group by" },
    { keys: "g n", label: "None", action: () => setGroup(Option.some("none")), group: "Group by" },
  ], []);

  const foldShortcuts: ShortcutDef[] = useMemo(() => [
    { keys: "z o", label: "Open all groups", action: () => setClosedGroups(() => new Set()), group: "Folds" },
    { keys: "z c", label: "Close current group", action: () => { if (selectedGroupName) { closeGroup(setClosedGroups, selectedGroupName); setSelectedNavIndex(-1); } }, group: "Folds" },
    { keys: "z a", label: "Close all groups", action: () => { setClosedGroups(() => new Set(groupedNames)); setSelectedNavIndex(-1); }, group: "Folds" },
  ], [selectedGroupName, groupedNames]);

  const filterShortcuts: ShortcutDef[] = useMemo(() => {
    const shortcuts: ShortcutDef[] = [
      { keys: "/", label: "Search", action: () => filterInputRef.current?.focus(), group: "Filters" },
    ];
    for (const def of FILTER_DEFS) {
      shortcuts.push({
        keys: `f ${def.shortcutKey}`,
        label: `${def.label} filter`,
        action: () => filterRefs[def.id]?.current?.click(),
        group: "Filters",
      });
    }
    shortcuts.push({
      keys: "c f", label: "Clear all filters", group: "Filters",
      action: () => {
        setSearch(Option.some(""));
        for (const def of FILTER_DEFS) {
          // Access the setter for each filter's selectedAtom
          // We need to go through the atom system
        }
      },
    });
    return shortcuts;
  }, []);

  // Fix the clear-all shortcut — we need individual setters
  const setSelectedRepos = useAtomSet(selectedReposAtom);
  const setSelectedPipelines = useAtomSet(selectedPipelinesAtom);
  const setSelectedReviews = useAtomSet(selectedReviewsAtom);
  const setSelectedTickets = useAtomSet(selectedTicketsAtom);

  // Replace the clear-all action in filterShortcuts
  const allFilterShortcuts = useMemo(() => {
    const shortcuts: ShortcutDef[] = [
      { keys: "/", label: "Search", action: () => filterInputRef.current?.focus(), group: "Filters" },
    ];
    for (const def of FILTER_DEFS) {
      shortcuts.push({
        keys: `f ${def.shortcutKey}`,
        label: `${def.label} filter`,
        action: () => filterRefs[def.id]?.current?.click(),
        group: "Filters",
      });
    }
    shortcuts.push({
      keys: "c f", label: "Clear all filters", group: "Filters",
      action: () => {
        setSearch(Option.some(""));
        setSelectedRepos([]);
        setSelectedPipelines([]);
        setSelectedReviews([]);
        setSelectedTickets([]);
      },
    });
    return shortcuts;
  }, []);

  const generalShortcuts: ShortcutDef[] = useMemo(() => [
    { keys: "?", label: "Shortcuts", action: () => setHelpOpen((o) => !o), group: "General" },
    {
      keys: "Escape", label: "Close / deselect", enableInInputs: true, group: "General",
      action: () => {
        if (document.activeElement instanceof HTMLElement && document.activeElement.tagName === "INPUT") { document.activeElement.blur(); return; }
        if (helpOpen) { setHelpOpen(false); return; }
        if (actionsOpen) { setActionsOpen(false); return; }
        if (sidebarOpen) { setSidebarOpen(false); return; }
        if (selectedNavIndex >= 0) { setSelectedNavIndex(-1); return; }
      },
    },
  ], [helpOpen, actionsOpen, sidebarOpen, selectedNavIndex]);

  const allShortcuts = useMemo(() => [
    ...navigationShortcuts,
    ...viewShortcuts,
    ...groupShortcuts,
    ...foldShortcuts,
    ...allFilterShortcuts,
    ...generalShortcuts,
  ], [navigationShortcuts, viewShortcuts, groupShortcuts, foldShortcuts, allFilterShortcuts, generalShortcuts]);

  const pending = useShortcuts(allShortcuts);

  const loading = AsyncResult.isInitial(response) || AsyncResult.isWaiting(response);
  const error = AsyncResult.isFailure(response) ? String(response.cause) : null;

  return (
    <>
      <FilterBar filterInputRef={filterInputRef} filterRefs={filterRefs} />

      <div className="app-layout">
        <div className="app-main">
          {loading && !prs.length && <div className="flex"><div className="spinner" /> Loading...</div>}
          {error && <div>Error: {error}</div>}
          {!loading && !error && <PRList />}
        </div>
        <Sidebar />
      </div>

      <FloatingBar pending={pending} shortcuts={allShortcuts} />
      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} shortcuts={allShortcuts} />
      <ActionsModal pr={selectedPR} open={actionsOpen} onClose={() => setActionsOpen(false)} />
    </>
  );
}
