# Analytics Module — NOT ACTIVE

**Status:** stub-only. The module currently contains only `analytics.types.ts` and is
**not wired** to any route, service, or background job.

## What exists today

- Interfaces: `PageView`, `WatchEvent`, `AnalyticsSummary`.
- No controller, no service, no repository, no tests.

## What the project actually uses for analytics

- `prisma.pageView` table is populated by the page-view tracker.
- The admin dashboard at `app/dashboard/page.tsx` reads those rows directly via
  `AdminService.getDashboardSummary()` (`src/be/modules/admin/admin.service.ts`).
- TCoin top-up revenue stats come from `prisma.topupOrder`.

## Decision needed

Either:
- **(a)** Implement the module — add `analytics.service.ts` + `analytics.repository.ts` and
  move dashboard aggregation logic out of `admin.service.ts`. This is the "right" thing.
- **(b)** Delete the folder entirely. The types are unused; nothing imports them.

Until one of those happens, this file marks the module as **inactive** so contributors
don't assume an analytics pipeline exists.
