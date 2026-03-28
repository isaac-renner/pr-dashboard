import React from "react"
import { createRoot } from "react-dom/client"
import { RegistryProvider } from "@effect/atom-react"
import { App } from "./components/App.js"
import "./styles/global.css"

createRoot(document.getElementById("root")!).render(
  <RegistryProvider>
    <App />
  </RegistryProvider>,
)
