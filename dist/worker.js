var R={title:"Nika Net",host:"nika.example.workers.dev",sni:"www.speedtest.net",wsPath:"/nika-ws",cleanIps:["1.0.0.1","104.16.132.229","188.114.96.9"],relayDomain:"",protocols:{vless:!0,trojan:!0,warp:!0},adminPassHash:null,secretPath:"nika-admin",sessionSecret:""};var L=new Map,ot=new Map;async function Nt(t,e){try{let r=await t.NIKA_DB.prepare("SELECT value FROM kv WHERE key = ?1").bind(e).first();return r?r.value:null}catch{return null}}async function Vt(t,e,r){try{await t.NIKA_DB.prepare("INSERT INTO kv (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(e,r).run()}catch{}}async function q(t,e){if(L.has(e))return L.get(e);let r=null;return t.NIKA_DB?r=await Nt(t,e):t.NIKA_KV?r=await t.NIKA_KV.get(e):r=ot.get(e)??null,r!==null&&L.set(e,r),r}async function B(t,e,r){L.set(e,r),t.NIKA_DB?await Vt(t,e,r):t.NIKA_KV?await t.NIKA_KV.put(e,r):ot.set(e,r)}async function st(t){let e=await q(t,"settings"),r={...R};if(e)try{Object.assign(r,JSON.parse(e))}catch{}return r.sessionSecret||(r.sessionSecret=crypto.randomUUID(),await B(t,"settings",JSON.stringify(r))),r}async function M(t,e){await B(t,"settings",JSON.stringify(e))}async function A(t){let e=await q(t,"users");if(!e)return[];try{return JSON.parse(e)}catch{return[]}}async function v(t,e){await B(t,"users",JSON.stringify(e))}async function C(t,e){let r=await q(t,e),a=parseInt(r||"0",10);return isNaN(a)?0:a}async function G(t,e,r){let s=await C(t,e)+r;return await B(t,e,String(s)),s}async function J(t,e){let r=await q(t,e);if(!r)return null;try{return JSON.parse(r)}catch{return null}}async function at(t,e,r){await B(t,e,JSON.stringify(r))}var j=new TextEncoder;async function z(t){let e=await crypto.subtle.digest("SHA-256",j.encode(t));return[...new Uint8Array(e)].map(r=>r.toString(16).padStart(2,"0")).join("")}function ct(){return[...crypto.getRandomValues(new Uint8Array(24))].map(e=>e.toString(16).padStart(2,"0")).join("")}async function Z(t,e){let r=await crypto.subtle.importKey("raw",j.encode(t),{name:"HMAC",hash:"SHA-256"},!1,["sign"]),a=await crypto.subtle.sign("HMAC",r,j.encode(e));return e+"."+[...new Uint8Array(a)].map(s=>s.toString(16).padStart(2,"0")).join("")}async function Pt(t,e){let r=e.lastIndexOf(".");if(r<0)return!1;let a=e.slice(0,r),n=(await Z(t,a)).split(".")[1],i=e.slice(r+1);if(n.length!==i.length)return!1;let c=0;for(let o=0;o<n.length;o++)c|=n.charCodeAt(o)^i.charCodeAt(o);return c===0}async function lt(t,e){let r=(t.headers.get("Cookie")||"").split(";").map(s=>s.trim()).find(s=>s.startsWith("nika_session="));if(!r)return!1;let a=decodeURIComponent(r.split("=").slice(1).join("="));return Pt(e.sessionSecret,a)}var X="nika_session";var pt="Nika Paneel | \u06CC\u06A9 \u0633\u0631\u0648\u06CC\u0633 \u0631\u0627\u06CC\u06AF\u0627\u0646 \u0647\u0633\u062A",gt=encodeURIComponent(pt);function D(t){let e=(t.cleanIps||[]).filter(Boolean);return e.length?e[Math.floor(Math.random()*e.length)]:t.host}function O(t){return(t.relayDomain||"").trim()||(t.host||"").trim()}function Tt(t,e){let r=D(e),a=O(e),s=new URLSearchParams({encryption:"none",security:"tls",sni:a,fp:"chrome",type:"ws",host:a,path:e.wsPath+"?ed=2048&proto=vless"});return`vless://${t.uuid}@${r}:443?${s.toString()}#${gt}`}function Wt(t,e){let r=D(e),a=O(e),s=new URLSearchParams({security:"tls",sni:a,fp:"chrome",type:"ws",host:a,path:e.wsPath+"?ed=2048&proto=trojan"});return`trojan://${t.password}@${r}:443?${s.toString()}#${gt}`}function K(t,e){let r=[];return e.protocols.vless&&r.push(Tt(t,e)),e.protocols.trojan&&r.push(Wt(t,e)),btoa(r.join(`
`)).replace(/=+$/,"")}function $(t,e){let r=D(e),a=O(e),s=[],n=`# Nika Net \u2014 ${pt}
mixed-port: 7890
allow-lan: false
mode: rule
log-level: info
dns:
  enable: true
  enhanced-mode: fake-ip
  nameserver: [1.1.1.1, 8.8.8.8]
proxies:
`;return e.protocols.vless&&(s.push("Nika Paneel - VLESS"),n+=`  - name: "Nika Paneel - VLESS"
    type: vless
    server: ${r}
    port: 443
    uuid: ${t.uuid}
    network: ws
    tls: true
    udp: false
    servername: ${a}
    client-fingerprint: chrome
    ws-opts:
      path: "${e.wsPath}?ed=2048&proto=vless"
      headers: { Host: "${a}" }
`),e.protocols.trojan&&(s.push("Nika Paneel - Trojan"),n+=`  - name: "Nika Paneel - Trojan"
    type: trojan
    server: ${r}
    port: 443
    password: ${t.password}
    network: ws
    tls: true
    udp: false
    sni: ${a}
    client-fingerprint: chrome
    ws-opts:
      path: "${e.wsPath}?ed=2048&proto=trojan"
      headers: { Host: "${a}" }
`),n+=`proxy-groups:
  - name: "Nika Paneel"
    type: select
    proxies: [${s.map(i=>`"${i}"`).join(", ")}]
`,n+=`rules:
  - GEOIP,IR,DIRECT
  - MATCH,Nika Paneel
`,n}function _(t,e){let r=D(e),a=O(e),s=[],n=[];e.protocols.vless&&(n.push("Nika Paneel - VLESS"),s.push({tag:"Nika Paneel - VLESS",type:"vless",server:r,server_port:443,uuid:t.uuid,network:"ws",tls:{enabled:!0,server_name:a,utls:{enabled:!0,fingerprint:"chrome"}},transport:{type:"ws",path:e.wsPath+"?ed=2048&proto=vless",headers:{Host:a}}})),e.protocols.trojan&&(n.push("Nika Paneel - Trojan"),s.push({tag:"Nika Paneel - Trojan",type:"trojan",server:r,server_port:443,password:t.password,network:"ws",tls:{enabled:!0,server_name:a,utls:{enabled:!0,fingerprint:"chrome"}},transport:{type:"ws",path:e.wsPath+"?ed=2048&proto=trojan",headers:{Host:a}}}));let i={log:{level:"info"},dns:{servers:[{tag:"cf",address:"https://1.1.1.1/dns-query",detour:"select"}]},outbounds:s.concat([{tag:"select",type:"selector",outbounds:n},{tag:"direct",type:"direct"}]),route:{rules:[{geoip:"ir",outbound:"direct"}],final:"select"}};return JSON.stringify(i,null,2)}function Mt(t){let e=(t.uuid.replace(/-/g,"")+(t.password||"")).slice(0,64).padEnd(64,"0"),r=new Uint8Array(32);for(let s=0;s<32;s++)r[s]=parseInt(e.slice(s*2,s*2+2),16)||0;let a="";for(let s=0;s<32;s++)a+=String.fromCharCode(r[s]);return btoa(a)}function dt(t){return`[Interface]
PrivateKey = ${Mt(t)}
Address = 172.16.0.2/32, 2606:4700:110:8f3e:1c5e:9a2b:7d4f::/128
DNS = 1.1.1.1
MTU = 1280

[Peer]
PublicKey = bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=
AllowedIPs = 0.0.0.0/0, ::/0
Endpoint = engage.cloudflareclient.com:2408
`}var k=new Map,ut=new Map,ft=0,H=()=>{let t=new Date,e=String(t.getMonth()+1).padStart(2,"0"),r=String(t.getDate()).padStart(2,"0");return`${t.getFullYear()}-${e}-${r}`};function mt(){k.set("req:total",(k.get("req:total")||0)+1),k.set("req:"+H(),(k.get("req:"+H())||0)+1)}async function ht(t){let e=Date.now();if(!(e-ft<15e3)){ft=e;for(let[r,a]of k)a&&await G(t,r,a);k.clear()}}async function xt(t){return await C(t,"req:"+H())+(k.get("req:"+H())||0)}async function wt(t){return await C(t,"req:total")+(k.get("req:total")||0)}async function Y(t,e,r,a){if(!r&&!a)return;let s=await A(t),n=s.find(c=>c.id===e);n&&(n.used=(n.used||0)+(r+a)/1e9,await v(t,s)),await G(t,"traffic:"+H(),r+a);let i=ut.get(e)||0;Date.now()-i>6e4&&(ut.set(e,Date.now()),await I(t,{icon:"\u{1F4E1}",text:`\u0627\u062A\u0635\u0627\u0644 \u062C\u062F\u06CC\u062F${n?` \u2014 ${n.name}`:""}`,time:Date.now()}))}async function yt(t){let e=[];for(let r=6;r>=0;r--){let a=new Date;a.setDate(a.getDate()-r);let s=String(a.getMonth()+1).padStart(2,"0"),n=String(a.getDate()).padStart(2,"0"),i=`${a.getFullYear()}-${s}-${n}`,c=await C(t,"traffic:"+i);e.push({date:i.slice(5),gb:Math.round(c/1e9*100)/100})}return e}async function I(t,e){let r=await J(t,"activity")||[];r.unshift(e),r.length>40&&(r.length=40),await at(t,"activity",r)}async function bt(t){return await J(t,"activity")||[]}import{connect as Jt}from"cloudflare:sockets";function N(t){let e=new WebSocketPair,[r,a]=Object.values(e);return a.accept(),{client:r,server:a}}function V(t,e,r){let a=!1;return new ReadableStream({start(n){let i=c=>{if(a)return;let o=c.data;o instanceof ArrayBuffer?n.enqueue(new Uint8Array(o)):Array.isArray(o)?n.enqueue(new Uint8Array(o)):typeof o=="string"&&n.enqueue(new TextEncoder().encode(o))};if(t.addEventListener("message",i),t.addEventListener("close",()=>{try{n.close()}catch{}}),t.addEventListener("error",()=>{try{n.error(new Error("ws error"))}catch{}}),e)try{let c=Uint8Array.from(atob(e),o=>o.charCodeAt(0));c.length&&n.enqueue(c)}catch{}},pull(){},cancel(){a=!0;try{t.close()}catch{}}})}function g(t,e=200){return new Response(JSON.stringify(t),{status:e,headers:{"content-type":"application/json; charset=utf-8","access-control-allow-origin":"*"}})}async function At(t,e,r,a){let{client:s,server:n}=N(t);n.binaryType="arraybuffer";let i=t.headers.get("sec-websocket-protocol")||"",c=V(n,i,()=>{}),o=w=>{try{n.send(w)}catch{}},p=null,l=0,u=0,x=null,h=!1;return c.pipeTo(new WritableStream({async write(w){if(h){l+=w.byteLength;let d=p.writable.getWriter();try{await d.write(w)}finally{d.releaseLock()}return}let f=x?jt(x,w):w,y=zt(f,e);if(!y.ok){if(y.incomplete){x=f;return}x=null;try{n.close()}catch{}return}if(x=null,h=!0,p=Jt({hostname:y.address,port:y.port}),o(new Uint8Array([0,0])),y.payload.length){l+=y.payload.length;let d=p.writable.getWriter();try{await d.write(y.payload)}finally{d.releaseLock()}}p.readable.pipeTo(new WritableStream({write(d){u+=d.byteLength,o(d)}})).catch(()=>{try{n.close()}catch{}}).finally(()=>{Y(a,e.id,l,u).catch(()=>{})})},close(){try{p?.close()}catch{}},abort(){try{p?.close()}catch{}try{n.close()}catch{}}})).catch(()=>{try{n.close()}catch{}try{p?.close()}catch{}}),new Response(null,{status:101,webSocket:s})}function jt(t,e){let r=new Uint8Array(t.length+e.length);return r.set(t),r.set(e,t.length),r}function zt(t,e){try{if(t.length<1)return{ok:!1,incomplete:!0};if(t[0]!==0)return{ok:!1,incomplete:!1};if(t.length<17)return{ok:!1,incomplete:!0};if(Zt(t.slice(1,17)).toLowerCase()!==e.uuid.toLowerCase())return{ok:!1,incomplete:!1};if(t.length<18)return{ok:!1,incomplete:!0};let s=18+t[17];if(t.length<s+4)return{ok:!1,incomplete:!0};if(t[s]!==1)return{ok:!1,incomplete:!1};let i=t[s+1]<<8|t[s+2],c=t[s+3],o=s+4,p="";if(c===1){if(t.length<o+4)return{ok:!1,incomplete:!0};p=`${t[o]}.${t[o+1]}.${t[o+2]}.${t[o+3]}`,o+=4}else if(c===2){if(t.length<o+1)return{ok:!1,incomplete:!0};let l=t[o];if(o+=1,t.length<o+l)return{ok:!1,incomplete:!0};p=new TextDecoder().decode(t.slice(o,o+l)),o+=l}else if(c===3){if(t.length<o+16)return{ok:!1,incomplete:!0};p=Xt(t.slice(o,o+16)),o+=16}else return{ok:!1,incomplete:!1};return{ok:!0,address:p,port:i,payload:t.slice(o)}}catch{return{ok:!1,incomplete:!1}}}function Zt(t){let e=[...t].map(r=>r.toString(16).padStart(2,"0")).join("");return`${e.slice(0,8)}-${e.slice(8,12)}-${e.slice(12,16)}-${e.slice(16,20)}-${e.slice(20)}`}function Xt(t){let e=[];for(let r=0;r<16;r+=2)e.push((t[r]<<8|t[r+1]).toString(16));return e.join(":")}import{connect as $t}from"cloudflare:sockets";async function Et(t,e,r,a){let{client:s,server:n}=N(t);n.binaryType="arraybuffer";let i=t.headers.get("sec-websocket-protocol")||"",c=V(n,i,()=>{}),o=oe(e.password),p=f=>{try{n.send(f)}catch{}},l=null,u=0,x=0,h=null,w=!1;return c.pipeTo(new WritableStream({async write(f){if(w){u+=f.byteLength;let b=l.writable.getWriter();try{await b.write(f)}finally{b.releaseLock()}return}let y=h?_t(h,f):f,d=te(y,o);if(!d.ok){if(d.incomplete){h=y;return}h=null;try{n.close()}catch{}return}if(h=null,w=!0,l=$t({hostname:d.address,port:d.port}),d.payload.length){u+=d.payload.length;let b=l.writable.getWriter();try{await b.write(d.payload)}finally{b.releaseLock()}}l.readable.pipeTo(new WritableStream({write(b){x+=b.byteLength,p(b)}})).catch(()=>{try{n.close()}catch{}}).finally(()=>{Y(a,e.id,u,x).catch(()=>{})})},close(){try{l?.close()}catch{}},abort(){try{l?.close()}catch{}try{n.close()}catch{}}})).catch(()=>{try{n.close()}catch{}try{l?.close()}catch{}}),new Response(null,{status:101,webSocket:s})}function _t(t,e){let r=new Uint8Array(t.length+e.length);return r.set(t),r.set(e,t.length),r}function te(t,e){try{if(t.length<56)return{ok:!1,incomplete:!0};if(new TextDecoder().decode(t.slice(0,56))!==e)return{ok:!1,incomplete:!1};if(t.length<58)return{ok:!1,incomplete:!0};if(t[56]!==13||t[57]!==10)return{ok:!1,incomplete:!1};if(t.length<60)return{ok:!1,incomplete:!0};if(t[58]!==1)return{ok:!1,incomplete:!1};let s=t[59],n=60,i="";if(s===1){if(t.length<n+4)return{ok:!1,incomplete:!0};i=`${t[n]}.${t[n+1]}.${t[n+2]}.${t[n+3]}`,n+=4}else if(s===3){if(t.length<n+1)return{ok:!1,incomplete:!0};let o=t[n];if(n+=1,t.length<n+o)return{ok:!1,incomplete:!0};i=new TextDecoder().decode(t.slice(n,n+o)),n+=o}else if(s===4){if(t.length<n+16)return{ok:!1,incomplete:!0};i=ee(t.slice(n,n+16)),n+=16}else return{ok:!1,incomplete:!1};if(t.length<n+2)return{ok:!1,incomplete:!0};let c=t[n]<<8|t[n+1];return n+=2,t.length<n+2?{ok:!1,incomplete:!0}:t[n]!==13||t[n+1]!==10?{ok:!1,incomplete:!1}:(n+=2,{ok:!0,address:i,port:c,payload:t.slice(n)})}catch{return{ok:!1,incomplete:!1}}}function ee(t){let e=[];for(let r=0;r<16;r+=2)e.push((t[r]<<8|t[r+1]).toString(16));return e.join(":")}var re=new Uint32Array([1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298]);function E(t,e){return t>>>e|t<<32-e}function ne(t){let e=new Uint32Array([3238371032,914150663,812702999,4144912697,4290775857,1750603025,1694076839,3204075428]),r=t.length,a=Math.floor(r/536870912),s=r<<3>>>0,n=new Uint8Array((r+8>>6)+1<<6);n.set(t),n[r]=128;let i=new DataView(n.buffer);i.setUint32(n.length-8,a),i.setUint32(n.length-4,s);let c=new Uint32Array(64);for(let l=0;l<n.length;l+=64){for(let m=0;m<16;m++)c[m]=i.getUint32(l+m*4);for(let m=16;m<64;m++){let T=E(c[m-15],7)^E(c[m-15],18)^c[m-15]>>>3,W=E(c[m-2],17)^E(c[m-2],19)^c[m-2]>>>10;c[m]=c[m-16]+T+c[m-7]+W>>>0}let[u,x,h,w,f,y,d,b]=e;for(let m=0;m<64;m++){let T=E(f,6)^E(f,11)^E(f,25),W=f&y^~f&d,nt=b+T+W+re[m]+c[m]>>>0,Ot=E(u,2)^E(u,13)^E(u,22),Kt=u&x^u&h^x&h,Yt=Ot+Kt>>>0;b=d,d=y,y=f,f=w+nt>>>0,w=h,h=x,x=u,u=nt+Yt>>>0}e[0]=e[0]+u>>>0,e[1]=e[1]+x>>>0,e[2]=e[2]+h>>>0,e[3]=e[3]+w>>>0,e[4]=e[4]+f>>>0,e[5]=e[5]+y>>>0,e[6]=e[6]+d>>>0,e[7]=e[7]+b>>>0}let o=new Uint8Array(28),p=new DataView(o.buffer);for(let l=0;l<7;l++)p.setUint32(l*4,e[l]);return o}function oe(t){return[...ne(new TextEncoder().encode(t))].map(e=>e.toString(16).padStart(2,"0")).join("")}var kt="https://api.cloudflare.com/client/v4";async function Q(t,e,r){return(await fetch(kt+e,{...r,headers:{authorization:`Bearer ${t}`,...r?.headers||{}}})).json()}async function It(t,e,r){let a=await Q(t,`/accounts/${e}/storage/kv/namespaces?per_page=100`);for(let s of a?.result||[])if(r.includes(s.title))return s.id;return null}async function vt(t,e,r,a,s){let n="----NikaNetBoundary"+Math.random().toString(16).slice(2),c=[`--${n}\r
Content-Disposition: form-data; name="metadata"\r
\r
${JSON.stringify({main_module:"worker.js",compatibility_date:"2026-05-01",workers_dev:!0,bindings:s})}\r
`,`--${n}\r
Content-Disposition: form-data; name="worker.js"; filename="worker.js"\r
Content-Type: application/javascript+module\r
\r
${a}\r
`,`--${n}--\r
`].join(""),o=await fetch(`${kt}/accounts/${e}/workers/scripts/${r}`,{method:"PUT",headers:{authorization:`Bearer ${t}`,"content-type":`multipart/form-data; boundary=${n}`},body:c}),p=await o.json();return{ok:!!p?.success,err:p?.errors?.[0]?.message||`HTTP ${o.status}`}}async function St(t,e,r){let a=await Q(t,`/accounts/${e}/workers/scripts/${r}/subdomain`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({enabled:!0})});return{ok:!!a?.success,err:a?.errors?.[0]?.message}}var Ut="data:image/png;base64,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",Rt="data:image/png;base64,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",Bt="data:image/png;base64,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",Ct="data:image/png;base64,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";var S=t=>String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),ae="\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9",P=t=>String(t).replace(/\d/g,e=>ae[+e]);function Ht(t){let e=`${t.origin}/sub/${t.token}`,r=`${e}.yaml`,a=`${e}.json`,s=encodeURIComponent,n=`v2rayng://install-sub?url=${s(e)}&name=${s("Nika Net")}`,i=`v2box://install-sub?url=${s(e)}&name=${s("Nika Net")}`,c=`hiddify://import/${e}#Nika%20Net`,o=`happ://add/${e}`,p=t.quota>0?Math.max(0,Math.min(100,Math.round(t.used/t.quota*100))):0,l=t.active?"\u0641\u0639\u0627\u0644":"\u063A\u06CC\u0631\u0641\u0639\u0627\u0644",u=t.active?"on":"off",x=[t.protocols.vless?"VLESS":"",t.protocols.trojan?"Trojan":"",t.protocols.warp?"WARP":""].filter(Boolean),h=`/**
 * Minified by jsDelivr using Terser v5.37.0.
 * Original file: /npm/qrcode-generator@1.4.4/qrcode.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
var qrcode=function(){var t=function(t,r){var e=t,n=g[r],o=null,i=0,a=null,u=[],f={},c=function(t,r){o=function(t){for(var r=new Array(t),e=0;e<t;e+=1){r[e]=new Array(t);for(var n=0;n<t;n+=1)r[e][n]=null}return r}(i=4*e+17),l(0,0),l(i-7,0),l(0,i-7),s(),h(),d(t,r),e>=7&&v(t),null==a&&(a=p(e,n,u)),w(a,r)},l=function(t,r){for(var e=-1;e<=7;e+=1)if(!(t+e<=-1||i<=t+e))for(var n=-1;n<=7;n+=1)r+n<=-1||i<=r+n||(o[t+e][r+n]=0<=e&&e<=6&&(0==n||6==n)||0<=n&&n<=6&&(0==e||6==e)||2<=e&&e<=4&&2<=n&&n<=4)},h=function(){for(var t=8;t<i-8;t+=1)null==o[t][6]&&(o[t][6]=t%2==0);for(var r=8;r<i-8;r+=1)null==o[6][r]&&(o[6][r]=r%2==0)},s=function(){for(var t=B.getPatternPosition(e),r=0;r<t.length;r+=1)for(var n=0;n<t.length;n+=1){var i=t[r],a=t[n];if(null==o[i][a])for(var u=-2;u<=2;u+=1)for(var f=-2;f<=2;f+=1)o[i+u][a+f]=-2==u||2==u||-2==f||2==f||0==u&&0==f}},v=function(t){for(var r=B.getBCHTypeNumber(e),n=0;n<18;n+=1){var a=!t&&1==(r>>n&1);o[Math.floor(n/3)][n%3+i-8-3]=a}for(n=0;n<18;n+=1){a=!t&&1==(r>>n&1);o[n%3+i-8-3][Math.floor(n/3)]=a}},d=function(t,r){for(var e=n<<3|r,a=B.getBCHTypeInfo(e),u=0;u<15;u+=1){var f=!t&&1==(a>>u&1);u<6?o[u][8]=f:u<8?o[u+1][8]=f:o[i-15+u][8]=f}for(u=0;u<15;u+=1){f=!t&&1==(a>>u&1);u<8?o[8][i-u-1]=f:u<9?o[8][15-u-1+1]=f:o[8][15-u-1]=f}o[i-8][8]=!t},w=function(t,r){for(var e=-1,n=i-1,a=7,u=0,f=B.getMaskFunction(r),c=i-1;c>0;c-=2)for(6==c&&(c-=1);;){for(var g=0;g<2;g+=1)if(null==o[n][c-g]){var l=!1;u<t.length&&(l=1==(t[u]>>>a&1)),f(n,c-g)&&(l=!l),o[n][c-g]=l,-1==(a-=1)&&(u+=1,a=7)}if((n+=e)<0||i<=n){n-=e,e=-e;break}}},p=function(t,r,e){for(var n=A.getRSBlocks(t,r),o=b(),i=0;i<e.length;i+=1){var a=e[i];o.put(a.getMode(),4),o.put(a.getLength(),B.getLengthInBits(a.getMode(),t)),a.write(o)}var u=0;for(i=0;i<n.length;i+=1)u+=n[i].dataCount;if(o.getLengthInBits()>8*u)throw"code length overflow. ("+o.getLengthInBits()+">"+8*u+")";for(o.getLengthInBits()+4<=8*u&&o.put(0,4);o.getLengthInBits()%8!=0;)o.putBit(!1);for(;!(o.getLengthInBits()>=8*u||(o.put(236,8),o.getLengthInBits()>=8*u));)o.put(17,8);return function(t,r){for(var e=0,n=0,o=0,i=new Array(r.length),a=new Array(r.length),u=0;u<r.length;u+=1){var f=r[u].dataCount,c=r[u].totalCount-f;n=Math.max(n,f),o=Math.max(o,c),i[u]=new Array(f);for(var g=0;g<i[u].length;g+=1)i[u][g]=255&t.getBuffer()[g+e];e+=f;var l=B.getErrorCorrectPolynomial(c),h=k(i[u],l.getLength()-1).mod(l);for(a[u]=new Array(l.getLength()-1),g=0;g<a[u].length;g+=1){var s=g+h.getLength()-a[u].length;a[u][g]=s>=0?h.getAt(s):0}}var v=0;for(g=0;g<r.length;g+=1)v+=r[g].totalCount;var d=new Array(v),w=0;for(g=0;g<n;g+=1)for(u=0;u<r.length;u+=1)g<i[u].length&&(d[w]=i[u][g],w+=1);for(g=0;g<o;g+=1)for(u=0;u<r.length;u+=1)g<a[u].length&&(d[w]=a[u][g],w+=1);return d}(o,n)};f.addData=function(t,r){var e=null;switch(r=r||"Byte"){case"Numeric":e=M(t);break;case"Alphanumeric":e=x(t);break;case"Byte":e=m(t);break;case"Kanji":e=L(t);break;default:throw"mode:"+r}u.push(e),a=null},f.isDark=function(t,r){if(t<0||i<=t||r<0||i<=r)throw t+","+r;return o[t][r]},f.getModuleCount=function(){return i},f.make=function(){if(e<1){for(var t=1;t<40;t++){for(var r=A.getRSBlocks(t,n),o=b(),i=0;i<u.length;i++){var a=u[i];o.put(a.getMode(),4),o.put(a.getLength(),B.getLengthInBits(a.getMode(),t)),a.write(o)}var g=0;for(i=0;i<r.length;i++)g+=r[i].dataCount;if(o.getLengthInBits()<=8*g)break}e=t}c(!1,function(){for(var t=0,r=0,e=0;e<8;e+=1){c(!0,e);var n=B.getLostPoint(f);(0==e||t>n)&&(t=n,r=e)}return r}())},f.createTableTag=function(t,r){t=t||2;var e="";e+='<table style="',e+=" border-width: 0px; border-style: none;",e+=" border-collapse: collapse;",e+=" padding: 0px; margin: "+(r=void 0===r?4*t:r)+"px;",e+='">',e+="<tbody>";for(var n=0;n<f.getModuleCount();n+=1){e+="<tr>";for(var o=0;o<f.getModuleCount();o+=1)e+='<td style="',e+=" border-width: 0px; border-style: none;",e+=" border-collapse: collapse;",e+=" padding: 0px; margin: 0px;",e+=" width: "+t+"px;",e+=" height: "+t+"px;",e+=" background-color: ",e+=f.isDark(n,o)?"#000000":"#ffffff",e+=";",e+='"/>';e+="</tr>"}return e+="</tbody>",e+="</table>"},f.createSvgTag=function(t,r,e,n){var o={};"object"==typeof arguments[0]&&(t=(o=arguments[0]).cellSize,r=o.margin,e=o.alt,n=o.title),t=t||2,r=void 0===r?4*t:r,(e="string"==typeof e?{text:e}:e||{}).text=e.text||null,e.id=e.text?e.id||"qrcode-description":null,(n="string"==typeof n?{text:n}:n||{}).text=n.text||null,n.id=n.text?n.id||"qrcode-title":null;var i,a,u,c,g=f.getModuleCount()*t+2*r,l="";for(c="l"+t+",0 0,"+t+" -"+t+",0 0,-"+t+"z ",l+='<svg version="1.1" xmlns="http://www.w3.org/2000/svg"',l+=o.scalable?"":' width="'+g+'px" height="'+g+'px"',l+=' viewBox="0 0 '+g+" "+g+'" ',l+=' preserveAspectRatio="xMinYMin meet"',l+=n.text||e.text?' role="img" aria-labelledby="'+y([n.id,e.id].join(" ").trim())+'"':"",l+=">",l+=n.text?'<title id="'+y(n.id)+'">'+y(n.text)+"</title>":"",l+=e.text?'<description id="'+y(e.id)+'">'+y(e.text)+"</description>":"",l+='<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>',l+='<path d="',a=0;a<f.getModuleCount();a+=1)for(u=a*t+r,i=0;i<f.getModuleCount();i+=1)f.isDark(a,i)&&(l+="M"+(i*t+r)+","+u+c);return l+='" stroke="transparent" fill="black"/>',l+="</svg>"},f.createDataURL=function(t,r){t=t||2,r=void 0===r?4*t:r;var e=f.getModuleCount()*t+2*r,n=r,o=e-r;return I(e,e,(function(r,e){if(n<=r&&r<o&&n<=e&&e<o){var i=Math.floor((r-n)/t),a=Math.floor((e-n)/t);return f.isDark(a,i)?0:1}return 1}))},f.createImgTag=function(t,r,e){t=t||2,r=void 0===r?4*t:r;var n=f.getModuleCount()*t+2*r,o="";return o+="<img",o+=' src="',o+=f.createDataURL(t,r),o+='"',o+=' width="',o+=n,o+='"',o+=' height="',o+=n,o+='"',e&&(o+=' alt="',o+=y(e),o+='"'),o+="/>"};var y=function(t){for(var r="",e=0;e<t.length;e+=1){var n=t.charAt(e);switch(n){case"<":r+="&lt;";break;case">":r+="&gt;";break;case"&":r+="&amp;";break;case'"':r+="&quot;";break;default:r+=n}}return r};return f.createASCII=function(t,r){if((t=t||1)<2)return function(t){t=void 0===t?2:t;var r,e,n,o,i,a=1*f.getModuleCount()+2*t,u=t,c=a-t,g={"\u2588\u2588":"\u2588","\u2588 ":"\u2580"," \u2588":"\u2584","  ":" "},l={"\u2588\u2588":"\u2580","\u2588 ":"\u2580"," \u2588":" ","  ":" "},h="";for(r=0;r<a;r+=2){for(n=Math.floor((r-u)/1),o=Math.floor((r+1-u)/1),e=0;e<a;e+=1)i="\u2588",u<=e&&e<c&&u<=r&&r<c&&f.isDark(n,Math.floor((e-u)/1))&&(i=" "),u<=e&&e<c&&u<=r+1&&r+1<c&&f.isDark(o,Math.floor((e-u)/1))?i+=" ":i+="\u2588",h+=t<1&&r+1>=c?l[i]:g[i];h+="\\n"}return a%2&&t>0?h.substring(0,h.length-a-1)+Array(a+1).join("\u2580"):h.substring(0,h.length-1)}(r);t-=1,r=void 0===r?2*t:r;var e,n,o,i,a=f.getModuleCount()*t+2*r,u=r,c=a-r,g=Array(t+1).join("\u2588\u2588"),l=Array(t+1).join("  "),h="",s="";for(e=0;e<a;e+=1){for(o=Math.floor((e-u)/t),s="",n=0;n<a;n+=1)i=1,u<=n&&n<c&&u<=e&&e<c&&f.isDark(o,Math.floor((n-u)/t))&&(i=0),s+=i?g:l;for(o=0;o<t;o+=1)h+=s+"\\n"}return h.substring(0,h.length-1)},f.renderTo2dContext=function(t,r){r=r||2;for(var e=f.getModuleCount(),n=0;n<e;n++)for(var o=0;o<e;o++)t.fillStyle=f.isDark(n,o)?"black":"white",t.fillRect(n*r,o*r,r,r)},f};t.stringToBytes=(t.stringToBytesFuncs={default:function(t){for(var r=[],e=0;e<t.length;e+=1){var n=t.charCodeAt(e);r.push(255&n)}return r}}).default,t.createStringToBytes=function(t,r){var e=function(){for(var e=S(t),n=function(){var t=e.read();if(-1==t)throw"eof";return t},o=0,i={};;){var a=e.read();if(-1==a)break;var u=n(),f=n()<<8|n();i[String.fromCharCode(a<<8|u)]=f,o+=1}if(o!=r)throw o+" != "+r;return i}(),n="?".charCodeAt(0);return function(t){for(var r=[],o=0;o<t.length;o+=1){var i=t.charCodeAt(o);if(i<128)r.push(i);else{var a=e[t.charAt(o)];"number"==typeof a?(255&a)==a?r.push(a):(r.push(a>>>8),r.push(255&a)):r.push(n)}}return r}};var r,e,n,o,i,a=1,u=2,f=4,c=8,g={L:1,M:0,Q:3,H:2},l=0,h=1,s=2,v=3,d=4,w=5,p=6,y=7,B=(r=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],e=1335,n=7973,i=function(t){for(var r=0;0!=t;)r+=1,t>>>=1;return r},(o={}).getBCHTypeInfo=function(t){for(var r=t<<10;i(r)-i(e)>=0;)r^=e<<i(r)-i(e);return 21522^(t<<10|r)},o.getBCHTypeNumber=function(t){for(var r=t<<12;i(r)-i(n)>=0;)r^=n<<i(r)-i(n);return t<<12|r},o.getPatternPosition=function(t){return r[t-1]},o.getMaskFunction=function(t){switch(t){case l:return function(t,r){return(t+r)%2==0};case h:return function(t,r){return t%2==0};case s:return function(t,r){return r%3==0};case v:return function(t,r){return(t+r)%3==0};case d:return function(t,r){return(Math.floor(t/2)+Math.floor(r/3))%2==0};case w:return function(t,r){return t*r%2+t*r%3==0};case p:return function(t,r){return(t*r%2+t*r%3)%2==0};case y:return function(t,r){return(t*r%3+(t+r)%2)%2==0};default:throw"bad maskPattern:"+t}},o.getErrorCorrectPolynomial=function(t){for(var r=k([1],0),e=0;e<t;e+=1)r=r.multiply(k([1,C.gexp(e)],0));return r},o.getLengthInBits=function(t,r){if(1<=r&&r<10)switch(t){case a:return 10;case u:return 9;case f:case c:return 8;default:throw"mode:"+t}else if(r<27)switch(t){case a:return 12;case u:return 11;case f:return 16;case c:return 10;default:throw"mode:"+t}else{if(!(r<41))throw"type:"+r;switch(t){case a:return 14;case u:return 13;case f:return 16;case c:return 12;default:throw"mode:"+t}}},o.getLostPoint=function(t){for(var r=t.getModuleCount(),e=0,n=0;n<r;n+=1)for(var o=0;o<r;o+=1){for(var i=0,a=t.isDark(n,o),u=-1;u<=1;u+=1)if(!(n+u<0||r<=n+u))for(var f=-1;f<=1;f+=1)o+f<0||r<=o+f||0==u&&0==f||a==t.isDark(n+u,o+f)&&(i+=1);i>5&&(e+=3+i-5)}for(n=0;n<r-1;n+=1)for(o=0;o<r-1;o+=1){var c=0;t.isDark(n,o)&&(c+=1),t.isDark(n+1,o)&&(c+=1),t.isDark(n,o+1)&&(c+=1),t.isDark(n+1,o+1)&&(c+=1),0!=c&&4!=c||(e+=3)}for(n=0;n<r;n+=1)for(o=0;o<r-6;o+=1)t.isDark(n,o)&&!t.isDark(n,o+1)&&t.isDark(n,o+2)&&t.isDark(n,o+3)&&t.isDark(n,o+4)&&!t.isDark(n,o+5)&&t.isDark(n,o+6)&&(e+=40);for(o=0;o<r;o+=1)for(n=0;n<r-6;n+=1)t.isDark(n,o)&&!t.isDark(n+1,o)&&t.isDark(n+2,o)&&t.isDark(n+3,o)&&t.isDark(n+4,o)&&!t.isDark(n+5,o)&&t.isDark(n+6,o)&&(e+=40);var g=0;for(o=0;o<r;o+=1)for(n=0;n<r;n+=1)t.isDark(n,o)&&(g+=1);return e+=Math.abs(100*g/r/r-50)/5*10},o),C=function(){for(var t=new Array(256),r=new Array(256),e=0;e<8;e+=1)t[e]=1<<e;for(e=8;e<256;e+=1)t[e]=t[e-4]^t[e-5]^t[e-6]^t[e-8];for(e=0;e<255;e+=1)r[t[e]]=e;var n={glog:function(t){if(t<1)throw"glog("+t+")";return r[t]},gexp:function(r){for(;r<0;)r+=255;for(;r>=256;)r-=255;return t[r]}};return n}();function k(t,r){if(void 0===t.length)throw t.length+"/"+r;var e=function(){for(var e=0;e<t.length&&0==t[e];)e+=1;for(var n=new Array(t.length-e+r),o=0;o<t.length-e;o+=1)n[o]=t[o+e];return n}(),n={getAt:function(t){return e[t]},getLength:function(){return e.length},multiply:function(t){for(var r=new Array(n.getLength()+t.getLength()-1),e=0;e<n.getLength();e+=1)for(var o=0;o<t.getLength();o+=1)r[e+o]^=C.gexp(C.glog(n.getAt(e))+C.glog(t.getAt(o)));return k(r,0)},mod:function(t){if(n.getLength()-t.getLength()<0)return n;for(var r=C.glog(n.getAt(0))-C.glog(t.getAt(0)),e=new Array(n.getLength()),o=0;o<n.getLength();o+=1)e[o]=n.getAt(o);for(o=0;o<t.getLength();o+=1)e[o]^=C.gexp(C.glog(t.getAt(o))+r);return k(e,0).mod(t)}};return n}var A=function(){var t=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],r=function(t,r){var e={};return e.totalCount=t,e.dataCount=r,e},e={};return e.getRSBlocks=function(e,n){var o=function(r,e){switch(e){case g.L:return t[4*(r-1)+0];case g.M:return t[4*(r-1)+1];case g.Q:return t[4*(r-1)+2];case g.H:return t[4*(r-1)+3];default:return}}(e,n);if(void 0===o)throw"bad rs block @ typeNumber:"+e+"/errorCorrectionLevel:"+n;for(var i=o.length/3,a=[],u=0;u<i;u+=1)for(var f=o[3*u+0],c=o[3*u+1],l=o[3*u+2],h=0;h<f;h+=1)a.push(r(c,l));return a},e}(),b=function(){var t=[],r=0,e={getBuffer:function(){return t},getAt:function(r){var e=Math.floor(r/8);return 1==(t[e]>>>7-r%8&1)},put:function(t,r){for(var n=0;n<r;n+=1)e.putBit(1==(t>>>r-n-1&1))},getLengthInBits:function(){return r},putBit:function(e){var n=Math.floor(r/8);t.length<=n&&t.push(0),e&&(t[n]|=128>>>r%8),r+=1}};return e},M=function(t){var r=a,e=t,n={getMode:function(){return r},getLength:function(t){return e.length},write:function(t){for(var r=e,n=0;n+2<r.length;)t.put(o(r.substring(n,n+3)),10),n+=3;n<r.length&&(r.length-n==1?t.put(o(r.substring(n,n+1)),4):r.length-n==2&&t.put(o(r.substring(n,n+2)),7))}},o=function(t){for(var r=0,e=0;e<t.length;e+=1)r=10*r+i(t.charAt(e));return r},i=function(t){if("0"<=t&&t<="9")return t.charCodeAt(0)-"0".charCodeAt(0);throw"illegal char :"+t};return n},x=function(t){var r=u,e=t,n={getMode:function(){return r},getLength:function(t){return e.length},write:function(t){for(var r=e,n=0;n+1<r.length;)t.put(45*o(r.charAt(n))+o(r.charAt(n+1)),11),n+=2;n<r.length&&t.put(o(r.charAt(n)),6)}},o=function(t){if("0"<=t&&t<="9")return t.charCodeAt(0)-"0".charCodeAt(0);if("A"<=t&&t<="Z")return t.charCodeAt(0)-"A".charCodeAt(0)+10;switch(t){case" ":return 36;case"$":return 37;case"%":return 38;case"*":return 39;case"+":return 40;case"-":return 41;case".":return 42;case"/":return 43;case":":return 44;default:throw"illegal char :"+t}};return n},m=function(r){var e=f,n=t.stringToBytes(r),o={getMode:function(){return e},getLength:function(t){return n.length},write:function(t){for(var r=0;r<n.length;r+=1)t.put(n[r],8)}};return o},L=function(r){var e=c,n=t.stringToBytesFuncs.SJIS;if(!n)throw"sjis not supported.";!function(){var t=n("\u53CB");if(2!=t.length||38726!=(t[0]<<8|t[1]))throw"sjis not supported."}();var o=n(r),i={getMode:function(){return e},getLength:function(t){return~~(o.length/2)},write:function(t){for(var r=o,e=0;e+1<r.length;){var n=(255&r[e])<<8|255&r[e+1];if(33088<=n&&n<=40956)n-=33088;else{if(!(57408<=n&&n<=60351))throw"illegal char at "+(e+1)+"/"+n;n-=49472}n=192*(n>>>8&255)+(255&n),t.put(n,13),e+=2}if(e<r.length)throw"illegal char at "+(e+1)}};return i},D=function(){var t=[],r={writeByte:function(r){t.push(255&r)},writeShort:function(t){r.writeByte(t),r.writeByte(t>>>8)},writeBytes:function(t,e,n){e=e||0,n=n||t.length;for(var o=0;o<n;o+=1)r.writeByte(t[o+e])},writeString:function(t){for(var e=0;e<t.length;e+=1)r.writeByte(t.charCodeAt(e))},toByteArray:function(){return t},toString:function(){var r="";r+="[";for(var e=0;e<t.length;e+=1)e>0&&(r+=","),r+=t[e];return r+="]"}};return r},S=function(t){var r=t,e=0,n=0,o=0,i={read:function(){for(;o<8;){if(e>=r.length){if(0==o)return-1;throw"unexpected end of file./"+o}var t=r.charAt(e);if(e+=1,"="==t)return o=0,-1;t.match(/^\\s$/)||(n=n<<6|a(t.charCodeAt(0)),o+=6)}var i=n>>>o-8&255;return o-=8,i}},a=function(t){if(65<=t&&t<=90)return t-65;if(97<=t&&t<=122)return t-97+26;if(48<=t&&t<=57)return t-48+52;if(43==t)return 62;if(47==t)return 63;throw"c:"+t};return i},I=function(t,r,e){for(var n=function(t,r){var e=t,n=r,o=new Array(t*r),i={setPixel:function(t,r,n){o[r*e+t]=n},write:function(t){t.writeString("GIF87a"),t.writeShort(e),t.writeShort(n),t.writeByte(128),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(255),t.writeByte(255),t.writeByte(255),t.writeString(","),t.writeShort(0),t.writeShort(0),t.writeShort(e),t.writeShort(n),t.writeByte(0);var r=a(2);t.writeByte(2);for(var o=0;r.length-o>255;)t.writeByte(255),t.writeBytes(r,o,255),o+=255;t.writeByte(r.length-o),t.writeBytes(r,o,r.length-o),t.writeByte(0),t.writeString(";")}},a=function(t){for(var r=1<<t,e=1+(1<<t),n=t+1,i=u(),a=0;a<r;a+=1)i.add(String.fromCharCode(a));i.add(String.fromCharCode(r)),i.add(String.fromCharCode(e));var f,c,g,l=D(),h=(f=l,c=0,g=0,{write:function(t,r){if(t>>>r!=0)throw"length over";for(;c+r>=8;)f.writeByte(255&(t<<c|g)),r-=8-c,t>>>=8-c,g=0,c=0;g|=t<<c,c+=r},flush:function(){c>0&&f.writeByte(g)}});h.write(r,n);var s=0,v=String.fromCharCode(o[s]);for(s+=1;s<o.length;){var d=String.fromCharCode(o[s]);s+=1,i.contains(v+d)?v+=d:(h.write(i.indexOf(v),n),i.size()<4095&&(i.size()==1<<n&&(n+=1),i.add(v+d)),v=d)}return h.write(i.indexOf(v),n),h.write(e,n),h.flush(),l.toByteArray()},u=function(){var t={},r=0,e={add:function(n){if(e.contains(n))throw"dup key:"+n;t[n]=r,r+=1},size:function(){return r},indexOf:function(r){return t[r]},contains:function(r){return void 0!==t[r]}};return e};return i}(t,r),o=0;o<r;o+=1)for(var i=0;i<t;i+=1)n.setPixel(i,o,e(i,o));var a=D();n.write(a);for(var u=function(){var t=0,r=0,e=0,n="",o={},i=function(t){n+=String.fromCharCode(a(63&t))},a=function(t){if(t<0);else{if(t<26)return 65+t;if(t<52)return t-26+97;if(t<62)return t-52+48;if(62==t)return 43;if(63==t)return 47}throw"n:"+t};return o.writeByte=function(n){for(t=t<<8|255&n,r+=8,e+=1;r>=6;)i(t>>>r-6),r-=6},o.flush=function(){if(r>0&&(i(t<<6-r),t=0,r=0),e%3!=0)for(var o=3-e%3,a=0;a<o;a+=1)n+="="},o.toString=function(){return n},o}(),f=a.toByteArray(),c=0;c<f.length;c+=1)u.writeByte(f[c]);return u.flush(),"data:image/gif;base64,"+u};return t}();qrcode.stringToBytesFuncs["UTF-8"]=function(t){return function(t){for(var r=[],e=0;e<t.length;e++){var n=t.charCodeAt(e);n<128?r.push(n):n<2048?r.push(192|n>>6,128|63&n):n<55296||n>=57344?r.push(224|n>>12,128|n>>6&63,128|63&n):(e++,n=65536+((1023&n)<<10|1023&t.charCodeAt(e)),r.push(240|n>>18,128|n>>12&63,128|n>>6&63,128|63&n))}return r}(t)},function(t){"function"==typeof define&&define.amd?define([],t):"object"==typeof exports&&(module.exports=t())}((function(){return qrcode}));
`.replace(/<\/script/gi,"<\\/script");return`<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>\u0644\u06CC\u0646\u06A9 \u0633\u0627\u0628 \u2022 Nika Net</title>
<style>
:root{
  --bg:#0a0c12; --bg2:#0f1220; --card:rgba(255,255,255,.045); --card2:rgba(255,255,255,.07);
  --border:rgba(255,255,255,.09); --txt:#eef0f8; --muted:#9aa1b8;
  --a1:#7c5cff; --a2:#22d3ee; --grad:linear-gradient(135deg,#7c5cff,#22d3ee);
  --ok:#34d399; --warn:#fbbf24; --bad:#fb7185; --shadow:0 20px 60px rgba(0,0,0,.45);
}
@media (prefers-color-scheme: light){
  :root{
    --bg:#eef0f8; --bg2:#ffffff; --card:#ffffff; --card2:#f4f5fb;
    --border:rgba(20,24,48,.10); --txt:#141828; --muted:#5b6279; --shadow:0 16px 50px rgba(40,48,90,.14);
  }
}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
body{
  font-family:"Vazirmatn","IRANSansX","Segoe UI",Tahoma,"Helvetica Neue",sans-serif;
  background:var(--bg); color:var(--txt); min-height:100vh; line-height:1.7;
  background-image:
    radial-gradient(60vw 40vw at 110% -10%, rgba(124,92,255,.28), transparent 60%),
    radial-gradient(55vw 40vw at -10% 10%, rgba(34,211,238,.20), transparent 60%),
    radial-gradient(40vw 35vw at 50% 120%, rgba(124,92,255,.16), transparent 60%);
  background-attachment:fixed;
}
.wrap{max-width:520px;margin:0 auto;padding:26px 16px 40px}
/* ---------- hero ---------- */
.hero{text-align:center;padding:14px 6px 8px;animation:up .5s ease both}
.brand{display:inline-flex;align-items:center;gap:8px;font-weight:800;letter-spacing:.5px;
  background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;
  font-size:1.05rem;direction:ltr}
.brand .dot{width:9px;height:9px;border-radius:50%;background:var(--grad);box-shadow:0 0 12px #22d3ee}
.hero h1{margin-top:14px;font-size:1.7rem;font-weight:800}
.hero p{color:var(--muted);font-size:.95rem;margin-top:2px}
.chip{display:inline-flex;align-items:center;gap:7px;margin-top:12px;padding:6px 16px;border-radius:999px;
  font-size:.85rem;font-weight:700;border:1px solid var(--border);background:var(--card)}
.chip .b{width:8px;height:8px;border-radius:50%}
.chip.on .b{background:var(--ok);box-shadow:0 0 10px var(--ok);animation:pulse 2s infinite}
.chip.off .b{background:var(--bad);box-shadow:0 0 10px var(--bad)}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
/* ---------- cards ---------- */
.card{background:var(--card);border:1px solid var(--border);border-radius:20px;
  padding:20px;margin-top:16px;box-shadow:var(--shadow);backdrop-filter:blur(14px);
  animation:up .55s ease both}
.card h2{font-size:1.02rem;font-weight:800;display:flex;align-items:center;gap:8px}
.card .sub{color:var(--muted);font-size:.82rem;margin-top:4px}
@keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
/* ---------- meter ---------- */
.meter{height:12px;border-radius:99px;background:var(--card2);overflow:hidden;margin:14px 0 6px}
.meter>i{display:block;height:100%;border-radius:99px;background:var(--grad);
  box-shadow:0 0 14px rgba(34,211,238,.55);transition:width .8s cubic-bezier(.2,.8,.2,1)}
.mlabel{display:flex;justify-content:space-between;font-size:.8rem;color:var(--muted)}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}
.stat{background:var(--card2);border:1px solid var(--border);border-radius:14px;padding:10px 6px;text-align:center}
.stat b{display:block;font-size:1.05rem}
.stat span{font-size:.72rem;color:var(--muted)}
.protos{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px}
.protos i{font-style:normal;font-size:.72rem;font-weight:700;padding:4px 12px;border-radius:999px;
  color:#fff;background:var(--grad)}
/* ---------- link box ---------- */
.linkbox{display:flex;gap:8px;margin-top:12px}
.linkbox input{flex:1;min-width:0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.78rem;
  padding:11px 12px;border-radius:12px;border:1px solid var(--border);background:var(--card2);color:var(--txt);
  direction:ltr;text-align:left;outline:none}
.btn{border:0;cursor:pointer;font-family:inherit;font-weight:800;border-radius:12px;padding:11px 18px;
  font-size:.9rem;transition:transform .12s ease,filter .12s ease;color:#fff;background:var(--grad);
  box-shadow:0 8px 22px rgba(124,92,255,.35);white-space:nowrap}
.btn:active{transform:scale(.96)}
.btn.ghost{background:var(--card2);color:var(--txt);border:1px solid var(--border);box-shadow:none}
.btn.small{padding:8px 14px;font-size:.8rem}
.formats{margin-top:12px;display:flex;flex-direction:column;gap:8px}
.frow{display:flex;align-items:center;gap:8px;background:var(--card2);border:1px solid var(--border);
  border-radius:13px;padding:9px 12px}
.frow .k{font-weight:700;font-size:.82rem;flex:0 0 74px}
.frow .k em{font-style:normal;font-size:.7rem;color:var(--muted);display:block;font-weight:400}
.frow code{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr;
  font-size:.74rem;color:var(--muted);text-align:left}
/* ---------- apps ---------- */
.apps{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:16px}
.app{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 8px 13px;border-radius:18px;
  background:var(--card2);border:1px solid var(--border);text-decoration:none;color:var(--txt);
  transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease;position:relative}
.app:hover{transform:translateY(-4px);border-color:transparent;box-shadow:0 14px 34px rgba(124,92,255,.28)}
.app img{width:62px;height:62px;border-radius:20%;object-fit:cover;box-shadow:0 8px 20px rgba(0,0,0,.28);
  background:#fff}
.app b{font-size:.92rem}
.app em{font-style:normal;font-size:.7rem;color:var(--muted)}
.app .go{position:absolute;top:10px;inset-inline-start:10px;font-size:.68rem;font-weight:700;
  background:var(--grad);color:#fff;padding:3px 9px;border-radius:999px}
/* ---------- qr ---------- */
.qrbox{display:flex;gap:16px;align-items:center;margin-top:14px}
#qr{background:#fff;border-radius:16px;padding:10px;line-height:0;box-shadow:0 12px 30px rgba(0,0,0,.3)}
#qr svg{display:block;width:150px;height:150px}
.qrbox .t{font-size:.82rem;color:var(--muted)}
.qrbox .t b{color:var(--txt);display:block;font-size:.95rem;margin-bottom:4px}
/* ---------- footer ---------- */
.foot{text-align:center;color:var(--muted);font-size:.76rem;margin-top:22px}
.foot b{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
/* ---------- toast ---------- */
#toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);
  background:var(--grad);color:#fff;font-weight:700;font-size:.86rem;padding:11px 22px;border-radius:999px;
  opacity:0;transition:all .3s ease;box-shadow:0 14px 40px rgba(0,0,0,.4);z-index:99;pointer-events:none}
#toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
</style>
</head>
<body>
<div class="wrap">

  <header class="hero">
    <div class="brand"><span class="dot"></span>NIKA NET</div>
    <h1>\u0633\u0644\u0627\u0645 ${S(t.name)} \u{1F44B}</h1>
    <p>\u0627\u0634\u062A\u0631\u0627\u06A9 \u0634\u062E\u0635\u06CC \u062A\u0648 \u0622\u0645\u0627\u062F\u0647\u200C\u0633\u062A \u2014 \u0628\u0627 \u06CC\u0647 \u0644\u0645\u0633 \u0648\u0635\u0644 \u0634\u0648</p>
    <div class="chip ${u}"><span class="b"></span>${l}</div>
  </header>

  <section class="card">
    <h2>\u{1F4CA} \u0648\u0636\u0639\u06CC\u062A \u0627\u0634\u062A\u0631\u0627\u06A9</h2>
    <div class="meter"><i style="width:${p}%"></i></div>
    <div class="mlabel"><span>\u0645\u0635\u0631\u0641</span><span>${P(p)}\u066A</span></div>
    <div class="stats">
      <div class="stat"><b>${P(t.quota)} GB</b><span>\u062D\u062C\u0645 \u06A9\u0644</span></div>
      <div class="stat"><b>${P(t.used)} GB</b><span>\u0645\u0635\u0631\u0641 \u0634\u062F\u0647</span></div>
      <div class="stat"><b>${P(t.days)}</b><span>\u0631\u0648\u0632 \u0627\u0639\u062A\u0628\u0627\u0631</span></div>
    </div>
    <div class="protos">${x.map(w=>`<i>${w}</i>`).join("")}</div>
  </section>

  <section class="card">
    <h2>\u{1F4CB} \u06A9\u067E\u06CC \u0644\u06CC\u0646\u06A9 \u0633\u0627\u0628</h2>
    <p class="sub">\u0627\u06CC\u0646 \u0644\u06CC\u0646\u06A9 \u0627\u0634\u062A\u0631\u0627\u06A9 \u0634\u062E\u0635\u06CC \u062A\u0648\u0626\u0647 \u2014 \u06A9\u067E\u06CC\u0634 \u06A9\u0646 \u06CC\u0627 \u0645\u0633\u062A\u0642\u06CC\u0645 \u0648\u0627\u0631\u062F \u0627\u067E \u06A9\u0646.</p>
    <div class="linkbox">
      <input id="rawLink" readonly value="${S(e)}"/>
      <button class="btn" onclick="copyRaw()">\u06A9\u067E\u06CC</button>
    </div>
    <div class="formats">
      <div class="frow">
        <div class="k">Base64<em>V2rayNG</em></div>
        <code>${S(e)}</code>
        <button class="btn ghost small" onclick="copyRaw()">\u06A9\u067E\u06CC</button>
      </div>
      <div class="frow">
        <div class="k">Clash<em>YAML</em></div>
        <code>${S(r)}</code>
        <button class="btn ghost small" onclick="copyClash()">\u06A9\u067E\u06CC</button>
      </div>
      <div class="frow">
        <div class="k">Sing-box<em>JSON</em></div>
        <code>${S(a)}</code>
        <button class="btn ghost small" onclick="copySing()">\u06A9\u067E\u06CC</button>
      </div>
    </div>
  </section>

  <section class="card">
    <h2>\u{1F4F1} \u0627\u062A\u0635\u0627\u0644 \u0633\u0631\u06CC\u0639 \u0628\u0627 \u0627\u067E</h2>
    <p class="sub">\u0631\u0648\u06CC \u0627\u067E \u0645\u0648\u0631\u062F\u0646\u0638\u0631\u062A \u0628\u0632\u0646 \u062A\u0627 \u06A9\u0627\u0646\u0641\u06CC\u06AF \u062E\u0648\u062F\u06A9\u0627\u0631 \u0648\u0627\u0631\u062F\u0634 \u0628\u0634\u0647 \u26A1</p>
    <div class="apps">
      <a class="app" href="${n}"><span class="go">\u26A1</span><img src="${Bt}" alt="V2rayNG"/><b>V2rayNG</b><em>\u0627\u0646\u062F\u0631\u0648\u06CC\u062F</em></a>
      <a class="app" href="${c}"><span class="go">\u26A1</span><img src="${Ut}" alt="Hiddify"/><b>Hiddify</b><em>\u0647\u0645\u0647\u200C\u06CC \u067E\u0644\u062A\u0641\u0631\u0645\u200C\u0647\u0627</em></a>
      <a class="app" href="${o}"><span class="go">\u26A1</span><img src="${Rt}" alt="Happ"/><b>Happ</b><em>\u0627\u0646\u062F\u0631\u0648\u06CC\u062F \xB7 iOS</em></a>
      <a class="app" href="${i}"><span class="go">\u26A1</span><img src="${Ct}" alt="V2Box"/><b>V2Box</b><em>iOS \xB7 macOS</em></a>
    </div>
  </section>

  <section class="card">
    <h2>\u{1F533} \u0627\u0633\u06A9\u0646 \u0633\u0631\u06CC\u0639</h2>
    <div class="qrbox">
      <div id="qr"></div>
      <div class="t"><b>\u0628\u0627 \u062F\u0648\u0631\u0628\u06CC\u0646 \u0627\u0633\u06A9\u0646 \u06A9\u0646</b>\u062F\u0627\u062E\u0644 \u0627\u067E\u060C \u0627\u0632 \u0628\u062E\u0634 \xAB\u0627\u0633\u06A9\u0646 QR\xBB \u0647\u0645\u06CC\u0646 \u06A9\u062F \u0631\u0648 \u0628\u062E\u0648\u0646 \u062A\u0627 \u0645\u0633\u062A\u0642\u06CC\u0645 \u0648\u0627\u0631\u062F \u0628\u0634\u0647.</div>
    </div>
  </section>

  <footer class="foot">\u0633\u0627\u062E\u062A\u0647\u200C\u0634\u062F\u0647 \u0628\u0627 <b>NIKA NET</b> \xB7 \u0646\u0633\u062E\u0647 ${S(t.version)}<br/>\u0644\u06CC\u0646\u06A9 \u0633\u0627\u0628\u062A \u0631\u0648 \u062C\u0627\u06CC\u06CC \u0627\u0645\u0646 \u0646\u06AF\u0647 \u062F\u0627\u0631 \u{1F510}</footer>
</div>

<div id="toast">\u06A9\u067E\u06CC \u0634\u062F \u2713</div>

<script>${h}<\/script>
<script>
(function(){
  var RAW=${JSON.stringify(e)};
  var CLASH=${JSON.stringify(r)};
  var SING=${JSON.stringify(a)};
  function toast(m){
    var t=document.getElementById('toast'); t.textContent=m; t.classList.add('show');
    setTimeout(function(){t.classList.remove('show')},1600);
  }
  function copyText(v){
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(v).then(function(){toast('\u06A9\u067E\u06CC \u0634\u062F \u2713')},function(){legacy(v)});
    }else{legacy(v)}
  }
  function legacy(v){
    var i=document.createElement('input');i.value=v;document.body.appendChild(i);i.select();
    try{document.execCommand('copy');toast('\u06A9\u067E\u06CC \u0634\u062F \u2713')}catch(e){toast('\u06A9\u067E\u06CC \u0646\u0634\u062F \u2717')}
    document.body.removeChild(i);
  }
  window.copyRaw=function(){copyText(RAW)};
  window.copyClash=function(){copyText(CLASH)};
  window.copySing=function(){copyText(SING)};
  try{
    var qr=qrcode(0,'M');qr.addData(RAW);qr.make();
    document.getElementById('qr').innerHTML=qr.createSvgTag({cellSize:5,margin:2});
  }catch(e){document.getElementById('qr').innerHTML='';}
})();
<\/script>
</body>
</html>`}var Qt=`<!doctype html>
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
            <button id="scanSourceO" data-i18n="scan.online">\u0645\u062E\u0632\u0646 \u0622\u0646\u0644\u0627\u06CC\u0646</button>
            <button id="scanSourceR" data-i18n="scan.ranges">\u0631\u0646\u062C \u06A9\u0644\u0648\u062F\u0641\u0644\u0631</button>
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
        <div class="card-title"><span>\u{1F6F0} <span data-i18n="relay.title">\u062A\u0633\u062A \u0631\u0644\u0647</span></span><span class="mini" data-i18n="relay.desc">\u067E\u06CC\u062F\u0627 \u06A9\u0631\u062F\u0646 \u0628\u0647\u062A\u0631\u06CC\u0646 \u062F\u0627\u0645\u0646\u0647\u0654 \u0631\u0644\u0647</span></div>
        <div class="d" style="margin-top:6px" data-i18n="relay.help">\u062F\u0627\u0645\u0646\u0647\u0654 \u0631\u0644\u0647\u060C \u062F\u0627\u0645\u0646\u0647 \u0627\u06CC \u0627\u0633\u062A \u06A9\u0647 \u062C\u0644\u0648\u06CC \u0648\u0631\u06A9\u0631 \u062A\u0648 \u0645\u06CC \u0627\u06CC\u0633\u062A\u062F \u0648 \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0647\u0627 \u0631\u0627 \u0648\u0635\u0644 \u0645\u06CC \u06A9\u0646\u062F.</div>
        <div class="field" style="margin-top:14px"><label data-i18n="relay.candidates">\u062F\u0627\u0645\u0646\u0647 \u0647\u0627\u06CC \u0631\u0644\u0647 (\u0647\u0631 \u062E\u0637 \u06CC\u06A9\u06CC)</label>
          <textarea class="input" id="relayCandidates" dir="ltr" style="min-height:84px"></textarea></div>
        <div class="copy-row" style="margin-top:14px">
          <button class="btn btn-primary" id="relayStart" style="width:auto">\u{1F680} <span data-i18n="relay.start">\u062A\u0633\u062A \u0631\u0644\u0647</span></button>
          <button class="btn btn-primary hidden" id="relayApply" style="width:auto">\u26A1 <span data-i18n="relay.apply">\u0627\u0639\u0645\u0627\u0644 \u0628\u0647\u062A\u0631\u06CC\u0646 \u062F\u0627\u0645\u0646\u0647</span></button>
        </div>
        <div class="scan-counters" id="relayStatus" style="margin-top:12px"><span data-i18n="relay.empty">\u0647\u0646\u0648\u0632 \u062A\u0633\u062A\u06CC \u0627\u0646\u062C\u0627\u0645 \u0646\u0634\u062F\u0647</span></div>
        <div class="scan-list" id="relayList" style="margin-top:10px"></div>
        <div class="d" id="relayCurrent" style="margin-top:10px"></div>
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
    "nav.dash": "\u062F\u0627\u0634\u0628\u0648\u0631\u062F", "nav.users": "\u06A9\u0627\u0631\u0628\u0631\u0627\u0646", "nav.settings": "\u062A\u0646\u0638\u06CC\u0645\u0627\u062A", "nav.scan": "\u0627\u0633\u06A9\u0646\u0631 IP", "nav.upd": "\u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC",
    "stat.users": "\u06A9\u0627\u0631\u0628\u0631\u0627\u0646", "stat.active": "\u0641\u0639\u0627\u0644", "stat.req": "\u062F\u0631\u062E\u0648\u0627\u0633\u062A \u0627\u0645\u0631\u0648\u0632", "stat.gig": "\u06AF\u06CC\u06AF\u0627\u0628\u0627\u06CC\u062A \u0645\u0635\u0631\u0641", "stat.proto": "\u067E\u0631\u0648\u062A\u06A9\u0644 \u0641\u0639\u0627\u0644",
    "dash.traffic": "\u062A\u0631\u0627\u0641\u06CC\u06A9 (\u06F7 \u0631\u0648\u0632 \u0627\u062E\u06CC\u0631)", "dash.gb": "\u0628\u0631 \u062D\u0633\u0628 \u06AF\u06CC\u06AF\u0627\u0628\u0627\u06CC\u062A", "dash.usage": "\u0645\u0635\u0631\u0641", "dash.activity": "\u0641\u0639\u0627\u0644\u06CC\u062A\u200C\u0647\u0627\u06CC \u0627\u062E\u06CC\u0631",
    "dash.today": "\u0627\u0645\u0631\u0648\u0632", "dash.nochart": "\u0647\u0646\u0648\u0632 \u062F\u0627\u062F\u0647\u0654 \u062A\u0631\u0627\u0641\u06CC\u06A9\u06CC \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A", "act.empty": "\u0647\u0646\u0648\u0632 \u0641\u0639\u0627\u0644\u06CC\u062A\u06CC \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A",
    "users.title": "\u0645\u062F\u06CC\u0631\u06CC\u062A \u06A9\u0627\u0631\u0628\u0631\u0627\u0646", "users.add": "+ \u06A9\u0627\u0631\u0628\u0631 \u062C\u062F\u06CC\u062F", "users.name": "\u0646\u0627\u0645", "users.status": "\u0648\u0636\u0639\u06CC\u062A", "users.used": "\u0645\u0635\u0631\u0641", "users.expiry": "\u0627\u0646\u0642\u0636\u0627",
    "users.empty": "\u0647\u0646\u0648\u0632 \u06A9\u0627\u0631\u0628\u0631\u06CC \u0646\u06CC\u0633\u062A \u2014 \u0627\u0648\u0644 \u06CC\u06A9 \u06A9\u0627\u0631\u0628\u0631 \u0628\u0633\u0627\u0632",
    "u.active": "\u0641\u0639\u0627\u0644", "u.inactive": "\u063A\u06CC\u0631\u0641\u0639\u0627\u0644", "u.expired": "\u0645\u0646\u0642\u0636\u06CC", "u.openStatus": "\u0628\u0627\u0632 \u06A9\u0631\u062F\u0646 \u0635\u0641\u062D\u0647 \u0648\u0636\u0639\u06CC\u062A \u06A9\u0627\u0631\u0628\u0631", "u.del": "\u062D\u0630\u0641",
    "set.general": "\u0639\u0645\u0648\u0645\u06CC", "set.title": "\u0639\u0646\u0648\u0627\u0646 \u067E\u0646\u0644", "set.host": "\u062F\u0627\u0645\u0646\u0647 / Host \u0648\u0631\u06A9\u0631", "set.sni": "SNI / Host \u062C\u0639\u0644\u06CC",
    "set.wsPath": "\u0645\u0633\u06CC\u0631 WebSocket", "set.security": "\u0627\u0645\u0646\u06CC\u062A", "set.newpass": "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u062C\u062F\u06CC\u062F", "set.brute": "\u0645\u062D\u0627\u0641\u0638\u062A Brute-Force",
    "set.bruteD": "\u0645\u0633\u062F\u0648\u062F\u0633\u0627\u0632\u06CC \u0645\u0648\u0642\u062A \u0628\u0639\u062F \u0627\u0632 \u062A\u0644\u0627\u0634 \u0646\u0627\u0645\u0648\u0641\u0642", "set.cleanip": "IP \u0647\u0627\u06CC \u062A\u0645\u06CC\u0632", "set.cleanipD": "\u0647\u0631 \u062E\u0637 \u06CC\u06A9 IP", "set.save": "\u0630\u062E\u06CC\u0631\u0647 \u062A\u0646\u0638\u06CC\u0645\u0627\u062A",
    "m.addUser": "\u06A9\u0627\u0631\u0628\u0631 \u062C\u062F\u06CC\u062F", "m.name": "\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631", "m.namePh": "\u0645\u062B\u0644\u0627\u064B: \u0639\u0644\u06CC", "m.quota": "\u0633\u0647\u0645\u06CC\u0647 (GB)", "m.days": "\u0645\u062F\u062A (\u0631\u0648\u0632)",
    "m.save": "\u0630\u062E\u06CC\u0631\u0647", "m.cancel": "\u0627\u0646\u0635\u0631\u0627\u0641",
    "toast.copied": "\u06A9\u067E\u06CC \u0634\u062F \u2713", "toast.saved": "\u0630\u062E\u06CC\u0631\u0647 \u0634\u062F \u2713", "toast.deleted": "\u062D\u0630\u0641 \u0634\u062F", "toast.gen": "\u06A9\u0627\u0646\u0641\u06CC\u06AF \u0628\u0647\u200C\u0631\u0648\u0632 \u0634\u062F \u2713",
    "toast.toggled": "\u0648\u0636\u0639\u06CC\u062A \u062A\u063A\u06CC\u06CC\u0631 \u06A9\u0631\u062F", "toast.preview": "\u062F\u0631 \u067E\u06CC\u0634\u200C\u0646\u0645\u0627\u06CC\u0634\u060C \u0627\u062A\u0635\u0627\u0644 \u0628\u0647 \u0633\u0631\u0648\u0631 \u0646\u06CC\u0633\u062A",
    "common.error": "\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u0627\u0637\u0644\u0627\u0639\u0627\u062A", "common.loading": "\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC\u2026",
    "page.dash": "\u062F\u0627\u0634\u0628\u0648\u0631\u062F", "page.dashD": "\u0646\u0645\u0627\u06CC \u06A9\u0644\u06CC \u0648\u0636\u0639\u06CC\u062A \u067E\u0646\u0644", "page.users": "\u06A9\u0627\u0631\u0628\u0631\u0627\u0646", "page.usersD": "Manage users & their status",
    "page.set": "\u062A\u0646\u0638\u06CC\u0645\u0627\u062A", "page.setD": "\u067E\u06CC\u06A9\u0631\u0628\u0646\u062F\u06CC \u067E\u0646\u0644 \u0648 \u0627\u0645\u0646\u06CC\u062A",
  },
  en: {
    dir: "ltr", lang: "en",
    "login.title": "Nika Net", "login.sub": "Proxy control panel \u2014 on Cloudflare Workers",
    "login.password": "Admin password", "login.passwordPh": "Password", "login.enter": "Sign in",
    "login.hintFirst": "\u{1F513} First sign-in \u2014 the password you choose becomes the admin password (min 4 chars)",
    "login.hintPass": "Enter the admin password",
    "login.hintPreview": "This is a static preview \u2014 open the live panel URL for real data",
    "login.wrong": "Wrong password", "login.short": "Password must be at least 4 characters",
    "nav.dash": "Dashboard", "nav.users": "Users", "nav.settings": "Settings", "nav.scan": "IP Scanner", "nav.upd": "Update",
    "stat.users": "Users", "stat.active": "active", "stat.req": "Requests today", "stat.gig": "GB used", "stat.proto": "Active protocols",
    "dash.traffic": "Traffic (last 7 days)", "dash.gb": "in gigabytes", "dash.usage": "Usage", "dash.activity": "Recent activity",
    "dash.today": "today", "dash.nochart": "No traffic data yet", "act.empty": "No activity yet",
    "users.title": "User management", "users.add": "+ Add user", "users.name": "Name", "users.status": "Status", "users.used": "Usage", "users.expiry": "Expiry",
    "users.empty": "No users yet \u2014 create your first user",
    "u.active": "Active", "u.inactive": "Inactive", "u.expired": "Expired", "u.openStatus": "Open user status page", "u.del": "Delete",
    "set.general": "General", "set.title": "Panel title", "set.host": "Worker domain / host", "set.sni": "Fake SNI / Host",
    "set.wsPath": "WebSocket path", "set.security": "Security", "set.newpass": "New password", "set.brute": "Brute-force protection",
    "set.bruteD": "Temporary block after failed attempts", "set.cleanip": "Clean IPs", "set.cleanipD": "One IP per line", "set.save": "Save settings",
    "m.addUser": "New user", "m.name": "Name", "m.namePh": "e.g. Ali", "m.quota": "Quota (GB)", "m.days": "Days",
    "m.save": "Save", "m.cancel": "Cancel",
    "toast.copied": "Copied \u2713", "toast.saved": "Saved \u2713", "toast.deleted": "Deleted", "toast.gen": "Config refreshed \u2713",
    "toast.toggled": "Status changed", "toast.preview": "No server connection in preview mode",
    "common.error": "Failed to load", "common.loading": "Loading\u2026",
    "page.dash": "Dashboard", "page.dashD": "Panel status overview", "page.users": "Users", "page.usersD": "Manage users & subscriptions",
    "page.set": "Settings", "page.setD": "Panel config & security",
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
let proto = { vless: true, trojan: true, warp: true };
const state = { status: null, users: [], settings: null };

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
  state.status = null; state.users = []; state.settings = null;
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
    renderDashboard();
    renderUsers();
  } catch (e) {
    toast(t("common.error"));
  }
}

/* ---------- navigation ---------- */
const PAGES = { dashboard: "page.dash", users: "page.users", settings: "page.set", scanner: "page.scanner", update: "page.update" };
const DESCS = { dashboard: "page.dashD", users: "page.usersD", settings: "page.setD", scanner: "page.scannerD", update: "page.updateD" };
function setPage(p) {
  currentPage = p;
  $$("#nav .nav-item").forEach((b) => b.classList.toggle("active", b.dataset.page === p));
  ["dashboard", "users", "settings", "scanner", "update"].forEach((x) => $("#page-" + x).classList.toggle("hidden", x !== p));
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
        <td><b>\${escHtml(u.name)}</b><div style="margin-top:6px"><a class="btn btn-ghost" style="padding:6px 10px;font-size:11px;display:inline-flex;align-items:center;gap:5px;text-decoration:none" href="/sub/\${escHtml(userToken(u))}" target="_blank" rel="noopener">\u{1F441} <span>\${t("u.openStatus")}</span></a></div></td>
        <td><span class="badge \${u.active ? "ok" : "off"}" style="cursor:pointer" onclick="toggleUser('\${u.id}')"><span class="dot"></span>\${t(u.active ? "u.active" : "u.inactive")}</span></td>
        <td><div>\${used.toFixed(2)} / \${quota} GB</div><div class="progress"><div style="width:\${pct}%"></div></div></td>
        <td>\${exp}</td>
        <td style="white-space:nowrap">
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

function userToken(u) {
  const pw = (u.password && String(u.password).trim()) || "";
  if (pw) return pw;
  return String(u.uuid || "").replace(/-/g, "").slice(0, 12);
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
I18N.fa["scan.online"] = "\u0645\u062E\u0632\u0646 \u0622\u0646\u0644\u0627\u06CC\u0646";
I18N.fa["scan.ranges"] = "\u0631\u0646\u062C \u06A9\u0644\u0648\u062F\u0641\u0644\u0631";
I18N.fa["scan.fetching"] = "\u062F\u0631\u06CC\u0627\u0641\u062A \u0645\u062E\u0632\u0646 \u0622\u0646\u0644\u0627\u06CC\u0646 IP \u0647\u0627\u2026";
I18N.fa["relay.title"] = "\u062A\u0633\u062A \u0631\u0644\u0647";
I18N.fa["relay.desc"] = "\u067E\u06CC\u062F\u0627 \u06A9\u0631\u062F\u0646 \u0628\u0647\u062A\u0631\u06CC\u0646 \u062F\u0627\u0645\u0646\u0647\u0654 \u0631\u0644\u0647 \u062A\u0627 \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0647\u0627 \u0648\u0635\u0644 \u0634\u0648\u0646\u062F";
I18N.fa["relay.help"] = "\u062F\u0627\u0645\u0646\u0647\u0654 \u0631\u0644\u0647\u060C \u062F\u0627\u0645\u0646\u0647 \u0627\u06CC \u0627\u0633\u062A \u06A9\u0647 \u062C\u0644\u0648\u06CC \u0648\u0631\u06A9\u0631 \u062A\u0648 \u0645\u06CC \u0627\u06CC\u0633\u062A\u062F \u0648 \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0647\u0627 \u0631\u0627 \u0648\u0635\u0644 \u0645\u06CC \u06A9\u0646\u062F. \u0647\u0631 \u062F\u0627\u0645\u0646\u0647 \u0627\u06CC \u06A9\u0647 \u0628\u0647 \u0648\u0631\u06A9\u0631\u062A \u0645\u062A\u0635\u0644 \u0627\u0633\u062A (workers.dev \u06CC\u0627 \u062F\u0627\u0645\u0646\u0647\u0654 \u0627\u062E\u062A\u0635\u0627\u0635\u06CC \u0628\u0627 Route) \u0631\u0627 \u0627\u06CC\u0646\u062C\u0627 \u0628\u0646\u0648\u06CC\u0633 \u2014 \u062A\u0633\u062A \u0645\u06CC \u06A9\u0646\u06CC\u0645 \u06A9\u062F\u0627\u0645 \u0633\u0631\u06CC\u0639 \u062A\u0631 \u0648 \u0633\u0627\u0644\u0645 \u062A\u0631 \u0627\u0633\u062A.";
I18N.fa["relay.candidates"] = "\u062F\u0627\u0645\u0646\u0647 \u0647\u0627\u06CC \u0631\u0644\u0647 (\u0647\u0631 \u062E\u0637 \u06CC\u06A9\u06CC)";
I18N.fa["relay.start"] = "\u062A\u0633\u062A \u0631\u0644\u0647";
I18N.fa["relay.apply"] = "\u0627\u0639\u0645\u0627\u0644 \u0628\u0647\u062A\u0631\u06CC\u0646 \u062F\u0627\u0645\u0646\u0647";
I18N.fa["relay.running"] = "\u062F\u0631 \u062D\u0627\u0644 \u062A\u0633\u062A \u062F\u0627\u0645\u0646\u0647 \u0647\u0627\u06CC \u0631\u0644\u0647\u2026";
I18N.fa["relay.done"] = "\u062A\u0633\u062A \u062A\u0645\u0627\u0645 \u0634\u062F";
I18N.fa["relay.front"] = "\u0628\u0647 \u0648\u0631\u06A9\u0631 \u0648\u0635\u0644 \u0634\u062F";
I18N.fa["relay.notfront"] = "\u0628\u0647 \u0627\u06CC\u0646 \u0648\u0631\u06A9\u0631 \u0631\u0648\u062A \u0646\u0645\u06CC \u0634\u0648\u062F";
I18N.fa["relay.best"] = "\u0628\u0647\u062A\u0631\u06CC\u0646";
I18N.fa["relay.current"] = "\u062F\u0627\u0645\u0646\u0647\u0654 \u0631\u0644\u0647\u0654 \u0641\u0639\u0644\u06CC";
I18N.fa["relay.none"] = "\u0647\u06CC\u0686 \u062F\u0627\u0645\u0646\u0647\u0654 \u0633\u0627\u0644\u0645\u06CC \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F";
I18N.fa["relay.applied"] = "\u062F\u0627\u0645\u0646\u0647\u0654 \u0631\u0644\u0647 \u0627\u0639\u0645\u0627\u0644 \u0634\u062F \u2713 \u2014 \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0647\u0627 \u0627\u0632 \u0627\u0644\u0627\u0646 \u0627\u0632 \u0627\u06CC\u0646 \u062F\u0627\u0645\u0646\u0647 \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0645\u06CC \u06A9\u0646\u0646\u062F";
I18N.fa["relay.empty"] = "\u0647\u0646\u0648\u0632 \u062A\u0633\u062A\u06CC \u0627\u0646\u062C\u0627\u0645 \u0646\u0634\u062F\u0647";

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
I18N.en["scan.online"] = "Online pool";
I18N.en["scan.ranges"] = "CF ranges";
I18N.en["scan.fetching"] = "Fetching online IP pool\u2026";
I18N.en["relay.title"] = "Relay Test";
I18N.en["relay.desc"] = "Find the best relay domain so configs connect";
I18N.en["relay.help"] = "A relay domain fronts your worker and makes configs connect. List every domain that routes to your worker (workers.dev or a custom domain with a Worker route) \u2014 we test which is fastest & healthiest.";
I18N.en["relay.candidates"] = "Relay domains (one per line)";
I18N.en["relay.start"] = "Run relay test";
I18N.en["relay.apply"] = "Apply best domain";
I18N.en["relay.running"] = "Testing relay domains\u2026";
I18N.en["relay.done"] = "Test finished";
I18N.en["relay.front"] = "reaches this worker";
I18N.en["relay.notfront"] = "not routed to this worker";
I18N.en["relay.best"] = "Best";
I18N.en["relay.current"] = "Current relay domain";
I18N.en["relay.none"] = "No healthy relay domain found";
I18N.en["relay.applied"] = "Relay domain applied \u2713 \u2014 configs now use this domain";
I18N.en["relay.empty"] = "No test yet";
I18N.en["page.scanner"] = "IP Scanner";
I18N.en["page.scannerD"] = "Discover the fastest clean Cloudflare IPs";
I18N.fa["page.scanner"] = "\u0627\u0633\u06A9\u0646\u0631 IP";
I18N.fa["page.scannerD"] = "\u067E\u06CC\u062F\u0627 \u06A9\u0631\u062F\u0646 \u0633\u0631\u06CC\u0639\u200C\u062A\u0631\u06CC\u0646 IP \u0647\u0627\u06CC \u062A\u0645\u06CC\u0632 \u06A9\u0644\u0648\u062F\u0641\u0644\u0631";

const SCANNER = (() => {
  /* bundled seed list (curated clean Cloudflare IPv4) */
  const SEED = ["1.1.1.205", "103.116.7.159", "104.129.164.73", "104.16.0.158", "104.16.104.127", "104.16.105.208", "104.16.12.155", "104.16.122.31", "104.16.127.145", "104.16.134.94", "104.16.138.229", "104.16.15.61", "104.16.172.40", "104.16.200.105", "104.16.209.40", "104.16.228.155", "104.16.231.154", "104.16.234.166", "104.16.235.139", "104.16.241.3", "104.16.25.194", "104.16.33.169", "104.16.4.244", "104.16.42.140", "104.16.45.222", "104.16.66.24", "104.16.76.146", "104.16.78.31", "104.16.84.135", "104.16.84.24", "104.16.96.61", "104.17.101.85", "104.17.110.181", "104.17.112.46", "104.17.121.12", "104.17.122.238", "104.17.128.173", "104.17.146.211", "104.17.148.242", "104.17.150.98", "104.17.171.118", "104.17.18.167", "104.17.185.63", "104.17.187.8", "104.17.192.182", "104.17.195.233", "104.17.196.229", "104.17.197.221", "104.17.205.217", "104.17.207.42", "104.17.223.228", "104.17.228.165", "104.17.240.243", "104.17.246.44", "104.17.25.239", "104.17.251.86", "104.17.253.178", "104.17.255.201", "104.17.27.211", "104.17.29.174", "104.17.31.203", "104.17.34.42", "104.17.36.206", "104.17.38.50", "104.17.44.240", "104.17.48.188", "104.17.5.30", "104.17.61.65", "104.17.64.67", "104.17.82.189", "104.17.82.215", "104.17.9.155", "104.17.90.249", "104.18.1.81", "104.18.111.31", "104.18.114.234", "104.18.121.40", "104.18.146.241", "104.18.158.192", "104.18.160.180", "104.18.163.244", "104.18.164.174", "104.18.167.107", "104.18.170.147", "104.18.185.179", "104.18.188.115", "104.18.191.195", "104.18.193.85", "104.18.204.53", "104.18.209.237", "104.18.213.206", "104.18.216.44", "104.18.218.124", "104.18.220.15", "104.18.236.110", "104.18.237.80", "104.18.247.129", "104.18.248.155", "104.18.251.151", "104.18.253.86", "104.18.33.119", "104.18.34.232", "104.18.35.176", "104.18.5.36", "104.18.54.13", "104.18.54.231", "104.18.55.248", "104.18.79.228", "104.18.83.11", "104.19.103.173", "104.19.104.143", "104.19.107.209", "104.19.114.114", "104.19.114.252", "104.19.119.181", "104.19.134.215", "104.19.136.183", "104.19.144.198", "104.19.145.142", "104.19.158.214", "104.19.181.243", "104.19.186.216", "104.19.186.47", "104.19.189.251", "104.19.202.206", "104.19.229.52", "104.19.232.195", "104.19.237.179", "104.19.29.197", "104.19.38.85", "104.19.39.82", "104.19.41.171", "104.19.41.228", "104.19.50.59", "104.19.52.241", "104.19.56.137", "104.19.60.0", "104.19.62.255", "104.19.66.54", "104.19.74.36", "104.19.75.119", "104.19.80.247", "104.19.80.98", "104.19.85.153", "104.19.91.124", "104.19.94.184", "104.20.12.161", "104.20.32.42", "104.20.40.194", "104.20.59.177", "104.21.106.155", "104.21.112.26", "104.21.113.137", "104.21.118.199", "104.21.18.68", "104.21.20.139", "104.21.221.61", "104.21.223.242", "104.21.224.32", "104.21.225.43", "104.21.23.23", "104.21.23.44", "104.21.231.123", "104.21.236.58", "104.21.25.89", "104.21.31.159", "104.21.36.174", "104.21.36.188", "104.21.37.215", "104.21.38.34", "104.21.42.100", "104.21.48.98", "104.21.5.197", "104.21.60.85", "104.21.62.19", "104.21.62.231", "104.21.63.154", "104.21.64.55", "104.21.67.237", "104.21.69.179", "104.21.70.136", "104.21.71.248", "104.21.72.102", "104.21.73.17", "104.21.75.225", "104.21.81.12", "104.21.83.26", "104.21.86.13", "104.21.87.113", "104.21.88.178", "104.21.88.79", "104.21.92.203", "104.21.93.170", "104.21.94.118", "104.239.72.0", "104.239.72.195", "104.24.142.51", "104.24.143.32", "104.24.150.11", "104.24.151.152", "104.24.158.116", "104.24.172.151", "104.24.172.200", "104.24.180.71", "104.24.181.68", "104.24.188.188", "104.24.189.34", "104.24.197.160", "104.24.20.6", "104.24.203.122", "104.24.211.31", "104.24.225.235", "104.24.233.118", "104.24.235.222", "104.24.236.15", "104.24.236.44", "104.24.241.159", "104.24.246.92", "104.24.26.24", "104.24.27.31", "104.24.29.62", "104.24.33.28", "104.24.34.44", "104.24.41.212", "104.24.45.16", "104.24.63.194", "104.25.1.157", "104.25.101.151", "104.25.107.158", "104.25.110.90", "104.25.115.43", "104.25.120.120", "104.25.124.20", "104.25.126.55", "104.25.127.245", "104.25.13.108", "104.25.130.51", "104.25.133.76", "104.25.141.138", "104.25.142.39", "104.25.148.250", "104.25.160.5", "104.25.173.57", "104.25.188.19", "104.25.198.1", "104.25.203.160", "104.25.204.143", "104.25.206.186", "104.25.209.147", "104.25.209.209", "104.25.209.251", "104.25.210.72", "104.25.226.220", "104.25.236.188", "104.25.244.30", "104.25.245.249", "104.25.27.45", "104.25.4.110", "104.25.62.57", "104.25.64.10", "104.25.79.119", "104.25.83.106", "104.25.96.164", "104.26.1.153", "104.26.13.175", "104.26.15.230", "104.26.5.42", "104.27.101.189", "104.27.110.157", "104.27.118.231", "104.27.17.178", "104.27.193.209", "104.27.200.19", "104.27.206.168", "104.27.26.161", "104.27.36.27", "104.27.37.185", "104.27.38.72", "104.27.4.156", "104.27.44.72", "104.27.49.51", "104.27.52.44", "104.27.54.234", "104.27.88.172", "104.27.97.174", "104.27.97.42", "108.162.193.46", "139.64.235.227", "141.11.202.7", "147.185.161.10", "154.197.65.219", "154.83.2.193", "159.242.242.20", "162.159.1.250", "162.159.132.26", "162.159.141.125", "162.159.151.88", "162.159.156.223", "162.159.156.64", "162.159.229.25", "162.159.233.84", "162.159.245.27", "162.159.40.172", "162.159.43.230", "162.159.60.112", "162.159.93.59", "167.68.11.204", "170.114.52.147", "172.64.157.244", "172.64.189.14", "172.64.49.95", "172.64.53.114", "172.64.74.9", "172.64.82.227", "172.64.85.161", "172.64.87.231", "172.65.217.95", "172.65.223.179", "172.65.237.186", "172.65.54.9", "172.65.58.206", "172.66.147.124", "172.66.147.59", "172.66.148.106", "172.66.149.15", "172.66.152.213", "172.66.152.87", "172.66.159.171", "172.66.162.127", "172.66.169.65", "172.66.174.124", "172.66.174.6", "172.66.216.111", "172.67.126.76", "172.67.127.131", "172.67.133.245", "172.67.134.218", "172.67.135.190", "172.67.135.47", "172.67.136.112", "172.67.140.237", "172.67.140.83", "172.67.143.245", "172.67.144.126", "172.67.147.255", "172.67.153.29", "172.67.154.182", "172.67.156.98", "172.67.160.104", "172.67.169.139", "172.67.170.253", "172.67.172.242", "172.67.176.34", "172.67.187.246", "172.67.188.214", "172.67.190.234", "172.67.195.55", "172.67.196.217", "172.67.197.235", "172.67.199.186", "172.67.199.209", "172.67.200.209", "172.67.211.75", "172.67.214.149", "172.67.217.25", "172.67.218.10", "172.67.220.3", "172.67.221.7", "172.67.238.109", "172.67.240.46", "172.67.250.18", "172.67.253.123", "172.67.73.30", "172.67.74.86", "172.67.93.117", "172.67.93.126", "172.67.94.198", "173.245.49.57", "185.238.228.201", "188.114.96.39", "191.101.251.190", "198.202.211.158", "198.41.193.207", "198.41.205.190", "198.41.211.0", "199.181.197.109", "199.181.197.158", "199.181.197.246", "2.16.0.134", "2.16.0.235", "2.16.1.137", "2.16.1.149", "2.16.1.218", "2.16.105.142", "2.16.11.186", "2.16.125.17", "2.16.164.29", "2.16.168.12", "2.16.168.7", "2.16.190.87", "2.16.192.83", "2.16.2.152", "2.16.222.174", "2.16.31.75", "2.16.31.87", "2.16.33.249", "2.16.39.17", "2.16.42.250", "2.16.42.251", "2.16.93.211", "212.104.128.75", "45.80.110.140", "5.10.214.117", "74.49.215.119", "88.216.66.154", "88.216.66.81", "89.116.161.253", "89.117.112.240", "92.53.188.172", "92.53.188.71"];

  const PORTS_ALL = [443, 2053, 2083, 2087, 2096, 8443];

  /* Cloudflare published IPv4 ranges (weighted random sampling like SenPaiScanner) */
  const CF_RANGES = [
    "173.245.48.0/20","103.21.244.0/22","103.22.200.0/22","103.31.4.0/22","141.101.64.0/18",
    "108.162.192.0/18","190.93.240.0/20","188.114.96.0/20","197.234.240.0/22","198.41.128.0/17",
    "162.158.0.0/15","104.16.0.0/12","172.64.0.0/17","172.64.128.0/18","172.64.192.0/19",
    "172.64.224.0/22","172.64.229.0/24","172.64.230.0/23","172.64.232.0/22","172.64.236.0/23",
    "172.64.238.0/23","172.64.240.0/22","172.64.244.0/22","172.64.248.0/22","131.0.72.0/22",
  ];

  function randIp(cidr) {
    const [ip, bits] = cidr.split("/");
    const b = ip.split(".").map(Number);
    const base = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
    const hostBits = 32 - (+bits);
    const rnd = Math.floor(Math.random() * Math.pow(2, hostBits));
    const out = (base + rnd) >>> 0;
    return [(out >>> 24) & 255, (out >>> 16) & 255, (out >>> 8) & 255, out & 255].join(".");
  }

  function randomRangeIps(n) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(randIp(CF_RANGES[Math.floor(Math.random() * CF_RANGES.length)]));
    return out;
  }
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
    online: [],       // online clean-IP pool (fetched via /api/ips)
  };
  const R = { running: false, results: [], best: null }; // relay-test state
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
    if (S.source === "custom") list = parseList($("#scanCustom").value);
    else if (S.source === "ranges") list = randomRangeIps(S.target);
    else if (S.source === "online") list = (S.online.length ? S.online : SEED).slice(0, Math.min(S.target, S.online.length || SEED.length));
    else list = SEED.slice(0, Math.min(S.target, SEED.length));
    const queue = [];
    for (const ip of list) for (const port of S.ports) queue.push({ ip, port });
    return queue;
  }

  async function runScan() {
    await ensureOnline();
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
    if (S.source === "ranges") return S.target * S.ports.length;
    if (S.source === "online") return Math.min(S.target, S.online.length || SEED.length) * S.ports.length;
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
    prefillRelay();
    renderRelayCurrent();
  }

  /* ---------------- wiring ---------------- */
  function initUI() {
    $("#scanStart").onclick = () => { readConfig(); runScan(); };
    $("#scanStop").onclick = stopScan;
    $("#scanSourceB").onclick = () => setSource("bundled");
    $("#scanSourceO").onclick = () => setSource("online");
    $("#scanSourceR").onclick = () => setSource("ranges");
    $("#scanSourceC").onclick = () => setSource("custom");
    $("#relayStart").onclick = () => runRelay();
    $("#relayApply").onclick = applyRelay;
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
    $("#scanSourceO").classList.toggle("on", src === "online");
    $("#scanSourceR").classList.toggle("on", src === "ranges");
    $("#scanSourceC").classList.toggle("on", src === "custom");
    $("#scanCustomWrap").classList.toggle("hidden", src !== "custom");
    $("#scanTargetWrap").classList.toggle("hidden", src === "custom");
  }

  /* ---------------- online clean-IP pool ---------------- */
  async function ensureOnline() {
    if (S.source !== "online") return;
    if (S.online.length) return;
    $("#scanStatus").textContent = t("scan.fetching");
    try {
      const res = await api("/api/ips");
      if (res.ok) {
        const j = await res.json();
        S.online = Array.isArray(j.ips) && j.ips.length ? j.ips : [...SEED];
      } else S.online = [...SEED];
    } catch (e) { S.online = [...SEED]; }
    if (!S.online.length) S.online = [...SEED];
  }

  /* ---------------- relay test (\u062A\u0633\u062A \u0631\u0644\u0647) ---------------- */
  function parseDomains(text) {
    const out = new Set();
    for (let line of (text || "").split("\\n")) {
      line = line.trim().toLowerCase();
      if (!line || line.startsWith("#")) continue;
      line = line.replace(/^[a-z]+:\\/\\//, "").split("/")[0].split(":")[0];
      if (/^[a-z0-9.-]+\\.[a-z]{2,}$/.test(line)) out.add(line);
    }
    return [...out];
  }

  function wsProbe(domain) {
    return new Promise((resolve) => {
      const wsPath = (state.settings && state.settings.wsPath) || "/nika-ws";
      const url = "wss://" + domain + wsPath + "?probe=nika&proto=probe";
      const t0 = performance.now();
      let settled = false;
      const finish = (ok, ms, info) => {
        if (settled) return;
        settled = true;
        resolve({ domain, ok, ms: ok ? Math.max(1, Math.round(ms)) : null, info });
      };
      let ws;
      try { ws = new WebSocket(url); }
      catch (e) { finish(false, 0, "err"); return; }
      const to = setTimeout(() => { try { ws.close(); } catch {} finish(false, 0, "timeout"); }, 8000);
      ws.onmessage = (ev) => {
        let ok = false;
        try { const j = JSON.parse(ev.data); ok = !!(j && j.ok === true); } catch {}
        clearTimeout(to);
        const ms = performance.now() - t0;
        try { ws.close(); } catch {}
        finish(ok, ms, ok ? "front" : "mismatch");
      };
      ws.onerror = () => { clearTimeout(to); finish(false, 0, "err"); };
      ws.onclose = () => { clearTimeout(to); finish(false, 0, "closed"); };
    });
  }

  async function runRelay() {
    const domains = parseDomains($("#relayCandidates").value);
    if (!domains.length) { toast(t("relay.none")); return; }
    R.running = true; R.results = []; R.best = null;
    $("#relayStart").classList.add("hidden");
    $("#relayApply").classList.add("hidden");
    $("#relayStatus").textContent = t("relay.running");
    $("#relayList").innerHTML = \`<div class="empty">\${t("relay.running")}</div>\`;
    let cursor = 0;
    const workers = [];
    const n = Math.min(6, domains.length);
    for (let w = 0; w < n; w++) {
      workers.push((async () => {
        while (cursor < domains.length) {
          const d = domains[cursor++];
          const r = await wsProbe(d);
          R.results.push(r);
          renderRelay();
        }
      })());
    }
    await Promise.all(workers);
    R.running = false;
    const ok = R.results.filter((r) => r.ok).sort((a, b) => a.ms - b.ms);
    R.best = ok[0] || null;
    renderRelay();
  }

  function renderRelay() {
    const el = $("#relayList");
    const list = [...R.results].sort((a, b) => (a.ok === b.ok ? (a.ms || 9999) - (b.ms || 9999) : a.ok ? -1 : 1));
    if (!R.results.length) {
      el.innerHTML = \`<div class="empty">\${R.running ? t("relay.running") : t("relay.empty")}</div>\`;
      $("#relayStart").classList.toggle("hidden", R.running);
      $("#relayStatus").textContent = "";
      return;
    }
    el.innerHTML = list.map((r) => {
      const best = R.best && r.domain === R.best.domain;
      const label = r.ok ? t("relay.front") + " \xB7 " + r.ms + "ms" : t("relay.notfront");
      return \`<div class="scan-row" onclick="SCANNER.copyIp('\${r.domain}')">
        <code class="scan-ip">\${r.domain}</code>
        \${best ? '<span class="badge ok" style="font-size:10px">\u2605 ' + t("relay.best") + '</span>' : ""}
        <div style="flex:1"></div>
        <code class="scan-ms \${r.ok ? "ok" : "bad"}">\${label}</code>
      </div>\`;
    }).join("");
    $("#relayStart").classList.toggle("hidden", R.running);
    $("#relayApply").classList.toggle("hidden", !R.best);
    $("#relayStatus").textContent = R.running ? t("relay.running") : t("relay.done");
    renderRelayCurrent();
  }

  function renderRelayCurrent() {
    const el = $("#relayCurrent");
    if (!el) return;
    const cur = (state.settings && state.settings.relayDomain) || "";
    el.innerHTML = cur ? \`\u{1F517} \${t("relay.current")}: <b>\${cur}</b>\` : "";
  }

  function prefillRelay() {
    const ta = $("#relayCandidates");
    if (!ta || ta.value.trim()) return;
    const host = (state.settings && state.settings.host) || location.hostname;
    const rd = (state.settings && state.settings.relayDomain) || "";
    const lines = ["# " + t("relay.candidates") + ":", host];
    if (rd && rd !== host) lines.push(rd);
    ta.value = lines.join("\\n");
  }

  async function applyRelay() {
    if (!R.best) { toast(t("relay.none")); return; }
    if (MODE !== "live") { toast(t("toast.preview")); return; }
    const res = await api("/api/settings", { method: "POST", body: { relayDomain: R.best.domain } });
    if (res.ok) {
      toast(t("relay.applied"));
      if (state.settings) state.settings.relayDomain = R.best.domain;
      renderRelayCurrent();
    } else toast(t("common.error"));
  }

  return { onOpen, copyIp, initUI, _seed: SEED.length };
})();

/* expose for inline onclick */
window.SCANNER = SCANNER;
SCANNER.initUI();
if (typeof applyLang === "function") applyLang(); // translate scanner labels (keys added above)

<\/script>
</body>
</html>
`,U="0.5.4",ie=["https://raw.githubusercontent.com/XIU2/CloudflareSpeedTest/master/ip.txt","https://raw.githubusercontent.com/vfarid/cf-clean-ips/main/list.txt"],ce=/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g,F=null;async function le(){if(F&&Date.now()-F.at<10*6e4)return F.ips;let t=new Set,e=a=>Promise.race([fetch(a),new Promise((s,n)=>setTimeout(()=>n(new Error("timeout")),8e3))]);for(let a of ie)try{let n=await(await e(a)).text(),i,c=0;for(;(i=ce.exec(n))&&c<4e3;){let o=i[1];o.split(".").map(Number).every(l=>l>=0&&l<=255)&&!o.startsWith("0.")&&(t.add(o),c++)}}catch{}let r=[...t];return F={ips:r,at:Date.now()},r}var Lt=(t,e=200)=>new Response(t,{status:e,headers:{"content-type":"text/html; charset=utf-8"}});function pe(t){return t.headers.set("access-control-allow-origin","*"),t}var Fe={async fetch(t,e,r){try{mt(),r.waitUntil(ht(e));let a=new URL(t.url),s=a.pathname,n=await st(e);if((t.headers.get("Upgrade")||"").toLowerCase()==="websocket")return de(t,e,n);if(s==="/admin"||s==="/admin/")return Lt(Qt);if(s.startsWith("/api/"))return pe(await ue(t,e,n,a));if(s.startsWith("/sub/"))return fe(t,e,n,s);let i=s.match(/^\/([0-9a-fA-F-]{36})\/?$/);return i?me(t,e,n,i[1]):s==="/health"?g({ok:!0,name:n.title}):n.host===R.host?Lt(Qt):Response.redirect("https://www.cloudflare.com",302)}catch(a){return g({error:String(a)},500)}}};function ge(t){let e=new WebSocketPair,[r,a]=Object.values(e);a.accept();let s=JSON.stringify({ok:!0,panel:"nika",v:U});try{a.send(s)}catch{}return setTimeout(()=>{try{a.close()}catch{}},2e3),new Response(null,{status:101,webSocket:r})}async function de(t,e,r){let a=new URL(t.url);if(a.searchParams.get("probe")==="nika")return ge(t);let s=a.searchParams.get("proto")||t.headers.get("x-nika-proto")||"",n=await A(e),i=a.searchParams.get("uuid")||"",c=n.find(o=>o.uuid.toLowerCase()===i.toLowerCase());return c?c.active?s==="trojan"?Et(t,c,r,e):At(t,c,r,e):g({error:"user inactive"},403):g({error:"no user for this uuid"},403)}async function ue(t,e,r,a){let s=a.pathname.replace("/api/",""),n=t.method.toUpperCase();if(s==="info")return g({name:r.title,setup:!r.adminPassHash,protocols:r.protocols,version:U});if(s==="update/check"){let i=await he();return g({current:U,latest:i.version,notes:i.notes||"",upToDate:xe(U,i.version)>=0})}if(s==="ips"){let i=await le();return g({ips:i,count:i.length})}if(s==="login"&&n==="POST"){let c=(await t.json().catch(()=>({}))).password||"",o=!r.adminPassHash;if(o){if(!c||c.length<4)return g({error:"password too short"},400);r.adminPassHash=await z(c),await M(e,r)}if(!(r.adminPassHash===await z(c)))return g({error:"wrong password"},401);let l=await Z(r.sessionSecret,JSON.stringify({t:Date.now()}));await I(e,{icon:o?"\u{1F6E0}":"\u{1F510}",text:o?"\u0646\u0635\u0628 \u0627\u0648\u0644\u06CC\u0647 \u067E\u0646\u0644 \u2014 \u0631\u0645\u0632 \u0627\u062F\u0645\u06CC\u0646 \u062B\u0628\u062A \u0634\u062F":"\u0648\u0631\u0648\u062F \u0627\u062F\u0645\u06CC\u0646 \u0628\u0647 \u067E\u0646\u0644",time:Date.now()});let u=g({ok:!0,setup:o});return u.headers.set("set-cookie",`${X}=${encodeURIComponent(l)}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax`),u}if(s==="logout"){let i=g({ok:!0});return i.headers.set("set-cookie",`${X}=; HttpOnly; Path=/; Max-Age=0`),i}if(!await lt(t,r))return g({error:"unauthorized"},401);switch(s){case"status":{let i=await A(e);return g({title:r.title,setup:!1,users:i.length,active:i.filter(c=>c.active).length,usedGb:Math.round(i.reduce((c,o)=>c+(o.used||0),0)*100)/100,requestsToday:await xt(e),requestsTotal:await wt(e),protocols:r.protocols,activity:await bt(e),traffic7d:await yt(e)})}case"users":{let i=await A(e);if(n==="GET")return g(i);if(n==="POST"){let c=await t.json().catch(()=>({})),o={id:crypto.randomUUID(),name:c.name||"\u06A9\u0627\u0631\u0628\u0631",uuid:crypto.randomUUID(),password:ct(),quota:Number(c.quota)||50,used:0,days:Number(c.days)||30,active:!0,createdAt:Date.now()};return i.push(o),await v(e,i),await I(e,{icon:"\u{1F464}",text:`\u06A9\u0627\u0631\u0628\u0631 \u0633\u0627\u062E\u062A\u0647 \u0634\u062F \u2014 ${o.name}`,time:Date.now()}),g(o)}if(n==="DELETE"){let c=a.searchParams.get("id"),o=i.find(l=>l.id===c),p=i.filter(l=>l.id!==c);return await v(e,p),await I(e,{icon:"\u{1F5D1}",text:`\u06A9\u0627\u0631\u0628\u0631 \u062D\u0630\u0641 \u0634\u062F \u2014 ${o?.name||c}`,time:Date.now()}),g({ok:!0})}break}case"users/toggle":{if(n!=="POST")break;let i=await t.json().catch(()=>({})),c=await A(e),o=c.find(p=>p.id===i.id);return o?(o.active=!o.active,await v(e,c),await I(e,{icon:o.active?"\u{1F7E2}":"\u26D4",text:`${o.name} ${o.active?"\u0641\u0639\u0627\u0644":"\u063A\u06CC\u0631\u0641\u0639\u0627\u0644"} \u0634\u062F`,time:Date.now()}),g({ok:!0,active:o.active})):g({error:"not found"},404)}case"settings":{if(n==="GET")return g(r);if(n==="POST"){let i=await t.json().catch(()=>({})),c={...r};return typeof i.title=="string"&&(c.title=i.title),typeof i.host=="string"&&(c.host=i.host),typeof i.sni=="string"&&(c.sni=i.sni),typeof i.wsPath=="string"&&(c.wsPath=i.wsPath),Array.isArray(i.cleanIps)&&(c.cleanIps=i.cleanIps),typeof i.relayDomain=="string"&&(c.relayDomain=i.relayDomain.trim()),i.protocols&&(c.protocols={...r.protocols,...i.protocols}),await M(e,c),await I(e,{icon:"\u2699\uFE0F",text:"\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u067E\u0646\u0644 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0634\u062F",time:Date.now()}),g({ok:!0})}break}case"gen":{let i=a.searchParams.get("id"),o=(await A(e)).find(l=>l.id===i);if(!o)return g({error:"user not found"},404);let p={...r,host:rt(t,r)};return g({user:{id:o.id,name:o.name,quota:o.quota,used:Math.round((o.used||0)*100)/100,days:o.days,active:o.active},base64:K(o,p),clash:$(o,p),singbox:_(o,p),warp:r.protocols.warp?dt(o):null})}case"update/apply":{if(n!=="POST")break;let i=await t.json().catch(()=>({})),c=await we(e,r,i.token||"");return g(c,c.ok?200:400)}}return g({error:"not found"},404)}function rt(t,e){let r=(e.host||"").trim();return r&&r!==R.host?r:new URL(t.url).hostname}async function fe(t,e,r,a){let s=a.replace("/sub/",""),n=s.split("/")[0].split(".")[0],i=s.split(".").pop()?.toLowerCase()||"",o=(await A(e)).find(d=>d.password===n||d.uuid.replace(/-/g,"").slice(0,12)===n);if(!o)return g({error:"invalid token"},404);let p=t.headers.get("Accept")||"",l=t.headers.get("Sec-Fetch-Dest")||"",u=t.headers.get("Sec-Fetch-Mode")||"",x=l==="document"||u==="navigate";if(p.includes("text/html")&&x){let d=new URL(t.url).origin;return new Response(Ht({name:o.name,active:!!o.active,quota:Number(o.quota)||0,used:Math.round((o.used||0)*100)/100,days:Number(o.days)||0,origin:d,token:n,version:U,protocols:r.protocols}),{headers:{"content-type":"text/html; charset=utf-8"}})}let h=i==="yaml"||i==="yml",w=i==="json",f={...r,host:rt(t,r)},y=h?$(o,f):w?_(o,f):K(o,f);return new Response(y,{headers:{"content-type":h?"text/yaml":w?"application/json":"text/plain"}})}async function me(t,e,r,a){let n=(await A(e)).find(o=>o.uuid.toLowerCase()===a.toLowerCase());if(!n)return g({error:"unknown uuid"},404);let i={...r,host:rt(t,r)},c=K(n,i);return new Response(c,{headers:{"content-type":"text/plain"}})}var Dt="https://raw.githubusercontent.com/NikaTeem/Nika-Net/main",et=null,qt=0;async function he(){if(et&&Date.now()-qt<3e5)return et;try{let t=await fetch(`${Dt}/version.json`,{cf:{cacheTtl:300}});if(!t.ok)throw new Error("fetch failed");let e=await t.json();return et=e,qt=Date.now(),e}catch{return{version:U,notes:""}}}function xe(t,e){let r=t.split(".").map(s=>parseInt(s,10)||0),a=e.split(".").map(s=>parseInt(s,10)||0);for(let s=0;s<3;s++){let n=(r[s]||0)-(a[s]||0);if(n!==0)return n}return 0}async function we(t,e,r){if(!r||r.length<20)return{ok:!1,error:"token required"};let a=await Q(r,"/user/tokens/verify");if(!a?.success)return{ok:!1,error:a?.errors?.[0]?.message||"\u062A\u0648\u06A9\u0646 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A"};let n=(await Q(r,"/accounts?per_page=50"))?.result?.[0]?.id;if(!n)return{ok:!1,error:"\u0627\u06A9\u0627\u0646\u062A\u06CC \u0628\u0627 \u0627\u06CC\u0646 \u062A\u0648\u06A9\u0646 \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F"};let i=(e.host||"").split(".")[0];if(!i)return{ok:!1,error:"\u0627\u0628\u062A\u062F\u0627 Host \u0648\u0631\u06A9\u0631 \u0631\u0627 \u062F\u0631 \u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0648\u0627\u0631\u062F \u06A9\u0646"};let c=await It(r,n,[`nika-${i}-kv`,`${i}-kv`]),o=await fetch(`${Dt}/dist/worker.js`);if(!o.ok)return{ok:!1,error:"\u062F\u0631\u06CC\u0627\u0641\u062A \u0622\u062E\u0631\u06CC\u0646 \u0646\u0633\u062E\u0647 \u0645\u0645\u06A9\u0646 \u0646\u0634\u062F"};let p=await o.text(),u=await vt(r,n,i,p,c?[{type:"kv_namespace",name:"NIKA_KV",namespace_id:c}]:[]);return u.ok?(await St(r,n,i),await I(t,{icon:"\u{1F504}",text:"\u067E\u0646\u0644 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0634\u062F",time:Date.now()}),{ok:!0}):{ok:!1,error:u.err}}export{Fe as default};
