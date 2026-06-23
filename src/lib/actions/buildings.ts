"use server";

import { createClient } from "@/lib/supabase/server";
import { requireManagement, requireOrganization } from "@/lib/auth/context";
import { writeAuditLog } from "@/lib/actions/utils";
import { revalidatePath } from "next/cache";

export async function createBuilding(formData: FormData) {
  const ctx = await requireManagement();
  const supabase = await createClient();

  const name = formData.get("name") as string;
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

export async function updateBuilding(formData: FormData) {
  const ctx = await requireManagement();
  const supabase = await createClient();

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  const floors = formData.get("floors")
    ? Number(formData.get("floors"))
    : null;
  const entranceCount = formData.get("entrance_count")
    ? Number(formData.get("entrance_count"))
    : 1;

  const { error } = await supabase
    .from("buildings")
    .update({
      name,
      address,
      floors,
      entrance_count: entranceCount,
    })
    .eq("id", id)
    .eq("organization_id", ctx.currentOrganization.id);

  if (error) return { error: error.message };

  revalidatePath("/buildings");
  return { success: true };
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
  revalidatePath("/apartments");
  return { success: true };
}

export async function createApartment(formData: FormData) {
  const ctx = await requireManagement();
  const supabase = await createClient();

  const buildingId = formData.get("building_id") as string;
  const number = formData.get("number") as string;
  const floor = formData.get("floor") ? Number(formData.get("floor")) : null;
  const areaSqm = formData.get("area_sqm")
    ? Number(formData.get("area_sqm"))
    : null;
  const hasVotingRights = formData.get("has_voting_rights") === "true";
  const ownerId = (formData.get("owner_id") as string) || null;

  const { data, error } = await supabase
    .from("apartments")
    .insert({
      organization_id: ctx.currentOrganization.id,
      building_id: buildingId,
      number,
      floor,
      area_sqm: areaSqm,
      has_voting_rights: hasVotingRights,
      owner_id: ownerId || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  if (ownerId) {
    await supabase.from("organization_members").upsert(
      {
        organization_id: ctx.currentOrganization.id,
        user_id: ownerId,
        role: "owner",
        status: "active",
        apartment_id: data.id,
      },
      { onConflict: "organization_id,user_id" }
    );
  }

  revalidatePath("/apartments");
  return { success: true, apartment: data };
}

export async function updateApartment(formData: FormData) {
  const ctx = await requireManagement();
  const supabase = await createClient();

  const id = formData.get("id") as string;
  const number = formData.get("number") as string;
  const floor = formData.get("floor") ? Number(formData.get("floor")) : null;
  const areaSqm = formData.get("area_sqm")
    ? Number(formData.get("area_sqm"))
    : null;
  const hasVotingRights = formData.get("has_voting_rights") === "true";
  const ownerId = (formData.get("owner_id") as string) || null;

  const { error } = await supabase
    .from("apartments")
    .update({
      number,
      floor,
      area_sqm: areaSqm,
      has_voting_rights: hasVotingRights,
      owner_id: ownerId || null,
    })
    .eq("id", id)
    .eq("organization_id", ctx.currentOrganization.id);

  if (error) return { error: error.message };

  if (ownerId) {
    await supabase.from("organization_members").upsert(
      {
        organization_id: ctx.currentOrganization.id,
        user_id: ownerId,
        role: "owner",
        status: "active",
        apartment_id: id,
      },
      { onConflict: "organization_id,user_id" }
    );
  }

  revalidatePath("/apartments");
  return { success: true };
}

export async function deleteApartment(id: string) {
  const ctx = await requireManagement();
  const supabase = await createClient();

  const { error } = await supabase
    .from("apartments")
    .delete()
    .eq("id", id)
    .eq("organization_id", ctx.currentOrganization.id);

  if (error) return { error: error.message };

  revalidatePath("/apartments");
  return { success: true };
}

export async function getBuildingsWithApartments() {
  const ctx = await requireOrganization();
  const supabase = await createClient();

  const { data: buildings } = await supabase
    .from("buildings")
    .select("*")
    .eq("organization_id", ctx.currentOrganization.id)
    .order("name");

  const { data: apartments } = await supabase
    .from("apartments")
    .select("*, users_profiles(id, full_name, email)")
    .eq("organization_id", ctx.currentOrganization.id)
    .order("number");

  return { buildings: buildings ?? [], apartments: apartments ?? [] };
}
