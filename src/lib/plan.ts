import { supabase } from "@/lib/supabaseClient";

export async function getCurrentPlan(): Promise<"free" | "pro"> {
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id;
  if (!uid) return "free";

  const res = await supabase.from("users").select("plan").eq("id", uid).single();
  if (res.error) return "free";

  return res.data?.plan === "pro" ? "pro" : "free";
}
