import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { AuditLog, Organization } from "@/lib/types/database";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

export default async function AdminPage() {
  const ctx = await getAuthContext();
  if (!ctx?.isSuperAdmin) redirect("/dashboard");

  const supabase = await createClient();

  const [{ data: organizations }, { data: auditLogs }] = await Promise.all([
    supabase.from("organizations").select("*").order("created_at", { ascending: false }).returns<Organization[]>(),
    supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<AuditLog[]>(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Panel</h1>

      <Card>
        <CardHeader>
          <CardTitle>Organizații ({organizations?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nume</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Creat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(organizations ?? []).map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell>{org.slug}</TableCell>
                  <TableCell>{format(new Date(org.created_at), "dd.MM.yyyy")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Log (ultimele 50)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Acțiune</TableHead>
                <TableHead>Entitate</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(auditLogs ?? []).map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.entity_type}</TableCell>
                  <TableCell>{format(new Date(log.created_at), "dd.MM.yyyy HH:mm")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
