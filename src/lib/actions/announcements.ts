"use server";

import { createClient } from "@/lib/supabase/server";
import { requireManagement, requireOrganization } from "@/lib/auth/context";
import { sendAnnouncementEmail } from "@/lib/email/resend";
import { extractEmails } from "@/lib/supabase/relations";
import { revalidatePath } from "next/cache";

export async function createAnnouncement(formData: FormData) {
  const ctx = await requireManagement();
  const supabase = await createClient();

  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const publish = formData.get("publish") === "true";
  const sendEmail = formData.get("send_email") === "true";

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      organization_id: ctx.currentOrganization.id,
      created_by: ctx.user.id,
      title,
      content,
      is_published: publish,
      published_at: publish ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  if (publish && sendEmail) {
    const { data: members } = await supabase
      .from("organization_members")
      .select("users_profiles(email)")
      .eq("organization_id", ctx.currentOrganization.id)
      .eq("status", "active");

    const emails = extractEmails(members ?? []);

    if (emails.length > 0) {
      await sendAnnouncementEmail({
        to: emails,
        organizationName: ctx.currentOrganization.name,
        title,
        content,
      });

      await supabase
        .from("announcements")
        .update({ email_sent: true })
        .eq("id", data.id);
    }
  }

  revalidatePath("/announcements");
  return { success: true, announcement: data };
}

export async function publishAnnouncement(id: string, sendEmail = false) {
  const ctx = await requireManagement();
  const supabase = await createClient();

  const { data: announcement } = await supabase
    .from("announcements")
    .select("*")
    .eq("id", id)
    .eq("organization_id", ctx.currentOrganization.id)
    .single();

  if (!announcement) return { error: "Anunț negăsit" };

  await supabase
    .from("announcements")
    .update({
      is_published: true,
      published_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (sendEmail) {
    const { data: members } = await supabase
      .from("organization_members")
      .select("users_profiles(email)")
      .eq("organization_id", ctx.currentOrganization.id)
      .eq("status", "active");

    const emails = extractEmails(members ?? []);

    if (emails.length > 0) {
      await sendAnnouncementEmail({
        to: emails,
        organizationName: ctx.currentOrganization.name,
        title: announcement.title,
        content: announcement.content,
      });

      await supabase
        .from("announcements")
        .update({ email_sent: true })
        .eq("id", id);
    }
  }

  revalidatePath("/announcements");
  return { success: true };
}

export async function getAnnouncements() {
  const ctx = await requireOrganization();
  const supabase = await createClient();

  let query = supabase
    .from("announcements")
    .select("*")
    .eq("organization_id", ctx.currentOrganization.id)
    .order("created_at", { ascending: false });

  if (!ctx.canManage) {
    query = query.eq("is_published", true);
  }

  const { data } = await query;
  return data ?? [];
}
