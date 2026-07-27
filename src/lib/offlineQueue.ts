import { supabase } from "@/lib/supabase";
import type { Database, TaskStatus } from "@/types/database.types";

type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
type CalibrationInsert = Database["public"]["Tables"]["daily_calibrations"]["Insert"];

export type QueueEntry =
  | { id: string; kind: "task_insert"; payload: TaskInsert; createdAt: number }
  | {
      id: string;
      kind: "task_toggle";
      payload: { id: string; status: TaskStatus };
      createdAt: number;
    }
  | {
      id: string;
      kind: "calibration_upsert";
      payload: CalibrationInsert;
      createdAt: number;
    };

export type QueueStatus = "idle" | "syncing" | "offline" | "error";

const KEY = "cognisync.pending_mutations";
const queueListeners = new Set<(entries: QueueEntry[]) => void>();
const statusListeners = new Set<(status: QueueStatus) => void>();

let currentStatus: QueueStatus = "idle";
let backoffAttempt = 0;
const BACKOFF_BASE_MS = 2_000;
const BACKOFF_CAP_MS = 30_000;
const MAX_ATTEMPTS = 5;
let backoffTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * In-memory mirror of the durable queue. Hydrated from NativeStorage
 * (OS SharedPreferences on device, localStorage on web) at boot so reads stay
 * synchronous while persistence survives device reboots.
 */
let cache: QueueEntry[] | null = null;

function read(): QueueEntry[] {
  if (cache) return cache;
  if (typeof window === "undefined") return [];
  try {
    cache = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as QueueEntry[];
  } catch {
    cache = [];
  }
  return cache;
}

function write(entries: QueueEntry[]) {
  cache = entries;
  void NativeStorage.setItem(KEY, JSON.stringify(entries));
  queueListeners.forEach((l) => l(entries));
}

async function hydrate(): Promise<void> {
  try {
    const raw = await NativeStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as QueueEntry[]) : [];
  } catch {
    cache = [];
  }
  queueListeners.forEach((l) => l(cache!));
}

function setStatus(next: QueueStatus) {
  if (currentStatus === next) return;
  currentStatus = next;
  statusListeners.forEach((l) => l(next));
}

export function subscribeQueue(fn: (entries: QueueEntry[]) => void) {
  queueListeners.add(fn);
  fn(read());
  return () => queueListeners.delete(fn);
}

export function subscribeStatus(fn: (status: QueueStatus) => void) {
  statusListeners.add(fn);
  fn(currentStatus);
  return () => statusListeners.delete(fn);
}

export function pendingCount(): number {
  return read().length;
}

export function pendingBreakdown(): { tasks: number; calibrations: number } {
  const entries = read();
  return {
    tasks: entries.filter((e) => e.kind === "task_insert" || e.kind === "task_toggle").length,
    calibrations: entries.filter((e) => e.kind === "calibration_upsert").length,
  };
}

export async function enqueue(entry: Omit<QueueEntry, "id" | "createdAt">) {
  const full = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  } as QueueEntry;
  write([...read(), full]);
  await drain();
}

async function executeEntry(entry: QueueEntry): Promise<boolean> {
  switch (entry.kind) {
    case "task_insert": {
      const { error } = await supabase.from("tasks").insert(entry.payload as never);
      return !error;
    }
    case "task_toggle": {
      const { error } = await supabase
        .from("tasks")
        .update({ status: entry.payload.status } as never)
        .eq("id", entry.payload.id);
      return !error;
    }
    case "calibration_upsert": {
      const { error } = await supabase
        .from("daily_calibrations")
        .upsert(entry.payload as never, { onConflict: "user_id,date" });
      return !error;
    }
  }
}

let draining = false;

export async function drain(): Promise<void> {
  if (draining) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    setStatus("offline");
    return;
  }
  const queue = read();
  if (queue.length === 0) {
    setStatus("idle");
    return;
  }

  draining = true;
  setStatus("syncing");
  try {
    let current = queue;
    while (current.length > 0) {
      const [head, ...rest] = current;
      const ok = await executeEntry(head);
      if (!ok) {
        scheduleBackoff();
        setStatus("error");
        return;
      }
      write(rest);
      current = rest;
    }
    backoffAttempt = 0;
    setStatus("idle");
  } finally {
    draining = false;
  }
}

function scheduleBackoff() {
  if (backoffAttempt >= MAX_ATTEMPTS) return;
  const delay = Math.min(
    BACKOFF_CAP_MS,
    BACKOFF_BASE_MS * 2 ** backoffAttempt,
  );
  backoffAttempt += 1;
  if (backoffTimer) clearTimeout(backoffTimer);
  backoffTimer = setTimeout(() => {
    void drain();
  }, delay);
}

export function initOfflineQueue() {
  if (typeof window === "undefined") return;
  window.addEventListener("online", () => {
    backoffAttempt = 0;
    void drain();
  });
  window.addEventListener("offline", () => setStatus("offline"));
  if (!navigator.onLine) setStatus("offline");
  void drain();
}
