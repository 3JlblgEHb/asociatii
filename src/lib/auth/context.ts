import { createClient } from "@/lib/supabase/server";
import type { Organization, OrganizationMember, UserProfile, UserRole } from "@/lib/types/database";
import { cookies } from "next/headers";

export interface AuthContext {
  user: { id: string; email?: string };
  profile: UserProfile;
  memberships: (OrganizationMember & { organizations: Organization })[];
  currentOrganization: Organization | null;
  currentMembership: OrganizationMember | null;
  currentRole: UserRole | null;
  isSuperAdmin: boolean;
  canManage: boolean;
}

const ORG_COOKIE = "current_organization_id";

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("*, organizations(*)")
    .eq("user_id", user.id)
    .eq("status", "active");

  const cookieStore = await cookies();
  const orgIdFromCookie = cookieStore.get(ORG_COOKIE)?.value;

  const typedMemberships = (memberships ?? []) as (OrganizationMember & {
    organizations: Organization;
  })[];

  let currentMembership =
    typedMemberships.find((m) => m.organization_id === orgIdFromCookie) ??
    typedMemberships[0] ??
    null;

  const currentOrganization = currentMembership?.organizations ?? null;
  const isSuperAdmin = profile.global_role === "super_admin";
  const currentRole = isSuperAdmin
    ? "super_admin"
    : (currentMembership?.role ?? null);

  return {
    user: { id: user.id, email: user.email },
    profile,
    memberships: typedMemberships,
    currentOrganization,
    currentMembership,
    currentRole,
    isSuperAdmin,
    canManage:
      isSuperAdmin ||
      currentRole === "association_admin" ||
      currentRole === "manager",
  };
}

export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) {
    throw new Error("Unauthorized");
  }
  return ctx;
}

export async function requireOrganization(): Promise<
  AuthContext & { currentOrganization: Organization }
> {
  const ctx = await requireAuth();
  if (!ctx.currentOrganization) {
    throw new Error("No organization selected");
  }
  return ctx as AuthContext & { currentOrganization: Organization };
}

export async function requireManagement(): Promise<
  AuthContext & { currentOrganization: Organization }
> {
  const ctx = await requireOrganization();
  if (!ctx.canManage) {
    throw new Error("Forbidden");
  }
  return ctx;
}

export { ORG_COOKIE };
