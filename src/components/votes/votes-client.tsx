"use client";

import { useActionState } from "react";
import { createVote, updateVoteStatus } from "@/lib/actions/votes";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Vote, VoteStatus } from "@/lib/types/database";
import { Plus } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

const STATUS_LABELS: Record<VoteStatus, string> = {
  draft: "Ciornă",
  active: "Activ",
  closed: "Închis",
};

const STATUS_VARIANT: Record<VoteStatus, "default" | "secondary" | "outline"> = {
  draft: "secondary",
  active: "default",
  closed: "outline",
};

interface VotesClientProps {
  votes: Vote[];
  canManage: boolean;
}

export function VotesClient({ votes, canManage }: VotesClientProps) {
  const [createState, createAction, createPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) =>
      (await createVote(formData)) ?? null,
    null
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Voturi</h1>
        {canManage && (
          <Dialog>
            <DialogTrigger>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Vot nou
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Creează vot</DialogTitle>
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
                  <Textarea id="description" name="description" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="starts_at">Început</Label>
                    <Input id="starts_at" name="starts_at" type="datetime-local" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ends_at">Sfârșit</Label>
                    <Input id="ends_at" name="ends_at" type="datetime-local" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="options">Opțiuni (câte una pe linie)</Label>
                  <Textarea
                    id="options"
                    name="options"
                    required
                    placeholder={"Da\nNu\nAbținere"}
                    rows={4}
                  />
                </div>
                <Button type="submit" disabled={createPending}>
                  Creează vot
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
                <TableHead>Titlu</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Perioadă</TableHead>
                {canManage && <TableHead>Acțiuni</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {votes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 4 : 3} className="text-center text-muted-foreground">
                    Niciun vot
                  </TableCell>
                </TableRow>
              ) : (
                votes.map((vote) => (
                  <TableRow key={vote.id}>
                    <TableCell>
                      <Link href={`/votes/${vote.id}`} className="font-medium hover:underline">
                        {vote.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[vote.status]}>
                        {STATUS_LABELS[vote.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {vote.starts_at ? format(new Date(vote.starts_at), "dd.MM.yyyy") : "—"}
                      {" — "}
                      {vote.ends_at ? format(new Date(vote.ends_at), "dd.MM.yyyy") : "—"}
                    </TableCell>
                    {canManage && (
                      <TableCell className="flex gap-2">
                        {vote.status === "draft" && (
                          <Button size="sm" onClick={() => updateVoteStatus(vote.id, "active")}>
                            Activează
                          </Button>
                        )}
                        {vote.status === "active" && (
                          <Button size="sm" variant="outline" onClick={() => updateVoteStatus(vote.id, "closed")}>
                            Închide
                          </Button>
                        )}
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
