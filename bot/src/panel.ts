// Nika Net Launcher — panel HTTP client (login via admin password + JSON API).

export interface PanelUser {
  id: string;
  name: string;
  uuid: string;
  password: string;
  quota: number;
  used: number;
  days: number;
  active: boolean;
  createdAt: number;
}

export async function panelLogin(
  base: string,
  password: string
): Promise<{ ok: boolean; err: string; cookie: string; setup?: boolean }> {
  try {
    const r = await fetch(`${base}/api/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const j: any = await r.json().catch(() => ({}));
    if (r.status !== 200 || !j.ok) {
      return { ok: false, err: j.error || `HTTP ${r.status}`, cookie: "" };
    }
    const setCookie = r.headers.get("set-cookie") || "";
    const cookie = setCookie.split(",").map((c) => c.trim().split(";")[0]).join("; ");
    return { ok: true, err: "", cookie, setup: !!j.setup };
  } catch (e: any) {
    return { ok: false, err: `network: ${e?.message || e}`, cookie: "" };
  }
}

export async function panelApi(
  base: string,
  cookie: string,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; json: any }> {
  try {
    const r = await fetch(`${base}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const json = await r.json().catch(() => ({}));
    return { status: r.status, json };
  } catch (e: any) {
    return { status: 0, json: { error: `network: ${e?.message || e}` } };
  }
}

export async function panelHealth(base: string): Promise<{ ok: boolean; ms: number }> {
  const t0 = Date.now();
  try {
    const r = await fetch(`${base}/health`);
    const ms = Date.now() - t0;
    const j: any = await r.json().catch(() => ({}));
    return { ok: r.status === 200 && !!j.ok, ms };
  } catch {
    return { ok: false, ms: -1 };
  }
}
