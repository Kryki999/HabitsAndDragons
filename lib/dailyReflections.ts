import { supabase } from "@/lib/supabase";

export type DailyReflectionRow = {
  id: string;
  user_id: string;
  reflection_date: string;
  content: string;
  updated_at: string;
};

function isMissingDailyReflectionsTable(error: { code?: string | null; message?: string | null }): boolean {
  const code = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();
  if (code === "PGRST204" || code === "PGRST205" || code === "42P01") return true;
  if (msg.includes("relation") && msg.includes("daily_reflections") && msg.includes("does not exist")) return true;
  if (msg.includes("could not find") && msg.includes("daily_reflections") && msg.includes("schema cache")) return true;
  return false;
}

export async function fetchDailyReflection(
  userId: string,
  dateKey: string,
): Promise<{ row: DailyReflectionRow | null; error?: string; tableMissing?: boolean }> {
  const { data, error } = await supabase
    .from("daily_reflections")
    .select("id, user_id, reflection_date, content, updated_at")
    .eq("user_id", userId)
    .eq("reflection_date", dateKey)
    .maybeSingle();

  if (error) {
    const msg = error.message ?? "";
    const missing = isMissingDailyReflectionsTable(error);
    return { row: null, error: msg, tableMissing: missing };
  }
  return { row: data as DailyReflectionRow | null };
}

export async function upsertDailyReflection(
  userId: string,
  dateKey: string,
  content: string,
): Promise<{ row: DailyReflectionRow | null; error?: string; tableMissing?: boolean }> {
  const { data, error } = await supabase
    .from("daily_reflections")
    .upsert(
      {
        user_id: userId,
        reflection_date: dateKey,
        content: content.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,reflection_date" },
    )
    .select("id, user_id, reflection_date, content, updated_at")
    .maybeSingle();

  if (error) {
    const msg = error.message ?? "";
    const missing = isMissingDailyReflectionsTable(error);
    return { row: null, error: msg, tableMissing: missing };
  }
  return { row: data as DailyReflectionRow | null };
}
