"use server";

import { createClient } from "@/lib/supabase/server";
import { requireManagement } from "@/lib/auth/context";
import { revalidatePath } from "next/cache";
import type { PropertyUnitType } from "@/lib/types/database";

export async function createBuilding(formData: FormData) {
  const ctx = await requireManagement();
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const condominiumId = formData.get("condominium_id") as string;
  const address = formData.get("address") as string;
  const floors = formData.get("floors")
    ? Number(formData.get("floors"))
    : null;
  const entranceCount = formData.get("entrance_count")
    ? Number(formData.get("entrance_count"))
    : 1;

  const { data, error } = await supabase
    .from("buildings")
    .insert({
      organization_id: ctx.currentOrganization.id,
      condominium_id: condominiumId,
      name,
      address,
      floors,
      entrance_count: entranceCount,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/buildings");
  return { success: true, building: data };
}

export async function createCondominium(formData: FormData) {
  const ctx = await requireManagement();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const cadastralNumber = String(formData.get("cadastral_number") ?? "").trim() || null;

  const { data, error } = await supabase
    .from("condominiums")
    .insert({
      organization_id: ctx.currentOrganization.id,
      name,
      address,
      cadastral_number: cadastralNumber,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/buildings");
  return { success: true, condominium: data };
}

export async function deleteBuilding(id: string) {
  const ctx = await requireManagement();
  const supabase = await createClient();

  const { error } = await supabase
    .from("buildings")
    .delete()
    .eq("id", id)
    .eq("organization_id", ctx.currentOrganization.id);

  if (error) return { error: error.message };

  revalidatePath("/buildings");
  revalidatePath("/properties");
  return { success: true };
}

export async function createPropertyUnit(formData: FormData) {
  const ctx = await requireManagement();
  const supabase = await createClient();

  const buildingId = formData.get("building_id") as string;
  const condominiumId = formData.get("condominium_id") as string;
  const number = formData.get("number") as string;
  const unitType = formData.get("unit_type") as PropertyUnitType;
  const cadastralNumber = (formData.get("cadastral_number") as string) || null;
  const floor = formData.get("floor") ? Number(formData.get("floor")) : null;
  const areaSqm = formData.get("area_sqm")
    ? Number(formData.get("area_sqm"))
    : null;
  const hasVotingRights = formData.get("has_voting_rights") === "true";
  const ownerUserId = (formData.get("owner_user_id") as string) || null;

  const { data, error } = await supabase.rpc("create_property_unit", {
    p_organization_id: ctx.currentOrganization.id,
    p_condominium_id: condominiumId,
    p_building_id: buildingId,
    p_number: number,
    p_unit_type: unitType,
    p_cadastral_number: cadastralNumber,
    p_floor: floor,
    p_area_sqm: areaSqm,
    p_has_voting_rights: hasVotingRights,
    p_owner_user_id: ownerUserId,
  });

  if (error) return { error: error.message };

  revalidatePath("/properties");
  return { success: true, propertyUnit: data };
}

export async function deletePropertyUnit(id: string) {
  const ctx = await requireManagement();
  const supabase = await createClient();

  const { error } = await supabase
    .from("property_units")
    .delete()
    .eq("id", id)
    .eq("organization_id", ctx.currentOrganization.id);

  if (error) return { error: error.message };

  revalidatePath("/properties");
  return { success: true };
}
