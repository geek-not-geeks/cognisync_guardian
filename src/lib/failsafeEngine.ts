import { supabase } from "@/lib/supabase";
import type { TasksRow } from "@/types/database.types";

/**
 * Pessimistic Failsafe: any pending task whose deadline has already lapsed is
 * assumed incomplete. It is rolled forward to later today and escalated to the
 * highest cognitive-load tier so the Governor prioritises it.
 */
export async function executePessimisticRollover(
  userId: string,
): Promise<{ rolledOverCount: number }> {
  const yesterdayISO = new Date(Date.now() - 86400000).toISOString();

  const { data: staleTasks, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .lt("deadline", yesterdayISO);

  const rows = (staleTasks as TasksRow[] | null) ?? [];
  if (error || rows.length === 0) return { rolledOverCount: 0 };

  const deadline = new Date(Date.now() + 3600000 * 8).toISOString();

  for (const task of rows) {
    const { error: updateError } = await supabase
      .from("tasks")
      .update({ deadline, difficulty: "Very Hard" } as never)
      .eq("id", task.id)
      .eq("user_id", userId);
    if (updateError) {
      // eslint-disable-next-line no-console
      console.error("Failsafe rollover error:", updateError);
    }
  }

  return { rolledOverCount: rows.length };
}
