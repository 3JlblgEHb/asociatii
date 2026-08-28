import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileText, Users, Vote, Wrench } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const ctx = await getAuthContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const orgId = ctx.currentOrganization?.id;

  let stats = {
    buildings: 0,
    propertyUnits: 0,
    documents: 0,
    activeVotes: 0,
    openRequests: 0,
    members: 0,
  };

  if (orgId) {
    const [buildings, propertyUnits, documents, votes, requests, members] =
      await Promise.all([
        supabase.from("buildings").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("property_units").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("votes").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "active"),
        supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("organization_id", orgId).in("status", ["new", "in_progress"]),
        supabase.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "active"),
      ]);

    stats = {
      buildings: buildings.count ?? 0,
      propertyUnits: propertyUnits.count ?? 0,
      documents: documents.count ?? 0,
      activeVotes: votes.count ?? 0,
      openRequests: requests.count ?? 0,
      members: members.count ?? 0,
    };
  }

  const cards = [
    { label: "Clădiri", value: stats.buildings, icon: Building2, href: "/buildings" },
    { label: "Unități", value: stats.propertyUnits, icon: Users, href: "/properties" },
    { label: "Documente", value: stats.documents, icon: FileText, href: "/documents" },
    { label: "Voturi active", value: stats.activeVotes, icon: Vote, href: "/votes" },
    { label: "Cereri deschise", value: stats.openRequests, icon: Wrench, href: "/requests" },
    { label: "Membri", value: stats.members, icon: Users, href: "/organizations" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Bun venit, {ctx.profile.full_name ?? ctx.profile.email}
          {ctx.currentOrganization && ` — ${ctx.currentOrganization.name}`}
        </p>
      </div>

      {!ctx.currentOrganization ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <p className="text-muted-foreground">
              Nu ești membru al niciunei organizații.
            </p>
            <Link href="/organizations" className={cn(buttonVariants())}>
              Creează o organizație
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ label, value, icon: Icon, href }) => (
            <Link key={label} href={href}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{value}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
