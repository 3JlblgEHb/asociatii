import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { BuildingsClient } from "@/components/buildings/buildings-client";
import { redirect } from "next/navigation";

export default async function BuildingsPage() {
  const ctx = await getAuthContext();
  if (!ctx?.currentOrganization) redirect("/organizations");

  const supabase = await createClient();
  const { data: buildings } = await supabase
    .from("buildings")
    .select("*")
    .eq("organization_id", ctx.currentOrganization.id)
    .order("name");

  return (
    <BuildingsClient
      buildings={buildings ?? []}
      canManage={ctx.canManage}
    />
  );
}
