"use client";

import { useActionState } from "react";
import { createApartment, deleteApartment } from "@/lib/actions/buildings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
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
import type { Apartment, Building } from "@/lib/types/database";
import { Plus, Trash2 } from "lucide-react";

interface ApartmentsClientProps {
  apartments: (Apartment & {
    buildings?: Building;
    users_profiles?: { full_name: string | null; email: string } | null;
  })[];
  buildings: Building[];
  members: {
    user_id: string;
    users_profiles: { full_name: string | null; email: string } | { full_name: string | null; email: string }[];
  }[];
  canManage: boolean;
}

export function ApartmentsClient({
  apartments,
  buildings,
  members,
  canManage,
}: ApartmentsClientProps) {
  const [createState, createAction, createPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) =>
      (await createApartment(formData)) ?? null,
    null
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Apartamente</h1>
        {canManage && buildings.length > 0 && (
          <Dialog>
            <DialogTrigger>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adaugă apartament
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Apartament nou</DialogTitle>
              </DialogHeader>
              <form action={createAction} className="space-y-4">
                {createState?.error && (
                  <p className="text-sm text-destructive">{createState.error}</p>
                )}
                <div className="space-y-2">
                  <Label>Clădire</Label>
                  <Select name="building_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selectează clădirea" />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number">Număr apartament</Label>
                  <Input id="number" name="number" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="floor">Etaj</Label>
                    <Input id="floor" name="floor" type="number" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="area_sqm">Suprafață m²</Label>
                    <Input id="area_sqm" name="area_sqm" type="number" step="0.01" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Proprietar</Label>
                  <Select name="owner_id">
                    <SelectTrigger>
                      <SelectValue placeholder="Fără proprietar" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => {
                        const profile = Array.isArray(m.users_profiles)
                          ? m.users_profiles[0]
                          : m.users_profiles;
                        return (
                          <SelectItem key={m.user_id} value={m.user_id}>
                            {profile?.full_name ?? profile?.email}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <input type="hidden" name="has_voting_rights" value="false" />
                  <input
                    type="checkbox"
                    id="has_voting_rights"
                    name="has_voting_rights"
                    value="true"
                    defaultChecked
                    onChange={(e) => {
                      const hidden = e.target.previousElementSibling as HTMLInputElement;
                      hidden.value = e.target.checked ? "true" : "false";
                    }}
                  />
                  <Label htmlFor="has_voting_rights">Drept de vot</Label>
                </div>
                <Button type="submit" disabled={createPending}>
                  Salvează
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clădire</TableHead>
                <TableHead>Nr.</TableHead>
                <TableHead>Etaj</TableHead>
                <TableHead>Proprietar</TableHead>
                <TableHead>Vot</TableHead>
                {canManage && <TableHead className="w-16" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {apartments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 6 : 5} className="text-center text-muted-foreground">
                    Niciun apartament
                  </TableCell>
                </TableRow>
              ) : (
                apartments.map((apt) => (
                  <TableRow key={apt.id}>
                    <TableCell>{apt.buildings?.name ?? "—"}</TableCell>
                    <TableCell className="font-medium">{apt.number}</TableCell>
                    <TableCell>{apt.floor ?? "—"}</TableCell>
                    <TableCell>
                      {apt.users_profiles?.full_name ?? apt.users_profiles?.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={apt.has_voting_rights ? "default" : "secondary"}>
                        {apt.has_voting_rights ? "Da" : "Nu"}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteApartment(apt.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
