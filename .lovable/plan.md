# Phase 1 & 2 Architectural Audit — Plan

## Scope
Read-only audit of every existing component + targeted refactors. No new features. Ends with a Gatekeeper Report.

## Important stack note (Step 2 adjustment)
Project is on **Tailwind v4** (CSS-first, no `tailwind.config.ts`). Tokens live in `src/styles.css` under `@theme` and `@utility`. Most tokens the brief asks for **already exist**: `--color-surface`, `--color-accent-mint`, `--color-warning-amber`, `--color-governor-red`, `--color-text-secondary`, and `@utility shadow-3d-base` / `shadow-3d-pressed`. I will:
- Add missing tokens: `--color-slate-deep: #0F172A`, `--color-slate-abyss: #020617`, `--radius-4xl` alias for the 32px drawer/card radius (already present).
- Refactor components to use `bg-surface`, `bg-slate-deep`, `text-text-secondary`, `shadow-3d-base`, `shadow-3d-pressed`, `rounded-4xl` — eliminating every `bg-[#...]`, `rounded-[32px]`, inline `boxShadow` string.
- I will NOT create `tailwind.config.ts` (v4 does not read it; creating it is an anti-pattern on this stack).

## Step 1 — Directory refactor
Move files and update all imports (routes + intra-component):
```
src/components/atomic/         (new — extract PillGroup, ActionCard, CaptureButton)
src/components/dashboard/      EnergySandbox.tsx
src/components/ingestion/      IngestionHub.tsx, QuickTextInput.tsx, BimodalFallback.tsx
src/components/media/          MediaCapture.tsx
src/components/modals/         OCRReviewDrawer.tsx
src/layouts/                   AppShell.tsx
src/types/                     task.ts
src/utils/                     mediaCompression.ts
```
`Dashboard.tsx` stays at `src/components/Dashboard.tsx` (page composition root) — or move to `src/components/dashboard/Dashboard.tsx`; I'll do the latter for consistency. `PlaceholderPage.tsx` stays where it is (route utility). `src/components/ui/*` (shadcn) untouched.

Update imports in: `src/routes/add-task.tsx`, `src/routes/index.tsx`, `src/routes/dashboard.tsx`, `src/routes/status.tsx`, `src/routes/profile.tsx`, `src/routes/__root.tsx` if applicable, and each moved component's cross-references.

## Step 2 — Token integrity
- Audit each moved TSX for arbitrary values.
- Add `--color-slate-deep`, `--color-slate-abyss` to `@theme` in `styles.css`.
- Replace: `bg-[#1E293B]` → `bg-surface`; `bg-[#0F172A]` → `bg-slate-deep`; `rounded-[32px]` → `rounded-4xl`; inline `boxShadow` on drawer → `shadow-3d-base` (drop the duplicate inset style — already covered by the utility).
- Confirm global gradient background (already in `@layer base` in `styles.css`) — leave as-is (single source of truth). Remove any redundant gradient from `AppShell`.

## Step 3 — MediaCapture hardware cleanup
Extract `mediaCompression.ts`, then in `MediaCapture.tsx`:
- Add `streamRef` capturing the active `MediaStream` from `react-webcam`'s `onUserMedia`.
- `useEffect` cleanup: iterate `stream.getTracks()` → `.stop()` on unmount **and** when transitioning to preview state (`useEffect` deps on capture state).
- Also stop `MediaRecorder` if active, clear `recordTimerRef`/`recordIntervalRef`.
- Verify `aspect-[9/16]` viewport constraint and 10s recorder cap (already present — confirm and lock).

## Step 4 — `src/utils/mediaCompression.ts`
Move existing `compressToWebP` logic out of `MediaCapture.tsx` into a pure util:
```ts
export async function compressToWebP(source: Blob | File, opts?: { maxBytes?: number; maxDimension?: number }): Promise<Blob>
```
Uses HTML5 Canvas only, iterative quality/scale loop, guarantees <2MB, returns `image/webp` Blob. No new deps.

## Step 5 — Typed drawer
Create `src/types/task.ts`:
```ts
export type EffortSize = 'Quick' | 'Standard' | 'Deep Work';
export type Difficulty = 'Comfortable' | 'Challenging' | 'Very Hard';
export interface ParsedTaskPayload {
  title: string;
  effortSize: EffortSize;
  difficulty: Difficulty;
  rawText?: string;
  deadline?: string;
}
```
Refactor `OCRReviewDrawer` props to `initialData?: ParsedTaskPayload` (keep existing `open/onClose/onConfirm/onRetake`). `onConfirm(task: ParsedTaskPayload)`. Update `IngestionHub` call sites.

## Step 6 — Housekeeping
- **Dead deps scan**: `package.json` currently has no Redux/Axios (already clean). Radix + shadcn UI kit are used by `src/components/ui/*` (kept). I will NOT remove Radix packages — removing them breaks the shadcn `ui/` primitives even if not all are imported today. I'll flag this in the report rather than delete.
- **Safe-area**: `AppShell` bottom nav already uses `env(safe-area-inset-bottom)`; `OCRReviewDrawer` already uses `calc(env(safe-area-inset-bottom) + 1.5rem)`. Verified — no change needed. Audit `BimodalFallback` (currently centered modal, no bottom dock — n/a).
- **Z-index / backdrop**: `BimodalFallback` uses `z-50 backdrop-blur-md` — verify no parent creates a stacking context that clips it (renders at document root via `IngestionHub`, so fine). Confirm drawer is `z-50` above backdrop `z-40` (already correct).

## Step 7 — Gatekeeper Report
Deliver a Markdown table (Module / Checkpoint | Initial Status | Action Taken | Final Status) covering all 6 steps, plus a "Pending Blocker Notes" section (expected empty), and conclude with the READY line if all pass. `bunx tsgo --noEmit` will be run to verify.

## Files touched (summary)
- Move: 8 components → domain folders.
- New: `src/types/task.ts`, `src/utils/mediaCompression.ts`, `src/layouts/AppShell.tsx`, `src/components/atomic/PillGroup.tsx` (extracted).
- Edit: `src/styles.css` (2 new color tokens), all moved components (token refactor + import fixes), 5 route files (import path updates), `MediaCapture` (stream cleanup + util extraction), `OCRReviewDrawer` (typed props), `IngestionHub` (call site).
- No package.json changes.

Proceed?