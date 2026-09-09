// Nika Net — Cloudflare IP detection.
//
// A VLESS/Trojan config connects to an "address" IP and presents SNI/Host =
// the worker's front domain. Cloudflare only routes that connection to our
// worker if the address is a Cloudflare edge IP (anycast) — a datacenter IP
// (DigitalOcean/Hetzner/AWS/…) answers for itself and the handshake fails.
// So the connect address MUST be a Cloudflare edge IP (or the host itself).
// This module is the single server-side source of truth for that check.

// Official Cloudflare IPv4 ranges (cloudflare.com/ips-v4, current).
const CIDRS = [
  "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22",
  "141.101.64.0/18", "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20",
  "197.234.240.0/22", "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
  "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
];

function ipToInt(ip: string): number {
  const o = ip.split(".").map(Number);
  return (((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0);
}

const RANGES = CIDRS.map((c) => {
  const [ip, bits] = c.split("/");
  const n = parseInt(bits, 10);
  const net = ipToInt(ip);
  const mask = n === 0 ? 0 : (0xffffffff << (32 - n)) >>> 0;
  return { base: net & mask, mask };
});

export function isCloudflareIp(ip: string): boolean {
  const t = (ip || "").trim();
  const o = t.split(".");
  if (o.length !== 4) return false;
  const b = o.map(Number);
  if (b.some((x) => isNaN(x) || x < 0 || x > 255)) return false;
  const v = ipToInt(t);
  for (const r of RANGES) {
    if (((v & r.mask) >>> 0) === r.base) return true;
  }
  return false;
}
