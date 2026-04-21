# Refactor Audit

Date: 2026-04-20
Workspace: `C:\Users\reala\OneDrive\Desktop\sendi\se.io SYSTEM DEMO`

## 1. Snapshot

This codebase is not "broken by design", but it has clearly crossed the point where feature work and UI polishing are slower than they should be. The biggest issue is not any single bug. The issue is that a few central files are doing too many jobs at once:

- page composition
- local UI state
- table behavior
- export logic
- persistence
- business rules
- live simulation

There are already good extraction attempts in place, but they are partial. That creates a hybrid system where some flows are shared and some are still duplicated.

## 2. Largest Hotspots

Largest files by line count:

1. `src/app/components/pages/live-manager.tsx` - 2050 lines
2. `src/app/context/delivery.context.tsx` - 1843 lines
3. `src/app/components/pages/deliveries-page.tsx` - 1593 lines
4. `src/app/components/pages/statistics-unified-page.tsx` - 1534 lines
5. `src/app/context/delivery.reducer.ts` - 1409 lines
6. `src/app/components/pages/entities/couriers-shifts.tsx` - 1332 lines
7. `src/app/components/pages/entities/couriers-list-page.tsx` - 1177 lines
8. `src/app/components/pages/live/live-couriers-view.tsx` - 1167 lines
9. `src/app/components/pages/entities/restaurants-page.tsx` - 1019 lines
10. `src/app/components/pages/courier-details-page.tsx` - 951 lines

Largest architectural hotspots by responsibility:

- `src/app/context/delivery.context.tsx`
  - seed generation
  - normalization
  - local storage persistence
  - background simulation
  - provider wiring
- `src/app/context/delivery.reducer.ts`
  - delivery mutations
  - courier logic
  - shift logic
  - business transitions
- `src/app/components/pages/deliveries-page.tsx`
  - filters
  - toolbar orchestration
  - column orchestration
  - row selection
  - export
  - side panels
  - date logic
- `src/app/components/pages/live-manager.tsx`
  - panel state
  - courier movement state
  - tab management
  - map coordination
  - live route orchestration
  - search, filter, sort, selection

## 3. What Is Already Good

There are real shared building blocks already in the repo:

- `src/app/components/deliveries/*`
- `src/app/components/pages/entities/entity-table-shared.ts`
- `src/app/components/pages/entities/entity-toolbar-controls.tsx`
- `src/app/components/common/table-widths.ts`
- `src/app/hooks/useDeliveriesFilters.ts`
- `src/app/hooks/useDeliveriesExport.ts`

This is important because it means the codebase should be refactored by consolidation, not by rewriting everything.

## 4. Main Structural Problems

### 4.1 Partial sharing

The repo has shared components, but they are only partially adopted.

Examples:

- Deliveries has a mature component ecosystem, but `deliveries-page.tsx` still remains too large.
- Entity pages share some table shell pieces, but still keep page-specific export, filters, context menus, sorting, and column behavior.
- Column and export systems were originally built for deliveries, then adapted for entities, but not fully normalized.

### 4.2 Logic is attached to pages

Several pages still own state and behavior that should live elsewhere:

- export logic inside entity pages
- inline filter state inside big page files
- context menu behavior inside pages
- table wiring and mapping inside page files

This makes UI fixes risky because layout and behavior are tightly coupled.

### 4.3 Context and reducer are overloaded

`delivery.context.tsx` and `delivery.reducer.ts` together act as:

- fake backend
- state store
- simulation engine
- migration layer
- persistence adapter
- domain service

That makes them hard to reason about and hard to safely refactor.

### 4.4 Persistence is scattered

`localStorage` appears in many unrelated files, including:

- deliveries UI
- entity pages
- live manager
- layout components
- multiple contexts

This means persistence rules are not centralized. It also makes reset/migration behavior more fragile.

### 4.5 Export logic is duplicated across domains

`XLSX`, `saveAs`, `JSZip`, and export-related logic currently exist in:

- `src/app/hooks/useDeliveriesExport.ts`
- `src/app/components/pages/entities/couriers-list-page.tsx`
- `src/app/components/pages/entities/restaurants-page.tsx`
- `src/app/components/pages/entities/managers-page.tsx`
- report and analytics files

This is a strong signal that export should be promoted to a shared domain service layer.

### 4.6 UI consistency depends on page-level tweaks

A lot of recent UI fixes required changing each page independently:

- table widths
- row actions
- hover states
- toolbar ordering
- info bars

That means the shared shell is not strong enough yet.

## 5. Problem Clusters

### Cluster A: Deliveries domain

Files:

- `src/app/components/pages/deliveries-page.tsx`
- `src/app/components/deliveries/*`
- `src/app/hooks/useDeliveriesFilters.ts`
- `src/app/hooks/useDeliveriesExport.ts`

Assessment:

- strongest existing architecture in the repo
- still too much orchestration left in the page
- best candidate to become the reference pattern for the rest of the app

### Cluster B: Live system

Files:

