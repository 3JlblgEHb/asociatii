import { getAuthContext } from "@/lib/auth/context";
import { getVoteDetails } from "@/lib/actions/votes";
import { VoteDetailClient } from "@/components/votes/vote-detail-client";
import { redirect, notFound } from "next/navigation";

export default async function VoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx?.currentOrganization) redirect("/organizations");

  const details = await getVoteDetails(id);
  if (!details) notFound();

  return (
    <VoteDetailClient
      vote={details.vote}
      options={details.options}
      userResponse={details.userResponse}
      hasVotingRights={details.hasVotingRights}
      totalVotes={details.totalVotes}
      canManage={ctx.canManage}
    />
  );
}
