## Phase 3 Completion — Anti-Gaming Lock, Parent View, Role Gating

Strict frontend-only. No schema, no `@theme` edits. All new queries strictly typed against `Database`.

### 1. Role resolution (shared)
- Add `src/hooks/useUserRole.ts` — TanStack Query keyed `["users", userId]`, selects `role, parent_id` from `public.users`. Exposes `{ role, parentId, loading }`.
- Consumed by `AppShell`, Dashboard, EnergySandbox, and the new Parent view.

### 2. Anti-Gaming Baseline Lock
- Add `src/hooks/useGovernorLockout.ts`:
  - Query: last 3 `daily_calibrations` for `userId` ordered by `date desc`, limit 3.
  - `isLocked = rows.length === 3 && rows.every(r => r.energy_baseline === 1 || r.sleep_quality < 4)`.
  - Returns `{ isLocked, rows }`.
- `Dashboard.tsx`:
  - When `isLocked`: render new `<GovernorLockoutPanel />` above stat pills.
    - Crimson-bordered "calendar grid" placeholder (`border-2 border-destructive rounded-3xl` on the existing pacing card).
    - Auto-rendered maintenance slots list: "10-Min Desk Organization", "20-Min Light Review", "Mandatory Sleep Hygiene Window" as `shadow-3d-base` pills.
  - Pass `disabled` prop through to any Add Task CTA rendered here (currently a nav link only, so also expose lockout via context — see below).
- `EnergySandbox.tsx`: when `isLocked`, freeze slider at `1`, show Crimson badge "Governor Lockout Active", disable input.
- `AppShell.tsx`: read `useGovernorLockout`; when locked, apply `aria-disabled` + `pointer-events-none opacity-40` to the `/add-task` bottom-nav item and short-circuit its `Link` to `#`.
- New component: `src/components/dashboard/GovernorLockoutPanel.tsx`.

### 3. Parent Macro Dashboard `/parent-view`
- New route `src/routes/parent-view.tsx` under `AppShell`.
- Fetches (parent-scoped, `tasks` table NEVER touched):
  - `users` where `parent_id = currentUser.id` → resolve linked student id (assume single student for v1; if multiple, pick first, display name/email from `auth` fallback).
  - `daily_calibrations` for that student, last 7 days ordered `date desc`.
- Components under `src/components/parent/`:
  - `BurnoutPreventionHero.tsx` — big `rounded-4xl bg-surface shadow-3d-base` card; score = `green_days / total_days * 100` (rounded); large numeral + label.
  - `BiometricTrend.tsx` — lightweight inline SVG dual-line (sleep_quality vs available_study_hours) over 7 days; no chart lib needed.
  - `SystemStatePill.tsx` — derives current state from most recent row's `burnout_tier`: Green→"Sustainable", Amber→"Load Warning", Red→"Governor Cap Active". Uses existing `--color-accent-mint`, `--color-warning-amber`, destructive token.
- Empty/loading states use `shadow-3d-base` skeletons.
- Explicit guard: if `role !== 'parent'`, `throw redirect({ to: '/' })` in `beforeLoad` equivalent (client redirect via `useEffect` since routes aren't under `_authenticated` layout this phase).

### 4. Role-Based Route Gating in `AppShell`
- `AppShell` reads `useUserRole()`.
- Nav item lists:
  - `student` (default): Dashboard, Add Task, Status, Profile (current behavior).
  - `parent`: Parent View (`/parent-view`), Profile only.
- If a `parent` lands on a student route (`/`, `/add-task`, `/status`), redirect to `/parent-view`.
- If a `student` lands on `/parent-view`, redirect to `/`.
- Loading role → keep current "Loading…" splash.

### 5. Types & typing
- Extend `src/types/database.types.ts` `UsersRow` usage (already has `role`, `parent_id`) — no change required.
- All new Supabase calls use `.from("users" | "daily_calibrations")` with `Database` generic; no `any`.

### 6. Verification
- `bunx tsgo --noEmit` must pass.
- Manual: sign in as student with 3 drained calibrations → lockout UI + disabled Add Task. Sign in as parent → only `/parent-view` + `/profile` reachable; no `tasks` query fires (verify Network tab).

### Files
**Create:** `src/hooks/useUserRole.ts`, `src/hooks/useGovernorLockout.ts`, `src/components/dashboard/GovernorLockoutPanel.tsx`, `src/routes/parent-view.tsx`, `src/components/parent/BurnoutPreventionHero.tsx`, `src/components/parent/BiometricTrend.tsx`, `src/components/parent/SystemStatePill.tsx`

**Edit:** `src/components/dashboard/Dashboard.tsx`, `src/components/dashboard/EnergySandbox.tsx`, `src/layouts/AppShell.tsx`, `src/routeTree.gen.ts` (auto)

**Untouched:** `src/styles.css`, database schema, `tasks` table access anywhere in parent surface.