- `src/app/components/pages/live-manager.tsx`
- `src/app/components/pages/live/live-couriers-view.tsx`
- `src/app/components/pages/live/leaflet-map.tsx`
- `src/app/components/pages/live/ultra-compact-strip.tsx`

Assessment:

- most fragile interaction area
- combines layout, animation, filters, route state, map markers, and live timing
- needs decomposition before more visual iteration

### Cluster C: Entity pages

Files:

- `src/app/components/pages/entities/restaurants-page.tsx`
- `src/app/components/pages/entities/couriers-list-page.tsx`
- `src/app/components/pages/entities/managers-page.tsx`
- `src/app/components/pages/entities/*toolbar*`
- `src/app/components/pages/entities/*inline-filters*`

Assessment:

- good candidate for consolidation
- still too much page-local behavior
- currently the main source of "why is this page slightly different?"

### Cluster D: Analytics and reports

Files:

- `src/app/components/pages/statistics-unified-page.tsx`
- `src/app/components/pages/reports-page.tsx`
- `src/app/hooks/useAdvancedReports.ts`

Assessment:

- large but lower urgency than live and entities
- likely contains a lot of charting and export duplication

## 6. Recommended Refactor Order

Do not refactor this codebase horizontally all at once.

Recommended order:

### Phase 1: Stabilize shared UI contracts

Goal:
- stop page-specific divergence

Tasks:
- create one shared entity table shell
- create one shared entity toolbar shell
- create one shared row-actions trigger/menu pattern
- centralize info-bar pattern

Success criteria:
- restaurants and couriers stop needing ad hoc visual fixes

### Phase 2: Extract entity page behavior

Goal:
- reduce page file size without touching domain logic yet

Tasks:
- split entity pages into:
  - page container
  - table view
  - export adapter
  - column config
  - actions/context-menu module
- remove direct XLSX/saveAs code from page files

Success criteria:
- entity pages drop below ~500-700 lines

### Phase 3: Split deliveries orchestration

Goal:
- keep deliveries as the reference architecture

Tasks:
- move toolbar orchestration out of `deliveries-page.tsx`
- isolate side-panel coordination
- isolate date/filter presets
- separate column layout/persistence glue from page render

Success criteria:
- `deliveries-page.tsx` becomes a composition file rather than a feature monolith

### Phase 4: Split simulation from app state

Goal:
- reduce risk inside context/reducer

Tasks:
- move simulation helpers out of `delivery.context.tsx`
- move transition calculators out of `delivery.reducer.ts`
- extract persistence/migration layer from provider

Success criteria:
- context becomes provider wiring
- reducer becomes state transitions
- simulation becomes standalone domain module

### Phase 5: Rebuild live manager on top of extracted pieces

Goal:
- make live UI easier to evolve

Tasks:
- split `live-manager.tsx` into:
  - shell/layout
  - tabs header
  - filters/search
  - map controller
  - route stop ordering controller
  - selection/details panel logic

Success criteria:
- live manager can be iterated visually without breaking behavior

## 7. Safe First Extractions

These are the safest first moves:

1. Create `src/app/components/pages/entities/entity-table-shell.tsx`
   - shared wrapper for header/body/actions/checkbox/info bar
2. Create `src/app/components/pages/entities/entity-export-drawer.tsx`
   - shared export panel for entities
3. Create `src/app/components/pages/entities/entity-column-config.ts`
   - data-only configs for columns and categories
4. Create `src/app/domain/deliveries/simulation/*`
   - pure functions only, no React

## 8. Risk Notes

- The codebase has many Hebrew UI strings inline in large TSX files. Bulk editing them carelessly risks encoding regressions.
- Because `localStorage` is scattered, behavior may appear "fixed" in one environment and not another until state is cleared or migrated.
- Large page files mean visual changes can accidentally affect sorting, export, and selection together.

## 9. Recommendation

The next real step should be:

1. consolidate entity table + toolbar behavior
2. move entity export out of page files
3. only then continue polishing screens

If the order is reversed, the repo will keep absorbing small UI fixes while staying structurally expensive to change.

## 10. Refresh Notes

This audit was refreshed again later on 2026-04-20 after more UI work and route changes. The overall diagnosis is still the same, but there are now a few concrete sources of friction that should be treated as first-class cleanup targets.

### 10.1 Current top heavy files

By current line count:

1. `src/app/components/pages/live-manager.tsx` - 2050
2. `src/app/context/delivery.context.tsx` - 1843
3. `src/app/components/pages/deliveries-page.tsx` - 1592
4. `src/app/components/pages/statistics-unified-page.tsx` - 1534
5. `src/app/context/delivery.reducer.ts` - 1409
6. `src/app/components/pages/entities/couriers-shifts.tsx` - 1332
7. `src/app/components/pages/entities/couriers-list-page.tsx` - 1177
8. `src/app/components/pages/live/live-couriers-view.tsx` - 1167
9. `src/app/components/pages/entities/restaurants-page.tsx` - 1019
10. `src/app/components/pages/reports-page.tsx` - 763

The important point is not only size. These files are also orchestration-heavy and couple UI layout with business behavior.

