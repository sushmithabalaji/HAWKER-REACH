# Closure plan engine

Pure TypeScript engine for Page 1 (Spec 3, #11). No React, no AppKit, no data fetching.

```ts
evaluatePlan(data, anchorId, selectedIds, assumptions) → PlanResult
```

- `data`: gold rows (`block_options`, `centres`, `centre_demand`, `centre_closures`), typed in `src/gold.ts`
- `assumptions`: the parsed `assumptions.json` from the repo root; every threshold and constant comes from it
- Throws `PlanError` (`interim-centre`, `too-many-centres`) for plans the page must not evaluate

This folder is temporary. It moves into `app/shared/` once Spec 1's AppKit shell lands.

```sh
npm install
npm test        # Vitest, tests only through evaluatePlan
npm run typecheck
```
