"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  FileText,
  Home,
  LayoutDashboard,
  Megaphone,
  Settings,
  Shield,
  Users,
  Vote,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Organization } from "@/lib/types/database";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/organizations", label: "Organizații", icon: Users },
  { href: "/buildings", label: "Clădiri", icon: Building2 },
  { href: "/apartments", label: "Apartamente", icon: Home },
  { href: "/documents", label: "Documente", icon: FileText },
  { href: "/announcements", label: "Anunțuri", icon: Megaphone },
  { href: "/votes", label: "Voturi", icon: Vote },
  { href: "/requests", label: "Cereri", icon: Wrench },
  { href: "/settings", label: "Setări", icon: Settings },
];

interface SidebarProps {
  organization: Organization | null;
  isSuperAdmin?: boolean;
}

export function Sidebar({ organization, isSuperAdmin }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="border-b p-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Building2 className="h-6 w-6 text-primary" />
          <span>Asociatii</span>
        </Link>
        {organization && (
          <p className="mt-2 truncate text-sm text-muted-foreground">
            {organization.name}
          </p>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}

        {isSuperAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              pathname === "/admin"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Shield className="h-4 w-4" />
            Admin
          </Link>
        )}
      </nav>
    </aside>
  );
}
