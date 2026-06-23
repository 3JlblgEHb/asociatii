"use client";

import { useActionState } from "react";
import { createAnnouncement, publishAnnouncement } from "@/lib/actions/announcements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import type { Announcement } from "@/lib/types/database";
import { Plus, Mail } from "lucide-react";
import { format } from "date-fns";

interface AnnouncementsClientProps {
  announcements: Announcement[];
  canManage: boolean;
}

export function AnnouncementsClient({
  announcements,
  canManage,
}: AnnouncementsClientProps) {
  const [createState, createAction, createPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) =>
      (await createAnnouncement(formData)) ?? null,
    null
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Anunțuri</h1>
        {canManage && (
          <Dialog>
            <DialogTrigger>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Anunț nou
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Anunț nou</DialogTitle>
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
                  <Label htmlFor="content">Conținut</Label>
                  <Textarea id="content" name="content" required rows={6} />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="publish" value="true" defaultChecked />
                    Publică imediat
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="send_email" value="true" />
                    Trimite email
                  </label>
                </div>
                <Button type="submit" disabled={createPending}>
                  {createPending ? "Se publică..." : "Publică anunțul"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Niciun anunț
            </CardContent>
          </Card>
        ) : (
          announcements.map((ann) => (
            <Card key={ann.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>{ann.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(ann.created_at), "dd MMMM yyyy, HH:mm")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={ann.is_published ? "default" : "secondary"}>
                    {ann.is_published ? "Publicat" : "Ciornă"}
                  </Badge>
                  {ann.email_sent && (
                    <Badge variant="outline">
                      <Mail className="mr-1 h-3 w-3" />
                      Email trimis
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{ann.content}</p>
                {canManage && !ann.is_published && (
                  <Button
                    className="mt-4"
                    size="sm"
                    onClick={() => publishAnnouncement(ann.id, true)}
                  >
                    Publică și trimite email
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
