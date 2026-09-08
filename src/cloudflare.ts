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
