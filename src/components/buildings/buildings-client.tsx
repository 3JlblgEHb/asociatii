"use client";

import { useActionState } from "react";
import { createBuilding, deleteBuilding } from "@/lib/actions/buildings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Building } from "@/lib/types/database";
import { Plus, Trash2 } from "lucide-react";

interface BuildingsClientProps {
  buildings: Building[];
  canManage: boolean;
}

export function BuildingsClient({ buildings, canManage }: BuildingsClientProps) {
  const [createState, createAction, createPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) =>
      (await createBuilding(formData)) ?? null,
    null
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clădiri</h1>
        {canManage && (
          <Dialog>
            <DialogTrigger>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adaugă clădire
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Clădire nouă</DialogTitle>
              </DialogHeader>
              <form action={createAction} className="space-y-4">
                {createState?.error && (
                  <p className="text-sm text-destructive">{createState.error}</p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Nume</Label>
                  <Input id="name" name="name" required placeholder="Bloc A" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Adresă</Label>
                  <Input id="address" name="address" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="floors">Etaje</Label>
                    <Input id="floors" name="floors" type="number" min={1} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="entrance_count">Scări</Label>
                    <Input id="entrance_count" name="entrance_count" type="number" min={1} defaultValue={1} />
                  </div>
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
                <TableHead>Nume</TableHead>
                <TableHead>Adresă</TableHead>
                <TableHead>Etaje</TableHead>
                <TableHead>Scări</TableHead>
                {canManage && <TableHead className="w-24">Acțiuni</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {buildings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 5 : 4} className="text-center text-muted-foreground">
                    Nicio clădire adăugată
                  </TableCell>
                </TableRow>
              ) : (
                buildings.map((building) => (
                  <TableRow key={building.id}>
                    <TableCell className="font-medium">{building.name}</TableCell>
                    <TableCell>{building.address}</TableCell>
                    <TableCell>{building.floors ?? "—"}</TableCell>
                    <TableCell>{building.entrance_count ?? 1}</TableCell>
                    {canManage && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteBuilding(building.id)}
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
