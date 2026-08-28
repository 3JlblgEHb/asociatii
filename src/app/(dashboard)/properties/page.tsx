import { redirect } from "next/navigation";
import { PropertyUnitsClient } from "@/components/properties/property-units-client";
import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export default async function PropertiesPage() {
  const ctx = await getAuthContext();
  if (!ctx?.currentOrganization) redirect("/organizations");

  const supabase = await createClient();
  const organizationId = ctx.currentOrganization.id;
  const [propertyUnits, buildings, condominiums, members] = await Promise.all([
    supabase
      .from("property_units")
      .select("*, buildings(name), condominiums(name), property_ownerships(*, persons(full_name, email))")
      .eq("organization_id", organizationId)
      .order("number"),
    supabase.from("buildings").select("*").eq("organization_id", organizationId).order("name"),
    supabase.from("condominiums").select("*").eq("organization_id", organizationId).order("name"),
    supabase
      .from("organization_members")
      .select("user_id, users_profiles(full_name, email)")
      .eq("organization_id", organizationId)
      .eq("status", "active"),
  ]);

  return (
    <PropertyUnitsClient
      propertyUnits={propertyUnits.data ?? []}
      buildings={buildings.data ?? []}
      condominiums={condominiums.data ?? []}
      members={members.data ?? []}
      canManage={ctx.canManage}
    />
  );
}