### 10.2 The repo now has live code plus stale code

There are several files that still exist even though the product flow has moved away from them:

- `src/app/components/pages/entities/managers-page.tsx` and related managers subcomponents still exist, even though the managers screen was removed from routing and navigation.
- `src/app/components/pages/entities/entity-column-panel.tsx` appears to be a legacy panel after moving entities onto the shared `ColumnSelector`.
- `src/app/components/pages/live-manager-page.tsx` is still imported in `src/app/routes.tsx`, but the route itself uses `LiveManager`, not `LiveManagerPage`.

This matters because stale files create false choices during edits. They make it easy to patch the wrong thing or assume a feature is still alive when it is actually dead.

### 10.3 Some product areas are intentionally stripped but still look like feature pages

At this point:

- `src/app/components/pages/operating-hours-page.tsx`
- `src/app/components/pages/distance-pricing-page.tsx`
- `src/app/components/pages/performance-page.tsx`

have been reduced to shell-only or near-shell-only screens.

That is not wrong, but it means the repo currently mixes:

- full feature pages
- reduced placeholder pages
- stale legacy feature files

This inconsistency increases confusion when scanning the codebase.

### 10.4 Encoding risk is real

Large Hebrew-heavy TSX files remain vulnerable to accidental encoding regressions during bulk edits. This already happened to `src/app/components/pages/deliveries-page.tsx` and had to be restored from git.

Implication:

- avoid broad blind rewrites of large TSX files
- prefer narrow patches
- prefer extracting data/config out of the giant page files before doing more text-heavy UI work

### 10.5 Working tree drift is now part of the problem

At the time of this refresh, the repo has a wide spread of modified files across:

- sidebar/layout
- entity pages
- delivery context/types
- map branding
- stripped settings/business pages

This means the codebase is not only structurally large. It is also in a state where many cross-cutting edits are open simultaneously.

That makes "what is the source of truth?" harder to answer during debugging.

### 10.6 Shared systems are better than before, but still incomplete

Progress already made:

- entities share more table shell pieces
- entities use the same `ColumnSelector`
- entities use a more aligned toolbar control pattern
- common table widths exist in `src/app/components/common/table-widths.ts`

Still incomplete:

- entity exports are still not fully centralized into one shared entity export module
- row action patterns are not fully normalized everywhere
- the live manager remains its own interaction universe
- `deliveries-page.tsx` still owns too much toolbar, filter, period, drawer, and selection orchestration

### 10.7 Strong candidates for deletion or consolidation

Before deeper feature work, review these explicitly:

- `src/app/components/pages/entities/managers-page.tsx`
- `src/app/components/pages/entities/managers-inline-filters.tsx`
- `src/app/components/pages/entities/managers-toolbar.tsx`
- `src/app/components/pages/entities/managers-filter-chips.tsx`
- `src/app/components/pages/entities/managers-stats.tsx`
- `src/app/components/pages/entities/entity-column-panel.tsx`
- `src/app/components/pages/live-manager-page.tsx`

Not all of them must be deleted immediately, but they should not remain in an ambiguous half-alive state.

### 10.8 Updated practical order

The best order is now:

1. clean stale/dead code and unused imports/routes
2. finish the shared entity system:
   - table shell
   - toolbar shell
   - export drawer
   - row actions
3. split `deliveries-page.tsx` into composition + modules
4. split `delivery.context.tsx` / `delivery.reducer.ts`
5. only then do a dedicated live-manager refactor

If live-manager is tackled first, it will keep pulling against unstable foundations.

## 11. Current Recommendation

If starting immediately, the most valuable cleanup sequence is:

1. remove or archive the dead managers stack and other stale page files
2. create a real shared `entity-export-drawer`
3. extract `deliveries` toolbar/period/search/filter orchestration out of `deliveries-page.tsx`
4. extract simulation and persistence helpers out of `delivery.context.tsx`

That sequence will reduce both file size and day-to-day editing risk faster than another round of visual tweaks.

## 12. Cleanup Completed

The first low-risk cleanup pass is done:

- removed stale legacy page:
  - `src/app/components/pages/live-manager-page.tsx`
- removed unused legacy entity column panel:
  - `src/app/components/pages/entities/entity-column-panel.tsx`
- removed orphaned managers stack files that are no longer routed or linked from the app:
  - `src/app/components/pages/entities/managers-page.tsx`
  - `src/app/components/pages/entities/managers-inline-filters.tsx`
  - `src/app/components/pages/entities/managers-filter-chips.tsx`
  - `src/app/components/pages/entities/managers-toolbar.tsx`
  - `src/app/components/pages/entities/managers-stats.tsx`
- removed stale `LiveManagerPage` import from:
  - `src/app/routes.tsx`

Validation:

- global search for `LiveManagerPage`, `ManagersPage`, `ManagersToolbar`, `ManagersFilterChips`, `ManagersInlineFilters`, `ManagersStats`, and `EntityColumnPanel` returns no remaining references
- `npm run build` passes after cleanup
