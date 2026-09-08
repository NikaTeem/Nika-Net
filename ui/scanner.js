/* ================================================================
   Nika Net — IP Scanner (clean Cloudflare IP discovery)
   Browser-side timing probe: a live Cloudflare edge completes its
   TLS handshake fast (20–150 ms) while a dead/blocked IP times out.
   The scanner probes candidate IPs in parallel, ranks them by
   latency, and can push the best ones into the panel's clean-IP
   list so every generated config uses them.
   ================================================================ */

/* i18n for the scanner */
I18N.fa["scanner.title"] = "اسکنر IP تمیز";
I18N.fa["scanner.sub"] = "تست و گلچین بهترین IP های کلودفلر از شبکهٔ تو";
I18N.fa["scan.source"] = "منبع IP ها";
I18N.fa["scan.bundled"] = "لیست داخلی";
I18N.fa["scan.custom"] = "لیست شخصی";
I18N.fa["scan.customD"] = "هر خط یک IP یا رنج CIDR";
I18N.fa["scan.target"] = "تعداد هدف";
I18N.fa["scan.ports"] = "پورت ها";
I18N.fa["scan.conc"] = "همزمانی";
I18N.fa["scan.timeout"] = "تایم‌اوت (ms)";
I18N.fa["scan.start"] = "▶ شروع اسکن";
I18N.fa["scan.stop"] = "■ توقف";
I18N.fa["scan.phase1"] = "در حال پروب IP ها…";
I18N.fa["scan.done"] = "اسکن تمام شد";
I18N.fa["scan.tested"] = "تست شده";
I18N.fa["scan.alive"] = "سالم";
I18N.fa["scan.dead"] = "مرده";
I18N.fa["scan.best"] = "بهترین";
I18N.fa["scan.results"] = "نتایج زنده";
I18N.fa["scan.resultsD"] = "مرتب بر اساس تأخیر — برای کپی روی هر IP بزن";
I18N.fa["scan.lat"] = "تأخیر";
I18N.fa["scan.port"] = "پورت";
I18N.fa["scan.status"] = "وضعیت";
I18N.fa["scan.apply"] = "⚡ اعمال به پنل";
I18N.fa["scan.applyD"] = "بهترین IP ها جایگزین لیست IP تمیز پنل می‌شوند";
I18N.fa["scan.copy"] = "📋 کپی";
I18N.fa["scan.export"] = "⬇ خروجی";
I18N.fa["scan.empty"] = "هنوز اسکنی شروع نشده — دکمهٔ شروع را بزن";
I18N.fa["scan.none"] = "هیچ IP سالمی پیدا نشد — تایم‌اوت را بیشتر یا پورت را عوض کن";
I18N.fa["scan.applied"] = "بهترین IP ها به پنل اعمال شد ✓";
I18N.fa["scan.copied"] = "IP ها کپی شد ✓";
I18N.fa["scan.hist"] = "توزیع تأخیر (ms)";
I18N.fa["scan.running"] = "اسکن در حال انجام است…";
I18N.fa["scan.ms"] = "ms";
I18N.fa["scan.live"] = "سالم";
I18N.fa["scan.deadL"] = "مرده";
I18N.fa["scan.top5"] = "۵ برتر";

I18N.en["scanner.title"] = "Clean IP Scanner";
I18N.en["scanner.sub"] = "Probe & pick the best Cloudflare IPs from your network";
I18N.en["scan.source"] = "IP source";
I18N.en["scan.bundled"] = "Built-in list";
I18N.en["scan.custom"] = "Custom list";
I18N.en["scan.customD"] = "One IP or CIDR per line";
I18N.en["scan.target"] = "Target count";
I18N.en["scan.ports"] = "Ports";
I18N.en["scan.conc"] = "Concurrency";
I18N.en["scan.timeout"] = "Timeout (ms)";
I18N.en["scan.start"] = "▶ Start scan";
I18N.en["scan.stop"] = "■ Stop";
I18N.en["scan.phase1"] = "Probing IPs…";
I18N.en["scan.done"] = "Scan complete";
I18N.en["scan.tested"] = "Tested";
I18N.en["scan.alive"] = "Alive";
I18N.en["scan.dead"] = "Dead";
I18N.en["scan.best"] = "Best";
I18N.en["scan.results"] = "Live results";
I18N.en["scan.resultsD"] = "Sorted by latency — click an IP to copy";
I18N.en["scan.lat"] = "Latency";
I18N.en["scan.port"] = "Port";
I18N.en["scan.status"] = "Status";
I18N.en["scan.apply"] = "⚡ Apply to panel";
I18N.en["scan.applyD"] = "Top IPs replace the panel's clean-IP list";
I18N.en["scan.copy"] = "📋 Copy";
I18N.en["scan.export"] = "⬇ Export";
I18N.en["scan.empty"] = "No scan yet — press start";
I18N.en["scan.none"] = "No alive IP found — raise the timeout or change the port";
I18N.en["scan.applied"] = "Top IPs applied to the panel ✓";
I18N.en["scan.copied"] = "IPs copied ✓";
I18N.en["scan.hist"] = "Latency distribution (ms)";
I18N.en["scan.running"] = "Scan running…";
I18N.en["scan.ms"] = "ms";
I18N.en["scan.live"] = "alive";
I18N.en["scan.deadL"] = "dead";
I18N.en["scan.top5"] = "Top 5";
I18N.en["page.scanner"] = "IP Scanner";
I18N.en["page.scannerD"] = "Discover the fastest clean Cloudflare IPs";
I18N.fa["page.scanner"] = "اسکنر IP";
I18N.fa["page.scannerD"] = "پیدا کردن سریع‌ترین IP های تمیز کلودفلر";

