"use client";

import { useActionState } from "react";
import { createServiceRequest, updateRequestStatus } from "@/lib/actions/requests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { RequestCategory, RequestStatus, ServiceRequest } from "@/lib/types/database";
import { Plus } from "lucide-react";
import { format } from "date-fns";

const CATEGORY_LABELS: Record<RequestCategory, string> = {
  repair: "Reparații",
  cleaning: "Curățenie",
  elevator: "Lift",
  water: "Apă",
  electricity: "Electricitate",
  other: "Altele",
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  new: "Nouă",
  in_progress: "În lucru",
  resolved: "Rezolvată",
  rejected: "Respinsă",
};

interface RequestsClientProps {
  requests: (ServiceRequest & {
    users_profiles?: { full_name: string | null; email: string };
    property_units?: { number: string } | null;
  })[];
  canManage: boolean;
}

export function RequestsClient({ requests, canManage }: RequestsClientProps) {
  const [createState, createAction, createPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) =>
      (await createServiceRequest(formData)) ?? null,
    null
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cereri de service</h1>
        <Dialog>
            <DialogTrigger>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Cerere nouă
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cerere nouă</DialogTitle>
            </DialogHeader>
            <form action={createAction} className="space-y-4">
              {createState?.error && (
                <p className="text-sm text-destructive">{createState.error}</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="title">Titlu</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descriere</Label>
                <Textarea id="description" name="description" required rows={4} />
              </div>
              <div className="space-y-2">
                <Label>Categorie</Label>
                <Select name="category" defaultValue="other">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CATEGORY_LABELS) as RequestCategory[]).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="attachments">Foto (opțional)</Label>
                <Input id="attachments" name="attachments" type="file" accept="image/*" multiple />
              </div>
              <Button type="submit" disabled={createPending}>
                Trimite cererea
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titlu</TableHead>
                <TableHead>Categorie</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Data</TableHead>
                {canManage && <TableHead>Acțiuni</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 6 : 5} className="text-center text-muted-foreground">
                    Nicio cerere
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.title}</TableCell>
                    <TableCell>{CATEGORY_LABELS[req.category]}</TableCell>
                    <TableCell>
                      <Badge variant={req.status === "new" ? "default" : "secondary"}>
                        {STATUS_LABELS[req.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{req.users_profiles?.full_name ?? req.users_profiles?.email}</TableCell>
                    <TableCell>{format(new Date(req.created_at), "dd.MM.yyyy")}</TableCell>
                    {canManage && (
                      <TableCell>
                        <Select
                          defaultValue={req.status}
                          onValueChange={(status) =>
                            updateRequestStatus(req.id, status as RequestStatus)
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(STATUS_LABELS) as RequestStatus[]).map((s) => (
                              <SelectItem key={s} value={s}>
                                {STATUS_LABELS[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
