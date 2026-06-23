import { getAuthContext } from "@/lib/auth/context";
import { getAnnouncements } from "@/lib/actions/announcements";
import { AnnouncementsClient } from "@/components/announcements/announcements-client";
import { redirect } from "next/navigation";

export default async function AnnouncementsPage() {
  const ctx = await getAuthContext();
  if (!ctx?.currentOrganization) redirect("/organizations");

  const announcements = await getAnnouncements();

  return (
    <AnnouncementsClient
      announcements={announcements}
      canManage={ctx.canManage}
    />
  );
}