const SCANNER = (() => {
  /* bundled seed list (curated clean Cloudflare IPv4) */
  const SEED = __SCAN_IPS__;

  const PORTS_ALL = [443, 2053, 2083, 2087, 2096, 8443];
  const S = {
    running: false,
    controller: null,
    concurrency: 24,
    timeout: 3500,
    tries: 2,
    ports: [443],
    target: 200,
    source: "bundled",
    results: [],      // {ip, port, min, avg, ok, dead}
    byIp: new Map(),
    tested: 0,
    alive: 0,
    dead: 0,
  };
  let raf = null;
  let sweep = 0;
  let lastBlip = 0;

  /* ---------------- probing ---------------- */
  function probe(ip, port, timeout) {
    return new Promise((resolve) => {
      const ctl = new AbortController();
      const t0 = setTimeout(() => ctl.abort(), timeout);
      const start = performance.now();
      fetch(`https://${ip}:${port}/`, { mode: "no-cors", cache: "no-store", signal: ctl.signal, redirect: "manual" })
        .then(() => { clearTimeout(t0); resolve({ ok: true, ms: Math.max(1, performance.now() - start) }); })
        .catch(() => {
          clearTimeout(t0);
          const ms = performance.now() - start;
          const aborted = ctl.signal.aborted;
          // non-aborted fast rejection = TLS handshake completed (live CF edge);
          // aborted = timeout (dead). Sub-12ms rejections are treated as RST noise.
          resolve({ ok: !aborted && ms >= 12, ms });
        });
    });
  }

  function parseList(text) {
    const ips = new Set();
    for (let line of (text || "").split("\n")) {
      line = line.trim();
      if (!line || line.startsWith("#")) continue;
      // CIDR → expand? just take the base IP for a /32-ish probe
      if (line.includes("/")) line = line.split("/")[0];
      const m = line.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/);
      if (m && /^\d{1,3}(\.\d{1,3}){3}$/.test(m[1])) ips.add(m[1]);
    }
    return [...ips];
  }

  function buildQueue() {
    let list;
    if (S.source === "custom") {
      list = parseList($("#scanCustom").value);
    } else {
      list = SEED.slice(0, Math.min(S.target, SEED.length));
    }
    const queue = [];
    for (const ip of list) for (const port of S.ports) queue.push({ ip, port });
    return queue;
  }

  async function runScan() {
    const queue = buildQueue();
    if (!queue.length) { toast(t("scan.none")); return; }
    S.running = true;
    S.controller = new AbortController();
    S.results = [];
    S.byIp = new Map();
    S.tested = S.alive = S.dead = 0;
    lastBlip = 0;
    $("#scanStart").classList.add("hidden");
    $("#scanStop").classList.remove("hidden");
    $("#scanStatus").textContent = t("scan.running");
    $("#scanStatus").classList.add("live");
    renderCounters();
    renderResults(true);
    drawRadar();

    let cursor = 0;
    const workers = [];
    const n = Math.min(S.concurrency, queue.length);
    const signal = S.controller.signal;

    for (let w = 0; w < n; w++) {
      workers.push((async () => {
        while (cursor < queue.length && !signal.aborted) {
          const idx = cursor++;
          const { ip, port } = queue[idx];
          let okTries = 0, sum = 0, min = Infinity;
          for (let tr = 0; tr < S.tries; tr++) {
            if (signal.aborted) break;
            const r = await probe(ip, port, S.timeout);
            if (r.ok) { okTries++; sum += r.ms; if (r.ms < min) min = r.ms; }
          }
          if (signal.aborted) break;
          S.tested++;
          const alive = okTries > 0;
          if (alive) S.alive++; else S.dead++;
          S.results.push({ ip, port, min: alive ? Math.round(min) : null, avg: alive ? Math.round(sum / okTries) : null, alive });
          if (alive) { lastBlip = performance.now(); }
          renderCounters();
          if (S.results.length % 8 === 0 || !S.running) renderResults(false);
        }
      })());
    }
    await Promise.all(workers);
    S.running = false;
    $("#scanStart").classList.remove("hidden");
    $("#scanStop").classList.add("hidden");
    $("#scanStatus").textContent = t("scan.done");
    $("#scanStatus").classList.remove("live");
    renderResults(false);
    renderCounters();
    renderTop();
  }

  function stopScan() {
    if (S.controller) S.controller.abort();
    S.running = false;
    $("#scanStart").classList.remove("hidden");
    $("#scanStop").classList.add("hidden");
    $("#scanStatus").textContent = t("scan.done");
    $("#scanStatus").classList.remove("live");
  }

  function aliveResults() {
    return S.results.filter((r) => r.alive).sort((a, b) => a.min - b.min);
  }

  /* ---------------- UI rendering ---------------- */
  function renderCounters() {
    $("#scTested").textContent = num(S.tested);
    $("#scAlive").textContent = num(S.alive);
    $("#scDead").textContent = num(S.dead);
    const total = buildQueueLen();
    const pct = total ? Math.min(100, Math.round((S.tested / total) * 100)) : 0;
    $("#scanBar").style.width = pct + "%";
    $("#scanBar").textContent = pct + "%";
  }

  function buildQueueLen() {
    if (S.source === "custom") return parseList($("#scanCustom").value).length * S.ports.length;
    return Math.min(S.target, SEED.length) * S.ports.length;
  }

  function renderResults(forceEmpty) {
    const el = $("#scanList");
    const list = aliveResults();
    if (forceEmpty || (!list.length && !S.running)) {
      el.innerHTML = `<div class="empty">${S.running ? t("scan.phase1") : t("scan.empty")}</div>`;
      return;
    }
    if (!list.length) { el.innerHTML = `<div class="empty">${t("scan.phase1")}</div>`; return; }
    const max = Math.max(...list.map((r) => r.min));
    el.innerHTML = list.slice(0, 60).map((r) => {
      const w = Math.max(4, Math.round((r.min / max) * 100));
      const cls = r.min < 120 ? "ok" : r.min < 300 ? "warn" : "bad";
      return `<div class="scan-row" onclick="SCANNER.copyIp('${r.ip}')" title="${t("scan.copy")}">
        <code class="scan-ip">${r.ip}</code>
        <span class="scan-port">:${r.port}</span>
        <div class="scan-latbar"><div class="scan-latfill" style="width:${w}%"></div></div>
        <code class="scan-ms ${cls}">${r.min}ms</code>
      </div>`;
    }).join("");
  }

  function renderTop() {
    const el = $("#scanTop");
    const list = aliveResults().slice(0, 5);
    if (!list.length) { el.innerHTML = ""; return; }
    el.innerHTML = list.map((r, i) =>
      `<div class="top-chip" onclick="SCANNER.copyIp('${r.ip}')"><span class="top-rank">${i + 1}</span><code>${r.ip}</code><b>${r.min}ms</b></div>`
    ).join("");
  }

  /* ---------------- radar canvas ---------------- */
  function drawRadar() {
    const cv = $("#radarCanvas");
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth || 320, h = cv.clientHeight || 300;
    if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 18;
    const dark = document.documentElement.dataset.theme === "dark";

    function frame() {
      ctx.clearRect(0, 0, w, h);
      const line = dark ? "rgba(127,178,135,0.28)" : "rgba(90,110,90,0.25)";
      const fill = dark ? "rgba(127,178,135,0.05)" : "rgba(90,110,90,0.05)";
      // rings
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (R * i) / 4, 0, Math.PI * 2);
        ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.stroke();
      }
      // crosshair
      ctx.beginPath();
      ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
      ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
      ctx.strokeStyle = line; ctx.stroke();

      // blips (alive IPs, angle by hash, radius by latency)
      for (const r of aliveResults().slice(0, 120)) {
        let hsh = 0; for (const c of r.ip) hsh = (hsh * 31 + c.charCodeAt(0)) >>> 0;
        const ang = (hsh % 360) * (Math.PI / 180);
        const rr = Math.min(1, r.min / 800) * R * 0.92;
        const bx = cx + Math.cos(ang) * rr, by = cy + Math.sin(ang) * rr;
        const fresh = performance.now() - lastBlip < 1500;
        ctx.beginPath();
        ctx.arc(bx, by, fresh ? 3.4 : 2.1, 0, Math.PI * 2);
        ctx.fillStyle = r.min < 120 ? (dark ? "#7fb287" : "#4a7a52") : r.min < 300 ? "#c9b273" : "#c98a92";
        ctx.globalAlpha = fresh ? 1 : 0.75;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // sweep
      const a = sweep + (S.running ? performance.now() * 0.0009 : 0);
      sweep = a;
      const g = ctx.createConicGradient ? ctx.createConicGradient(a, cx, cy) : null;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, a, a + 0.9);
      ctx.closePath();
      if (g) {
        g.addColorStop(0, "rgba(127,178,135,0)");
        g.addColorStop(1, dark ? "rgba(127,178,135,0.5)" : "rgba(74,122,82,0.5)");
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = dark ? "rgba(127,178,135,0.18)" : "rgba(74,122,82,0.18)";
      }
      ctx.fill();
      // sweep line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      ctx.strokeStyle = dark ? "#7fb287" : "#4a7a52";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // center
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = dark ? "#7fb287" : "#4a7a52"; ctx.fill();

      raf = requestAnimationFrame(frame);
    }
    if (raf) cancelAnimationFrame(raf);
    frame();
  }

  /* ---------------- actions ---------------- */
  function copyIp(ip) {
    try { navigator.clipboard.writeText(ip).then(() => toast(ip)); } catch (e) {}
  }
  function copyAll() {
    const txt = aliveResults().map((r) => r.ip).join("\n");
    try { navigator.clipboard.writeText(txt).then(() => toast(t("scan.copied"))); } catch (e) {}
  }
  function exportTxt() {
    const txt = "# Nika Net — clean IPs\n" + aliveResults().map((r) => r.ip + ":" + r.port).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([txt], { type: "text/plain" }));
    a.download = "nika-clean-ips.txt";
    a.click();
  }
  async function applyToPanel() {
    const top = aliveResults().slice(0, 20).map((r) => r.ip);
    if (!top.length) { toast(t("scan.none")); return; }
    if (MODE !== "live") { toast(t("toast.preview")); return; }
    const res = await api("/api/settings", { method: "POST", body: { cleanIps: top } });
    if (res.ok) { toast(t("scan.applied")); if (state.settings) state.settings.cleanIps = top; }
    else toast(t("common.error"));
  }

  function onOpen() {
    if (!raf) drawRadar();
  }

  /* ---------------- wiring ---------------- */
  function initUI() {
    $("#scanStart").onclick = () => { readConfig(); runScan(); };
    $("#scanStop").onclick = stopScan;
    $("#scanSourceB").onclick = () => setSource("bundled");
    $("#scanSourceC").onclick = () => setSource("custom");
    $("#scanApply").onclick = applyToPanel;
    $("#scanCopy").onclick = copyAll;
    $("#scanExport").onclick = exportTxt;
    $("#scanTarget").onchange = () => { S.target = +$("#scanTarget").value; };
    $("#scanConc").onchange = () => { S.concurrency = +$("#scanConc").value; };
    $("#scanTimeout").onchange = () => { S.timeout = +$("#scanTimeout").value; };
    $$("#scanPorts .pchip").forEach((el) => (el.onclick = () => {
      el.classList.toggle("on");
      S.ports = $$("#scanPorts .pchip.on").map((x) => +x.dataset.port);
    }));
  }

  function readConfig() {
    S.target = +($("#scanTarget").value || 200);
    S.concurrency = +($("#scanConc").value || 24);
    S.timeout = +($("#scanTimeout").value || 3500);
    S.ports = $$("#scanPorts .pchip.on").map((x) => +x.dataset.port);
    if (!S.ports.length) { S.ports = [443]; $$("#scanPorts .pchip[data-port='443']").classList.add("on"); }
  }

  function setSource(src) {
    S.source = src;
    $("#scanSourceB").classList.toggle("on", src === "bundled");
    $("#scanSourceC").classList.toggle("on", src === "custom");
    $("#scanCustomWrap").classList.toggle("hidden", src !== "custom");
    $("#scanTargetWrap").classList.toggle("hidden", src !== "bundled");
  }

  return { onOpen, copyIp, initUI, _seed: SEED.length };
})();

/* expose for inline onclick */
window.SCANNER = SCANNER;
SCANNER.initUI();
