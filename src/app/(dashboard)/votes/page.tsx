import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { VotesClient } from "@/components/votes/votes-client";
import { redirect } from "next/navigation";

export default async function VotesPage() {
  const ctx = await getAuthContext();
  if (!ctx?.currentOrganization) redirect("/organizations");

  const supabase = await createClient();
  const { data: votes } = await supabase
    .from("votes")
    .select("*")
    .eq("organization_id", ctx.currentOrganization.id)
    .order("created_at", { ascending: false });

  return <VotesClient votes={votes ?? []} canManage={ctx.canManage} />;
}
