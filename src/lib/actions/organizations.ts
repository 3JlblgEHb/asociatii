"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireManagement } from "@/lib/auth/context";
import { sendInvitationEmail } from "@/lib/email/resend";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { slugify } from "@/lib/slugify";
import { writeAuditLog } from "@/lib/actions/utils";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/lib/types/database";

export async function createOrganization(formData: FormData) {
  await requireAuth();
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  const phone = (formData.get("phone") as string) || null;
  const email = (formData.get("email") as string) || null;
  const description = (formData.get("description") as string) || null;

  const slug = slugify(name) + "-" + Date.now().toString(36);

  const { data: org, error } = await supabase.rpc("create_organization", {
    p_name: name,
    p_slug: slug,
    p_address: address,
    p_phone: phone,
    p_email: email,
    p_description: description,
  });

  if (error) return { error: error.message };

  revalidatePath("/organizations");
  revalidatePath("/dashboard");
  return { success: true, organization: org };
}

export async function updateOrganization(formData: FormData) {
  const ctx = await requireManagement();
  const supabase = await createClient();

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  const phone = (formData.get("phone") as string) || null;
  const email = (formData.get("email") as string) || null;
  const description = (formData.get("description") as string) || null;

  const { error } = await supabase
    .from("organizations")
    .update({ name, address, phone, email, description })
    .eq("id", id);

  if (error) return { error: error.message };

  await writeAuditLog({
    organizationId: ctx.currentOrganization.id,
    action: "organization_updated",
    entityType: "organization",
    entityId: id,
  });

  revalidatePath("/organizations");
  revalidatePath("/settings");
  return { success: true };
}

export async function inviteMember(formData: FormData) {
  const ctx = await requireManagement();
  const supabase = await createClient();

  const email = (formData.get("email") as string).toLowerCase().trim();
  const role = formData.get("role") as UserRole;

  const { data: invitation, error } = await supabase
    .from("organization_invitations")
    .insert({
      organization_id: ctx.currentOrganization.id,
      email,
      role,
      invited_by: ctx.user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await sendInvitationEmail({
    to: email,
    organizationName: ctx.currentOrganization.name,
    inviterName: ctx.profile.full_name ?? ctx.profile.email,
    token: invitation.token,
    role: ROLE_LABELS[role],
  });

  await writeAuditLog({
    organizationId: ctx.currentOrganization.id,
    action: "user_invited",
    entityType: "organization_invitation",
    entityId: invitation.id,
    metadata: { email, role },
  });

  revalidatePath("/organizations");
  return { success: true };
}

export async function acceptInvitation(token: string) {
  await requireAuth();
  const supabase = await createClient();

  const { data: organizationId, error } = await supabase.rpc(
    "accept_organization_invitation",
    { p_token: token }
  );

  if (error || !organizationId) {
    return { error: "Invitație invalidă sau expirată" };
  }

  revalidatePath("/dashboard");
  return { success: true, organizationId };
}

export async function updateMemberRole(formData: FormData) {
  const ctx = await requireManagement();
  const supabase = await createClient();

  const memberId = formData.get("memberId") as string;
  const role = formData.get("role") as UserRole;

  const { error } = await supabase
    .from("organization_members")
    .update({ role })
    .eq("id", memberId)
    .eq("organization_id", ctx.currentOrganization.id);

  if (error) return { error: error.message };

  revalidatePath("/organizations");
  return { success: true };
}

export async function removeMember(memberId: string) {
  const ctx = await requireManagement();
  const supabase = await createClient();

  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", memberId)
    .eq("organization_id", ctx.currentOrganization.id);

  if (error) return { error: error.message };

  revalidatePath("/organizations");
  return { success: true };
}
