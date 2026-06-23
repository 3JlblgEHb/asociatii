import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { getAuthContext } from "@/lib/auth/context";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAuthContext();

  if (!ctx) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        organization={ctx.currentOrganization}
        isSuperAdmin={ctx.isSuperAdmin}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          profile={ctx.profile}
          currentRole={ctx.currentRole}
          memberships={ctx.memberships}
          currentOrganization={ctx.currentOrganization}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
