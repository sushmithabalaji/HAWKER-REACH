# Architecture

Databricks notebooks turn public data into gold tables; a Databricks AppKit app (React front end, Node server) reads those tables through SQL query files, deployed as a Databricks App.

```
data.gov.sg + SingStat files ─┐
OSM walking network ──────────┤
                              ▼
Databricks (Unity Catalog: hawkerreach)
  bronze  ← 01_ingest           raw files as tables
  silver  ← 02_silver           centres, blocks, subzones, closures
          ← 03_dist_matrix      walking network + block→centre walks (≤ 2 km)
  gold    ← 04_gold_access      block_access (+ Spec 1 and 2 tables)
                              ▼
SQL warehouse
                              ▲  AppKit Analytics plugin (app service principal)
AppKit Node server (Express), deployed as the Databricks App
  - runs config/queries/*.sql: read gold tables only
  - serves the built React files
                              ▲  useAnalyticsQuery("<page>_<name>", params)
Browser: React (Vite) + deck.gl maps
```

| Layer | Technology | Where |
|---|---|---|
| Data platform | Databricks, Unity Catalog `hawkerreach`, bronze / silver / gold schemas | `Sql/00_setup.sql` |
| Pipeline | Notebooks: PySpark, pandas, shapely, osmium, networkx, scipy | `01_ingest` … `04_gold_access` |
| Serving | Databricks SQL warehouse | `app/app.yaml` (`sql-warehouse` resource) |
| App framework | Databricks AppKit, Analytics plugin | `app/` (Spec 1) |
| Queries | AppKit SQL files, typed with `npm run typegen` | `app/config/queries/` |
| UI | React + Vite | `app/client/` (Spec 1) |
| Maps | deck.gl, react-map-gl / MapLibre | `app/` (Spec 1) |

Rules:

- The app reads gold tables only, and does no routing at click time.
- The browser never talks to Databricks directly; AppKit runs every query on its Node server.

Why React and Node: [ADR 0001](adr/0001-react-and-node-on-databricks-apps.md). Why AppKit: [ADR 0002](adr/0002-appkit-for-the-app.md).
