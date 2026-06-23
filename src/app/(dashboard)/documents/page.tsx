import { getAuthContext } from "@/lib/auth/context";
import { getDocuments } from "@/lib/actions/documents";
import { DocumentsClient } from "@/components/documents/documents-client";
import { redirect } from "next/navigation";

export default async function DocumentsPage() {
  const ctx = await getAuthContext();
  if (!ctx?.currentOrganization) redirect("/organizations");

  const documents = await getDocuments();

  return (
    <DocumentsClient documents={documents} canManage={ctx.canManage} />
  );
}
