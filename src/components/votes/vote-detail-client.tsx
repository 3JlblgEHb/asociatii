"use client";

import { castVote, exportVoteResults } from "@/lib/actions/votes";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Vote, VoteOption, VoteResponse, VoteStatus } from "@/lib/types/database";
import { format } from "date-fns";
import { Download } from "lucide-react";

const STATUS_LABELS: Record<VoteStatus, string> = {
  draft: "Ciornă",
  active: "Activ",
  closed: "Închis",
};

interface VoteDetailClientProps {
  vote: Vote;
  options: (VoteOption & { count: number })[];
  userResponse: VoteResponse | null;
  hasVotingRights: boolean;
  totalVotes: number;
  canManage: boolean;
}

export function VoteDetailClient({
  vote,
  options,
  userResponse,
  hasVotingRights,
  totalVotes,
  canManage,
}: VoteDetailClientProps) {
  const maxCount = Math.max(...options.map((o) => o.count), 1);

  async function handleExport() {
    const result = await exportVoteResults(vote.id);
    if (result.pdf) {
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${result.pdf}`;
      link.download = `vot-${vote.title}.pdf`;
      link.click();
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{vote.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge>{STATUS_LABELS[vote.status]}</Badge>
            <span className="text-sm text-muted-foreground">
              {vote.starts_at && format(new Date(vote.starts_at), "dd.MM.yyyy HH:mm")}
              {vote.ends_at && ` — ${format(new Date(vote.ends_at), "dd.MM.yyyy HH:mm")}`}
            </span>
          </div>
        </div>
        {canManage && vote.status === "closed" && (
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        )}
      </div>

      {vote.description && (
        <p className="text-muted-foreground">{vote.description}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Rezultate</CardTitle>
          <CardDescription>{totalVotes} voturi exprimate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {options.map((option) => (
            <div key={option.id} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{option.label}</span>
                <span className="font-medium">
                  {option.count} ({totalVotes > 0 ? Math.round((option.count / totalVotes) * 100) : 0}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${(option.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {vote.status === "active" && hasVotingRights && !userResponse && (
        <Card>
          <CardHeader>
            <CardTitle>Votează</CardTitle>
            <CardDescription>Alege o opțiune (un vot per apartament)</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {options.map((option) => (
              <Button
                key={option.id}
                variant="outline"
                className="justify-start"
                onClick={() => castVote(vote.id, option.id)}
              >
                {option.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {userResponse && (
        <p className="text-sm text-muted-foreground">
          Ai votat deja în acest scrutin.
        </p>
      )}

      {vote.status === "active" && !hasVotingRights && !userResponse && (
        <p className="text-sm text-muted-foreground">
          Nu ai drept de vot în această organizație.
        </p>
      )}
    </div>
  );
}
