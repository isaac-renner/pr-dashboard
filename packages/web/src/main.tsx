/**
 * Web entry point — Phase 4 implementation.
 *
 * Will mount:
 * - React 19 app with @effect/atom-react RegistryContext
 * - RPC client consuming PrDashboardRpc
 * - Atoms for PR data, filters (URL-synced), grouping, buckets
 * - Component tree: App → FilterBar + BucketList
 */

import React from "react"
import { createRoot } from "react-dom/client"

function App() {
  return (
    <div style={{ fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace', padding: "2rem 2.5rem" }}>
      <h1 style={{ fontSize: "1.2rem", letterSpacing: "0.02em" }}>PR Dashboard</h1>
      <p style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
        Scaffold ready — React + Effect Atom implementation in Phase 4
      </p>
    </div>
  )
}

const root = createRoot(document.getElementById("root")!)
root.render(<App />)
