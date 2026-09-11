// Nika Net Launcher — Cloudflare API helpers (token verification, workers, KV).

const CF = "https://api.cloudflare.com/client/v4";

export interface CfAccount { id: string; name: string }

async function cfReq(token: string, path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(CF + path, {
    ...init,
    headers: { authorization: `Bearer ${token}`, ...(init?.headers || {}) },
  });
  return res.json();
}

export async function verifyAndListAccounts(
  token: string
): Promise<{ ok: boolean; accounts: CfAccount[]; err?: string }> {
  try {
    const v = await cfReq(token, "/user/tokens/verify");
    if (!v?.success) return { ok: false, accounts: [], err: v?.errors?.[0]?.message || "توکن نامعتبر است" };
    const a = await cfReq(token, "/accounts?per_page=50");
    const accounts: CfAccount[] = (a?.result || []).map((x: any) => ({ id: x.id, name: x.name }));
    if (!accounts.length) return { ok: false, accounts: [], err: "هیچ اکانتی با این توکن در دسترس نیست" };
    return { ok: true, accounts };
  } catch (e) {
    return { ok: false, accounts: [], err: "خطا در اتصال به Cloudflare" };
  }
}

export async function getSubdomain(token: string, accountId: string): Promise<string | null> {
  const r = await cfReq(token, `/accounts/${accountId}/workers/subdomain`);
  return r?.result?.subdomain ?? null;
}

export async function registerSubdomain(
  token: string,
  accountId: string,
  sub: string
): Promise<{ ok: boolean; err?: string }> {
  const r = await cfReq(token, `/accounts/${accountId}/workers/subdomain`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ subdomain: sub }),
  });
  return { ok: !!r?.success, err: r?.errors?.[0]?.message };
}

export async function findKvId(token: string, accountId: string, titles: string[]): Promise<string | null> {
  const r = await cfReq(token, `/accounts/${accountId}/storage/kv/namespaces?per_page=100`);
  for (const ns of r?.result || []) {
    if (titles.includes(ns.title)) return ns.id;
  }
  return null;
}

export async function createKvNamespace(
  token: string,
  accountId: string,
  title: string
): Promise<string | null> {
  const r = await cfReq(token, `/accounts/${accountId}/storage/kv/namespaces`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title }),
  });
  return r?.result?.id ?? null;
}

// --- D1 helpers -----------------------------------------------------------
// KV free tier = 1,000 writes/day per ACCOUNT (not per namespace). A shared D1
// database gives every panel ~100k rows/day of writes, so panels keep working
// even when the account's KV write quota is exhausted. Panels are isolated
// inside the shared DB via the NIKA_NS key prefix (set at upload time).

export async function listD1(tok: string, accountId: string): Promise<Array<{ id: string; name: string }>> {
  const r = await cfReq(tok, `/accounts/${accountId}/d1/database?per_page=100`);
  return (r?.result || []).map((x: any) => ({ id: x.uuid, name: x.name }));
}

export async function createD1(tok: string, accountId: string, title: string): Promise<string | null> {
  const r = await cfReq(tok, `/accounts/${accountId}/d1/database`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: title }),
  });
  return r?.result?.uuid ?? null;
}

export async function ensureD1Table(tok: string, accountId: string, dbId: string): Promise<boolean> {
  const r = await cfReq(tok, `/accounts/${accountId}/d1/database/${dbId}/query`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sql: "CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)" }),
  });
  return !!r?.success;
}

// Find (or create, if the account still has room) the shared panels D1 DB.
export async function resolvePanelD1(tok: string, accountId: string): Promise<string | null> {
  try {
    let id = (await listD1(tok, accountId)).find((d) => d.name === "nika-net-panels")?.id ?? null;
    if (!id) id = await createD1(tok, accountId, "nika-net-panels");
    if (id) await ensureD1Table(tok, accountId, id);
    return id;
  } catch {
    return null;
  }
}

// Build the storage bindings for a panel: D1 (primary, immune to the KV daily
// write cap) + KV (fallback) + NIKA_NS (per-panel key prefix).
export async function panelBindings(
  tok: string,
  accountId: string,
  name: string,
  kvId: string | null
): Promise<Array<Record<string, unknown>>> {
  const bindings: Array<Record<string, unknown>> = [];
  if (kvId) bindings.push({ type: "kv_namespace", name: "NIKA_KV", namespace_id: kvId });
  const d1 = await resolvePanelD1(tok, accountId);
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

export async function deleteWorker(
  token: string,
  accountId: string,
  name: string
): Promise<{ ok: boolean; err?: string }> {
  const r = await cfReq(token, `/accounts/${accountId}/workers/scripts/${name}?force=true`, { method: "DELETE" });
  return { ok: !!r?.success, err: r?.errors?.[0]?.message };
}

export async function deleteKvNamespace(
  token: string,
  accountId: string,
  ns: string
): Promise<{ ok: boolean; err?: string }> {
  const r = await cfReq(token, `/accounts/${accountId}/storage/kv/namespaces/${ns}`, { method: "DELETE" });
  return { ok: !!r?.success, err: r?.errors?.[0]?.message };
}

// workers.dev hostname is disabled by default for API-uploaded workers —
// it must be enabled or the URL returns "error code: 1042".
export async function enableWorkersDev(
  token: string,
  accountId: string,
  name: string
): Promise<{ ok: boolean; err?: string }> {
  const r = await cfReq(token, `/accounts/${accountId}/workers/scripts/${name}/subdomain`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enabled: true }),
  });
  return { ok: !!r?.success, err: r?.errors?.[0]?.message };
}
