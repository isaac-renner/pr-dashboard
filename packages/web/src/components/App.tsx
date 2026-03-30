import { useAtomSet, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import React, { useCallback, useEffect, useState } from "react";
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
import { ResizeHandle } from "./ResizeHandle.js";
import { ShortcutHelp } from "./ShortcutHelp.js";
import { Sidebar } from "./Sidebar.js";

const DEFAULT_SIDEBAR_WIDTH = 400;
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 800;

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

  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);

  const handleResize = useCallback((deltaX: number) => {
    setSidebarWidth((w) => Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, w - deltaX)));
  }, []);

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
          {sidebarOpen && <ResizeHandle onResize={handleResize} />}
          <Sidebar style={{ width: sidebarWidth }} />
        </div>
      </div>
      <FloatingBar pending={pending} shortcuts={shortcuts} />
      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} shortcuts={shortcuts} />
      <ActionsModal pr={selectedPR} open={actionsOpen} onClose={() => setActionsOpen(false)} />
    </div>
  );
}
