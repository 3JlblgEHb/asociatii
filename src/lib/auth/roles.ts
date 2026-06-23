import type { UserRole } from "@/lib/types/database";

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  association_admin: "Admin Asociație",
  manager: "Manager",
  owner: "Proprietar",
  resident: "Locatar",
};

export const MANAGEMENT_ROLES: UserRole[] = [
  "super_admin",
  "association_admin",
  "manager",
];

export function canManageOrganization(role: UserRole | null | undefined): boolean {
  if (!role) return false;
  return MANAGEMENT_ROLES.includes(role);
}

export function canVote(role: UserRole | null | undefined): boolean {
  return role === "owner";
}
