## Phase 4 — QA Hardening, PDPL Sanitizer, Capacitor Prep

Strict frontend-only. No `@theme` changes, RLS untouched, no mock data in production paths.

### 1. Offline queue refinement + `NetworkBanner`
- `src/lib/offlineQueue.ts` enhancements (keep existing API to avoid churn):
  - Add exponential backoff on `drain()` failure (2s → 30s cap, 5 retries then pause until next `online` event).
  - Emit a `syncing` state via a new `subscribeStatus(fn)` broadcasting `"idle" | "syncing" | "offline" | "error"`.
  - Sequentially replay in FIFO order (already correct — verified) and separate metrics for `tasks` vs `daily_calibrations` counts.
  - Add re-export shim `src/utils/offlineQueue.ts` that re-exports from `@/lib/offlineQueue` so the directive path resolves without breaking existing imports.
- New `src/components/ui/NetworkBanner.tsx`:
  - Top-docked, `fixed top-3 inset-x-0 mx-auto`, `bg-warning-amber/15 text-warning-amber shadow-3d-base rounded-full` (Golden Warning pill).
  - Copy: "Offline Mode — Changes Queued" when `!navigator.onLine`; "Syncing N changes…" while draining; auto-fades (framer-motion `AnimatePresence`, 400ms) once queue empties AND online.
  - Uses `subscribeStatus` + `subscribeQueue`.
- `AppShell.tsx`: replace the inline `OfflineBanner` with `<NetworkBanner />` (top-docked, respects `pt-safe`).

### 2. Bimodal OCR fallback hardening
- Add `src/lib/ocrParse.ts` — thin typed wrapper around the (future) vision endpoint. For now:
  - Exports `parseOcr(asset): Promise<ParseResult>` with `ParseResult = { ok: true; payload: ParsedTaskPayload; confidence: number } | { ok: false; reason: 'malformed_json' | 'low_confidence' | 'network' }`.
  - Because no live endpoint exists yet, the util validates JSON via `zod` and threshold checks; production wiring lands in Phase 5. NOT mock data — it's the schema+guard the real endpoint will use.
- `MediaCapture.tsx`:
  - Wrap post-confirm handoff in try/catch; on thrown error, call `stopMediaTracks()` (already exists) and surface `onParseFail?(reason)` to parent.
- `OCRReviewDrawer.tsx`:
  - Accept new prop `onParseFail?: (reason) => void`; if `initialData` is missing AND `confidence < 0.7` was signaled by parent, drawer does not open — parent triggers `<BimodalFallback />` instead.
  - Wrap Supabase insert in try/catch; on JSON parse errors from Supabase reply, degrade to `enqueue()` and toast, never crash.
- `IngestionHub.tsx`: local state `fallbackOpen`. On `MediaCapture.onConfirm(asset)`, call `parseOcr(asset)`; if `ok` and `confidence >= 0.7` → open review drawer with `initialData`; else set `fallbackOpen=true` and render existing `<BimodalFallback open onRetake=... />`.

### 3. PDPL sanitizer
- New `src/utils/privacySanitizer.ts`:
  - `sanitizeText(input: string): { clean: string; flagged: string[] }`.
  - Regex passes for: 8+ digit ID numbers (school IDs / Emirates ID), email addresses, phone numbers (E.164 + local UAE formats), and a proper-noun heuristic that flags common "Name: …" / "Student: …" header patterns.
  - Replaces matches with `[REDACTED_ID]`, `[REDACTED_EMAIL]`, etc., returning the redacted string plus the list of flags for user review.
  - `sanitizeImageMetadata(blob): Promise<Blob>` — strips EXIF via canvas re-encode to WebP (reuses `compressToWebP` under the hood; declares intent explicitly so future OCR pipelines call this helper).
  - Pure functions, unit-testable, zero side effects.
- Wire into ingestion boundaries:
  - `QuickTextInput` → run `sanitizeText` before handing raw text to review drawer; show flagged tokens as amber chips ("Removed: 1 ID, 1 email").
  - `MediaCapture` post-compression → run `sanitizeImageMetadata` before `onConfirm` so any future OCR API call receives EXIF-stripped bytes.
- Biometric decoupling: audit `Dashboard` + `parent-view` queries — `sleep_quality` / `energy_baseline` are only ever read via `daily_calibrations`; add an explicit comment block in `useUserRole.ts` documenting that these columns MUST NOT be selected in any `users` / profile query. No code change needed if audit passes.

### 4. Capacitor / SPA readiness
- `AppShell.tsx`:
  - Apply `pt-safe` (existing `env(safe-area-inset-top)`) to the top region wrapping `NetworkBanner` and page header.
  - `BottomNav` already uses `env(safe-area-inset-bottom)` — verify + document.
- `src/styles.css`: add utility classes `@utility pt-safe { padding-top: env(safe-area-inset-top); }` and `@utility pb-safe { padding-bottom: env(safe-area-inset-bottom); }` (Tailwind v4 CSS-first, no `@theme` change).
- Confirm all routes use `createFileRoute` client rendering — no server loaders touching Supabase from top-level SSR paths (already verified: only browser client). Add `ssr: false` to `__root.tsx`? No — TanStack Start SPA-mode is opt-in per route and current build already ships client-hydrated. Add a short comment in `src/router.tsx` (or root) confirming SPA-safe posture.
- No React Router involved (the directive mentions "React Router" but the app uses TanStack Router). Note this in the audit report — no code drift needed.

### 5. Types & verification
- All new modules strictly typed; no `any` (already lint-clean, keep pattern).
- `bunx tsgo --noEmit` must pass.
- Manual smoke:
  - Toggle DevTools offline → NetworkBanner appears, submit task → toast "Saved offline", go online → banner shows "Syncing 1 change…" then fades.
  - Paste "Student: Jane Doe, ID 12345678, jane@school.ae need to finish homework" into Quick Text → flagged chips shown, review drawer opens with sanitized title.
  - Force `parseOcr` to return `low_confidence` (via test hook) → BimodalFallback opens, camera released.

### Files
**Create:** `src/utils/offlineQueue.ts` (re-export), `src/components/ui/NetworkBanner.tsx`, `src/lib/ocrParse.ts`, `src/utils/privacySanitizer.ts`

**Edit:** `src/lib/offlineQueue.ts` (backoff + status), `src/layouts/AppShell.tsx` (banner swap + pt-safe), `src/components/media/MediaCapture.tsx` (parse-fail hook + EXIF strip), `src/components/modals/OCRReviewDrawer.tsx` (guarded insert), `src/components/ingestion/IngestionHub.tsx` (parseOcr + fallback), `src/components/ingestion/QuickTextInput.tsx` (sanitizeText), `src/styles.css` (only add `@utility pt-safe` / `pb-safe` — `@theme` untouched)

**Untouched:** `@theme` block, database schema, RLS policies, all Phase 3 components (Dashboard/EnergySandbox/parent-view).
