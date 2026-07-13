## Phase 3: External Supabase Integration

Wire the app to the pre-deployed Supabase backend. No migrations, no schema changes — strict client-side integration only.

### 1. Client setup
- `bun add @supabase/supabase-js`
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env` (values provided).
- Create `src/lib/supabase.ts` — single typed `createClient<Database>()` instance, `persistSession: true`, `autoRefreshToken: true`.

### 2. Types
- Create `src/types/database.types.ts` with a hand-written `Database` interface mapping the three tables (`users`, `daily_calibrations`, `tasks`) with `Row` / `Insert` / `Update` shapes using the enum unions from the directive. Re-export enum unions.
- Update `src/types/task.ts` to re-use these enum types (no drift).

### 3. Minimal Auth (email + password)
Required because `tasks.user_id` is RLS-scoped.
- Create `src/routes/auth.tsx` — public route, single card with tabs for Sign In / Sign Up (email + password). Styled with existing `bg-surface` / `shadow-3d-*` tokens. On success → navigate to `/`.
- Create `src/hooks/useAuth.ts` — subscribes to `supabase.auth.onAuthStateChange`, exposes `{ user, session, loading }`.
- Add a lightweight guard inside `AppShell`: if no session and route ≠ `/auth`, redirect to `/auth`. (Avoids restructuring routes under `_authenticated/` this phase.)
- Add a Sign Out control in the existing Profile route.
- No `profiles` table is created (backend already owns `users`).

### 4. OCRReviewDrawer — Confirm & Sync
- Convert `onConfirm` handler to async: insert into `public.tasks` with `{ user_id: session.user.id, title, raw_text, effort_size, difficulty, deadline, status: 'pending', is_governor_locked: false }`.
- Local `isSaving` state disables the button + shows spinner icon.
- `sonner` toast on success (`"Task synced"`) and error (message from Supabase error).
- On success: close drawer, invalidate the tasks query, enqueue via offline queue if `navigator.onLine === false`.

### 5. Dashboard — live calibration
- Replace hardcoded 85% / "Green State" with a TanStack Query:
  - Key: `["daily_calibrations", userId, today]`
  - Fetch: `select * from daily_calibrations where user_id=? and date=today order by created_at desc limit 1`.
- Map `burnout_tier` → ring color + label:
  - `Green` → `--color-accent-mint`, "Green State"
  - `Amber` → `--color-warning-amber`, "Amber State"
  - `Red` → destructive red token, "Red State"
- Score % derived from `energy_baseline * 10` (fallback 0 if no row today).
- Loading skeleton uses existing `shadow-3d-base` surface; empty state prompts "Complete morning calibration."
- Extract the ring into `src/components/dashboard/MacroScoreRing.tsx` accepting `{ tier, score }` so the component boundary matches the directive.
- The Sleep / Tasks / Energy stat pills also read from the calibration row + a lightweight `count(tasks)` query.

### 6. Optimistic UI + Offline Queue
- Create `src/lib/offlineQueue.ts`:
  - Persistent queue in `localStorage` under `cognisync.pending_mutations`.
  - Entry shape: `{ id, kind: 'task_insert' | 'task_toggle' | 'calibration_upsert', payload, createdAt }`.
  - `enqueue(entry)` → appends + attempts drain.
  - `drain()` → iterate FIFO, call the matching Supabase op, remove on success, stop on first failure.
  - Listens for `window.online` and drains; also drains on client init.
- Wrap the three mutation surfaces (task insert from drawer, future task complete toggle, calibration save hook) so they:
  1. Apply the optimistic change to the TanStack Query cache immediately.
  2. Attempt the network call; on failure or offline, enqueue and keep the optimistic state.
  3. On drain success, invalidate the affected query keys.
- A tiny `<OfflineBanner />` in `AppShell` shows "Working offline — N changes pending" when the queue is non-empty.

### 7. Verification
- `bunx tsgo --noEmit` must pass with all Supabase calls strictly typed via `Database`.
- Manual smoke: sign up → open Quick Text → confirm → see toast + row in Supabase. Dashboard reflects today's calibration when a row exists.

### Files touched
**Create:** `src/lib/supabase.ts`, `src/lib/offlineQueue.ts`, `src/types/database.types.ts`, `src/hooks/useAuth.ts`, `src/routes/auth.tsx`, `src/components/dashboard/MacroScoreRing.tsx`, `.env`

**Edit:** `src/types/task.ts`, `src/components/modals/OCRReviewDrawer.tsx`, `src/components/dashboard/Dashboard.tsx`, `src/components/ingestion/IngestionHub.tsx` (pass insert result through), `src/layouts/AppShell.tsx` (auth guard + offline banner), `src/routes/profile.tsx` (sign-out button)

**Untouched:** `src/styles.css` (`@theme` intact), Tailwind config, all existing 3D tokens, database schema.