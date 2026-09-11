// Nika Net — Cloudflare API helpers (panel side, for self-update).
const CF = "https://api.cloudflare.com/client/v4";

export async function cfJson(token: string, path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(CF + path, {
    ...init,
    headers: { authorization: `Bearer ${token}`, ...(init?.headers || {}) },
  });
  return res.json();
}

export async function findKvId(token: string, accountId: string, titles: string[]): Promise<string | null> {
  const r = await cfJson(token, `/accounts/${accountId}/storage/kv/namespaces?per_page=100`);
  for (const ns of r?.result || []) {
    if (titles.includes(ns.title)) return ns.id;
  }
  return null;
}

// --- D1 helpers (shared panel DB) ----------------------------------------
// KV free tier = 1,000 writes/day per ACCOUNT. A shared D1 database gives the
// panel ~100k rows/day of writes, so a panel must NEVER be (re)deployed without
// its D1 binding — that is exactly how panels lost their D1 and hit the KV cap.
// Self-update resolves the same shared `nika-net-panels` D1 that the bot and
// deploy.mjs use, so every deploy path agrees on the storage bindings.

export async function listD1(token: string, accountId: string): Promise<Array<{ id: string; name: string }>> {
  const r = await cfJson(token, `/accounts/${accountId}/d1/database?per_page=100`);
  return (r?.result || []).map((x: any) => ({ id: x.uuid, name: x.name }));
}

export async function createD1(token: string, accountId: string, title: string): Promise<string | null> {
  const r = await cfJson(token, `/accounts/${accountId}/d1/database`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: title }),
  });
  return r?.result?.uuid ?? null;
}

export async function ensureD1Table(token: string, accountId: string, dbId: string): Promise<boolean> {
  const r = await cfJson(token, `/accounts/${accountId}/d1/database/${dbId}/query`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sql: "CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)" }),
  });
  return !!r?.success;
}

// Find (or create, if the account still has room) the shared panels D1 DB.
export async function resolvePanelD1(token: string, accountId: string): Promise<string | null> {
  try {
    let id = (await listD1(token, accountId)).find((d) => d.name === "nika-net-panels")?.id ?? null;
    if (!id) id = await createD1(token, accountId, "nika-net-panels");
    if (id) await ensureD1Table(token, accountId, id);
    return id;
  } catch {
    return null;
  }
}

// Storage bindings for a panel: D1 (primary) + KV (fallback) + NIKA_NS.
export async function panelBindings(
  token: string,
  accountId: string,
  name: string,
  kvId: string | null
): Promise<Array<Record<string, unknown>>> {
  const bindings: Array<Record<string, unknown>> = [];
  if (kvId) bindings.push({ type: "kv_namespace", name: "NIKA_KV", namespace_id: kvId });
  const d1 = await resolvePanelD1(token, accountId);
  if (d1) {
    bindings.push({ type: "d1", name: "NIKA_DB", id: d1 });
    bindings.push({ type: "plain_text", name: "NIKA_NS", text: name });
  }
  return bindings;
}

export async function uploadWorker(
  token: string,
  accountId: string,
  name: string,
  code: string,
  bindings: Array<Record<string, unknown>>
): Promise<{ ok: boolean; err?: string }> {
  const boundary = "----NikaNetBoundary" + Math.random().toString(16).slice(2);
  const metadata = {
    main_module: "worker.js",
    compatibility_date: "2026-05-01",
    workers_dev: true,
    bindings,
  };
  const body = [
    `--${boundary}\r\nContent-Disposition: form-data; name="metadata"\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="worker.js"; filename="worker.js"\r\nContent-Type: application/javascript+module\r\n\r\n${code}\r\n`,
    `--${boundary}--\r\n`,
  ].join("");

  const res = await fetch(`${CF}/accounts/${accountId}/workers/scripts/${name}`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });
  const j: any = await res.json();
  return { ok: !!j?.success, err: j?.errors?.[0]?.message || `HTTP ${res.status}` };
}

export async function enableWorkersDev(
  token: string,
  accountId: string,
  name: string
): Promise<{ ok: boolean; err?: string }> {
  const r = await cfJson(token, `/accounts/${accountId}/workers/scripts/${name}/subdomain`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enabled: true }),
  });
  return { ok: !!r?.success, err: r?.errors?.[0]?.message };
}
