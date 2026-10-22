# Architecture

Databricks notebooks turn public data into gold tables; a React app reads those tables through a small Node API, deployed as a Databricks App.

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
                              ▲  @databricks/sql
Node server (Express), deployed as the Databricks App
  - /api/... routes: read gold tables only
  - serves the built React files
                              ▲  fetch /api/...
Browser: React (Vite) + deck.gl maps
```

| Layer | Technology | Where |
|---|---|---|
| Data platform | Databricks, Unity Catalog `hawkerreach`, bronze / silver / gold schemas | `Sql/00_setup.sql` |
| Pipeline | Notebooks: PySpark, pandas, shapely, osmium, networkx, scipy | `01_ingest` … `04_gold_access` |
| Serving | Databricks SQL warehouse | `app/app.yaml` (`sql-warehouse` resource) |
| API | Node + Express, `@databricks/sql` | `app/` (Spec 1) |
| UI | React + Vite | `app/` (Spec 1) |
| Maps | deck.gl, react-map-gl / MapLibre | `app/` (Spec 1) |

Rules:

- The app reads gold tables only, and does no routing at click time.
- The browser never talks to Databricks directly; all queries go through the Node API.

Why React and Node: [ADR 0001](adr/0001-react-and-node-on-databricks-apps.md).
