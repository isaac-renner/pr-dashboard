import { useAtomSet, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import React from "react";
import { filteredPrsAtom } from "../atoms/derived.js";
import { filtersAtom } from "../atoms/filters.js";
import { lastRefreshedAtom, prsAtom, prsResponseAtom, refreshAtom } from "../atoms/prs.js";
import { timeAgo } from "../lib/format.js";
import { BucketList } from "./BucketList.js";
import { FilterBar } from "./FilterBar.js";

export function App() {
  const response = useAtomValue(prsResponseAtom);
  const prs = useAtomValue(prsAtom);
  const filtered = useAtomValue(filteredPrsAtom);
  const lastRefreshed = useAtomValue(lastRefreshedAtom);
  const filters = useAtomValue(filtersAtom);
  const refresh = useAtomSet(refreshAtom);

  const loading = AsyncResult.isInitial(response) || AsyncResult.isWaiting(response);
  const error = AsyncResult.isFailure(response) ? String(response.cause) : null;

  return (
    <>
      <div className="header">
        <div>
          <h1>PR Dashboard</h1>
          <div className="tagline">Triage by urgency, ticket, and repo</div>
        </div>
        <div className="refresh-bar">
          <span>
            {loading && !prs.length
              ? (
                <span className="refreshing">
                  <span className="spinner spinner-sm" />
                  Loading...
                </span>
              )
              : lastRefreshed
              ? (
                `Last refreshed ${timeAgo(lastRefreshed)}`
              )
              : null}
          </span>
          <button onClick={() => refresh()} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <FilterBar />

      <div id="content">
        {loading && !prs.length && (
          <div className="loading">
            <div className="spinner" />
            Loading...
          </div>
        )}
        {error && <div className="error">Error: {error}</div>}
        {prs.length > 0 && (
          <>
            <p className="count">
              {filtered.length} PR{filtered.length === 1 ? "" : "s"}
            </p>
            <BucketList />
          </>
        )}
        {!loading && !error && prs.length === 0 && <p className="count">No PRs found</p>}
      </div>
    </>
  );
}
