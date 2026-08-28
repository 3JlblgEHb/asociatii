"use client";

import { useActionState } from "react";
import { createOrganization, inviteMember, updateOrganization } from "@/lib/actions/organizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { Organization, OrganizationMember, UserRole } from "@/lib/types/database";
import { UserPlus } from "lucide-react";

interface OrganizationsPageProps {
  organization: Organization | null;
  members: (OrganizationMember & { users_profiles: { full_name: string | null; email: string } })[];
  canManage: boolean;
}

export function OrganizationsClient({
  organization,
  members,
  canManage,
}: OrganizationsPageProps) {
  const [createState, createAction, createPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) =>
      (await createOrganization(formData)) ?? null,
    null
  );

  const [inviteState, inviteAction, invitePending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) =>
      (await inviteMember(formData)) ?? null,
    null
  );

  const [updateState, updateAction, updatePending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) =>
      (await updateOrganization(formData)) ?? null,
    null
  );

  if (!organization) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Organizații</h1>
        <Card>
          <CardHeader>
            <CardTitle>Creează organizația ta</CardTitle>
            <CardDescription>
              Înregistrează asociația de proprietari pentru a începe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createAction} className="space-y-4 max-w-md">
              {createState?.error && (
                <p className="text-sm text-destructive">{createState.error}</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Nume organizație</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adresă</Label>
                <Input id="address" name="address" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" name="phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descriere</Label>
                <Textarea id="description" name="description" />
              </div>
              <Button type="submit" disabled={createPending}>
                {createPending ? "Se creează..." : "Creează organizația"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{organization.name}</h1>
        {canManage && (
          <Dialog>
            <DialogTrigger>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Invită membru
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invită membru</DialogTitle>
              </DialogHeader>
              <form action={inviteAction} className="space-y-4">
                {inviteState?.error && (
                  <p className="text-sm text-destructive">{inviteState.error}</p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="invite_email">Email</Label>
                  <Input id="invite_email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite_role">Rol</Label>
                  <Select name="role" defaultValue="resident">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["association_admin", "manager", "owner", "resident"] as UserRole[]).map(
                        (role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={invitePending}>
                  Trimite invitația
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Date organizație</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateAction} className="grid gap-4 max-w-lg">
              <input type="hidden" name="id" value={organization.id} />
              {updateState?.error && (
                <p className="text-sm text-destructive">{updateState.error}</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit_name">Nume</Label>
                <Input id="edit_name" name="name" defaultValue={organization.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_address">Adresă</Label>
                <Input id="edit_address" name="address" defaultValue={organization.address ?? ""} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_phone">Telefon</Label>
                <Input id="edit_phone" name="phone" defaultValue={organization.phone ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_email">Email</Label>
                <Input id="edit_email" name="email" type="email" defaultValue={organization.email ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_description">Descriere</Label>
                <Textarea id="edit_description" name="description" defaultValue={organization.description ?? ""} />
              </div>
              <Button type="submit" disabled={updatePending}>
                Salvează modificările
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Membri ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nume</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.users_profiles?.full_name ?? "—"}</TableCell>
                  <TableCell>{member.users_profiles?.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{ROLE_LABELS[member.role]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.status === "active" ? "default" : "outline"}>
                      {member.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
