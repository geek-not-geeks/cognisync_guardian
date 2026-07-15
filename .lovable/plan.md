# Sprint 4: Enterprise Auth, Onboarding & Batch Ingestion

## Task 1 — Auth Normalization (`src/lib/auth.ts`, `src/routes/auth.tsx`)
- Create `src/lib/auth.ts` exporting:
  - `authSchema` (Zod): `email` (email format) + `password` (min 8, ≥1 digit via `/\d/`, ≥1 special via `/[^A-Za-z0-9]/`).
  - `formatAuthError(err: unknown): string` — safely reads `.message`/`.code`, maps Supabase codes (`user_already_exists`, `over_email_send_rate_limit`, `invalid_credentials`, `email_not_confirmed`, `weak_password`) to human copy, never returns `"{}"` or empty.
- Update `src/routes/auth.tsx`: run `authSchema.safeParse({email,password})` before hitting Supabase; on failure, `toast.error(issue.message)`. On Supabase error use `formatAuthError`.

## Task 2 — Progressive Onboarding (`src/routes/onboarding.tsx`)
- New route with dark claymorphic UI, two-step wizard state (`step: 1 | 2`).
  - Step 1: Display Name input + role radio pills (`student` | `parent`).
  - Step 2: Study hours slider (0–12, step 0.5, default 6.0) with live readout.
- Finish: single `supabase.from("users").update({ display_name, role, target_study_hours }).eq("id", user.id)`; on success `navigate({ to: "/" })` (or `/parent-view` for parent).
- Update `src/layouts/AppShell.tsx`: after session + role load, query `display_name`; if authenticated and `display_name` is null and pathname isn't `/onboarding` or `/auth`, redirect to `/onboarding`. Skip nav gating while on `/onboarding`.

## Task 3 — Multi-Task OCR & PDPL Gate (`src/lib/ocrParse.ts`, `MediaCapture.tsx`, `IngestionHub.tsx`)
- `ocrParse.ts`: change signature to `Promise<{ ok: true; payload: ParsedTaskPayload[] } | { ok: false; reason: string }>`. Stub returns a single-item array (`[{ title: "New Scanned Task", ... }]`) so downstream code stays wired until the live endpoint lands. Keep Zod schema updated to `z.array(...)` for future real responses; export `validateOcrPayload` accordingly.
- `MediaCapture.tsx`: add `ALLOWED_MIME = ["image/jpeg","image/png","image/webp","application/pdf"]` and `MAX_BYTES = 10 * 1024 * 1024`. Reject other types/sizes with inline error in `handleFile`. Confirm handler already routes images through `sanitizeImageMetadata` — keep intact.
- `IngestionHub.tsx`: switch `handleMediaConfirm` to expect array payload, pass to new `BatchOCRReviewDrawer`. `QuickTextInput` path wraps its single task into an array.

## Task 4 — Batch Review Drawer (`src/components/modals/BatchOCRReviewDrawer.tsx`)
- New component; props `{ open, onClose, initialTasks: ParsedTaskPayload[], onConfirmed?: () => void }`.
- Local state `tasks: ParsedTaskPayload[]` seeded from `initialTasks` on open.
- Scrollable list of surface cards; each card has Title input, Deadline input, `PillGroup` for Effort & Difficulty, and a Remove (trash) button.
- Primary CTA `Confirm & Sync All (${tasks.length} Tasks)`; disabled if empty or saving. On click: map to Supabase rows with `user_id`, single `supabase.from("tasks").insert(prepared)`. Loading spinner in CTA, success toast, `queryClient.invalidateQueries({ queryKey: ["tasks_count"] })` + `["tasks"]`, then `onConfirmed?.()` and `onClose()`.
- Replace old `OCRReviewDrawer` usage in `IngestionHub.tsx`. Keep old file untouched (still referenced elsewhere? — verify none; if unused, leave file for now to avoid unrelated churn).

## Verification
- `bunx tsgo --noEmit` must be clean (no `any` casts in new modules; use `as never` only where existing pattern requires it for Supabase insert typing).
- Final line: **ENTERPRISE AUTH, ONBOARDING, AND BATCH INGESTION PIPELINE FULLY OPERATIONAL**

## Files
- **Create**: `src/lib/auth.ts`, `src/routes/onboarding.tsx`, `src/components/modals/BatchOCRReviewDrawer.tsx`
- **Edit**: `src/routes/auth.tsx`, `src/layouts/AppShell.tsx`, `src/lib/ocrParse.ts`, `src/components/media/MediaCapture.tsx`, `src/components/ingestion/IngestionHub.tsx`
