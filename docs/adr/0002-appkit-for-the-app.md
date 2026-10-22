# 0002 · Build the app with Databricks AppKit

**Date:** 2026-10-23
**Status:** Accepted
**Supersedes:** [0001](0001-react-and-node-on-databricks-apps.md), on how the app reads data. 0001's choice of a React front end on a Node server, deployed as a Databricks App, still stands.

## Context

0001 chose a React (Vite) front end and an Express server whose hand-written `/api` routes query gold tables with `@databricks/sql`. Databricks AppKit is a framework built on that same stack (React + Vite, an Express server, deployed as a Databricks App). It also takes care of service principal auth, the `sql-warehouse` resource, typed query results and deployment, which 0001 would have the team write by hand.

## Decision

- **Framework:** the app in `app/` is scaffolded with `databricks apps init --features analytics` (AppKit, Analytics plugin). Reads run on the SQL warehouse, not Lakebase.
- **Reads:** each read is a `.sql` file in `app/config/queries/` named `<page>_<name>.sql`, typed with `npm run typegen` and called from React with `useAnalyticsQuery`. Queries read gold tables only and use named parameters.
- **Custom routes:** Express routes in `app/server/server.ts` (inside `onPluginsReady`) are only for things a SQL file can't do, and need a check with the app shell owner (Spec 1). They are never used for plain SELECTs.
- **Rule kept:** the browser never talks to Databricks directly. AppKit runs every query on its Node server with the app's service principal, so no token reaches the client. No routing at click time.
- **Ruled out, as in 0001:** Python UI frameworks and Python APIs (Streamlit, Dash, FastAPI).

## Consequences

- `app/app.py` and `app/requirements.txt` are replaced by the AppKit scaffold. This is still the first ticket of Spec 1 (app shell).
- Page owners write React components and `.sql` query files, not `/api` routes.
- The AppKit and AppKit UI versions are the ones `databricks apps init` sets; don't override them in `package.json`.
- The first Spec 1 ticket confirms that AppKit apps run on Databricks Apps (Free Edition) before page work depends on it, as 0001 required for Node.
