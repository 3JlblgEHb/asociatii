"use client";

import { useActionState } from "react";
import { createPropertyUnit, deletePropertyUnit } from "@/lib/actions/buildings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type {
  Building,
  Condominium,
  Person,
  PropertyOwnership,
  PropertyUnit,
  PropertyUnitType,
} from "@/lib/types/database";
import { Plus, Trash2 } from "lucide-react";

const UNIT_TYPE_LABELS: Record<PropertyUnitType, string> = {
  apartment: "Apartament",
  commercial: "Spațiu comercial",
  parking: "Loc de parcare",
  storage: "Debara",
  other: "Alt tip",
};

type PropertyUnitRow = PropertyUnit & {
  buildings?: Pick<Building, "name"> | null;
  condominiums?: Pick<Condominium, "name"> | null;
  property_ownerships?: (PropertyOwnership & {
    persons?: Pick<Person, "full_name" | "email"> | null;
  })[];
};

interface PropertyUnitsClientProps {
  propertyUnits: PropertyUnitRow[];
  buildings: Building[];
  condominiums: Condominium[];
  members: {
    user_id: string;
    users_profiles:
      | { full_name: string | null; email: string }
      | { full_name: string | null; email: string }[];
  }[];
  canManage: boolean;
}

export function PropertyUnitsClient({
  propertyUnits,
  buildings,
  condominiums,
  members,
  canManage,
}: PropertyUnitsClientProps) {
  const [createState, createAction, createPending] = useActionState(
    async (_previous: { error?: string } | null, formData: FormData) =>
      (await createPropertyUnit(formData)) ?? null,
    null
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Unități imobiliare</h1>
          <p className="text-muted-foreground">
            Apartamente, spații comerciale, parcări și alte unități cadastrale.
          </p>
        </div>
        {canManage && buildings.length > 0 && (
          <Dialog>
            <DialogTrigger>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adaugă unitate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Unitate imobiliară nouă</DialogTitle>
              </DialogHeader>
              <form action={createAction} className="space-y-4">
                {createState?.error && (
                  <p className="text-sm text-destructive">{createState.error}</p>
                )}
                <div className="space-y-2">
                  <Label>Condominiu</Label>
                  <Select name="condominium_id" required>
                    <SelectTrigger><SelectValue placeholder="Selectează condominiul" /></SelectTrigger>
                    <SelectContent>
                      {condominiums.map((condominium) => (
                        <SelectItem key={condominium.id} value={condominium.id}>
                          {condominium.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Clădire</Label>
                  <Select name="building_id" required>
                    <SelectTrigger><SelectValue placeholder="Selectează clădirea" /></SelectTrigger>
                    <SelectContent>
                      {buildings.map((building) => (
                        <SelectItem key={building.id} value={building.id}>
                          {building.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tip</Label>
                  <Select name="unit_type" defaultValue="apartment">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(UNIT_TYPE_LABELS) as PropertyUnitType[]).map((type) => (
                        <SelectItem key={type} value={type}>{UNIT_TYPE_LABELS[type]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="number">Număr</Label>
                    <Input id="number" name="number" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="floor">Etaj</Label>
                    <Input id="floor" name="floor" type="number" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="area_sqm">Suprafață m²</Label>
                    <Input id="area_sqm" name="area_sqm" type="number" step="0.01" min="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cadastral_number">Nr. cadastral</Label>
                    <Input id="cadastral_number" name="cadastral_number" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Proprietar inițial</Label>
                  <Select name="owner_user_id">
                    <SelectTrigger><SelectValue placeholder="Fără proprietar" /></SelectTrigger>
                    <SelectContent>
                      {members.map((member) => {
                        const profile = Array.isArray(member.users_profiles)
                          ? member.users_profiles[0]
                          : member.users_profiles;
                        return (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            {profile?.full_name ?? profile?.email}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <input type="hidden" name="has_voting_rights" value="true" />
                <Button type="submit" disabled={createPending}>Salvează</Button>
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
                <TableHead>Condominiu / clădire</TableHead>
                <TableHead>Unitate</TableHead>
                <TableHead>Cadastru</TableHead>
                <TableHead>Suprafață</TableHead>
                <TableHead>Proprietari</TableHead>
                {canManage && <TableHead className="w-16" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {propertyUnits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 6 : 5} className="text-center text-muted-foreground">
                    Nu există unități imobiliare.
                  </TableCell>
                </TableRow>
              ) : propertyUnits.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell>
                    <div className="font-medium">{unit.buildings?.name ?? "—"}</div>
                    <div className="text-sm text-muted-foreground">{unit.condominiums?.name ?? "—"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{unit.number}</div>
                    <Badge variant="secondary">{UNIT_TYPE_LABELS[unit.unit_type]}</Badge>
                  </TableCell>
                  <TableCell>{unit.cadastral_number ?? "—"}</TableCell>
                  <TableCell>{unit.area_sqm ? `${unit.area_sqm} m²` : "—"}</TableCell>
                  <TableCell>
                    {unit.property_ownerships?.map((ownership) => ownership.persons?.full_name).filter(Boolean).join(", ") || "—"}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deletePropertyUnit(unit.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
