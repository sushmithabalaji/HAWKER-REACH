# 0001 · React front end with a Node API, deployed as a Databricks App

**Date:** 2026-10-22
**Status:** Accepted

## Context

The first app skeleton (`app/app.py`) used Streamlit. The team has been told to avoid Python UI frameworks (Streamlit, Dash and similar) for the app. The app needs two map-heavy pages (wireframe v1, Page 1 and Page 2) that read precomputed gold tables from the `hawkerreach` catalog through a Databricks SQL warehouse.

## Decision

- **UI:** React with Vite. Maps use deck.gl (with react-map-gl / MapLibre for the base map).
- **API:** a small Node server (Express) that serves the built React files and exposes `/api/...` routes. Routes query gold tables with `@databricks/sql`.
- **Deploy:** the Node server runs as a Databricks App, authenticating with the app's service principal and the `sql-warehouse` resource, as the Streamlit skeleton did.
- **Rule kept:** no routing at click time. The API only reads precomputed gold tables.

The browser never talks to Databricks directly, so no access token reaches the client. A Python API (such as FastAPI) is ruled out for the same reason as Streamlit.

## Consequences

- `app/app.py` and `app/requirements.txt` are replaced by a `package.json`, a Vite React app and a Node server; `app/app.yaml` runs Node. This is the first ticket of Spec 1 (app shell).
- Page owners write React components plus the `/api` routes their pages need. The Spec 1 shell defines how pages and routes plug in.
- Node support on Databricks Apps (Free Edition) should be confirmed by the first Spec 1 ticket, before page work depends on it.
- Open: whether the "avoid Python frameworks" rule also covers the PySpark notebooks. This ADR assumes it covers the app only.
