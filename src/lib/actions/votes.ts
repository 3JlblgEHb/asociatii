"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireManagement, requireOrganization } from "@/lib/auth/context";
import { writeAuditLog } from "@/lib/actions/utils";
import { revalidatePath } from "next/cache";
import type { VoteStatus } from "@/lib/types/database";

export async function createVote(formData: FormData) {
  const ctx = await requireManagement();
  const supabase = await createClient();

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const startsAt = (formData.get("starts_at") as string) || null;
  const endsAt = (formData.get("ends_at") as string) || null;
  const optionsRaw = formData.get("options") as string;
  const options = optionsRaw.split("\n").map((o) => o.trim()).filter(Boolean);

  if (options.length < 2) {
    return { error: "Adaugă cel puțin 2 opțiuni" };
  }

  const { data: vote, error } = await supabase
    .from("votes")
    .insert({
      organization_id: ctx.currentOrganization.id,
      created_by: ctx.user.id,
      title,
      description,
      status: "draft",
      starts_at: startsAt,
      ends_at: endsAt,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  const optionRows = options.map((label, index) => ({
    vote_id: vote.id,
    organization_id: ctx.currentOrganization.id,
    label,
    sort_order: index,
  }));

  const { error: optionsError } = await supabase
    .from("vote_options")
    .insert(optionRows);

  if (optionsError) return { error: optionsError.message };

  await writeAuditLog({
    organizationId: ctx.currentOrganization.id,
    action: "vote_created",
    entityType: "vote",
    entityId: vote.id,
    metadata: { title },
  });

  revalidatePath("/votes");
  return { success: true, vote };
}

export async function updateVoteStatus(voteId: string, status: VoteStatus) {
  const ctx = await requireManagement();
  const supabase = await createClient();

  const { error } = await supabase
    .from("votes")
    .update({ status })
    .eq("id", voteId)
    .eq("organization_id", ctx.currentOrganization.id);

  if (error) return { error: error.message };

  revalidatePath("/votes");
  revalidatePath(`/votes/${voteId}`);
  return { success: true };
}

export async function castVote(voteId: string, optionId: string) {
  const ctx = await requireOrganization();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("cast_vote", {
    p_vote_id: voteId,
    p_option_id: optionId,
  });

  if (error) return { error: error.message };

  revalidatePath(`/votes/${voteId}`);
  revalidatePath("/votes");
  return { success: true, responseId: data };
}

export async function getVoteDetails(voteId: string) {
  const ctx = await requireOrganization();
  const supabase = await createClient();

  const { data: vote } = await supabase
    .from("votes")
    .select("*")
    .eq("id", voteId)
    .eq("organization_id", ctx.currentOrganization.id)
    .single();

  if (!vote) return null;

  const { data: options } = await supabase
    .from("vote_options")
    .select("*")
    .eq("vote_id", voteId)
    .order("sort_order");

  const { data: responses } = await supabase
    .from("vote_responses")
    .select("*, apartments(number), vote_options(label)")
    .eq("vote_id", voteId);

  const { data: userResponse } = await supabase
    .from("vote_responses")
    .select("*")
    .eq("vote_id", voteId)
    .eq("voter_id", ctx.user.id)
    .maybeSingle();

  const { data: hasVotingRights } = await supabase.rpc("user_has_voting_rights", {
    org_id: ctx.currentOrganization.id,
  });

  const results = (options ?? []).map((option) => ({
    ...option,
    count: (responses ?? []).filter((r) => r.option_id === option.id).length,
  }));

  return {
    vote,
    options: results,
    responses: responses ?? [],
    userResponse,
    hasVotingRights: hasVotingRights ?? false,
    totalVotes: responses?.length ?? 0,
  };
}

export async function exportVoteResults(voteId: string) {
  const ctx = await requireManagement();
  const supabase = await createClient();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const { data: session } = await supabase.auth.getSession();

  if (!session.session) return { error: "Not authenticated" };

  const response = await fetch(
    `${supabaseUrl}/functions/v1/export-vote-results`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        voteId,
        organizationId: ctx.currentOrganization.id,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    return { error: err || "Export failed" };
  }

  const blob = await response.blob();
  const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
  return { success: true, pdf: base64 };
}
