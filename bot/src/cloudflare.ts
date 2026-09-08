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
