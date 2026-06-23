"use client";

import { useActionState } from "react";
import { uploadDocument, deleteDocument, getDocumentUrl } from "@/lib/actions/documents";
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
import type { Document, DocumentCategory } from "@/lib/types/database";
import { Plus, Download, Trash2 } from "lucide-react";
import { format } from "date-fns";

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  protocol: "Proces verbal",
  invoice: "Factură",
  report: "Raport",
  statute: "Statut",
  other: "Altele",
};

interface DocumentsClientProps {
  documents: Document[];
  canManage: boolean;
}

export function DocumentsClient({ documents, canManage }: DocumentsClientProps) {
  const [uploadState, uploadAction, uploadPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) =>
      (await uploadDocument(formData)) ?? null,
    null
  );

  async function handleDownload(filePath: string) {
    const result = await getDocumentUrl(filePath);
    if (result.url) window.open(result.url, "_blank");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Documente</h1>
        {canManage && (
          <Dialog>
            <DialogTrigger>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Încarcă document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Document nou</DialogTitle>
              </DialogHeader>
              <form action={uploadAction} className="space-y-4">
                {uploadState?.error && (
                  <p className="text-sm text-destructive">{uploadState.error}</p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="title">Titlu</Label>
                  <Input id="title" name="title" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descriere</Label>
                  <Textarea id="description" name="description" />
                </div>
                <div className="space-y-2">
                  <Label>Categorie</Label>
                  <Select name="category" defaultValue="other">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CATEGORY_LABELS) as DocumentCategory[]).map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {CATEGORY_LABELS[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">Fișier (PDF, JPG, PNG)</Label>
                  <Input id="file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" required />
                </div>
                <Button type="submit" disabled={uploadPending}>
                  {uploadPending ? "Se încarcă..." : "Încarcă"}
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
                <TableHead>Categorie</TableHead>
                <TableHead>Fișier</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-24">Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Niciun document
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{CATEGORY_LABELS[doc.category]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{doc.file_name}</TableCell>
                    <TableCell>{format(new Date(doc.created_at), "dd.MM.yyyy")}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleDownload(doc.file_path)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      {canManage && (
                        <Button variant="ghost" size="icon" onClick={() => deleteDocument(doc.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
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
