// Supabase Edge Function: trigger-import
// Dispara o workflow "Catalog import" no GitHub (workflow_dispatch), guardando o
// token do GitHub como SECRET no servidor -- nunca no navegador. Com verify_jwt
// ligado (padrão), só um usuário autenticado do admin consegue invocar.
//
// Deploy (Dashboard -> Edge Functions -> "Deploy a new function" -> cole isto,
// nome "trigger-import"); OU via CLI: `supabase functions deploy trigger-import`.
// Secrets (Dashboard -> Edge Functions -> Secrets, ou `supabase secrets set`):
//   GH_TOKEN     fine-grained PAT do GitHub com permissão Actions: Read and write
//                no repositório m11ntx/catalog-pipeline (obrigatório).
//   GH_REPO      opcional, default "m11ntx/catalog-pipeline".
//   GH_WORKFLOW  opcional, default "import.yml".
//   GH_REF       opcional, default "main".

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const token = Deno.env.get("GH_TOKEN");
  if (!token) return json({ ok: false, error: "GH_TOKEN não configurado na função" }, 500);

  const repo = Deno.env.get("GH_REPO") ?? "m11ntx/catalog-pipeline";
  const workflow = Deno.env.get("GH_WORKFLOW") ?? "import.yml";
  const ref = Deno.env.get("GH_REF") ?? "main";

  const gh = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "m11ntx-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref }),
    },
  );

  if (gh.status === 204) return json({ ok: true });
  return json({ ok: false, status: gh.status, error: await gh.text() }, 502);
});
