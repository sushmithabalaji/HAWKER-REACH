# HawkerReach app

A Databricks App built with [AppKit](https://developers.databricks.com/docs/appkit/v0/) (React + Vite on AppKit's Node server). It reads gold tables in `hawkerreach.gold` through SQL query files. Why AppKit: `docs/adr/0002-appkit-for-the-app.md`.

## Run it

```bash
cp .env.example .env               # set DATABRICKS_HOST (or DATABRICKS_CONFIG_PROFILE) and DATABRICKS_WAREHOUSE_ID
npm install
npm run dev                        # local, against the real warehouse
databricks apps validate           # typegen, lint, typecheck, build, tests
databricks apps deploy             # validate, deploy and start the app
```

Typegen needs a signed-in profile. If `DATABRICKS_CONFIG_PROFILE` points at one you haven't signed in to, typegen goes offline and query results become `unknown`. Run `databricks auth login --profile <name>` first.

The app's service principal needs gold-only read grants: `Sql/01_app_grants.sql`.

## Where things go

| What | Where |
|---|---|
| A page | `client/src/pages/<page>/`, with its component and its `assumptions.ts` |
| Adding a page to the sidebar and routes | one entry in `client/src/pages/registry.tsx` (`path`, `label`, `element`, `assumptions`) |
| A read | `config/queries/<page>_<name>.sql`, gold tables only, named parameters. Run `npm run typegen`, then call it with `useAnalyticsQuery('<page>_<name>', params)` |
| A custom server route | only for what a SQL file can't do, in `server/server.ts`. Check with the shell owner (Spec 1) first |
| Pure TypeScript both sides use | `shared/` (no React, Express or AppKit imports), imported as `@shared/...` |
| Shared UI | `client/src/components/shared/`: `TagBadge`, `AssumptionsPanel`, `BaseMap`, `CentreSearch` |
| Query results | AppKit's JSON format sends every value as a string (`"103.81"`, `"false"`) even though the generated types say number or boolean. Parse before use, e.g. `toNumber` / `toBoolean` in `components/shared/centres.ts` |
| Tests | Vitest, `<name>.test.ts` next to the code. `npm test` |

## Tags and the Assumptions panel

Every number shown carries a `<TagBadge tag="MEASURED" | "MODELLED" | "ASSUMPTION" />` and a line in its page's Assumptions panel. A page lists its lines in its `assumptions.ts`, either written out (`text`, `tag`, `source`, `status`) or as `{ key: '<assumptions.json key>' }`, which reads name, value, unit, tag and source from `assumptions.json`. A third kind, `{ limitation: '...' }`, is a known limitation of the model and has no tag. Lines with status `open` show their source with "(source still needed)", or "illustrative, unsourced" when there is no source.

Lines a spec owns but shows on another spec's page (for example Spec 2's model lines on Page 1) go in `client/src/assumptions/<spec>.ts`. The page that shows them spreads them into its `assumptions` in the registry, so each spec still edits only its own file.

`shared/assumptions.json` is a copy of the repo-root `assumptions.json`, because Databricks only uploads `app/` when it builds the app. Edit the root file, then run `npm run sync:assumptions`. A test fails if the copy drifts.

## Maps

`BaseMap` is the Singapore map every page uses. Pass it deck.gl `layers` (drawn bottom first) and an optional `getTooltip`. `CentreSearch` picks the centre to close, with a town filter. Interim centres are listed but can't be picked. Both read subzone shapes and centres from `GeoDataProvider` in the app layout, which loads `gold.subzone_shapes` and `gold.centres` once per visit.

Tiles come from OneMap's grey basemap. If OneMap is unreachable, the map switches to Carto Positron, and then to subzone outlines alone. The outlines are always drawn under the page's layers, so the map still reads with no tiles.

Basemap credits:
- [OneMap](https://www.onemap.gov.sg/) © contributors, [Singapore Land Authority](https://www.sla.gov.sg/)
- © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors © [CARTO](https://carto.com/attributions)
