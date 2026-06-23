import { getAuthContext } from "@/lib/auth/context";
import { getServiceRequests } from "@/lib/actions/requests";
import { RequestsClient } from "@/components/requests/requests-client";
import { redirect } from "next/navigation";

export default async function RequestsPage() {
  const ctx = await getAuthContext();
  if (!ctx?.currentOrganization) redirect("/organizations");

  const requests = await getServiceRequests();

  return (
    <RequestsClient
      requests={requests ?? []}
      canManage={ctx.canManage}
    />
  );
}
