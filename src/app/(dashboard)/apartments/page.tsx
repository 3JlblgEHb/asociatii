import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { ApartmentsClient } from "@/components/apartments/apartments-client";
import { redirect } from "next/navigation";

export default async function ApartmentsPage() {
  const ctx = await getAuthContext();
  if (!ctx?.currentOrganization) redirect("/organizations");

  const supabase = await createClient();
  const orgId = ctx.currentOrganization.id;

  const [{ data: apartments }, { data: buildings }, { data: members }] =
    await Promise.all([
      supabase
        .from("apartments")
        .select("*, buildings(name), users_profiles(full_name, email)")
        .eq("organization_id", orgId)
        .order("number"),
      supabase.from("buildings").select("*").eq("organization_id", orgId).order("name"),
      supabase
        .from("organization_members")
        .select("user_id, users_profiles(full_name, email)")
        .eq("organization_id", orgId)
        .eq("status", "active"),
    ]);

  return (
    <ApartmentsClient
      apartments={apartments ?? []}
      buildings={buildings ?? []}
      members={members ?? []}
      canManage={ctx.canManage}
    />
  );
}
