"use server";

import { createClient } from "@/lib/supabase/server";
import { requireManagement, requireOrganization } from "@/lib/auth/context";
import { writeAuditLog } from "@/lib/actions/utils";
import { revalidatePath } from "next/cache";
import type { DocumentCategory } from "@/lib/types/database";

export async function uploadDocument(formData: FormData) {
  const ctx = await requireManagement();
  const supabase = await createClient();

  const file = formData.get("file") as File;
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const category = formData.get("category") as DocumentCategory;

  if (!file || file.size === 0) {
    return { error: "Selectează un fișier" };
  }

  const orgId = ctx.currentOrganization.id;
  const filePath = `${orgId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) return { error: uploadError.message };

  const { data, error } = await supabase
    .from("documents")
    .insert({
      organization_id: orgId,
      uploaded_by: ctx.user.id,
      title,
      description,
      category,
      file_path: filePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await writeAuditLog({
    organizationId: orgId,
    action: "document_uploaded",
    entityType: "document",
    entityId: data.id,
    metadata: { title, category, file_name: file.name },
  });

  revalidatePath("/documents");
  return { success: true, document: data };
}

export async function deleteDocument(id: string) {
  const ctx = await requireManagement();
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("documents")
    .select("file_path")
    .eq("id", id)
    .eq("organization_id", ctx.currentOrganization.id)
    .single();

  if (!doc) return { error: "Document negăsit" };

  await supabase.storage.from("documents").remove([doc.file_path]);

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("organization_id", ctx.currentOrganization.id);

  if (error) return { error: error.message };

  revalidatePath("/documents");
  return { success: true };
}

export async function getDocumentUrl(filePath: string) {
  const ctx = await requireOrganization();
  const supabase = await createClient();

  if (!filePath.startsWith(ctx.currentOrganization.id)) {
    return { error: "Access denied" };
  }

  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(filePath, 3600);

  if (error) return { error: error.message };
  return { url: data.signedUrl };
}

export async function getDocuments() {
  const ctx = await requireOrganization();
  const supabase = await createClient();

  const { data } = await supabase
    .from("documents")
    .select("*")
    .eq("organization_id", ctx.currentOrganization.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}
