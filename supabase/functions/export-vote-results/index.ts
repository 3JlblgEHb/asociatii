import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { voteId, organizationId } = await req.json();

    const { data: canManage } = await supabase.rpc("can_manage_org", {
      org_id: organizationId,
    });

    if (!canManage) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: vote } = await supabase
      .from("votes")
      .select("*")
      .eq("id", voteId)
      .eq("organization_id", organizationId)
      .single();

    if (!vote) {
      return new Response(JSON.stringify({ error: "Vote not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: options } = await supabase
      .from("vote_options")
      .select("*")
      .eq("vote_id", voteId)
      .order("sort_order");

    const { data: responses } = await supabase
      .from("vote_responses")
      .select("*, property_units(number), vote_options(label)")
      .eq("vote_id", voteId);

    const totalVotes = responses?.length ?? 0;

    const pdfContent = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 6 0 R>>stream
BT /F1 16 Tf 50 750 Td (${vote.title.replace(/[()\\]/g, "")}) Tj
/F1 12 Tf 0 -30 Td (Status: ${vote.status}) Tj
0 -20 Td (Total votes: ${totalVotes}) Tj
0 -40 Td (Results:) Tj
${(options ?? []).map((opt) => {
  const count = (responses ?? []).filter((r) => r.option_id === opt.id).length;
  const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
  return `0 -20 Td (${opt.label}: ${count} (${pct}%)) Tj`;
}).join("\n")}
ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
6 0 obj ${400} endobj
xref
0 7
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000266 00000 n
0000000800 00000 n
0000000870 00000 n
trailer<</Size 7/Root 1 0 R>>
startxref
920
%%EOF`;

    return new Response(pdfContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="vote-${voteId}.pdf"`,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
