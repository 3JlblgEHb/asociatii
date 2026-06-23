import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { OrganizationsClient } from "@/components/organizations/organizations-client";

export default async function OrganizationsPage() {
  const ctx = await getAuthContext();
  if (!ctx) return null;

  let members: Parameters<typeof OrganizationsClient>[0]["members"] = [];

  if (ctx.currentOrganization) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("organization_members")
      .select("*, users_profiles(full_name, email)")
      .eq("organization_id", ctx.currentOrganization.id)
      .order("created_at");

    members = (data ?? []) as typeof members;
  }

  return (
    <OrganizationsClient
      organization={ctx.currentOrganization}
      members={members}
      canManage={ctx.canManage}
    />
  );
}
