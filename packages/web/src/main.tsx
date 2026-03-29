import { RegistryProvider } from "@effect/atom-react";
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./components/App.js";
import { ModalProvider } from "./contexts/ModalContext.js";
import { ShortcutProvider } from "./contexts/ShortcutContext.js";
import "./styles/tokens.css";

createRoot(document.getElementById("root")!).render(
  <RegistryProvider>
    <ModalProvider>
      <ShortcutProvider>
        <App />
      </ShortcutProvider>
    </ModalProvider>
  </RegistryProvider>,
);
