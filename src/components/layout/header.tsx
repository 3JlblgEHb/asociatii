"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { Organization, UserProfile, UserRole } from "@/lib/types/database";
import { setCurrentOrganization } from "@/lib/actions/organization-context";
import { signOut } from "@/lib/actions/auth";
import { LogOut, ChevronDown } from "lucide-react";

interface HeaderProps {
  profile: UserProfile;
  currentRole: UserRole | null;
  memberships: { organization_id: string; organizations: Organization }[];
  currentOrganization: Organization | null;
}

export function Header({
  profile,
  currentRole,
  memberships,
  currentOrganization,
}: HeaderProps) {
  const initials = (profile.full_name ?? profile.email)
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleOrgSwitch(orgId: string) {
    await setCurrentOrganization(orgId);
    window.location.reload();
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div>
        {memberships.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="outline" size="sm" className="gap-2">
                {currentOrganization?.name ?? "Selectează organizația"}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Organizații</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {memberships.map((m) => (
                <DropdownMenuItem
                  key={m.organization_id}
                  onClick={() => handleOrgSwitch(m.organization_id)}
                >
                  {m.organizations.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="ghost" className="gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium">{profile.full_name ?? profile.email}</p>
              {currentRole && (
                <p className="text-xs text-muted-foreground">
                  {ROLE_LABELS[currentRole]}
                </p>
              )}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Contul meu</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            Deconectare
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
