var R={title:"Nika Net",host:"nika.example.workers.dev",sni:"www.speedtest.net",wsPath:"/nika-ws",cleanIps:["1.0.0.1","104.16.132.229","188.114.96.9"],protocols:{vless:!0,trojan:!0,warp:!0},adminPassHash:null,secretPath:"nika-admin",sessionSecret:""};var j=new Map,Z=new Map;async function Nt(n,t){try{let e=await n.NIKA_DB.prepare("SELECT value FROM kv WHERE key = ?1").bind(t).first();return e?e.value:null}catch{return null}}async function Tt(n,t,e){try{await n.NIKA_DB.prepare("INSERT INTO kv (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(t,e).run()}catch{}}async function I(n,t){if(j.has(t))return j.get(t);let e=null;return n.NIKA_DB?e=await Nt(n,t):n.NIKA_KV?e=await n.NIKA_KV.get(t):e=Z.get(t)??null,e!==null&&j.set(t,e),e}async function E(n,t,e){j.set(t,e),n.NIKA_DB?await Tt(n,t,e):n.NIKA_KV?await n.NIKA_KV.put(t,e):Z.set(t,e)}async function tt(n){let t=await I(n,"settings"),e={...R};if(t)try{Object.assign(e,JSON.parse(t))}catch{}return e.sessionSecret||(e.sessionSecret=crypto.randomUUID(),await E(n,"settings",JSON.stringify(e))),e}async function W(n,t){await E(n,"settings",JSON.stringify(t))}async function x(n){let t=await I(n,"users");if(!t)return[];try{return JSON.parse(t)}catch{return[]}}async function U(n,t){await E(n,"users",JSON.stringify(t))}async function P(n,t){let e=await I(n,t),s=parseInt(e||"0",10);return isNaN(s)?0:s}async function V(n,t,e){let r=await P(n,t)+e;return await E(n,t,String(r)),r}async function q(n,t){let e=await I(n,t);if(!e)return null;try{return JSON.parse(e)}catch{return null}}async function et(n,t,e){await E(n,t,JSON.stringify(e))}var M=new TextEncoder;async function J(n){let t=await crypto.subtle.digest("SHA-256",M.encode(n));return[...new Uint8Array(t)].map(e=>e.toString(16).padStart(2,"0")).join("")}function rt(){return[...crypto.getRandomValues(new Uint8Array(24))].map(t=>t.toString(16).padStart(2,"0")).join("")}async function B(n,t){let e=await crypto.subtle.importKey("raw",M.encode(n),{name:"HMAC",hash:"SHA-256"},!1,["sign"]),s=await crypto.subtle.sign("HMAC",e,M.encode(t));return t+"."+[...new Uint8Array(s)].map(r=>r.toString(16).padStart(2,"0")).join("")}async function $t(n,t){let e=t.lastIndexOf(".");if(e<0)return!1;let s=t.slice(0,e),i=(await B(n,s)).split(".")[1],o=t.slice(e+1);if(i.length!==o.length)return!1;let a=0;for(let c=0;c<i.length;c++)a|=i.charCodeAt(c)^o.charCodeAt(c);return a===0}async function st(n,t){let e=(n.headers.get("Cookie")||"").split(";").map(r=>r.trim()).find(r=>r.startsWith("nika_session="));if(!e)return!1;let s=decodeURIComponent(e.split("=").slice(1).join("="));return $t(t.sessionSecret,s)}var F="nika_session";function D(n){let t=(n.cleanIps||[]).filter(Boolean);return t.length?t[Math.floor(Math.random()*t.length)]:n.host}function jt(n,t){let e=D(t),s=new URLSearchParams({encryption:"none",security:"tls",sni:t.sni,fp:"chrome",type:"ws",host:t.sni,path:t.wsPath+"?ed=2048"});return`vless://${n.uuid}@${e}:443?${s.toString()}#NikaNet-${encodeURIComponent(n.name)}`}function It(n,t){let e=D(t),s=new URLSearchParams({security:"tls",sni:t.sni,fp:"chrome",type:"ws",host:t.sni,path:t.wsPath+"?ed=2048"});return`trojan://${n.password}@${e}:443?${s.toString()}#NikaNet-${encodeURIComponent(n.name)}`}function C(n,t){let e=[];return t.protocols.vless&&e.push(jt(n,t)),t.protocols.trojan&&e.push(It(n,t)),btoa(e.join(`
`)).replace(/=+$/,"")}function G(n,t){let e=D(t),s=[],r=`# Nika Net \u2014 ${n.name}
mixed-port: 7890
allow-lan: false
mode: rule
log-level: info
dns:
  enable: true
  enhanced-mode: fake-ip
  nameserver: [1.1.1.1, 8.8.8.8]
proxies:
`;return t.protocols.vless&&(s.push("NikaNet-VLESS"),r+=`  - name: "NikaNet-VLESS"
    type: vless
    server: ${e}
    port: 443
    uuid: ${n.uuid}
    network: ws
    tls: true
    udp: true
    servername: ${t.sni}
    client-fingerprint: chrome
    ws-opts:
      path: "${t.wsPath}?ed=2048"
      headers: { Host: "${t.sni}" }
`),t.protocols.trojan&&(s.push("NikaNet-Trojan"),r+=`  - name: "NikaNet-Trojan"
    type: trojan
    server: ${e}
    port: 443
    password: ${n.password}
    network: ws
    tls: true
    udp: true
    sni: ${t.sni}
    client-fingerprint: chrome
    ws-opts:
      path: "${t.wsPath}?ed=2048"
      headers: { Host: "${t.sni}" }
`),r+=`proxy-groups:
  - name: "NikaNet"
    type: select
    proxies: [${s.map(i=>`"${i}"`).join(", ")}]
`,r+=`rules:
  - GEOIP,IR,DIRECT
  - MATCH,NikaNet
`,r}function Y(n,t){let e=D(t),s=[],r=[];t.protocols.vless&&(r.push("NikaNet-VLESS"),s.push({tag:"NikaNet-VLESS",type:"vless",server:e,server_port:443,uuid:n.uuid,network:"ws",tls:{enabled:!0,server_name:t.sni,utls:{enabled:!0,fingerprint:"chrome"}},transport:{type:"ws",path:t.wsPath+"?ed=2048",headers:{Host:t.sni}}})),t.protocols.trojan&&(r.push("NikaNet-Trojan"),s.push({tag:"NikaNet-Trojan",type:"trojan",server:e,server_port:443,password:n.password,network:"ws",tls:{enabled:!0,server_name:t.sni,utls:{enabled:!0,fingerprint:"chrome"}},transport:{type:"ws",path:t.wsPath+"?ed=2048",headers:{Host:t.sni}}}));let i={log:{level:"info"},dns:{servers:[{tag:"cf",address:"https://1.1.1.1/dns-query",detour:"select"}]},outbounds:s.concat([{tag:"select",type:"selector",outbounds:r},{tag:"direct",type:"direct"}]),route:{rules:[{geoip:"ir",outbound:"direct"}],final:"select"}};return JSON.stringify(i,null,2)}function at(n){return`[Interface]
PrivateKey = ${n.password.slice(0,43)}
Address = 172.16.0.2/32, 2606:4700:110:8f3e:1c5e:9a2b:7d4f::/128
DNS = 1.1.1.1
MTU = 1280

[Peer]
PublicKey = bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=
AllowedIPs = 0.0.0.0/0, ::/0
Endpoint = engage.cloudflareclient.com:2408
`}var S=new Map,ot=new Map,it=0,N=()=>{let n=new Date,t=String(n.getMonth()+1).padStart(2,"0"),e=String(n.getDate()).padStart(2,"0");return`${n.getFullYear()}-${t}-${e}`};function ct(){S.set("req:total",(S.get("req:total")||0)+1),S.set("req:"+N(),(S.get("req:"+N())||0)+1)}async function ut(n){let t=Date.now();if(!(t-it<15e3)){it=t;for(let[e,s]of S)s&&await V(n,e,s);S.clear()}}async function lt(n){return await P(n,"req:"+N())+(S.get("req:"+N())||0)}async function dt(n){return await P(n,"req:total")+(S.get("req:total")||0)}async function T(n,t,e,s){if(!e&&!s)return;let r=await x(n),i=r.find(a=>a.id===t);i&&(i.used=(i.used||0)+(e+s)/1e9,await U(n,r)),await V(n,"traffic:"+N(),e+s);let o=ot.get(t)||0;Date.now()-o>6e4&&(ot.set(t,Date.now()),await v(n,{icon:"\u{1F4E1}",text:`\u0627\u062A\u0635\u0627\u0644 \u062C\u062F\u06CC\u062F${i?` \u2014 ${i.name}`:""}`,time:Date.now()}))}async function pt(n){let t=[];for(let e=6;e>=0;e--){let s=new Date;s.setDate(s.getDate()-e);let r=String(s.getMonth()+1).padStart(2,"0"),i=String(s.getDate()).padStart(2,"0"),o=`${s.getFullYear()}-${r}-${i}`,a=await P(n,"traffic:"+o);t.push({date:o.slice(5),gb:Math.round(a/1e9*100)/100})}return t}async function v(n,t){let e=await q(n,"activity")||[];e.unshift(t),e.length>40&&(e.length=40),await et(n,"activity",e)}async function ft(n){return await q(n,"activity")||[]}import{connect as Ct}from"cloudflare:sockets";function L(n,t,e){let s=null;try{t&&(s=Uint8Array.from(atob(t),a=>a.charCodeAt(0)))}catch{s=null}let r=null,i=new Promise(a=>r=a);return n.addEventListener("message",()=>{r&&(r(),r=null)}),n.addEventListener("error",()=>{r&&(r(),r=null)}),{stream:new ReadableStream({start(a){let c=l=>{let u=l.data;u instanceof ArrayBuffer?a.enqueue(new Uint8Array(u)):Array.isArray(u)?a.enqueue(new Uint8Array(u)):typeof u=="string"&&a.enqueue(new TextEncoder().encode(u))};n.addEventListener("message",c),n.addEventListener("close",()=>{try{a.close()}catch{}}),n.addEventListener("error",()=>{try{a.error(new Error("ws error"))}catch{}})},async pull(){await i},cancel(){try{n.close()}catch{}}}),removeEarlyData:()=>{let a=s;return s=null,a}}}function O(n){let t=new WebSocketPair,[e,s]=Object.values(t);return s.accept(),s}function p(n,t=200){return new Response(JSON.stringify(n),{status:t,headers:{"content-type":"application/json; charset=utf-8","access-control-allow-origin":"*"}})}async function mt(n,t,e,s){let r=O(n);r.binaryType="arraybuffer";let i=n.headers.get("sec-websocket-protocol")||"",{stream:o,removeEarlyData:a}=L(r,i,()=>{}),c=d=>{try{r.send(d)}catch{}},l=0,u=0;return o.pipeTo(new WritableStream({async write(d){let f=null;try{let h=a(),k=h&&h.length?Lt(h,d):d,y=Ot(k,t);if(!y){r.close();return}if(f=Ct({hostname:y.address,port:y.port}),c(new Uint8Array([0,0])),y.payload.length){let m=f.writable.getWriter();await m.write(y.payload),m.releaseLock(),l+=y.payload.length}o.pipeTo(new WritableStream({async write(m){l+=m.byteLength;let w=f.writable.getWriter();try{await w.write(m)}finally{w.releaseLock()}}})).catch(()=>{try{f.close()}catch{}}),f.readable.pipeTo(new WritableStream({write(m){u+=m.byteLength,c(m)}})).catch(()=>{try{r.close()}catch{}}).finally(()=>{gt(s,t.id,l,u)})}catch{try{f?.close()}catch{}try{r.close()}catch{}gt(s,t.id,l,u)}}})).catch(()=>{try{r.close()}catch{}}),new Response(null,{status:101,webSocket:r})}function gt(n,t,e,s){T(n,t,e,s).catch(()=>{})}function Lt(n,t){let e=new Uint8Array(n.length+t.length);return e.set(n),e.set(t,n.length),e}function Ot(n,t){try{let e=0;if(n[e]!==0)return null;e+=1;let s=Ht(n.slice(e,e+16));if(e+=16,s.toLowerCase()!==t.uuid.toLowerCase())return null;let r=n[e];e+=1,e+=r;let i=n[e];if(e+=1,i!==1)return null;let o=n[e]<<8|n[e+1];e+=2;let a=n[e];e+=1;let c="";if(a===1)c=`${n[e]}.${n[e+1]}.${n[e+2]}.${n[e+3]}`,e+=4;else if(a===2){let l=n[e];e+=1,c=new TextDecoder().decode(n.slice(e,e+l)),e+=l}else if(a===3)c=_t(n.slice(e,e+16)),e+=16;else return null;return{address:c,port:o,payload:n.slice(e)}}catch{return null}}function Ht(n){let t=[...n].map(e=>e.toString(16).padStart(2,"0")).join("");return`${t.slice(0,8)}-${t.slice(8,12)}-${t.slice(12,16)}-${t.slice(16,20)}-${t.slice(20)}`}function _t(n){let t=[];for(let e=0;e<16;e+=2)t.push((n[e]<<8|n[e+1]).toString(16));return t.join(":")}import{connect as Kt}from"cloudflare:sockets";async function yt(n,t,e,s){let r=O(n);r.binaryType="arraybuffer";let i=n.headers.get("sec-websocket-protocol")||"",{stream:o,removeEarlyData:a}=L(r,i,()=>{}),c=d=>{try{r.send(d)}catch{}},l=0,u=0;return o.pipeTo(new WritableStream({async write(d){let f=null;try{let h=a(),k=h&&h.length?Wt(h,d):d,y=Bt(t.password),m=Vt(k,y);if(!m){r.close();return}if(f=Kt({hostname:m.address,port:m.port}),m.payload.length){let w=f.writable.getWriter();await w.write(m.payload),w.releaseLock(),l+=m.payload.length}o.pipeTo(new WritableStream({async write(w){l+=w.byteLength;let A=f.writable.getWriter();try{await A.write(w)}finally{A.releaseLock()}}})).catch(()=>{try{f.close()}catch{}}),f.readable.pipeTo(new WritableStream({write(w){u+=w.byteLength,c(w)}})).catch(()=>{try{r.close()}catch{}}).finally(()=>{T(s,t.id,l,u).catch(()=>{})})}catch{try{f?.close()}catch{}try{r.close()}catch{}T(s,t.id,l,u).catch(()=>{})}}})).catch(()=>{try{r.close()}catch{}}),new Response(null,{status:101,webSocket:r})}function Wt(n,t){let e=new Uint8Array(n.length+t.length);return e.set(n),e.set(t,n.length),e}function Vt(n,t){try{let e=0,s=new TextDecoder().decode(n.slice(e,e+56));if(e+=56,s!==t||n[e]!==13||n[e+1]!==10)return null;e+=2;let r=n[e];if(e+=1,r!==1)return null;let i=n[e];e+=1;let o="";if(i===1)o=`${n[e]}.${n[e+1]}.${n[e+2]}.${n[e+3]}`,e+=4;else if(i===3){let c=n[e];e+=1,o=new TextDecoder().decode(n.slice(e,e+c)),e+=c}else if(i===4)o=qt(n.slice(e,e+16)),e+=16;else return null;let a=n[e]<<8|n[e+1];return e+=2,n[e]!==13||n[e+1]!==10?null:(e+=2,{address:o,port:a,payload:n.slice(e)})}catch{return null}}function qt(n){let t=[];for(let e=0;e<16;e+=2)t.push((n[e]<<8|n[e+1]).toString(16));return t.join(":")}var Mt=new Uint32Array([1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298]);function b(n,t){return n>>>t|n<<32-t}function Jt(n){let t=new Uint32Array([3238371032,914150663,812702999,4144912697,4290775857,1750603025,1694076839,3204075428]),e=n.length,s=Math.floor(e/536870912),r=e<<3>>>0,i=new Uint8Array((e+8>>6)+1<<6);i.set(n),i[e]=128;let o=new DataView(i.buffer);o.setUint32(i.length-8,s),o.setUint32(i.length-4,r);let a=new Uint32Array(64);for(let u=0;u<i.length;u+=64){for(let g=0;g<16;g++)a[g]=o.getUint32(u+g*4);for(let g=16;g<64;g++){let _=b(a[g-15],7)^b(a[g-15],18)^a[g-15]>>>3,K=b(a[g-2],17)^b(a[g-2],19)^a[g-2]>>>10;a[g]=a[g-16]+_+a[g-7]+K>>>0}let[d,f,h,k,y,m,w,A]=t;for(let g=0;g<64;g++){let _=b(y,6)^b(y,11)^b(y,25),K=y&m^~y&w,Q=A+_+K+Mt[g]+a[g]>>>0,Ut=b(d,2)^b(d,13)^b(d,22),Et=d&f^d&h^f&h,Pt=Ut+Et>>>0;A=w,w=m,m=y,y=k+Q>>>0,k=h,h=f,f=d,d=Q+Pt>>>0}t[0]=t[0]+d>>>0,t[1]=t[1]+f>>>0,t[2]=t[2]+h>>>0,t[3]=t[3]+k>>>0,t[4]=t[4]+y>>>0,t[5]=t[5]+m>>>0,t[6]=t[6]+w>>>0,t[7]=t[7]+A>>>0}let c=new Uint8Array(28),l=new DataView(c.buffer);for(let u=0;u<7;u++)l.setUint32(u*4,t[u]);return c}function Bt(n){return[...Jt(new TextEncoder().encode(n))].map(t=>t.toString(16).padStart(2,"0")).join("")}var wt="https://api.cloudflare.com/client/v4";async function $(n,t,e){return(await fetch(wt+t,{...e,headers:{authorization:`Bearer ${n}`,...e?.headers||{}}})).json()}async function ht(n,t,e){let s=await $(n,`/accounts/${t}/storage/kv/namespaces?per_page=100`);for(let r of s?.result||[])if(e.includes(r.title))return r.id;return null}async function xt(n,t,e,s,r){let i="----NikaNetBoundary"+Math.random().toString(16).slice(2),a=[`--${i}\r
Content-Disposition: form-data; name="metadata"\r
\r
${JSON.stringify({main_module:"worker.js",compatibility_date:"2026-05-01",workers_dev:!0,bindings:r})}\r
`,`--${i}\r
Content-Disposition: form-data; name="worker.js"; filename="worker.js"\r
Content-Type: application/javascript+module\r
\r
${s}\r
`,`--${i}--\r
`].join(""),c=await fetch(`${wt}/accounts/${t}/workers/scripts/${e}`,{method:"PUT",headers:{authorization:`Bearer ${n}`,"content-type":`multipart/form-data; boundary=${i}`},body:a}),l=await c.json();return{ok:!!l?.success,err:l?.errors?.[0]?.message||`HTTP ${c.status}`}}async function bt(n,t,e){let s=await $(n,`/accounts/${t}/workers/scripts/${e}/subdomain`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({enabled:!0})});return{ok:!!s?.success,err:s?.errors?.[0]?.message}}var St=`<!doctype html>
<html lang="fa" dir="rtl" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="color-scheme" content="dark light" />
<title>Nika Net \u2014 \u067E\u0646\u0644 \u0645\u062F\u06CC\u0631\u06CC\u062A</title>
<link rel="icon" href="data:image/jpeg;base64,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" />
<style>
  :root{
    /* ---------- \u06AF\u0631\u0627\u0641\u06CC\u062A / \u06A9\u0627\u063A\u0630 ---------- */
    --bg:#0e0e0f; --bg-soft:#151517; --card:#17171a; --card-2:#1f1f23;
    --border:#2e2e33; --text:#e8e5df; --muted:#8f8e95; --accent:#b9b9c0;
    --grad:linear-gradient(135deg,#3e3e45,#8a8a93 55%,#b6b6be);
    --ok:#7fb287; --warn:#c9b273; --bad:#c98a92; --radius:16px;
    --shadow:0 18px 44px -20px rgba(0,0,0,.7);
    --serif:Georgia,"Times New Roman",serif;
    --mono:"Courier New",ui-monospace,monospace;
    --paper-line:transparent;
    --grain-op:.05;
    --avatar:url(data:image/jpeg;base64,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);
  }
  [data-theme="light"]{
    --bg:#f1ecdf; --bg-soft:#faf6ec; --card:#fdfaf1; --card-2:#f4efe1;
    --border:#d5cdb8; --text:#26241f; --muted:#77705f;
    --grad:linear-gradient(135deg,#5a5a5a,#8a8a8a 55%,#b9b9b9);
    --shadow:0 18px 40px -22px rgba(60,50,30,.35);
    --paper-line:repeating-linear-gradient(0deg,transparent 0 31px,rgba(120,105,70,.07) 31px 32px);
    --grain-op:.06;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,"Vazirmatn",Roboto,sans-serif;
    background:var(--bg); color:var(--text); min-height:100vh; transition:background .35s,color .35s;
    background-image:
      var(--paper-line),
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");
    background-attachment:fixed;
  }
  body::after{ /* \u062F\u0627\u0646\u0647\u200C\u062F\u0627\u0646\u0647\u200C\u0634\u062F\u0646 \u06A9\u0627\u063A\u0630 */
    content:""; position:fixed; inset:0; pointer-events:none; z-index:0;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");
    opacity:var(--grain-op); mix-blend-mode:overlay;
  }
  ::-webkit-scrollbar{width:10px;height:10px}
  ::-webkit-scrollbar-thumb{background:var(--border);border-radius:99px}
  ::-webkit-scrollbar-track{background:transparent}
  button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit}
  input,textarea,select{font-family:inherit;color:var(--text)}
  .hidden{display:none!important}

  /* ---------- \u0648\u0631\u0648\u062F ---------- */
  #loginView{min-height:100vh;display:grid;place-items:center;padding:24px;position:relative;z-index:1}
  .login-card{width:min(400px,100%);background:var(--card);border:1.5px dashed var(--border);
    border-radius:20px;padding:40px 32px;text-align:center;backdrop-filter:blur(10px);box-shadow:var(--shadow);
    position:relative}
  .login-card::before{ /* \u0633\u0646\u062C\u0627\u0642/\u0646\u0648\u0627\u0631 \u0642\u062F\u06CC\u0645\u06CC \u0628\u0627\u0644\u0627\u06CC \u06A9\u0627\u0631\u062A */
    content:""; position:absolute; top:14px; right:50%; transform:translateX(50%) rotate(-2deg);
    width:86px; height:20px; background:rgba(150,140,115,.28); border:1px dashed var(--muted); border-radius:3px;
    box-shadow:0 1px 3px rgba(0,0,0,.3);
  }
  .logo-big{width:96px;height:96px;margin:6px auto 16px;position:relative;border-radius:50%;
    padding:6px; background:var(--bg-soft); box-shadow:0 10px 26px -10px rgba(0,0,0,.6)}
  .logo-big .av{background:var(--avatar);background-size:cover;background-position:center;width:100%;height:100%;border-radius:50%;display:block;filter:contrast(1.02)}
  .logo-big img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;
    filter:contrast(1.02); }
  .logo-big::after{ /* \u062D\u0644\u0642\u0647\u200C\u06CC \u0645\u062F\u0627\u062F\u06CC \u062F\u0633\u062A\u06CC */
    content:""; position:absolute; inset:-7px; border-radius:50%;
    border:1.5px dashed var(--muted); transform:rotate(6deg);
  }
  .login-card h1{font-family:var(--serif);font-size:27px;font-weight:700;letter-spacing:.5px}
  .login-card h1 .dot{color:var(--muted)}
  .login-card p.sub{color:var(--muted);margin:8px 0 22px;font-size:13px;font-family:var(--mono)}
  .field{text-align:right;margin-bottom:16px}
  .field label{display:block;font-size:12px;color:var(--muted);margin-bottom:7px;font-weight:600;font-family:var(--mono);letter-spacing:.4px}
  .input{width:100%;padding:13px 16px;border-radius:12px;border:1.5px dashed var(--border);
    background:var(--bg-soft);font-size:14px;outline:none;transition:border .2s,box-shadow .2s}
  .input:focus{border-color:var(--accent);border-style:solid;box-shadow:0 0 0 4px rgba(150,150,160,.12)}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 20px;
    border-radius:12px;font-size:14px;font-weight:700;transition:transform .15s,box-shadow .2s,opacity .2s;
    border:1px solid rgba(255,255,255,.08)}
  .btn:active{transform:scale(.97)}
  .btn-primary{background:var(--grad);color:#f4f4f4;width:100%;box-shadow:4px 4px 0 rgba(0,0,0,.35)}
  .btn-primary:active{box-shadow:1px 1px 0 rgba(0,0,0,.35)}
  .btn-ghost{background:var(--card-2);border:1.5px dashed var(--border)}
  .btn-ghost:hover{background:var(--border)}
  .btn-danger{background:rgba(201,138,146,.13);color:var(--bad)}
  .hint{background:rgba(160,150,125,.10);border:1.5px dashed var(--border);color:var(--muted);
    border-radius:12px;padding:10px;font-size:12px;margin-top:18px;font-family:var(--mono)}
  .error{color:var(--bad);font-size:12.5px;margin-top:10px;min-height:18px}

  /* ---------- \u0642\u0627\u0628 \u0628\u0631\u0646\u0627\u0645\u0647 ---------- */
  #appView{display:grid;grid-template-columns:264px 1fr;min-height:100vh;position:relative;z-index:1}
  #sidebar{padding:22px 16px;border-left:1.5px dashed var(--border);display:flex;flex-direction:column;
    gap:6px;background:var(--card);backdrop-filter:blur(10px);position:sticky;top:0;height:100vh}
  .brand{display:flex;align-items:center;gap:12px;padding:4px 8px 16px}
  .logo{width:44px;height:44px;border-radius:50%;flex:none;position:relative;padding:3px;background:var(--bg-soft)}
  .logo .av{background:var(--avatar);background-size:cover;background-position:center;width:100%;height:100%;border-radius:50%;display:block}
  .logo img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block}
  .logo::after{content:"";position:absolute;inset:-4px;border-radius:50%;border:1.2px dashed var(--muted);transform:rotate(8deg)}
  .brand-name{font-size:16.5px;font-weight:700;font-family:var(--serif);letter-spacing:.3px}
  .brand-sub{font-size:10.5px;color:var(--muted);font-family:var(--mono)}
  .brand-underline{width:100%;height:8px;margin-top:2px}
  .brand-underline path{fill:none;stroke:var(--muted);stroke-width:1.4;stroke-dasharray:4 4}
  .nav{display:flex;flex-direction:column;gap:4px}
  .nav-item{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;font-size:14px;
    color:var(--muted);font-weight:600;transition:all .2s;width:100%;border:1.5px dashed transparent}
  .nav-item svg{width:19px;height:19px;flex:none}
  .nav-item:hover{background:var(--card-2);color:var(--text)}
  .nav-item.active{background:var(--grad);color:#f4f4f4;border-color:transparent;box-shadow:3px 3px 0 rgba(0,0,0,.3)}
  .sidebar-foot{margin-top:auto;padding-top:16px;border-top:1.5px dashed var(--border);font-size:11px;color:var(--muted);font-family:var(--mono)}
  #main{padding:26px 30px;max-width:1180px;width:100%;margin:0 auto}
  .topbar{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:24px;flex-wrap:wrap}
  .page-title{font-size:23px;font-weight:700;letter-spacing:.2px;font-family:var(--serif)}
  .page-desc{color:var(--muted);font-size:12.5px;margin-top:5px;font-family:var(--mono)}
  .top-actions{display:flex;gap:10px;align-items:center}
  .icon-btn{width:42px;height:42px;border-radius:12px;background:var(--card);border:1.5px dashed var(--border);
    display:grid;place-items:center;transition:all .2s}
  .icon-btn:hover{background:var(--card-2)}
  .icon-btn svg{width:19px;height:19px}

  /* ---------- \u06A9\u0627\u0631\u062A\u200C\u0647\u0627 ---------- */
  .grid{display:grid;gap:16px}
  .stats{grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-bottom:16px}
  .card{background:var(--card);border:1.5px dashed var(--border);border-radius:var(--radius);padding:20px;
    backdrop-filter:blur(10px);box-shadow:var(--shadow);transition:background .3s;position:relative}
  .stat{position:relative;overflow:hidden}
  .stat .icon{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;margin-bottom:14px;
    background:var(--card-2);border:1.5px dashed var(--border);transform:rotate(-2deg)}
  .stat .icon svg{width:21px;height:21px;stroke:var(--muted)}
  .stat .val{font-size:27px;font-weight:700;letter-spacing:-1px;font-family:var(--mono)}
  .stat .lbl{color:var(--muted);font-size:12.5px;margin-top:3px}
  .stat .trend{position:absolute;top:20px;left:20px;font-size:10.5px;font-weight:700;padding:4px 9px;border-radius:99px;font-family:var(--mono)}
  .trend.up{background:rgba(127,178,135,.14);color:var(--ok)}
  .two-col{grid-template-columns:1.4fr 1fr}
  @media(max-width:900px){.two-col{grid-template-columns:1fr}}

  .card-title{font-size:15px;font-weight:700;display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;font-family:var(--serif)}
  .card-title .mini{font-size:10.5px;color:var(--muted);font-weight:500;font-family:var(--mono)}
  .pencil{margin-left:8px;opacity:.75}
  table{width:100%;border-collapse:collapse}
  th{font-size:11px;color:var(--muted);text-align:right;padding:8px 10px;font-weight:600;border-bottom:1.5px dashed var(--border);font-family:var(--mono);letter-spacing:.4px}
  td{padding:12px 10px;font-size:13.5px;border-bottom:1.5px dashed var(--border)}
  tr:last-child td{border-bottom:none}
  .badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:99px;font-size:11px;font-weight:700;font-family:var(--mono)}
  .badge.ok{background:rgba(127,178,135,.14);color:var(--ok)}
  .badge.off{background:rgba(201,138,146,.13);color:var(--bad)}
  .badge.warn{background:rgba(201,178,115,.15);color:var(--warn)}
  .dot{width:7px;height:7px;border-radius:99px;background:currentColor}

  .chart{width:100%;height:190px}
  .chart path.area{fill:url(#areaGrad)}
  .chart path.line{fill:none;stroke:url(#lineGrad);stroke-width:2.5;stroke-linecap:round}
  .legend{display:flex;gap:16px;margin-top:10px;font-size:12px;color:var(--muted);font-family:var(--mono)}
  .legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-left:6px}

  .toggle{position:relative;width:46px;height:26px;background:var(--border);border-radius:99px;transition:.25s;flex:none;border:1px dashed var(--muted)}
  .toggle::after{content:"";position:absolute;top:2px;right:2px;width:20px;height:20px;border-radius:99px;background:var(--muted);transition:.25s}
  .toggle.on{background:var(--grad)}
  .toggle.on::after{transform:translateX(-20px);background:#f4f4f4}
  .row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:1.5px dashed var(--border)}
  .row:last-child{border-bottom:none}
  .row .k{font-size:13.5px;font-weight:600}
  .row .d{font-size:12px;color:var(--muted);margin-top:2px;font-family:var(--mono)}

  textarea.input{resize:vertical;min-height:110px;font-family:var(--mono);font-size:12px;line-height:1.7}
  pre.code{background:var(--bg-soft);border:1.5px dashed var(--border);border-radius:12px;padding:16px;font-size:11.5px;
    line-height:1.8;direction:ltr;text-align:left;overflow:auto;max-height:340px;font-family:var(--mono);white-space:pre-wrap;word-break:break-all}
  .tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
  .tab{padding:8px 14px;border-radius:10px;font-size:12px;font-weight:700;background:var(--card-2);border:1.5px dashed var(--border);color:var(--muted);font-family:var(--mono)}
  .tab.active{background:var(--grad);color:#f4f4f4;border-color:transparent}
  .copy-row{display:flex;gap:8px;align-items:center;margin-top:10px}
  .copy-row .btn{width:auto;padding:9px 16px;font-size:12.5px}
  .field-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  @media(max-width:640px){.field-grid{grid-template-columns:1fr}}
  .modal-back{position:fixed;inset:0;background:rgba(5,5,6,.72);backdrop-filter:blur(4px);display:grid;place-items:center;z-index:50;padding:20px}
  .modal{width:min(560px,100%);max-height:88vh;overflow:auto;background:var(--bg-soft);border:1.5px dashed var(--border);border-radius:18px;padding:26px;box-shadow:var(--shadow)}
  .modal h3{font-size:17px;font-weight:700;margin-bottom:16px;font-family:var(--serif)}
  .seg{display:flex;background:var(--card-2);border:1.5px dashed var(--border);border-radius:12px;padding:4px;gap:4px}
  .seg button{flex:1;padding:9px;border-radius:9px;font-size:12.5px;font-weight:700;color:var(--muted)}
  .seg button.on{background:var(--grad);color:#f4f4f4}
  .toast{position:fixed;bottom:22px;right:50%;transform:translateX(50%);background:var(--bg-soft);border:1.5px dashed var(--border);
    padding:12px 22px;border-radius:12px;font-size:13px;font-weight:600;box-shadow:var(--shadow);z-index:99;opacity:0;transition:.3s;pointer-events:none}
  .toast.show{opacity:1}
  .empty{text-align:center;color:var(--muted);padding:40px 10px;font-size:13px;font-family:var(--mono)}
  .progress{height:8px;background:var(--card-2);border-radius:99px;overflow:hidden;margin-top:10px;border:1px dashed var(--border)}
  .progress>div{height:100%;background:var(--grad);border-radius:99px;transition:width .5s}
  .qty{width:74px;text-align:center}

  /* ---------- \u0627\u0633\u06A9\u0646\u0631 IP ---------- */
  .seg button.on{background:var(--grad);color:#f4f4f4}
  .chips{display:flex;gap:8px;flex-wrap:wrap}
  .pchip{padding:7px 13px;border-radius:9px;font-size:12px;font-weight:700;font-family:var(--mono);
    background:var(--card-2);border:1.5px dashed var(--border);color:var(--muted);transition:all .15s}
  .pchip.on{background:var(--grad);color:#f4f4f4;border-color:transparent}
  .scan-counters{display:flex;gap:12px;margin-top:14px;flex-wrap:wrap}
  .scan-counters#scanStatus{display:block;font-family:var(--mono);font-size:12.5px;color:var(--muted);min-height:18px}
  #scanStatus.live{color:var(--ok)}
  .scan-counters .sc{flex:1;min-width:84px;background:var(--card-2);border:1.5px dashed var(--border);border-radius:12px;padding:10px 12px;text-align:center}
  .scan-counters .sc .v{font-family:var(--mono);font-size:21px;font-weight:700}
  .scan-counters .sc .l{font-size:10.5px;color:var(--muted);font-family:var(--mono)}
  .scan-counters .sc.ok .v{color:var(--ok)}
  .scan-counters .sc.bad .v{color:var(--bad)}
  .scan-top{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
  .top-chip{display:inline-flex;align-items:center;gap:8px;background:var(--card-2);border:1.5px dashed var(--border);
    border-radius:11px;padding:6px 12px;cursor:pointer;transition:all .15s}
  .top-chip:hover{border-color:var(--accent)}
  .top-chip .top-rank{width:20px;height:20px;border-radius:50%;background:var(--grad);color:#f4f4f4;display:grid;place-items:center;font-size:11px;font-weight:700}
  .top-chip code{font-family:var(--mono);font-size:12px}
  .top-chip b{font-family:var(--mono);font-size:11.5px;color:var(--ok)}
  .scan-list{display:flex;flex-direction:column;gap:6px;max-height:420px;overflow:auto}
  .scan-row{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;background:var(--card-2);
    border:1.5px dashed transparent;cursor:pointer;transition:all .12s}
  .scan-row:hover{border-color:var(--accent)}
  .scan-ip{font-family:var(--mono);font-size:12.5px;font-weight:700;min-width:130px}
  .scan-port{font-family:var(--mono);font-size:11px;color:var(--muted)}
  .scan-latbar{flex:1;height:7px;background:var(--border);border-radius:99px;overflow:hidden;min-width:40px}
  .scan-latfill{height:100%;background:var(--grad);border-radius:99px}
  .scan-ms{font-family:var(--mono);font-size:11.5px;min-width:56px;text-align:left}
  .scan-ms.ok{color:var(--ok)} .scan-ms.warn{color:var(--warn)} .scan-ms.bad{color:var(--bad)}


  /* ---------- \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC ---------- */
  .upd-ver{font-family:var(--mono);font-size:14px;font-weight:700;color:var(--accent)}
  .upd-status{display:inline-block;margin-top:12px;padding:6px 14px;border-radius:99px;font-family:var(--mono);font-size:12px;font-weight:700}
  .upd-status.ok{background:rgba(127,178,135,.14);color:var(--ok)}
  .upd-status.warn{background:rgba(201,178,115,.15);color:var(--warn)}
  .upd-status.bad{background:rgba(201,138,146,.13);color:var(--bad)}
  .upd-notes{background:var(--card-2);border:1.5px dashed var(--border);border-radius:12px;padding:12px 14px;font-size:12.5px;color:var(--muted);line-height:1.9;font-family:var(--mono)}

    @media(max-width:760px){
    #appView{grid-template-columns:1fr}
    #sidebar{position:fixed;bottom:0;top:auto;left:0;right:0;height:auto;flex-direction:row;align-items:center;
      z-index:40;border-left:none;border-top:1.5px dashed var(--border);padding:8px 10px;justify-content:space-around}
    .brand{display:none}.sidebar-foot{display:none}
    .nav{flex-direction:row;width:100%;justify-content:space-around}
    .nav-item{flex-direction:column;gap:4px;font-size:10.5px;padding:8px 10px}
    .nav-item span{display:none}
    #main{padding:20px 14px 90px}
  }
</style>
</head>
<body>

<!-- ============ \u0648\u0631\u0648\u062F ============ -->
<div id="loginView">
  <div class="login-card">
    <div class="logo-big"><div class="av"></div></div>
    <h1 data-i18n="login.title">Nika Net<span class="dot">.</span></h1>
    <p class="sub" data-i18n="login.sub">\u067E\u0646\u0644 \u0645\u062F\u06CC\u0631\u06CC\u062A \u067E\u0631\u0648\u06A9\u0633\u06CC \u2014 \u0631\u0648\u06CC Cloudflare Workers</p>
    <div class="field">
      <label data-i18n="login.password">\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0627\u062F\u0645\u06CC\u0646</label>
      <input class="input" id="loginPass" type="password" autocomplete="current-password" data-i18n-ph="login.passwordPh" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" />
    </div>
    <div class="error" id="loginError"></div>
    <button class="btn btn-primary" id="loginBtn" data-i18n="login.enter">\u0648\u0631\u0648\u062F \u0628\u0647 \u067E\u0646\u0644</button>
    <div class="hint" id="demoHint"></div>
  </div>
</div>

<!-- ============ \u0628\u0631\u0646\u0627\u0645\u0647 ============ -->
<div id="appView" class="hidden">
  <aside id="sidebar">
    <div class="brand">
      <div class="logo"><div class="av"></div></div>
      <div>
        <div class="brand-name">Nika Net</div>
        <div class="brand-sub">Control Panel</div>
        <svg class="brand-underline" viewBox="0 0 120 8" preserveAspectRatio="none"><path d="M2 5 Q 30 2 60 4 T 118 4"/></svg>
      </div>
    </div>
    <nav class="nav" id="nav">
      <button class="nav-item active" data-page="dashboard">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
        <span data-i18n="nav.dash">\u062F\u0627\u0634\u0628\u0648\u0631\u062F</span>
      </button>
      <button class="nav-item" data-page="users">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17.5 14.5c2.6 0 4.5 1.5 5.3 4"/></svg>
        <span data-i18n="nav.users">\u06A9\u0627\u0631\u0628\u0631\u0627\u0646</span>
      </button>
      <button class="nav-item" data-page="subscription">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>
        <span data-i18n="nav.sub">\u0627\u0634\u062A\u0631\u0627\u06A9</span>
      </button>
      <button class="nav-item" data-page="settings">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z"/></svg>
        <span data-i18n="nav.settings">\u062A\u0646\u0638\u06CC\u0645\u0627\u062A</span>
      </button>
      <button class="nav-item" data-page="scanner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 7a5 5 0 1 0 5 5"/><circle cx="12" cy="12" r="1"/><path d="M16 16l4 4"/></svg>
        <span data-i18n="nav.scan">\u0627\u0633\u06A9\u0646\u0631 IP</span>
      </button>
      <button class="nav-item" data-page="update">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-2.6-6.3"/><path d="M21 3v6h-6"/></svg>
        <span data-i18n="nav.upd">\u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC</span>
      </button>
    </nav>
    <div class="sidebar-foot">Nika Net v0.2 \xB7 graphite<br/>Cloudflare Workers</div>
  </aside>

  <div id="main">
    <div class="topbar">
      <div><div class="page-title" id="pageTitle">\u062F\u0627\u0634\u0628\u0648\u0631\u062F</div><div class="page-desc" id="pageDesc">\u0646\u0645\u0627\u06CC \u06A9\u0644\u06CC \u0648\u0636\u0639\u06CC\u062A \u067E\u0646\u0644</div></div>
      <div class="top-actions">
        <button class="icon-btn" id="langBtn" title="English / \u0641\u0627\u0631\u0633\u06CC">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>
        </button>
        <button class="icon-btn" id="themeBtn" title="\u062A\u063A\u06CC\u06CC\u0631 \u062A\u0645">
          <svg id="iconMoon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
          <svg id="iconSun" class="hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
        </button>
        <button class="icon-btn" id="logoutBtn" title="\u062E\u0631\u0648\u062C">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>
        </button>
      </div>
    </div>

    <!-- \u062F\u0627\u0634\u0628\u0648\u0631\u062F -->
    <section id="page-dashboard">
      <div class="grid stats">
        <div class="card stat">
          <div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/></svg></div>
          <div class="val" id="stUsers">0</div><div class="lbl" data-i18n="stat.users">\u06A9\u0627\u0631\u0628\u0631\u0627\u0646</div>
          <div class="trend" id="stUsersT"></div>
        </div>
        <div class="card stat">
          <div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h7l-1 8 11-13h-7l1-7z"/></svg></div>
          <div class="val" id="stReq">0</div><div class="lbl" data-i18n="stat.req">\u062F\u0631\u062E\u0648\u0627\u0633\u062A \u0627\u0645\u0631\u0648\u0632</div>
          <div class="trend" id="stReqT"></div>
        </div>
        <div class="card stat">
          <div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h4l3-9 4 18 3-9h4"/></svg></div>
          <div class="val" id="stGig">0</div><div class="lbl" data-i18n="stat.gig">\u06AF\u06CC\u06AF\u0627\u0628\u0627\u06CC\u062A \u0645\u0635\u0631\u0641</div>
          <div class="trend" id="stGigT"></div>
        </div>
        <div class="card stat">
          <div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
          <div class="val" id="stProto">3</div><div class="lbl" data-i18n="stat.proto">\u067E\u0631\u0648\u062A\u06A9\u0644 \u0641\u0639\u0627\u0644</div>
          <div class="trend" id="stProtoT"></div>
        </div>
      </div>
      <div class="grid two-col">
        <div class="card">
          <div class="card-title"><span>\u270E <span data-i18n="dash.traffic">\u062A\u0631\u0627\u0641\u06CC\u06A9 (\u06F7 \u0631\u0648\u0632 \u0627\u062E\u06CC\u0631)</span></span><span class="mini" data-i18n="dash.gb">\u0628\u0631 \u062D\u0633\u0628 \u06AF\u06CC\u06AF\u0627\u0628\u0627\u06CC\u062A</span></div>
          <svg class="chart" id="chart" viewBox="0 0 560 190" preserveAspectRatio="none">
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a8a93" stop-opacity=".28"/><stop offset="1" stop-color="#8a8a93" stop-opacity="0"/></linearGradient>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a5a60"/><stop offset=".6" stop-color="#8a8a93"/><stop offset="1" stop-color="#b6b6be"/></linearGradient>
            </defs>
            <path class="area" id="areaPath" d=""/>
            <path class="line" id="linePath" d=""/>
          </svg>
          <div class="empty hidden" id="chartEmpty"></div>
          <div class="legend"><span><i style="background:#8a8a93"></i><span data-i18n="dash.usage">\u0645\u0635\u0631\u0641</span></span></div>
        </div>
        <div class="card">
          <div class="card-title"><span>\u270E <span data-i18n="dash.activity">\u0641\u0639\u0627\u0644\u06CC\u062A\u200C\u0647\u0627\u06CC \u0627\u062E\u06CC\u0631</span></span></div>
          <div id="activity"></div>
        </div>
      </div>
    </section>

    <!-- \u06A9\u0627\u0631\u0628\u0631\u0627\u0646 -->
    <section id="page-users" class="hidden">
      <div class="card">
        <div class="card-title"><span>\u270E <span data-i18n="users.title">\u0645\u062F\u06CC\u0631\u06CC\u062A \u06A9\u0627\u0631\u0628\u0631\u0627\u0646</span></span>
          <button class="btn btn-primary" id="addUserBtn" style="width:auto;padding:9px 16px;font-size:12.5px">
            <span data-i18n="users.add">+ \u06A9\u0627\u0631\u0628\u0631 \u062C\u062F\u06CC\u062F</span>
          </button>
        </div>
        <div style="overflow-x:auto">
        <table>
          <thead><tr>
            <th data-i18n="users.name">\u0646\u0627\u0645</th><th data-i18n="users.status">\u0648\u0636\u0639\u06CC\u062A</th>
            <th data-i18n="users.used">\u0645\u0635\u0631\u0641</th><th data-i18n="users.expiry">\u0627\u0646\u0642\u0636\u0627</th><th></th>
          </tr></thead>
          <tbody id="usersBody"></tbody>
        </table>
        </div>
      </div>
    </section>

    <!-- \u0627\u0634\u062A\u0631\u0627\u06A9 -->
    <section id="page-subscription" class="hidden">
      <div class="card" style="margin-bottom:16px">
        <div class="card-title"><span>\u270E <span data-i18n="sub.title">\u0633\u0627\u062E\u062A \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0627\u0634\u062A\u0631\u0627\u06A9</span></span></div>
        <div class="row"><div><div class="k" data-i18n="sub.user">\u06A9\u0627\u0631\u0628\u0631</div><div class="d" data-i18n="sub.userD">\u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0627\u0631\u0628\u0631 \u0628\u0631\u0627\u06CC \u0646\u0645\u0627\u06CC\u0634 \u06A9\u0627\u0646\u0641\u06CC\u06AF</div></div>
          <select class="input" id="subUserSel" style="width:auto;max-width:230px" onchange="state.selectedUserId=this.value;loadGen()"></select></div>
        <div class="row"><div><div class="k" data-i18n="sub.vless">VLESS</div><div class="d" data-i18n="sub.vlessD">\u067E\u0631\u0648\u062A\u06A9\u0644 \u0627\u0635\u0644\u06CC \u2014 \u0631\u0648\u06CC WebSocket + TLS</div></div><div class="toggle on" data-p="vless" onclick="toggleProto(this)"></div></div>
        <div class="row"><div><div class="k" data-i18n="sub.trojan">Trojan</div><div class="d" data-i18n="sub.trojanD">\u067E\u0631\u0648\u062A\u06A9\u0644 \u062F\u0648\u0645 \u2014 \u0627\u0633\u062A\u062A\u0627\u0631 \u0628\u0647\u062A\u0631</div></div><div class="toggle on" data-p="trojan" onclick="toggleProto(this)"></div></div>
        <div class="row"><div><div class="k" data-i18n="sub.warp">WARP</div><div class="d" data-i18n="sub.warpD">\u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u06CC \u0627\u0632 \u062A\u0645\u0627\u0633\u200C\u0647\u0627 (UDP) \u0648 \u0634\u0631\u0627\u06CC\u0637 \u0628\u062D\u0631\u0627\u0646\u06CC</div></div><div class="toggle on" data-p="warp" onclick="toggleProto(this)"></div></div>
      </div>
      <div class="card">
        <div class="card-title"><span>\u270E <span data-i18n="sub.preview">\u067E\u06CC\u0634\u200C\u0646\u0645\u0627\u06CC\u0634 \u06A9\u0627\u0646\u0641\u06CC\u06AF</span></span><span class="mini" data-i18n="sub.previewD">\u062E\u0631\u0648\u062C\u06CC \u0628\u0631\u0627\u06CC \u06A9\u0644\u0627\u06CC\u0646\u062A\u200C\u0647\u0627</span></div>
        <div class="tabs" id="fmtTabs">
          <button class="tab active" data-fmt="base64">Base64 (v2rayNG)</button>
          <button class="tab" data-fmt="clash">Clash / Mihomo</button>
          <button class="tab" data-fmt="singbox">Sing-box</button>
          <button class="tab" data-fmt="warp">WireGuard (WARP)</button>
        </div>
        <pre class="code" id="fmtOut" dir="ltr"></pre>
        <div class="copy-row"><button class="btn btn-ghost" id="copyBtn">\u{1F4CB} <span data-i18n="sub.copy">\u06A9\u067E\u06CC</span></button>
        <button class="btn btn-ghost" id="refreshBtn">\u{1F504} <span data-i18n="sub.gen">\u062A\u0648\u0644\u06CC\u062F \u0645\u062C\u062F\u062F</span></button></div>
      </div>
    </section>

    <!-- \u062A\u0646\u0638\u06CC\u0645\u0627\u062A -->
    <section id="page-settings" class="hidden">
      <div class="grid two-col">
        <div class="card">
          <div class="card-title"><span>\u270E <span data-i18n="set.general">\u0639\u0645\u0648\u0645\u06CC</span></span></div>
          <div class="field"><label data-i18n="set.title">\u0639\u0646\u0648\u0627\u0646 \u067E\u0646\u0644</label><input class="input" id="setTitle" /></div>
          <div class="field" style="margin-top:14px"><label data-i18n="set.host">\u062F\u0627\u0645\u0646\u0647 / Host \u0648\u0631\u06A9\u0631</label><input class="input" id="setHost" dir="ltr" placeholder="nika.example.workers.dev" /></div>
          <div class="field" style="margin-top:14px"><label data-i18n="set.sni">SNI / Host \u062C\u0639\u0644\u06CC</label><input class="input" id="setSni" dir="ltr" placeholder="www.speedtest.net" /></div>
          <div class="field" style="margin-top:14px"><label data-i18n="set.wsPath">\u0645\u0633\u06CC\u0631 WebSocket</label><input class="input" id="setWsPath" dir="ltr" placeholder="/nika-ws" /></div>
        </div>
        <div class="card">
          <div class="card-title"><span>\u270E <span data-i18n="set.security">\u0627\u0645\u0646\u06CC\u062A</span></span></div>
          <div class="field"><label data-i18n="set.newpass">\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u062C\u062F\u06CC\u062F</label><input class="input" id="setPass" type="password" /></div>
          <div class="row" style="margin-top:16px"><div><div class="k" data-i18n="set.brute">\u0645\u062D\u0627\u0641\u0638\u062A Brute-Force</div><div class="d" data-i18n="set.bruteD">\u0645\u0633\u062F\u0648\u062F\u0633\u0627\u0632\u06CC \u0645\u0648\u0642\u062A \u0628\u0639\u062F \u0627\u0632 \u062A\u0644\u0627\u0634 \u0646\u0627\u0645\u0648\u0641\u0642</div></div><div class="toggle on" onclick="this.classList.toggle('on')"></div></div>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-title"><span>\u270E <span data-i18n="set.cleanip">IP \u0647\u0627\u06CC \u062A\u0645\u06CC\u0632</span></span><span class="mini" data-i18n="set.cleanipD">\u0647\u0631 \u062E\u0637 \u06CC\u06A9 IP</span></div>
        <textarea class="input" id="setIps" dir="ltr"></textarea>
        <div class="copy-row"><button class="btn btn-primary" id="saveBtn" style="width:auto">\u{1F4BE} <span data-i18n="set.save">\u0630\u062E\u06CC\u0631\u0647 \u062A\u0646\u0638\u06CC\u0645\u0627\u062A</span></button></div>
      </div>
    </section>

    <!-- \u0627\u0633\u06A9\u0646\u0631 IP -->
    <section id="page-scanner" class="hidden">
      <div class="grid two-col">
        <div class="card">
          <div class="card-title"><span>\u270E <span data-i18n="scanner.title">\u0627\u0633\u06A9\u0646\u0631 IP \u062A\u0645\u06CC\u0632</span></span><span class="mini" data-i18n="scan.source">\u0645\u0646\u0628\u0639 IP \u0647\u0627</span></div>
          <div class="seg" style="margin-bottom:14px">
            <button class="on" id="scanSourceB" data-i18n="scan.bundled">\u0644\u06CC\u0633\u062A \u062F\u0627\u062E\u0644\u06CC</button>
            <button id="scanSourceC" data-i18n="scan.custom">\u0644\u06CC\u0633\u062A \u0634\u062E\u0635\u06CC</button>
          </div>
          <div id="scanCustomWrap" class="hidden" style="margin-bottom:14px">
            <div class="field"><label data-i18n="scan.customD">\u0647\u0631 \u062E\u0637 \u06CC\u06A9 IP \u06CC\u0627 \u0631\u0646\u062C CIDR</label><textarea class="input" id="scanCustom" dir="ltr" style="min-height:96px"></textarea></div>
          </div>
          <div class="field-grid" id="scanTargetWrap">
            <div class="field"><label data-i18n="scan.target">\u062A\u0639\u062F\u0627\u062F \u0647\u062F\u0641</label>
              <select class="input" id="scanTarget">
                <option value="50">50</option><option value="100">100</option><option value="200" selected>200</option><option value="420">420 (\u06A9\u0627\u0645\u0644)</option>
              </select>
            </div>
            <div class="field"><label data-i18n="scan.conc">\u0647\u0645\u0632\u0645\u0627\u0646\u06CC</label>
              <select class="input" id="scanConc"><option>8</option><option>16</option><option selected>24</option><option>40</option></select>
            </div>
          </div>
          <div class="field" style="margin-top:14px"><label data-i18n="scan.ports">\u067E\u0648\u0631\u062A \u0647\u0627</label>
            <div class="chips" id="scanPorts">
              <button class="pchip on" data-port="443">443</button>
              <button class="pchip" data-port="2053">2053</button>
              <button class="pchip" data-port="2083">2083</button>
              <button class="pchip" data-port="2087">2087</button>
              <button class="pchip" data-port="2096">2096</button>
              <button class="pchip" data-port="8443">8443</button>
            </div>
          </div>
          <div class="field" style="margin-top:14px"><label data-i18n="scan.timeout">\u062A\u0627\u06CC\u0645\u200C\u0627\u0648\u062A (ms)</label>
            <select class="input" id="scanTimeout"><option value="2500">2500</option><option value="3500" selected>3500</option><option value="5000">5000</option><option value="8000">8000</option></select>
          </div>
          <div class="copy-row" style="margin-top:18px">
            <button class="btn btn-primary" id="scanStart" style="width:auto">\u25B6 <span data-i18n="scan.start">\u0634\u0631\u0648\u0639 \u0627\u0633\u06A9\u0646</span></button>
            <button class="btn btn-danger hidden" id="scanStop" style="width:auto">\u25A0 <span data-i18n="scan.stop">\u062A\u0648\u0642\u0641</span></button>
          </div>
          <div class="progress" style="margin-top:18px"><div id="scanBar" style="width:0%"></div></div>
          <div class="scan-counters" id="scanStatus"><span data-i18n="scan.running">\u0627\u0633\u06A9\u0646 \u062F\u0631 \u062D\u0627\u0644 \u0627\u0646\u062C\u0627\u0645 \u0627\u0633\u062A\u2026</span></div>
          <div class="scan-counters">
            <div class="sc"><div class="v" id="scTested">0</div><div class="l" data-i18n="scan.tested">\u062A\u0633\u062A \u0634\u062F\u0647</div></div>
            <div class="sc ok"><div class="v" id="scAlive">0</div><div class="l" data-i18n="scan.alive">\u0633\u0627\u0644\u0645</div></div>
            <div class="sc bad"><div class="v" id="scDead">0</div><div class="l" data-i18n="scan.dead">\u0645\u0631\u062F\u0647</div></div>
          </div>
        </div>
        <div class="card" style="display:flex;flex-direction:column">
          <div class="card-title"><span>\u270E <span data-i18n="scan.top5">\u06F5 \u0628\u0631\u062A\u0631</span></span></div>
          <canvas id="radarCanvas" style="width:100%;height:260px;display:block"></canvas>
          <div class="scan-top" id="scanTop"></div>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-title"><span>\u270E <span data-i18n="scan.results">\u0646\u062A\u0627\u06CC\u062C \u0632\u0646\u062F\u0647</span></span>
          <span style="display:flex;gap:8px">
            <button class="btn btn-ghost" id="scanCopy" style="padding:8px 14px;font-size:12px">\u{1F4CB} <span data-i18n="scan.copy">\u06A9\u067E\u06CC</span></button>
            <button class="btn btn-ghost" id="scanExport" style="padding:8px 14px;font-size:12px">\u2B07 <span data-i18n="scan.export">\u062E\u0631\u0648\u062C\u06CC</span></button>
            <button class="btn btn-primary" id="scanApply" style="padding:8px 14px;font-size:12px" title="" data-i18n="scan.apply">\u26A1 \u0627\u0639\u0645\u0627\u0644 \u0628\u0647 \u067E\u0646\u0644</button>
          </span>
        </div>
        <div class="scan-list" id="scanList"><div class="empty" data-i18n="scan.empty">\u0647\u0646\u0648\u0632 \u0627\u0633\u06A9\u0646\u06CC \u0634\u0631\u0648\u0639 \u0646\u0634\u062F\u0647</div></div>
      </div>
    </section>
    <!-- \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC -->
    <section id="page-update" class="hidden">
      <div class="grid two-col">
        <div class="card">
          <div class="card-title"><span>\u270E <span data-i18n="upd.title">\u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u067E\u0646\u0644</span></span></div>
          <div class="row"><div><div class="k" data-i18n="upd.current">\u0646\u0633\u062E\u0647 \u0641\u0639\u0644\u06CC</div></div><code class="upd-ver" id="updCurrent">\u2014</code></div>
          <div class="row"><div><div class="k" data-i18n="upd.latest">\u0622\u062E\u0631\u06CC\u0646 \u0646\u0633\u062E\u0647</div></div><code class="upd-ver" id="updLatest">\u2014</code></div>
          <div class="upd-status" id="updStatus">\u2026</div>
          <div class="field" style="margin-top:14px"><label data-i18n="upd.notes">\u062A\u063A\u06CC\u06CC\u0631\u0627\u062A</label><div class="upd-notes" id="updNotes">\u2014</div></div>
          <div class="copy-row"><button class="btn btn-ghost" id="updCheck" style="width:auto">\u{1F50E} <span data-i18n="upd.check">\u0628\u0631\u0631\u0633\u06CC \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC</span></button></div>
        </div>
        <div class="card">
          <div class="card-title"><span>\u270E <span data-i18n="upd.apply">\u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u06A9\u0646</span></span></div>
          <div class="field"><label data-i18n="upd.token">\u062A\u0648\u06A9\u0646 Cloudflare</label><input class="input" id="updToken" dir="ltr" placeholder="cfut_\u2026 or \u2026"/><div class="d" style="color:var(--muted);font-size:12px;margin-top:6px;font-family:var(--mono)" data-i18n="upd.tokenD">\u0628\u0631\u0627\u06CC \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u062E\u0648\u062F\u06A9\u0627\u0631\u060C \u062A\u0648\u06A9\u0646 \u0627\u06A9\u0627\u0646\u062A Cloudflare \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646</div></div>
          <div class="copy-row"><button class="btn btn-primary" id="updApply" style="width:auto">\u{1F504} <span id="updApplyLbl" data-i18n="upd.apply">\u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u06A9\u0646</span></button></div>
          <div class="hint" style="margin-top:18px">\u{1F916} <span data-i18n="upd.bot">\u06CC\u0627 \u0627\u0632 \u0637\u0631\u06CC\u0642 \u0631\u0628\u0627\u062A \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u06A9\u0646</span> \u2014 <a href="https://t.me/NikaNetLauncher_bot" target="_blank" style="color:var(--accent)">@NikaNetLauncher_bot</a></div>
        </div>
      </div>
    </section>

  </div>
</div>

<div id="modalBack" class="modal-back hidden"></div>
<div class="toast" id="toast"></div>





<script>
/* ================================================================
   Nika Net \u2014 Panel logic (API-first).
   When served by the Nika worker, it talks to /api/* and shows real
   data (users, usage, requests, activity). When opened as a static
   preview (no server), it shows an honest "preview" notice and nothing
   fake.
   ================================================================ */
"use strict";
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

/* ---------- safe storage (theme/lang only) ---------- */
const store = (() => {
  let mem = {};
  try { localStorage.setItem("__t", "1"); localStorage.removeItem("__t"); return localStorage; }
  catch (e) {
    return {
      getItem: (k) => (k in mem ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); },
      removeItem: (k) => { delete mem[k]; },
    };
  }
})();

/* ---------- i18n ---------- */
const I18N = {
  fa: {
    dir: "rtl", lang: "fa",
    "login.title": "Nika Net", "login.sub": "\u067E\u0646\u0644 \u0645\u062F\u06CC\u0631\u06CC\u062A \u067E\u0631\u0648\u06A9\u0633\u06CC \u2014 \u0631\u0648\u06CC Cloudflare Workers",
    "login.password": "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0627\u062F\u0645\u06CC\u0646", "login.passwordPh": "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631", "login.enter": "\u0648\u0631\u0648\u062F \u0628\u0647 \u067E\u0646\u0644",
    "login.hintFirst": "\u{1F513} \u0627\u0648\u0644\u06CC\u0646 \u0648\u0631\u0648\u062F \u2014 \u0631\u0645\u0632\u06CC \u06A9\u0647 \u0627\u0646\u062A\u062E\u0627\u0628 \u0645\u06CC\u200C\u06A9\u0646\u06CC \u0628\u0647\u200C\u0639\u0646\u0648\u0627\u0646 \u0631\u0645\u0632 \u0627\u062F\u0645\u06CC\u0646 \u062B\u0628\u062A \u0645\u06CC\u200C\u0634\u0648\u062F (\u062D\u062F\u0627\u0642\u0644 \u06F4 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631)",
    "login.hintPass": "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0627\u062F\u0645\u06CC\u0646 \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646",
    "login.hintPreview": "\u0627\u06CC\u0646 \u067E\u06CC\u0634\u200C\u0646\u0645\u0627\u06CC\u0634 \u0641\u0627\u06CC\u0644 \u0627\u0633\u062A \u2014 \u0628\u0631\u0627\u06CC \u062F\u0627\u062F\u0647\u0654 \u0648\u0627\u0642\u0639\u06CC\u060C \u067E\u0646\u0644 \u0631\u0627 \u0627\u0632 \u0622\u062F\u0631\u0633 \u0632\u0646\u062F\u0647\u0654 \u0648\u0631\u06A9\u0631 \u0628\u0627\u0632 \u06A9\u0646",
    "login.wrong": "\u0631\u0645\u0632 \u0627\u0634\u062A\u0628\u0627\u0647 \u0627\u0633\u062A", "login.short": "\u0631\u0645\u0632 \u0628\u0627\u06CC\u062F \u062D\u062F\u0627\u0642\u0644 \u06F4 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631 \u0628\u0627\u0634\u062F",
    "nav.dash": "\u062F\u0627\u0634\u0628\u0648\u0631\u062F", "nav.users": "\u06A9\u0627\u0631\u0628\u0631\u0627\u0646", "nav.sub": "\u0627\u0634\u062A\u0631\u0627\u06A9", "nav.settings": "\u062A\u0646\u0638\u06CC\u0645\u0627\u062A", "nav.scan": "\u0627\u0633\u06A9\u0646\u0631 IP", "nav.upd": "\u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC",
    "stat.users": "\u06A9\u0627\u0631\u0628\u0631\u0627\u0646", "stat.active": "\u0641\u0639\u0627\u0644", "stat.req": "\u062F\u0631\u062E\u0648\u0627\u0633\u062A \u0627\u0645\u0631\u0648\u0632", "stat.gig": "\u06AF\u06CC\u06AF\u0627\u0628\u0627\u06CC\u062A \u0645\u0635\u0631\u0641", "stat.proto": "\u067E\u0631\u0648\u062A\u06A9\u0644 \u0641\u0639\u0627\u0644",
    "dash.traffic": "\u062A\u0631\u0627\u0641\u06CC\u06A9 (\u06F7 \u0631\u0648\u0632 \u0627\u062E\u06CC\u0631)", "dash.gb": "\u0628\u0631 \u062D\u0633\u0628 \u06AF\u06CC\u06AF\u0627\u0628\u0627\u06CC\u062A", "dash.usage": "\u0645\u0635\u0631\u0641", "dash.activity": "\u0641\u0639\u0627\u0644\u06CC\u062A\u200C\u0647\u0627\u06CC \u0627\u062E\u06CC\u0631",
    "dash.today": "\u0627\u0645\u0631\u0648\u0632", "dash.nochart": "\u0647\u0646\u0648\u0632 \u062F\u0627\u062F\u0647\u0654 \u062A\u0631\u0627\u0641\u06CC\u06A9\u06CC \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A", "act.empty": "\u0647\u0646\u0648\u0632 \u0641\u0639\u0627\u0644\u06CC\u062A\u06CC \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A",
    "users.title": "\u0645\u062F\u06CC\u0631\u06CC\u062A \u06A9\u0627\u0631\u0628\u0631\u0627\u0646", "users.add": "+ \u06A9\u0627\u0631\u0628\u0631 \u062C\u062F\u06CC\u062F", "users.name": "\u0646\u0627\u0645", "users.status": "\u0648\u0636\u0639\u06CC\u062A", "users.used": "\u0645\u0635\u0631\u0641", "users.expiry": "\u0627\u0646\u0642\u0636\u0627",
    "users.empty": "\u0647\u0646\u0648\u0632 \u06A9\u0627\u0631\u0628\u0631\u06CC \u0646\u06CC\u0633\u062A \u2014 \u0627\u0648\u0644 \u06CC\u06A9 \u06A9\u0627\u0631\u0628\u0631 \u0628\u0633\u0627\u0632",
    "u.active": "\u0641\u0639\u0627\u0644", "u.inactive": "\u063A\u06CC\u0631\u0641\u0639\u0627\u0644", "u.expired": "\u0645\u0646\u0642\u0636\u06CC", "u.sub": "\u0627\u0634\u062A\u0631\u0627\u06A9", "u.del": "\u062D\u0630\u0641",
    "sub.title": "\u0633\u0627\u062E\u062A \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0627\u0634\u062A\u0631\u0627\u06A9", "sub.user": "\u06A9\u0627\u0631\u0628\u0631", "sub.userD": "\u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0627\u0631\u0628\u0631 \u0628\u0631\u0627\u06CC \u0646\u0645\u0627\u06CC\u0634 \u06A9\u0627\u0646\u0641\u06CC\u06AF",
    "sub.vless": "VLESS", "sub.vlessD": "\u067E\u0631\u0648\u062A\u06A9\u0644 \u0627\u0635\u0644\u06CC \u2014 \u0631\u0648\u06CC WebSocket + TLS",
    "sub.trojan": "Trojan", "sub.trojanD": "\u067E\u0631\u0648\u062A\u06A9\u0644 \u062F\u0648\u0645 \u2014 \u0627\u0633\u062A\u062A\u0627\u0631 \u0628\u0647\u062A\u0631",
    "sub.warp": "WARP", "sub.warpD": "\u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u06CC \u0627\u0632 \u062A\u0645\u0627\u0633\u200C\u0647\u0627 (UDP) \u0648 \u0634\u0631\u0627\u06CC\u0637 \u0628\u062D\u0631\u0627\u0646\u06CC",
    "sub.preview": "\u067E\u06CC\u0634\u200C\u0646\u0645\u0627\u06CC\u0634 \u06A9\u0627\u0646\u0641\u06CC\u06AF", "sub.previewD": "\u062E\u0631\u0648\u062C\u06CC \u0628\u0631\u0627\u06CC \u06A9\u0644\u0627\u06CC\u0646\u062A\u200C\u0647\u0627", "sub.copy": "\u06A9\u067E\u06CC", "sub.gen": "\u062A\u0648\u0644\u06CC\u062F \u0645\u062C\u062F\u062F",
    "sub.empty": "\u0647\u0646\u0648\u0632 \u06A9\u0627\u0631\u0628\u0631\u06CC \u0646\u0633\u0627\u062E\u062A\u06CC \u2014 \u0627\u0648\u0644 \u0627\u0632 \u0628\u062E\u0634 \xAB\u06A9\u0627\u0631\u0628\u0631\u0627\u0646\xBB \u06CC\u06A9 \u06A9\u0627\u0631\u0628\u0631 \u0628\u0633\u0627\u0632",
    "set.general": "\u0639\u0645\u0648\u0645\u06CC", "set.title": "\u0639\u0646\u0648\u0627\u0646 \u067E\u0646\u0644", "set.host": "\u062F\u0627\u0645\u0646\u0647 / Host \u0648\u0631\u06A9\u0631", "set.sni": "SNI / Host \u062C\u0639\u0644\u06CC",
    "set.wsPath": "\u0645\u0633\u06CC\u0631 WebSocket", "set.security": "\u0627\u0645\u0646\u06CC\u062A", "set.newpass": "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u062C\u062F\u06CC\u062F", "set.brute": "\u0645\u062D\u0627\u0641\u0638\u062A Brute-Force",
    "set.bruteD": "\u0645\u0633\u062F\u0648\u062F\u0633\u0627\u0632\u06CC \u0645\u0648\u0642\u062A \u0628\u0639\u062F \u0627\u0632 \u062A\u0644\u0627\u0634 \u0646\u0627\u0645\u0648\u0641\u0642", "set.cleanip": "IP \u0647\u0627\u06CC \u062A\u0645\u06CC\u0632", "set.cleanipD": "\u0647\u0631 \u062E\u0637 \u06CC\u06A9 IP", "set.save": "\u0630\u062E\u06CC\u0631\u0647 \u062A\u0646\u0638\u06CC\u0645\u0627\u062A",
    "m.addUser": "\u06A9\u0627\u0631\u0628\u0631 \u062C\u062F\u06CC\u062F", "m.name": "\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631", "m.namePh": "\u0645\u062B\u0644\u0627\u064B: \u0639\u0644\u06CC", "m.quota": "\u0633\u0647\u0645\u06CC\u0647 (GB)", "m.days": "\u0645\u062F\u062A (\u0631\u0648\u0632)",
    "m.save": "\u0630\u062E\u06CC\u0631\u0647", "m.cancel": "\u0627\u0646\u0635\u0631\u0627\u0641",
    "toast.copied": "\u06A9\u067E\u06CC \u0634\u062F \u2713", "toast.saved": "\u0630\u062E\u06CC\u0631\u0647 \u0634\u062F \u2713", "toast.deleted": "\u062D\u0630\u0641 \u0634\u062F", "toast.gen": "\u06A9\u0627\u0646\u0641\u06CC\u06AF \u0628\u0647\u200C\u0631\u0648\u0632 \u0634\u062F \u2713",
    "toast.toggled": "\u0648\u0636\u0639\u06CC\u062A \u062A\u063A\u06CC\u06CC\u0631 \u06A9\u0631\u062F", "toast.preview": "\u062F\u0631 \u067E\u06CC\u0634\u200C\u0646\u0645\u0627\u06CC\u0634\u060C \u0627\u062A\u0635\u0627\u0644 \u0628\u0647 \u0633\u0631\u0648\u0631 \u0646\u06CC\u0633\u062A",
    "common.error": "\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u0627\u0637\u0644\u0627\u0639\u0627\u062A", "common.loading": "\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC\u2026",
    "page.dash": "\u062F\u0627\u0634\u0628\u0648\u0631\u062F", "page.dashD": "\u0646\u0645\u0627\u06CC \u06A9\u0644\u06CC \u0648\u0636\u0639\u06CC\u062A \u067E\u0646\u0644", "page.users": "\u06A9\u0627\u0631\u0628\u0631\u0627\u0646", "page.usersD": "\u0645\u062F\u06CC\u0631\u06CC\u062A \u06A9\u0627\u0631\u0628\u0631\u0627\u0646 \u0648 \u0627\u0634\u062A\u0631\u0627\u06A9\u200C\u0647\u0627",
    "page.sub": "\u0627\u0634\u062A\u0631\u0627\u06A9", "page.subD": "\u0633\u0627\u062E\u062A \u0648 \u067E\u06CC\u0634\u200C\u0646\u0645\u0627\u06CC\u0634 \u06A9\u0627\u0646\u0641\u06CC\u06AF", "page.set": "\u062A\u0646\u0638\u06CC\u0645\u0627\u062A", "page.setD": "\u067E\u06CC\u06A9\u0631\u0628\u0646\u062F\u06CC \u067E\u0646\u0644 \u0648 \u0627\u0645\u0646\u06CC\u062A",
  },
  en: {
    dir: "ltr", lang: "en",
    "login.title": "Nika Net", "login.sub": "Proxy control panel \u2014 on Cloudflare Workers",
    "login.password": "Admin password", "login.passwordPh": "Password", "login.enter": "Sign in",
    "login.hintFirst": "\u{1F513} First sign-in \u2014 the password you choose becomes the admin password (min 4 chars)",
    "login.hintPass": "Enter the admin password",
    "login.hintPreview": "This is a static preview \u2014 open the live panel URL for real data",
    "login.wrong": "Wrong password", "login.short": "Password must be at least 4 characters",
    "nav.dash": "Dashboard", "nav.users": "Users", "nav.sub": "Subscription", "nav.settings": "Settings", "nav.scan": "IP Scanner", "nav.upd": "Update",
    "stat.users": "Users", "stat.active": "active", "stat.req": "Requests today", "stat.gig": "GB used", "stat.proto": "Active protocols",
    "dash.traffic": "Traffic (last 7 days)", "dash.gb": "in gigabytes", "dash.usage": "Usage", "dash.activity": "Recent activity",
    "dash.today": "today", "dash.nochart": "No traffic data yet", "act.empty": "No activity yet",
    "users.title": "User management", "users.add": "+ Add user", "users.name": "Name", "users.status": "Status", "users.used": "Usage", "users.expiry": "Expiry",
    "users.empty": "No users yet \u2014 create your first user",
    "u.active": "Active", "u.inactive": "Inactive", "u.expired": "Expired", "u.sub": "Sub", "u.del": "Delete",
    "sub.title": "Build subscription config", "sub.user": "User", "sub.userD": "Pick a user to show their config",
    "sub.vless": "VLESS", "sub.vlessD": "Primary protocol \u2014 over WebSocket + TLS",
    "sub.trojan": "Trojan", "sub.trojanD": "Secondary protocol \u2014 better stealth",
    "sub.warp": "WARP", "sub.warpD": "Calls (UDP) support & critical situations",
    "sub.preview": "Config preview", "sub.previewD": "Output for clients", "sub.copy": "Copy", "sub.gen": "Regenerate",
    "sub.empty": "No users yet \u2014 create one under Users first",
    "set.general": "General", "set.title": "Panel title", "set.host": "Worker domain / host", "set.sni": "Fake SNI / Host",
    "set.wsPath": "WebSocket path", "set.security": "Security", "set.newpass": "New password", "set.brute": "Brute-force protection",
    "set.bruteD": "Temporary block after failed attempts", "set.cleanip": "Clean IPs", "set.cleanipD": "One IP per line", "set.save": "Save settings",
    "m.addUser": "New user", "m.name": "Name", "m.namePh": "e.g. Ali", "m.quota": "Quota (GB)", "m.days": "Days",
    "m.save": "Save", "m.cancel": "Cancel",
    "toast.copied": "Copied \u2713", "toast.saved": "Saved \u2713", "toast.deleted": "Deleted", "toast.gen": "Config refreshed \u2713",
    "toast.toggled": "Status changed", "toast.preview": "No server connection in preview mode",
    "common.error": "Failed to load", "common.loading": "Loading\u2026",
    "page.dash": "Dashboard", "page.dashD": "Panel status overview", "page.users": "Users", "page.usersD": "Manage users & subscriptions",
    "page.sub": "Subscription", "page.subD": "Build & preview configs", "page.set": "Settings", "page.setD": "Panel config & security",
  },
};
let LANG = store.getItem("nn_lang") || "fa";
const t = (k) => (I18N[LANG] && I18N[LANG][k]) || I18N.fa[k] || k;
const escHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (n) => (n == null ? 0 : n).toLocaleString(LANG === "fa" ? "fa-IR" : "en-US");

/* ---------- update page i18n ---------- */
I18N.fa["upd.title"] = "\u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u067E\u0646\u0644";
I18N.fa["upd.current"] = "\u0646\u0633\u062E\u0647 \u0641\u0639\u0644\u06CC";
I18N.fa["upd.latest"] = "\u0622\u062E\u0631\u06CC\u0646 \u0646\u0633\u062E\u0647";
I18N.fa["upd.notes"] = "\u062A\u063A\u06CC\u06CC\u0631\u0627\u062A";
I18N.fa["upd.check"] = "\u0628\u0631\u0631\u0633\u06CC \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC";
I18N.fa["upd.uptodate"] = "\u067E\u0646\u0644 \u0628\u0647\u200C\u0631\u0648\u0632 \u0627\u0633\u062A \u2713";
I18N.fa["upd.available"] = "\u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u062C\u062F\u06CC\u062F \u0645\u0648\u062C\u0648\u062F \u0627\u0633\u062A!";
I18N.fa["upd.apply"] = "\u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u06A9\u0646";
I18N.fa["upd.applying"] = "\u062F\u0631 \u062D\u0627\u0644 \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC\u2026";
I18N.fa["upd.done"] = "\u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0627\u0646\u062C\u0627\u0645 \u0634\u062F \u2713";
I18N.fa["upd.err"] = "\u062E\u0637\u0627 \u062F\u0631 \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC";
I18N.fa["upd.token"] = "\u062A\u0648\u06A9\u0646 Cloudflare";
I18N.fa["upd.tokenD"] = "\u0628\u0631\u0627\u06CC \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u062E\u0648\u062F\u06A9\u0627\u0631\u060C \u062A\u0648\u06A9\u0646 \u0627\u06A9\u0627\u0646\u062A Cloudflare \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646";
I18N.fa["upd.bot"] = "\u06CC\u0627 \u0627\u0632 \u0637\u0631\u06CC\u0642 \u0631\u0628\u0627\u062A \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u06A9\u0646";
I18N.fa["page.update"] = "\u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC";
I18N.fa["page.updateD"] = "\u0628\u0631\u0631\u0633\u06CC \u0648 \u0646\u0635\u0628 \u0622\u062E\u0631\u06CC\u0646 \u0646\u0633\u062E\u0647\u0654 \u067E\u0646\u0644";
I18N.en["upd.title"] = "Panel update";
I18N.en["upd.current"] = "Current version";
I18N.en["upd.latest"] = "Latest version";
I18N.en["upd.notes"] = "What's new";
I18N.en["upd.check"] = "Check for updates";
I18N.en["upd.uptodate"] = "Panel is up to date \u2713";
I18N.en["upd.available"] = "New update available!";
I18N.en["upd.apply"] = "Update now";
I18N.en["upd.applying"] = "Updating\u2026";
I18N.en["upd.done"] = "Update complete \u2713";
I18N.en["upd.err"] = "Update failed";
I18N.en["upd.token"] = "Cloudflare token";
I18N.en["upd.tokenD"] = "To self-update, paste your Cloudflare account token";
I18N.en["upd.bot"] = "Or update via the bot";
I18N.en["page.update"] = "Update";
I18N.en["page.updateD"] = "Check & install the latest panel version";

let updState = { current: "\u2014", latest: "\u2014", upToDate: false, notes: "" };
async function checkUpdate() {
  if (MODE !== "live") { updState = { current: "preview", latest: "\u2014", upToDate: true, notes: t("toast.preview") }; renderUpdate(); return; }
  try {
    const res = await api("/api/update/check");
    const d = await res.json().catch(() => ({}));
    updState = d;
    renderUpdate();
  } catch (e) { updState = { current: "\u2014", latest: "\u2014", upToDate: false, notes: t("common.error") }; renderUpdate(); }
}
function renderUpdate() {
  $("#updCurrent").textContent = updState.current || "\u2014";
  $("#updLatest").textContent = updState.latest || "\u2014";
  $("#updNotes").textContent = updState.notes || "\u2014";
  const st = $("#updStatus");
  st.textContent = updState.upToDate ? t("upd.uptodate") : t("upd.available");
  st.className = "upd-status " + (updState.upToDate ? "ok" : "warn");
  $("#updApply").disabled = !!updState.upToDate;
}
async function applyUpdate() {
  if (MODE !== "live") { toast(t("toast.preview")); return; }
  const token = $("#updToken").value.trim();
  if (!token) { toast(t("upd.token")); return; }
  const btn = $("#updApply"); btn.disabled = true;
  $("#updApplyLbl").textContent = t("upd.applying");
  try {
    const res = await api("/api/update/apply", { method: "POST", body: { token } });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.ok) { toast(t("upd.done")); await checkUpdate(); }
    else toast(d.error || t("upd.err"));
  } catch (e) { toast(t("upd.err")); }
  btn.disabled = false;
  $("#updApplyLbl").textContent = t("upd.apply");
}

function applyLang() {
  const d = I18N[LANG];
  document.documentElement.lang = d.lang;
  document.documentElement.dir = d.dir;
  $$("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  $$("[data-i18n-ph]").forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
  setPage(currentPage);
}

/* ---------- theme ---------- */
let THEME = store.getItem("nn_theme") || "dark";
function applyTheme() {
  document.documentElement.dataset.theme = THEME;
  $("#iconMoon").classList.toggle("hidden", THEME !== "dark");
  $("#iconSun").classList.toggle("hidden", THEME !== "light");
}
$("#themeBtn").onclick = () => { THEME = THEME === "dark" ? "light" : "dark"; store.setItem("nn_theme", THEME); applyTheme(); };
$("#langBtn").onclick = () => { LANG = LANG === "fa" ? "en" : "fa"; store.setItem("nn_lang", LANG); applyLang(); };

/* ---------- state ---------- */
let MODE = "preview"; // "live" | "preview"
let SETUP = false;
let currentPage = "dashboard";
let currentFmt = "base64";
let proto = { vless: true, trojan: true, warp: true };
const state = { status: null, users: [], settings: null, selectedUserId: null, gen: null };

/* ---------- api ---------- */
async function api(path, opts = {}) {
  const init = { method: opts.method || "GET", headers: {} };
  if (opts.body !== undefined) {
    init.headers["content-type"] = "application/json";
    init.body = JSON.stringify(opts.body);
  }
  return fetch(path, init); // same-origin: cookies included automatically
}

/* ---------- toast ---------- */
let toastTimer;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
}

/* ---------- boot ---------- */
async function init() {
  applyTheme();
  applyLang();
  try {
    const res = await api("/api/info");
    const info = await res.json();
    if (res.ok && info && typeof info.setup === "boolean") {
      MODE = "live";
      SETUP = info.setup;
      if (info.protocols) proto = info.protocols;
      await checkSession();
      return;
    }
  } catch (e) { /* fall through to preview */ }
  MODE = "preview";
  $("#demoHint").textContent = t("login.hintPreview");
  showLogin();
}

async function checkSession() {
  const res = await api("/api/status");
  if (res.ok) {
    await loadAll();
    showApp();
  } else {
    $("#demoHint").textContent = SETUP ? t("login.hintFirst") : t("login.hintPass");
    showLogin();
  }
}

function showLogin() { $("#appView").classList.add("hidden"); $("#loginView").classList.remove("hidden"); }
function showApp() { $("#loginView").classList.add("hidden"); $("#appView").classList.remove("hidden"); }

/* ---------- auth ---------- */
async function doLogin() {
  if (MODE !== "live") { toast(t("toast.preview")); return; }
  const pass = $("#loginPass").value;
  if (!pass) { $("#loginError").textContent = t("login.short"); return; }
  const res = await api("/api/login", { method: "POST", body: { password: pass } });
  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    if (data.setup) SETUP = false;
    $("#loginPass").value = "";
    $("#loginError").textContent = "";
    await loadAll();
    showApp();
  } else {
    $("#loginError").textContent = data.error === "password too short" ? t("login.short") : t("login.wrong");
  }
}
$("#loginBtn").onclick = doLogin;
$("#loginPass").addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });

$("#logoutBtn").onclick = async () => {
  if (MODE === "live") { try { await api("/api/logout", { method: "POST" }); } catch (e) {} }
  state.status = null; state.users = []; state.settings = null; state.selectedUserId = null; state.gen = null;
  showLogin();
};

/* ---------- data ---------- */
async function loadAll() {
  try {
    const [st, us, se] = await Promise.all([
      api("/api/status").then((r) => r.json()),
      api("/api/users").then((r) => r.json()),
      api("/api/settings").then((r) => r.json()),
    ]);
    state.status = st;
    state.users = Array.isArray(us) ? us : [];
    state.settings = se;
    if (se && se.protocols) proto = se.protocols;
    syncProtoToggles();
    if (!state.selectedUserId && state.users.length) state.selectedUserId = state.users[0].id;
    if (state.selectedUserId && !state.users.find((u) => u.id === state.selectedUserId)) state.selectedUserId = state.users[0] ? state.users[0].id : null;
    renderDashboard();
    renderUsers();
    renderSub();
  } catch (e) {
    toast(t("common.error"));
  }
}

/* ---------- navigation ---------- */
const PAGES = { dashboard: "page.dash", users: "page.users", subscription: "page.sub", settings: "page.set", scanner: "page.scanner", update: "page.update" };
const DESCS = { dashboard: "page.dashD", users: "page.usersD", subscription: "page.subD", settings: "page.setD", scanner: "page.scannerD", update: "page.updateD" };
function setPage(p) {
  currentPage = p;
  $$("#nav .nav-item").forEach((b) => b.classList.toggle("active", b.dataset.page === p));
  ["dashboard", "users", "subscription", "settings", "scanner", "update"].forEach((x) => $("#page-" + x).classList.toggle("hidden", x !== p));
  $("#pageTitle").textContent = t(PAGES[p]);
  $("#pageDesc").textContent = t(DESCS[p]);
  if (p === "settings") fillSettingsForm();
  if (p === "scanner" && typeof SCANNER !== "undefined") SCANNER.onOpen();
  if (p === "update") checkUpdate();
}
$$("#nav .nav-item").forEach((b) => (b.onclick = () => setPage(b.dataset.page)));

/* ---------- dashboard ---------- */
function renderDashboard() {
  const st = state.status || {};
  $("#stUsers").textContent = num(st.users);
  $("#stUsersT").textContent = \`\${t("stat.active")}: \${num(st.active)}\`;
  $("#stReq").textContent = num(st.requestsToday);
  $("#stReqT").textContent = t("dash.today");
  $("#stGig").textContent = (st.usedGb || 0).toFixed(2);
  $("#stGigT").textContent = "GB";
  const enabled = ["vless", "trojan", "warp"].filter((p) => st.protocols && st.protocols[p]);
  $("#stProto").textContent = enabled.length;
  $("#stProtoT").textContent = enabled.map((p) => p.toUpperCase()).join("\xB7") || "\u2014";
  drawChart(st.traffic7d);
  renderActivity(st.activity);
}

function drawChart(series) {
  const el = $("#chart");
  const empty = $("#chartEmpty");
  if (!series || !series.length || series.every((p) => (p.gb || 0) === 0)) {
    el.classList.add("hidden");
    empty.classList.remove("hidden");
    empty.textContent = t("dash.nochart");
    return;
  }
  el.classList.remove("hidden");
  empty.classList.add("hidden");
  const data = series.map((p) => p.gb || 0);
  const W = 560, H = 190, P = 8;
  const max = Math.max(...data, 0.01) * 1.2;
  const pts = data.map((v, i) => [P + (i * (W - 2 * P)) / (data.length - 1), H - P - (v / max) * (H - 2 * P)]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  $("#linePath").setAttribute("d", line);
  $("#areaPath").setAttribute("d", line + \` L\${pts[pts.length - 1][0]},\${H - P} L\${pts[0][0]},\${H - P} Z\`);
}

function renderActivity(list) {
  const el = $("#activity");
  if (!list || !list.length) { el.innerHTML = \`<div class="empty">\${t("act.empty")}</div>\`; return; }
  el.innerHTML = list
    .slice(0, 8)
    .map((a) => {
      const when = new Date(a.time).toLocaleString(LANG === "fa" ? "fa-IR" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      return \`<div class="row"><div><div class="k">\${a.icon ? a.icon + " " : ""}\${escHtml(a.text)}</div><div class="d">\${when}</div></div></div>\`;
    })
    .join("");
}

/* ---------- users ---------- */
function renderUsers() {
  const tb = $("#usersBody");
  if (!state.users.length) {
    tb.innerHTML = \`<tr><td colspan="5"><div class="empty">\${t("users.empty")}</div></td></tr>\`;
    return;
  }
  tb.innerHTML = state.users
    .map((u) => {
      const quota = Number(u.quota) || 0;
      const used = Number(u.used) || 0;
      const pct = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;
      const exp = (Number(u.days) || 0) > 0 ? \`\${u.days} \${t("m.days").toLowerCase()}\` : t("u.expired");
      return \`<tr>
        <td><b>\${escHtml(u.name)}</b></td>
        <td><span class="badge \${u.active ? "ok" : "off"}" style="cursor:pointer" onclick="toggleUser('\${u.id}')"><span class="dot"></span>\${t(u.active ? "u.active" : "u.inactive")}</span></td>
        <td><div>\${used.toFixed(2)} / \${quota} GB</div><div class="progress"><div style="width:\${pct}%"></div></div></td>
        <td>\${exp}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-ghost" style="padding:7px 12px;font-size:11.5px" onclick="subFor('\${u.id}')">\u{1F517} \${t("u.sub")}</button>
          <button class="btn btn-danger" style="padding:7px 12px;font-size:11.5px" onclick="delUser('\${u.id}')">\u2715</button>
        </td></tr>\`;
    })
    .join("");
}

async function toggleUser(id) {
  if (MODE !== "live") { toast(t("toast.preview")); return; }
  const res = await api("/api/users/toggle", { method: "POST", body: { id } });
  if (res.ok) { toast(t("toast.toggled")); await loadAll(); }
  else toast(t("common.error"));
}

async function delUser(id) {
  if (MODE !== "live") { toast(t("toast.preview")); return; }
  const res = await api("/api/users?id=" + encodeURIComponent(id), { method: "DELETE" });
  if (res.ok) { toast(t("toast.deleted")); await loadAll(); }
  else toast(t("common.error"));
}

function subFor(id) {
  state.selectedUserId = id;
  setPage("subscription");
  renderSub();
}

/* ---------- add user modal ---------- */
function openAddUser() {
  if (MODE !== "live") { toast(t("toast.preview")); return; }
  $("#modalBack").classList.remove("hidden");
  $("#modalBack").innerHTML = \`<div class="modal">
    <h3 data-i18n="m.addUser">\u06A9\u0627\u0631\u0628\u0631 \u062C\u062F\u06CC\u062F</h3>
    <div class="field"><label data-i18n="m.name">\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631</label><input class="input" id="mName" data-i18n-ph="m.namePh" placeholder="\u0645\u062B\u0644\u0627\u064B: \u0639\u0644\u06CC"/></div>
    <div class="field-grid">
      <div class="field"><label data-i18n="m.quota">\u0633\u0647\u0645\u06CC\u0647 (GB)</label><input class="input" id="mQuota" type="number" value="50"/></div>
      <div class="field"><label data-i18n="m.days">\u0645\u062F\u062A (\u0631\u0648\u0632)</label><input class="input" id="mDays" type="number" value="30"/></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button class="btn btn-primary" id="mSave" data-i18n="m.save">\u0630\u062E\u06CC\u0631\u0647</button>
      <button class="btn btn-ghost" id="mCancel" data-i18n="m.cancel">\u0627\u0646\u0635\u0631\u0627\u0641</button>
    </div>
  </div>\`;
  applyLang();
  $("#mCancel").onclick = () => $("#modalBack").classList.add("hidden");
  $("#mSave").onclick = async () => {
    const name = $("#mName").value.trim() || t("m.namePh");
    const quota = +$("#mQuota").value || 50;
    const days = +$("#mDays").value || 30;
    const res = await api("/api/users", { method: "POST", body: { name, quota, days } });
    if (res.ok) { toast(t("toast.saved")); $("#modalBack").classList.add("hidden"); await loadAll(); }
    else toast(t("common.error"));
  };
}
$("#addUserBtn").onclick = openAddUser;
$("#modalBack").onclick = (e) => { if (e.target.id === "modalBack") $("#modalBack").classList.add("hidden"); };

/* ---------- subscription ---------- */
async function renderSub() {
  syncProtoToggles();
  const sel = $("#subUserSel");
  if (sel) {
    sel.innerHTML = state.users.map((u) => \`<option value="\${u.id}">\${escHtml(u.name)}</option>\`).join("");
    if (state.selectedUserId) sel.value = state.selectedUserId;
  }
  if (!state.users.length) {
    $("#fmtOut").textContent = t("sub.empty");
    $("#copyBtn").disabled = true;
    return;
  }
  $("#copyBtn").disabled = false;
  await loadGen();
}

async function loadGen() {
  const id = state.selectedUserId || (state.users[0] && state.users[0].id);
  if (!id) return;
  try {
    const res = await api("/api/gen?id=" + encodeURIComponent(id));
    if (!res.ok) { $("#fmtOut").textContent = t("common.error"); return; }
    state.gen = await res.json();
    renderFmt();
  } catch (e) {
    $("#fmtOut").textContent = t("common.error");
  }
}

function renderFmt() {
  const g = state.gen || {};
  const map = {
    base64: "vmess://" + (g.base64 || ""),
    clash: g.clash || "",
    singbox: g.singbox || "",
    warp: g.warp || \`# WARP \${LANG === "fa" ? "\u063A\u06CC\u0631\u0641\u0639\u0627\u0644 \u0627\u0633\u062A" : "disabled"}\`,
  };
  $("#fmtOut").textContent = map[currentFmt] || "";
}

function syncProtoToggles() {
  $$(".toggle[data-p]").forEach((el) => {
    const p = el.dataset.p;
    el.classList.toggle("on", !!proto[p]);
  });
}

async function toggleProto(el) {
  const p = el.dataset.p;
  el.classList.toggle("on");
  proto[p] = el.classList.contains("on");
  if (MODE === "live") {
    const res = await api("/api/settings", { method: "POST", body: { protocols: proto } });
    if (res.ok) { toast(t("toast.saved")); await loadGen(); }
    else { el.classList.toggle("on"); proto[p] = !proto[p]; }
  }
}

$$("#fmtTabs .tab").forEach((b) => (b.onclick = () => {
  currentFmt = b.dataset.fmt;
  $$("#fmtTabs .tab").forEach((x) => x.classList.toggle("active", x === b));
  renderFmt();
}));
$("#copyBtn").onclick = async () => {
  try { await navigator.clipboard.writeText($("#fmtOut").textContent); toast(t("toast.copied")); }
  catch (e) { toast("\u2715"); }
};
$("#refreshBtn").onclick = () => { loadGen(); toast(t("toast.gen")); };

/* ---------- settings ---------- */
function fillSettingsForm() {
  $("#setTitle").value = (state.settings && state.settings.title) || "";
  $("#setHost").value = (state.settings && state.settings.host) || "";
  $("#setSni").value = (state.settings && state.settings.sni) || "";
  $("#setWsPath").value = (state.settings && state.settings.wsPath) || "";
  $("#setIps").value = ((state.settings && state.settings.cleanIps) || []).join("\\n");
}
$("#saveBtn").onclick = async () => {
  if (MODE !== "live") { toast(t("toast.preview")); return; }
  const body = {
    title: $("#setTitle").value || "Nika Net",
    host: $("#setHost").value,
    sni: $("#setSni").value,
    wsPath: $("#setWsPath").value || "/nika-ws",
    cleanIps: $("#setIps").value.split("\\n").map((x) => x.trim()).filter(Boolean),
    protocols: proto,
  };
  const res = await api("/api/settings", { method: "POST", body });
  if (res.ok) { toast(t("toast.saved")); await loadAll(); }
  else toast(t("common.error"));
};

$("#updCheck").onclick = checkUpdate;
$("#updApply").onclick = applyUpdate;

/* ---------- boot ---------- */
init();

<\/script>
<script>
/* ================================================================
   Nika Net \u2014 IP Scanner (clean Cloudflare IP discovery)
   Browser-side timing probe: a live Cloudflare edge completes its
   TLS handshake fast (20\u2013150 ms) while a dead/blocked IP times out.
   The scanner probes candidate IPs in parallel, ranks them by
   latency, and can push the best ones into the panel's clean-IP
   list so every generated config uses them.
   ================================================================ */

/* i18n for the scanner */
I18N.fa["scanner.title"] = "\u0627\u0633\u06A9\u0646\u0631 IP \u062A\u0645\u06CC\u0632";
I18N.fa["scanner.sub"] = "\u062A\u0633\u062A \u0648 \u06AF\u0644\u0686\u06CC\u0646 \u0628\u0647\u062A\u0631\u06CC\u0646 IP \u0647\u0627\u06CC \u06A9\u0644\u0648\u062F\u0641\u0644\u0631 \u0627\u0632 \u0634\u0628\u06A9\u0647\u0654 \u062A\u0648";
I18N.fa["scan.source"] = "\u0645\u0646\u0628\u0639 IP \u0647\u0627";
I18N.fa["scan.bundled"] = "\u0644\u06CC\u0633\u062A \u062F\u0627\u062E\u0644\u06CC";
I18N.fa["scan.custom"] = "\u0644\u06CC\u0633\u062A \u0634\u062E\u0635\u06CC";
I18N.fa["scan.customD"] = "\u0647\u0631 \u062E\u0637 \u06CC\u06A9 IP \u06CC\u0627 \u0631\u0646\u062C CIDR";
I18N.fa["scan.target"] = "\u062A\u0639\u062F\u0627\u062F \u0647\u062F\u0641";
I18N.fa["scan.ports"] = "\u067E\u0648\u0631\u062A \u0647\u0627";
I18N.fa["scan.conc"] = "\u0647\u0645\u0632\u0645\u0627\u0646\u06CC";
I18N.fa["scan.timeout"] = "\u062A\u0627\u06CC\u0645\u200C\u0627\u0648\u062A (ms)";
I18N.fa["scan.start"] = "\u25B6 \u0634\u0631\u0648\u0639 \u0627\u0633\u06A9\u0646";
I18N.fa["scan.stop"] = "\u25A0 \u062A\u0648\u0642\u0641";
I18N.fa["scan.phase1"] = "\u062F\u0631 \u062D\u0627\u0644 \u067E\u0631\u0648\u0628 IP \u0647\u0627\u2026";
I18N.fa["scan.done"] = "\u0627\u0633\u06A9\u0646 \u062A\u0645\u0627\u0645 \u0634\u062F";
I18N.fa["scan.tested"] = "\u062A\u0633\u062A \u0634\u062F\u0647";
I18N.fa["scan.alive"] = "\u0633\u0627\u0644\u0645";
I18N.fa["scan.dead"] = "\u0645\u0631\u062F\u0647";
I18N.fa["scan.best"] = "\u0628\u0647\u062A\u0631\u06CC\u0646";
I18N.fa["scan.results"] = "\u0646\u062A\u0627\u06CC\u062C \u0632\u0646\u062F\u0647";
I18N.fa["scan.resultsD"] = "\u0645\u0631\u062A\u0628 \u0628\u0631 \u0627\u0633\u0627\u0633 \u062A\u0623\u062E\u06CC\u0631 \u2014 \u0628\u0631\u0627\u06CC \u06A9\u067E\u06CC \u0631\u0648\u06CC \u0647\u0631 IP \u0628\u0632\u0646";
I18N.fa["scan.lat"] = "\u062A\u0623\u062E\u06CC\u0631";
I18N.fa["scan.port"] = "\u067E\u0648\u0631\u062A";
I18N.fa["scan.status"] = "\u0648\u0636\u0639\u06CC\u062A";
I18N.fa["scan.apply"] = "\u26A1 \u0627\u0639\u0645\u0627\u0644 \u0628\u0647 \u067E\u0646\u0644";
I18N.fa["scan.applyD"] = "\u0628\u0647\u062A\u0631\u06CC\u0646 IP \u0647\u0627 \u062C\u0627\u06CC\u06AF\u0632\u06CC\u0646 \u0644\u06CC\u0633\u062A IP \u062A\u0645\u06CC\u0632 \u067E\u0646\u0644 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F";
I18N.fa["scan.copy"] = "\u{1F4CB} \u06A9\u067E\u06CC";
I18N.fa["scan.export"] = "\u2B07 \u062E\u0631\u0648\u062C\u06CC";
I18N.fa["scan.empty"] = "\u0647\u0646\u0648\u0632 \u0627\u0633\u06A9\u0646\u06CC \u0634\u0631\u0648\u0639 \u0646\u0634\u062F\u0647 \u2014 \u062F\u06A9\u0645\u0647\u0654 \u0634\u0631\u0648\u0639 \u0631\u0627 \u0628\u0632\u0646";
I18N.fa["scan.none"] = "\u0647\u06CC\u0686 IP \u0633\u0627\u0644\u0645\u06CC \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F \u2014 \u062A\u0627\u06CC\u0645\u200C\u0627\u0648\u062A \u0631\u0627 \u0628\u06CC\u0634\u062A\u0631 \u06CC\u0627 \u067E\u0648\u0631\u062A \u0631\u0627 \u0639\u0648\u0636 \u06A9\u0646";
I18N.fa["scan.applied"] = "\u0628\u0647\u062A\u0631\u06CC\u0646 IP \u0647\u0627 \u0628\u0647 \u067E\u0646\u0644 \u0627\u0639\u0645\u0627\u0644 \u0634\u062F \u2713";
I18N.fa["scan.copied"] = "IP \u0647\u0627 \u06A9\u067E\u06CC \u0634\u062F \u2713";
I18N.fa["scan.hist"] = "\u062A\u0648\u0632\u06CC\u0639 \u062A\u0623\u062E\u06CC\u0631 (ms)";
I18N.fa["scan.running"] = "\u0627\u0633\u06A9\u0646 \u062F\u0631 \u062D\u0627\u0644 \u0627\u0646\u062C\u0627\u0645 \u0627\u0633\u062A\u2026";
I18N.fa["scan.ms"] = "ms";
I18N.fa["scan.live"] = "\u0633\u0627\u0644\u0645";
I18N.fa["scan.deadL"] = "\u0645\u0631\u062F\u0647";
I18N.fa["scan.top5"] = "\u06F5 \u0628\u0631\u062A\u0631";

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
I18N.en["scan.start"] = "\u25B6 Start scan";
I18N.en["scan.stop"] = "\u25A0 Stop";
I18N.en["scan.phase1"] = "Probing IPs\u2026";
I18N.en["scan.done"] = "Scan complete";
I18N.en["scan.tested"] = "Tested";
I18N.en["scan.alive"] = "Alive";
I18N.en["scan.dead"] = "Dead";
I18N.en["scan.best"] = "Best";
I18N.en["scan.results"] = "Live results";
I18N.en["scan.resultsD"] = "Sorted by latency \u2014 click an IP to copy";
I18N.en["scan.lat"] = "Latency";
I18N.en["scan.port"] = "Port";
I18N.en["scan.status"] = "Status";
I18N.en["scan.apply"] = "\u26A1 Apply to panel";
I18N.en["scan.applyD"] = "Top IPs replace the panel's clean-IP list";
I18N.en["scan.copy"] = "\u{1F4CB} Copy";
I18N.en["scan.export"] = "\u2B07 Export";
I18N.en["scan.empty"] = "No scan yet \u2014 press start";
I18N.en["scan.none"] = "No alive IP found \u2014 raise the timeout or change the port";
I18N.en["scan.applied"] = "Top IPs applied to the panel \u2713";
I18N.en["scan.copied"] = "IPs copied \u2713";
I18N.en["scan.hist"] = "Latency distribution (ms)";
I18N.en["scan.running"] = "Scan running\u2026";
I18N.en["scan.ms"] = "ms";
I18N.en["scan.live"] = "alive";
I18N.en["scan.deadL"] = "dead";
I18N.en["scan.top5"] = "Top 5";
I18N.en["page.scanner"] = "IP Scanner";
I18N.en["page.scannerD"] = "Discover the fastest clean Cloudflare IPs";
I18N.fa["page.scanner"] = "\u0627\u0633\u06A9\u0646\u0631 IP";
I18N.fa["page.scannerD"] = "\u067E\u06CC\u062F\u0627 \u06A9\u0631\u062F\u0646 \u0633\u0631\u06CC\u0639\u200C\u062A\u0631\u06CC\u0646 IP \u0647\u0627\u06CC \u062A\u0645\u06CC\u0632 \u06A9\u0644\u0648\u062F\u0641\u0644\u0631";

const SCANNER = (() => {
  /* bundled seed list (curated clean Cloudflare IPv4) */
  const SEED = ["1.1.1.205", "103.116.7.159", "104.129.164.73", "104.16.0.158", "104.16.104.127", "104.16.105.208", "104.16.12.155", "104.16.122.31", "104.16.127.145", "104.16.134.94", "104.16.138.229", "104.16.15.61", "104.16.172.40", "104.16.200.105", "104.16.209.40", "104.16.228.155", "104.16.231.154", "104.16.234.166", "104.16.235.139", "104.16.241.3", "104.16.25.194", "104.16.33.169", "104.16.4.244", "104.16.42.140", "104.16.45.222", "104.16.66.24", "104.16.76.146", "104.16.78.31", "104.16.84.135", "104.16.84.24", "104.16.96.61", "104.17.101.85", "104.17.110.181", "104.17.112.46", "104.17.121.12", "104.17.122.238", "104.17.128.173", "104.17.146.211", "104.17.148.242", "104.17.150.98", "104.17.171.118", "104.17.18.167", "104.17.185.63", "104.17.187.8", "104.17.192.182", "104.17.195.233", "104.17.196.229", "104.17.197.221", "104.17.205.217", "104.17.207.42", "104.17.223.228", "104.17.228.165", "104.17.240.243", "104.17.246.44", "104.17.25.239", "104.17.251.86", "104.17.253.178", "104.17.255.201", "104.17.27.211", "104.17.29.174", "104.17.31.203", "104.17.34.42", "104.17.36.206", "104.17.38.50", "104.17.44.240", "104.17.48.188", "104.17.5.30", "104.17.61.65", "104.17.64.67", "104.17.82.189", "104.17.82.215", "104.17.9.155", "104.17.90.249", "104.18.1.81", "104.18.111.31", "104.18.114.234", "104.18.121.40", "104.18.146.241", "104.18.158.192", "104.18.160.180", "104.18.163.244", "104.18.164.174", "104.18.167.107", "104.18.170.147", "104.18.185.179", "104.18.188.115", "104.18.191.195", "104.18.193.85", "104.18.204.53", "104.18.209.237", "104.18.213.206", "104.18.216.44", "104.18.218.124", "104.18.220.15", "104.18.236.110", "104.18.237.80", "104.18.247.129", "104.18.248.155", "104.18.251.151", "104.18.253.86", "104.18.33.119", "104.18.34.232", "104.18.35.176", "104.18.5.36", "104.18.54.13", "104.18.54.231", "104.18.55.248", "104.18.79.228", "104.18.83.11", "104.19.103.173", "104.19.104.143", "104.19.107.209", "104.19.114.114", "104.19.114.252", "104.19.119.181", "104.19.134.215", "104.19.136.183", "104.19.144.198", "104.19.145.142", "104.19.158.214", "104.19.181.243", "104.19.186.216", "104.19.186.47", "104.19.189.251", "104.19.202.206", "104.19.229.52", "104.19.232.195", "104.19.237.179", "104.19.29.197", "104.19.38.85", "104.19.39.82", "104.19.41.171", "104.19.41.228", "104.19.50.59", "104.19.52.241", "104.19.56.137", "104.19.60.0", "104.19.62.255", "104.19.66.54", "104.19.74.36", "104.19.75.119", "104.19.80.247", "104.19.80.98", "104.19.85.153", "104.19.91.124", "104.19.94.184", "104.20.12.161", "104.20.32.42", "104.20.40.194", "104.20.59.177", "104.21.106.155", "104.21.112.26", "104.21.113.137", "104.21.118.199", "104.21.18.68", "104.21.20.139", "104.21.221.61", "104.21.223.242", "104.21.224.32", "104.21.225.43", "104.21.23.23", "104.21.23.44", "104.21.231.123", "104.21.236.58", "104.21.25.89", "104.21.31.159", "104.21.36.174", "104.21.36.188", "104.21.37.215", "104.21.38.34", "104.21.42.100", "104.21.48.98", "104.21.5.197", "104.21.60.85", "104.21.62.19", "104.21.62.231", "104.21.63.154", "104.21.64.55", "104.21.67.237", "104.21.69.179", "104.21.70.136", "104.21.71.248", "104.21.72.102", "104.21.73.17", "104.21.75.225", "104.21.81.12", "104.21.83.26", "104.21.86.13", "104.21.87.113", "104.21.88.178", "104.21.88.79", "104.21.92.203", "104.21.93.170", "104.21.94.118", "104.239.72.0", "104.239.72.195", "104.24.142.51", "104.24.143.32", "104.24.150.11", "104.24.151.152", "104.24.158.116", "104.24.172.151", "104.24.172.200", "104.24.180.71", "104.24.181.68", "104.24.188.188", "104.24.189.34", "104.24.197.160", "104.24.20.6", "104.24.203.122", "104.24.211.31", "104.24.225.235", "104.24.233.118", "104.24.235.222", "104.24.236.15", "104.24.236.44", "104.24.241.159", "104.24.246.92", "104.24.26.24", "104.24.27.31", "104.24.29.62", "104.24.33.28", "104.24.34.44", "104.24.41.212", "104.24.45.16", "104.24.63.194", "104.25.1.157", "104.25.101.151", "104.25.107.158", "104.25.110.90", "104.25.115.43", "104.25.120.120", "104.25.124.20", "104.25.126.55", "104.25.127.245", "104.25.13.108", "104.25.130.51", "104.25.133.76", "104.25.141.138", "104.25.142.39", "104.25.148.250", "104.25.160.5", "104.25.173.57", "104.25.188.19", "104.25.198.1", "104.25.203.160", "104.25.204.143", "104.25.206.186", "104.25.209.147", "104.25.209.209", "104.25.209.251", "104.25.210.72", "104.25.226.220", "104.25.236.188", "104.25.244.30", "104.25.245.249", "104.25.27.45", "104.25.4.110", "104.25.62.57", "104.25.64.10", "104.25.79.119", "104.25.83.106", "104.25.96.164", "104.26.1.153", "104.26.13.175", "104.26.15.230", "104.26.5.42", "104.27.101.189", "104.27.110.157", "104.27.118.231", "104.27.17.178", "104.27.193.209", "104.27.200.19", "104.27.206.168", "104.27.26.161", "104.27.36.27", "104.27.37.185", "104.27.38.72", "104.27.4.156", "104.27.44.72", "104.27.49.51", "104.27.52.44", "104.27.54.234", "104.27.88.172", "104.27.97.174", "104.27.97.42", "108.162.193.46", "139.64.235.227", "141.11.202.7", "147.185.161.10", "154.197.65.219", "154.83.2.193", "159.242.242.20", "162.159.1.250", "162.159.132.26", "162.159.141.125", "162.159.151.88", "162.159.156.223", "162.159.156.64", "162.159.229.25", "162.159.233.84", "162.159.245.27", "162.159.40.172", "162.159.43.230", "162.159.60.112", "162.159.93.59", "167.68.11.204", "170.114.52.147", "172.64.157.244", "172.64.189.14", "172.64.49.95", "172.64.53.114", "172.64.74.9", "172.64.82.227", "172.64.85.161", "172.64.87.231", "172.65.217.95", "172.65.223.179", "172.65.237.186", "172.65.54.9", "172.65.58.206", "172.66.147.124", "172.66.147.59", "172.66.148.106", "172.66.149.15", "172.66.152.213", "172.66.152.87", "172.66.159.171", "172.66.162.127", "172.66.169.65", "172.66.174.124", "172.66.174.6", "172.66.216.111", "172.67.126.76", "172.67.127.131", "172.67.133.245", "172.67.134.218", "172.67.135.190", "172.67.135.47", "172.67.136.112", "172.67.140.237", "172.67.140.83", "172.67.143.245", "172.67.144.126", "172.67.147.255", "172.67.153.29", "172.67.154.182", "172.67.156.98", "172.67.160.104", "172.67.169.139", "172.67.170.253", "172.67.172.242", "172.67.176.34", "172.67.187.246", "172.67.188.214", "172.67.190.234", "172.67.195.55", "172.67.196.217", "172.67.197.235", "172.67.199.186", "172.67.199.209", "172.67.200.209", "172.67.211.75", "172.67.214.149", "172.67.217.25", "172.67.218.10", "172.67.220.3", "172.67.221.7", "172.67.238.109", "172.67.240.46", "172.67.250.18", "172.67.253.123", "172.67.73.30", "172.67.74.86", "172.67.93.117", "172.67.93.126", "172.67.94.198", "173.245.49.57", "185.238.228.201", "188.114.96.39", "191.101.251.190", "198.202.211.158", "198.41.193.207", "198.41.205.190", "198.41.211.0", "199.181.197.109", "199.181.197.158", "199.181.197.246", "2.16.0.134", "2.16.0.235", "2.16.1.137", "2.16.1.149", "2.16.1.218", "2.16.105.142", "2.16.11.186", "2.16.125.17", "2.16.164.29", "2.16.168.12", "2.16.168.7", "2.16.190.87", "2.16.192.83", "2.16.2.152", "2.16.222.174", "2.16.31.75", "2.16.31.87", "2.16.33.249", "2.16.39.17", "2.16.42.250", "2.16.42.251", "2.16.93.211", "212.104.128.75", "45.80.110.140", "5.10.214.117", "74.49.215.119", "88.216.66.154", "88.216.66.81", "89.116.161.253", "89.117.112.240", "92.53.188.172", "92.53.188.71"];

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
      fetch(\`https://\${ip}:\${port}/\`, { mode: "no-cors", cache: "no-store", signal: ctl.signal, redirect: "manual" })
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
    for (let line of (text || "").split("\\n")) {
      line = line.trim();
      if (!line || line.startsWith("#")) continue;
      // CIDR \u2192 expand? just take the base IP for a /32-ish probe
      if (line.includes("/")) line = line.split("/")[0];
      const m = line.match(/\\b(\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})\\b/);
      if (m && /^\\d{1,3}(\\.\\d{1,3}){3}$/.test(m[1])) ips.add(m[1]);
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
      el.innerHTML = \`<div class="empty">\${S.running ? t("scan.phase1") : t("scan.empty")}</div>\`;
      return;
    }
    if (!list.length) { el.innerHTML = \`<div class="empty">\${t("scan.phase1")}</div>\`; return; }
    const max = Math.max(...list.map((r) => r.min));
    el.innerHTML = list.slice(0, 60).map((r) => {
      const w = Math.max(4, Math.round((r.min / max) * 100));
      const cls = r.min < 120 ? "ok" : r.min < 300 ? "warn" : "bad";
      return \`<div class="scan-row" onclick="SCANNER.copyIp('\${r.ip}')" title="\${t("scan.copy")}">
        <code class="scan-ip">\${r.ip}</code>
        <span class="scan-port">:\${r.port}</span>
        <div class="scan-latbar"><div class="scan-latfill" style="width:\${w}%"></div></div>
        <code class="scan-ms \${cls}">\${r.min}ms</code>
      </div>\`;
    }).join("");
  }

  function renderTop() {
    const el = $("#scanTop");
    const list = aliveResults().slice(0, 5);
    if (!list.length) { el.innerHTML = ""; return; }
    el.innerHTML = list.map((r, i) =>
      \`<div class="top-chip" onclick="SCANNER.copyIp('\${r.ip}')"><span class="top-rank">\${i + 1}</span><code>\${r.ip}</code><b>\${r.min}ms</b></div>\`
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
    const txt = aliveResults().map((r) => r.ip).join("\\n");
    try { navigator.clipboard.writeText(txt).then(() => toast(t("scan.copied"))); } catch (e) {}
  }
  function exportTxt() {
    const txt = "# Nika Net \u2014 clean IPs\\n" + aliveResults().map((r) => r.ip + ":" + r.port).join("\\n");
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

<\/script>
</body>
</html>
`,H="0.4.0",vt=(n,t=200)=>new Response(n,{status:t,headers:{"content-type":"text/html; charset=utf-8"}});function Gt(n){return n.headers.set("access-control-allow-origin","*"),n}var Se={async fetch(n,t,e){try{ct(),e.waitUntil(ut(t));let s=new URL(n.url),r=s.pathname,i=await tt(t);if((n.headers.get("Upgrade")||"").toLowerCase()==="websocket")return Yt(n,t,i);if(r==="/admin"||r==="/admin/")return vt(St);if(r.startsWith("/api/"))return Gt(await zt(n,t,i,s));if(r.startsWith("/sub/"))return Xt(n,t,i,r);let o=r.match(/^\/([0-9a-fA-F-]{36})\/?$/);return o?Qt(t,i,o[1]):r==="/health"?p({ok:!0,name:i.title}):i.host===R.host?vt(St):Response.redirect("https://www.cloudflare.com",302)}catch(s){return p({error:String(s)},500)}}};async function Yt(n,t,e){let s=new URL(n.url),r=s.searchParams.get("proto")||n.headers.get("x-nika-proto")||"",i=await x(t),o=s.searchParams.get("uuid")||"",a=i.find(c=>c.uuid.toLowerCase()===o.toLowerCase());return a?a.active?r==="trojan"?yt(n,a,e,t):mt(n,a,e,t):p({error:"user inactive"},403):p({error:"no user for this uuid"},403)}async function zt(n,t,e,s){let r=s.pathname.replace("/api/",""),i=n.method.toUpperCase();if(r==="info")return p({name:e.title,setup:!e.adminPassHash,protocols:e.protocols,version:H});if(r==="update/check"){let o=await Zt();return p({current:H,latest:o.version,notes:o.notes||"",upToDate:te(H,o.version)>=0})}if(r==="login"&&i==="POST"){let a=(await n.json().catch(()=>({}))).password||"",c=!e.adminPassHash;if(c){if(!a||a.length<4)return p({error:"password too short"},400);e.adminPassHash=await J(a),await W(t,e)}if(!(e.adminPassHash===await J(a)))return p({error:"wrong password"},401);let u=await B(e.sessionSecret,JSON.stringify({t:Date.now()}));await v(t,{icon:c?"\u{1F6E0}":"\u{1F510}",text:c?"\u0646\u0635\u0628 \u0627\u0648\u0644\u06CC\u0647 \u067E\u0646\u0644 \u2014 \u0631\u0645\u0632 \u0627\u062F\u0645\u06CC\u0646 \u062B\u0628\u062A \u0634\u062F":"\u0648\u0631\u0648\u062F \u0627\u062F\u0645\u06CC\u0646 \u0628\u0647 \u067E\u0646\u0644",time:Date.now()});let d=p({ok:!0,setup:c});return d.headers.set("set-cookie",`${F}=${encodeURIComponent(u)}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax`),d}if(r==="logout"){let o=p({ok:!0});return o.headers.set("set-cookie",`${F}=; HttpOnly; Path=/; Max-Age=0`),o}if(!await st(n,e))return p({error:"unauthorized"},401);switch(r){case"status":{let o=await x(t);return p({title:e.title,setup:!1,users:o.length,active:o.filter(a=>a.active).length,usedGb:Math.round(o.reduce((a,c)=>a+(c.used||0),0)*100)/100,requestsToday:await lt(t),requestsTotal:await dt(t),protocols:e.protocols,activity:await ft(t),traffic7d:await pt(t)})}case"users":{let o=await x(t);if(i==="GET")return p(o);if(i==="POST"){let a=await n.json().catch(()=>({})),c={id:crypto.randomUUID(),name:a.name||"\u06A9\u0627\u0631\u0628\u0631",uuid:crypto.randomUUID(),password:rt(),quota:Number(a.quota)||50,used:0,days:Number(a.days)||30,active:!0,createdAt:Date.now()};return o.push(c),await U(t,o),await v(t,{icon:"\u{1F464}",text:`\u06A9\u0627\u0631\u0628\u0631 \u0633\u0627\u062E\u062A\u0647 \u0634\u062F \u2014 ${c.name}`,time:Date.now()}),p(c)}if(i==="DELETE"){let a=s.searchParams.get("id"),c=o.find(u=>u.id===a),l=o.filter(u=>u.id!==a);return await U(t,l),await v(t,{icon:"\u{1F5D1}",text:`\u06A9\u0627\u0631\u0628\u0631 \u062D\u0630\u0641 \u0634\u062F \u2014 ${c?.name||a}`,time:Date.now()}),p({ok:!0})}break}case"users/toggle":{if(i!=="POST")break;let o=await n.json().catch(()=>({})),a=await x(t),c=a.find(l=>l.id===o.id);return c?(c.active=!c.active,await U(t,a),await v(t,{icon:c.active?"\u{1F7E2}":"\u26D4",text:`${c.name} ${c.active?"\u0641\u0639\u0627\u0644":"\u063A\u06CC\u0631\u0641\u0639\u0627\u0644"} \u0634\u062F`,time:Date.now()}),p({ok:!0,active:c.active})):p({error:"not found"},404)}case"settings":{if(i==="GET")return p(e);if(i==="POST"){let o=await n.json().catch(()=>({})),a={...e};return typeof o.title=="string"&&(a.title=o.title),typeof o.host=="string"&&(a.host=o.host),typeof o.sni=="string"&&(a.sni=o.sni),typeof o.wsPath=="string"&&(a.wsPath=o.wsPath),Array.isArray(o.cleanIps)&&(a.cleanIps=o.cleanIps),o.protocols&&(a.protocols={...e.protocols,...o.protocols}),await W(t,a),await v(t,{icon:"\u2699\uFE0F",text:"\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u067E\u0646\u0644 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0634\u062F",time:Date.now()}),p({ok:!0})}break}case"gen":{let o=s.searchParams.get("id"),c=(await x(t)).find(l=>l.id===o);return c?p({user:{id:c.id,name:c.name,quota:c.quota,used:Math.round((c.used||0)*100)/100,days:c.days,active:c.active},base64:C(c,e),clash:G(c,e),singbox:Y(c,e),warp:e.protocols.warp?at(c):null}):p({error:"user not found"},404)}case"update/apply":{if(i!=="POST")break;let o=await n.json().catch(()=>({})),a=await ee(t,e,o.token||"");return p(a,a.ok?200:400)}}return p({error:"not found"},404)}async function Xt(n,t,e,s){let r=s.replace("/sub/",""),i=r.split("/")[0].split(".")[0],o=r.split(".").pop()?.toLowerCase()||"",c=(await x(t)).find(f=>f.password===i||f.uuid.replace(/-/g,"").slice(0,12)===i);if(!c)return p({error:"invalid token"},404);let l=o==="yaml"||o==="yml",u=o==="json",d=l?G(c,e):u?Y(c,e):"vmess://"+C(c,e);return new Response(d,{headers:{"content-type":l?"text/yaml":u?"application/json":"text/plain"}})}async function Qt(n,t,e){let r=(await x(n)).find(o=>o.uuid.toLowerCase()===e.toLowerCase());if(!r)return p({error:"unknown uuid"},404);let i="vmess://"+C(r,t);return new Response(i,{headers:{"content-type":"text/plain"}})}var At="https://raw.githubusercontent.com/NikaTeem/Nika-Net/main",X=null,kt=0;async function Zt(){if(X&&Date.now()-kt<3e5)return X;try{let n=await fetch(`${At}/version.json`,{cf:{cacheTtl:300}});if(!n.ok)throw new Error("fetch failed");let t=await n.json();return X=t,kt=Date.now(),t}catch{return{version:H,notes:""}}}function te(n,t){let e=n.split(".").map(r=>parseInt(r,10)||0),s=t.split(".").map(r=>parseInt(r,10)||0);for(let r=0;r<3;r++){let i=(e[r]||0)-(s[r]||0);if(i!==0)return i}return 0}async function ee(n,t,e){if(!e||e.length<20)return{ok:!1,error:"token required"};let s=await $(e,"/user/tokens/verify");if(!s?.success)return{ok:!1,error:s?.errors?.[0]?.message||"\u062A\u0648\u06A9\u0646 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A"};let i=(await $(e,"/accounts?per_page=50"))?.result?.[0]?.id;if(!i)return{ok:!1,error:"\u0627\u06A9\u0627\u0646\u062A\u06CC \u0628\u0627 \u0627\u06CC\u0646 \u062A\u0648\u06A9\u0646 \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F"};let o=(t.host||"").split(".")[0];if(!o)return{ok:!1,error:"\u0627\u0628\u062A\u062F\u0627 Host \u0648\u0631\u06A9\u0631 \u0631\u0627 \u062F\u0631 \u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0648\u0627\u0631\u062F \u06A9\u0646"};let a=await ht(e,i,[`nika-${o}-kv`,`${o}-kv`]),c=await fetch(`${At}/dist/worker.js`);if(!c.ok)return{ok:!1,error:"\u062F\u0631\u06CC\u0627\u0641\u062A \u0622\u062E\u0631\u06CC\u0646 \u0646\u0633\u062E\u0647 \u0645\u0645\u06A9\u0646 \u0646\u0634\u062F"};let l=await c.text(),d=await xt(e,i,o,l,a?[{type:"kv_namespace",name:"NIKA_KV",namespace_id:a}]:[]);return d.ok?(await bt(e,i,o),await v(n,{icon:"\u{1F504}",text:"\u067E\u0646\u0644 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0634\u062F",time:Date.now()}),{ok:!0}):{ok:!1,error:d.err}}export{Se as default};
