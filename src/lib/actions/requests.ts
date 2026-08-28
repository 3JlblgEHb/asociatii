"use server";

import { createClient } from "@/lib/supabase/server";
import { requireManagement, requireOrganization } from "@/lib/auth/context";
import { writeAuditLog } from "@/lib/actions/utils";
import { revalidatePath } from "next/cache";
import type { RequestCategory, RequestStatus } from "@/lib/types/database";

export async function createServiceRequest(formData: FormData) {
  const ctx = await requireOrganization();
  const supabase = await createClient();

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const category = formData.get("category") as RequestCategory;
  const propertyUnitId = (formData.get("property_unit_id") as string) || null;

  const attachments: string[] = [];
  const files = formData.getAll("attachments") as File[];

  for (const file of files) {
    if (file && file.size > 0) {
      const filePath = `${ctx.currentOrganization.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("request-attachments")
        .upload(filePath, file, { contentType: file.type });

      if (!error) attachments.push(filePath);
    }
  }

  const { data, error } = await supabase
    .from("service_requests")
    .insert({
      organization_id: ctx.currentOrganization.id,
      created_by: ctx.user.id,
      property_unit_id: propertyUnitId,
      title,
      description,
      category,
      status: "new",
      attachments,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/requests");
  return { success: true, request: data };
}

export async function updateRequestStatus(requestId: string, status: RequestStatus) {
  const ctx = await requireManagement();
  const supabase = await createClient();

  const { error } = await supabase
    .from("service_requests")
    .update({ status })
    .eq("id", requestId)
    .eq("organization_id", ctx.currentOrganization.id);

  if (error) return { error: error.message };

  await writeAuditLog({
    organizationId: ctx.currentOrganization.id,
    action: "request_status_changed",
    entityType: "service_request",
    entityId: requestId,
    metadata: { status },
  });

  revalidatePath("/requests");
  return { success: true };
}

export async function addRequestComment(requestId: string, content: string) {
  const ctx = await requireOrganization();
  const supabase = await createClient();

  const { error } = await supabase.from("service_request_comments").insert({
    request_id: requestId,
    organization_id: ctx.currentOrganization.id,
    user_id: ctx.user.id,
    content,
  });

  if (error) return { error: error.message };

  revalidatePath("/requests");
  return { success: true };
}

export async function getServiceRequests() {
  const ctx = await requireOrganization();
  const supabase = await createClient();

  const { data } = await supabase
    .from("service_requests")
    .select("*, users_profiles(full_name, email), property_units(number)")
    .eq("organization_id", ctx.currentOrganization.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getRequestComments(requestId: string) {
  const ctx = await requireOrganization();
  const supabase = await createClient();

  const { data } = await supabase
    .from("service_request_comments")
    .select("*, users_profiles(full_name, email)")
    .eq("request_id", requestId)
    .eq("organization_id", ctx.currentOrganization.id)
    .order("created_at");

  return data ?? [];
}

export async function getAttachmentUrl(filePath: string) {
  const ctx = await requireOrganization();
  const supabase = await createClient();

  if (!filePath.startsWith(ctx.currentOrganization.id)) {
    return { error: "Access denied" };
  }

  const { data, error } = await supabase.storage
    .from("request-attachments")
    .createSignedUrl(filePath, 3600);

  if (error) return { error: error.message };
  return { url: data.signedUrl };
}
