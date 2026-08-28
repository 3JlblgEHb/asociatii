"use server";

import { createClient } from "@/lib/supabase/server";

export async function writeAuditLog({
  organizationId,
  action,
  entityType,
  entityId,
  metadata = {},
}: {
  organizationId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  await supabase.rpc("write_management_audit_log", {
    p_organization_id: organizationId,
    p_action: action,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_metadata: metadata,
  });
}
