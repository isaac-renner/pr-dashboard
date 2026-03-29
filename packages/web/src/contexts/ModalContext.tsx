/**
 * Modal context — manages help and actions modal state.
 * Keeps modal state out of App.tsx and accessible to shortcuts.
 */

import React, { createContext, useCallback, useContext, useState } from "react";

interface ModalState {
  readonly helpOpen: boolean;
  readonly actionsOpen: boolean;
  readonly setHelpOpen: React.Dispatch<React.SetStateAction<boolean>>;
  readonly setActionsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  readonly closeAll: () => void;
  /** Close the topmost open modal. Returns true if something was closed. */
  readonly dismissTop: () => boolean;
}

const ModalCtx = createContext<ModalState | null>(null);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const closeAll = useCallback(() => {
    setHelpOpen(false);
    setActionsOpen(false);
  }, []);

  const dismissTop = useCallback(() => {
    if (actionsOpen) { setActionsOpen(false); return true; }
    if (helpOpen) { setHelpOpen(false); return true; }
    return false;
  }, [helpOpen, actionsOpen]);

  return (
    <ModalCtx.Provider value={{ helpOpen, actionsOpen, setHelpOpen, setActionsOpen, closeAll, dismissTop }}>
      {children}
    </ModalCtx.Provider>
  );
}

export function useModals() {
  const ctx = useContext(ModalCtx);
  if (!ctx) throw new Error("useModals must be used within ModalProvider");
  return ctx;
}
