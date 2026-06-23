import { getAuthContext } from "@/lib/auth/context";
import { SettingsClient } from "@/components/settings/settings-client";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  return <SettingsClient profile={ctx.profile} />;
}
