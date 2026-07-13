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

const KEY = "cognisync.pending_mutations";
const listeners = new Set<(entries: QueueEntry[]) => void>();

function read(): QueueEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as QueueEntry[];
  } catch {
    return [];
  }
}

function write(entries: QueueEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(entries));
  listeners.forEach((l) => l(entries));
}

export function subscribeQueue(fn: (entries: QueueEntry[]) => void) {
  listeners.add(fn);
  fn(read());
  return () => listeners.delete(fn);
}

export function pendingCount(): number {
  return read().length;
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
      const { error } = await supabase.from("tasks").insert(entry.payload);
      return !error;
    }
    case "task_toggle": {
      const { error } = await supabase
        .from("tasks")
        .update({ status: entry.payload.status })
        .eq("id", entry.payload.id);
      return !error;
    }
    case "calibration_upsert": {
      const { error } = await supabase
        .from("daily_calibrations")
        .upsert(entry.payload, { onConflict: "user_id,date" });
      return !error;
    }
  }
}

let draining = false;

export async function drain(): Promise<void> {
  if (draining) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  draining = true;
  try {
    let queue = read();
    while (queue.length > 0) {
      const [head, ...rest] = queue;
      const ok = await executeEntry(head);
      if (!ok) break;
      write(rest);
      queue = rest;
    }
  } finally {
    draining = false;
  }
}

export function initOfflineQueue() {
  if (typeof window === "undefined") return;
  window.addEventListener("online", () => {
    void drain();
  });
  void drain();
}
