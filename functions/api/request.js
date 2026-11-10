// POST /api/request  — staff "Request a car" form.
// Cloudflare Access sits in front of this whole site, so every request here comes from a signed-in staff member;
// Access adds their email in the Cf-Access-Authenticated-User-Email header. The Zapier catch-hook URL lives in the
// ZAPIER_HOOK environment variable (Pages > Settings > Variables and secrets), never in this repo.
export async function onRequestPost({ request, env }) {
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const email = (request.headers.get("cf-access-authenticated-user-email") || "").trim().toLowerCase();
  if (!email) return json({ error: "Sign in again, then send the request." }, 401);
  if (!env.ZAPIER_HOOK) return json({ error: "Requests aren't switched on yet. Tell Chris." }, 503);
  let b = {};
  try { b = await request.json(); } catch { return json({ error: "Couldn't read the request." }, 400); }
  const s = (v, n) => String(v ?? "").replace(/[\u0000-\u001f]+/g, " ").trim().slice(0, n);
  const out = { year: s(b.year, 4), make: s(b.make, 60), model: s(b.model, 60), trim: s(b.trim, 80), note: String(b.note ?? "").trim().slice(0, 1000), requested_by: email, source: "ppf-staff" };
  if (!/^(19|20)\d\d$/.test(out.year) || !out.make || !out.model) return json({ error: "Add the year, make and model." }, 400);
  const r = await fetch(env.ZAPIER_HOOK, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(out) });
  if (!r.ok) return json({ error: "Couldn't save the request. Try again in a minute." }, 502);
  return json({ ok: true });
}
export async function onRequest() {
  return new Response("Method not allowed", { status: 405 });
}
