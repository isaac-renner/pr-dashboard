import { useAtomSet, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import React, { useEffect } from "react";
import { navItemsAtom } from "../atoms/derived.js";
import { prsAtom, prsResponseAtom } from "../atoms/prs.js";
import { selectedNavIndexAtom, selectedPRAtom, sidebarOpenAtom } from "../atoms/selection.js";
import { useModals } from "../contexts/ModalContext.js";
import { useShortcutContext } from "../contexts/ShortcutContext.js";
import { useSSE } from "../hooks/useSSE.js";
import { ActionsModal } from "./ActionsModal.js";
import { FilterBar } from "./FilterBar.js";
import { FloatingBar } from "./FloatingBar.js";
import { PRList } from "./PRList.js";
import { ShortcutHelp } from "./ShortcutHelp.js";
import { Sidebar } from "./Sidebar.js";

export function App() {
  useSSE();
  const response = useAtomValue(prsResponseAtom);
  const prs = useAtomValue(prsAtom);
  const navItems = useAtomValue(navItemsAtom);
  const selectedNavIndex = useAtomValue(selectedNavIndexAtom);
  const setSelectedNavIndex = useAtomSet(selectedNavIndexAtom);
  const selectedPR = useAtomValue(selectedPRAtom);
  const sidebarOpen = useAtomValue(sidebarOpenAtom);
  const setSidebarOpen = useAtomSet(sidebarOpenAtom);

  const { helpOpen, setHelpOpen, actionsOpen, setActionsOpen } = useModals();
  const { shortcuts, pending, filterInputRef, filterRefs } = useShortcutContext();

  // Clamp selection
  useEffect(() => {
    if (selectedNavIndex >= navItems.length) setSelectedNavIndex(Math.max(navItems.length - 1, -1));
  }, [navItems.length, selectedNavIndex, setSelectedNavIndex]);

  // Close sidebar when fully deselected
  useEffect(() => {
    if (selectedNavIndex === -1 && sidebarOpen) setSidebarOpen(false);
  }, [selectedNavIndex, sidebarOpen, setSidebarOpen]);

  const loading = AsyncResult.isInitial(response) || AsyncResult.isWaiting(response);
  const error = AsyncResult.isFailure(response) ? String(response.cause) : null;

  return (
    <div className="shell">
      <div className="shell-content">
        <FilterBar filterInputRef={filterInputRef} filterRefs={filterRefs} />
        <div className="shell-scroll">
          <div className="shell-main">
            {loading && !prs.length && <div className="flex"><div className="spinner" /> Loading...</div>}
            {error && <div>Error: {error}</div>}
            {!loading && !error && <PRList />}
          </div>
          <Sidebar />
        </div>
      </div>
      <FloatingBar pending={pending} shortcuts={shortcuts} />
      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} shortcuts={shortcuts} />
      <ActionsModal pr={selectedPR} open={actionsOpen} onClose={() => setActionsOpen(false)} />
    </div>
  );
}
