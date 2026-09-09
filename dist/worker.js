var v={title:"Nika Net",host:"nika.example.workers.dev",sni:"www.speedtest.net",wsPath:"/nika-ws",cleanIps:["188.114.96.9","162.159.192.1","104.17.147.22","172.67.161.1"],fixedIp:"",relayDomain:"",protocols:{vless:!0,trojan:!0,warp:!1},adminPassHash:null,secretPath:"nika-admin",sessionSecret:""};var Mt=3e3,W=new Map,ct=new Map;async function Gt(t,e){try{let r=await t.NIKA_DB.prepare("SELECT value FROM kv WHERE key = ?1").bind(e).first();return r?r.value:null}catch{return null}}async function Jt(t,e,r){try{await t.NIKA_DB.prepare("INSERT INTO kv (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(e,r).run()}catch{}}async function D(t,e){let r=W.get(e);if(r&&Date.now()-r.at<Mt)return r.v;let s=null;return t.NIKA_DB?s=await Gt(t,e):t.NIKA_KV?s=await t.NIKA_KV.get(e,{cacheTtl:30}):s=ct.get(e)??null,s!==null&&W.set(e,{v:s,at:Date.now()}),s}async function S(t,e,r){W.set(e,{v:r,at:Date.now()}),t.NIKA_DB?await Jt(t,e,r):t.NIKA_KV?await t.NIKA_KV.put(e,r):ct.set(e,r)}var lt=new Set(["1.0.0.1","1.1.1.1","1.0.0.2","1.1.1.2","1.0.0.3","1.1.1.3","8.8.8.8","8.8.4.4","9.9.9.9","149.112.112.112","208.67.222.222","208.67.220.220","64.6.64.6","64.6.65.6","104.16.132.229"]);function jt(t){if(!Array.isArray(t.cleanIps))return!1;let e=t.cleanIps.filter(r=>!lt.has(r));return e.length!==t.cleanIps.length?(t.cleanIps=e.length?e:[...v.cleanIps],!0):!1}function zt(t){let e=(t.fixedIp||"").trim();if(!e)return!1;let r=e.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::(\d{1,5}))?$/);if(!r||lt.has(r[1]))return t.fixedIp="",!0;let s=r[2]?parseInt(r[2],10):443;return s<1||s>65535?(t.fixedIp=r[1],!0):(t.fixedIp=r[2]?`${r[1]}:${s}`:r[1],!1)}function M(t){let e=jt(t),r=zt(t);return e||r}async function pt(t){let e=await D(t,"settings"),r={...v};if(e)try{Object.assign(r,JSON.parse(e))}catch{}return M(r)&&await S(t,"settings",JSON.stringify(r)),r.sessionSecret||(r.sessionSecret=crypto.randomUUID(),await S(t,"settings",JSON.stringify(r))),r}async function G(t,e){await S(t,"settings",JSON.stringify(e))}async function A(t){let e=await D(t,"users");if(!e)return[];try{return JSON.parse(e)}catch{return[]}}async function U(t,e){await S(t,"users",JSON.stringify(e))}async function C(t,e){let r=await D(t,e),s=parseInt(r||"0",10);return isNaN(s)?0:s}async function J(t,e,r){let n=await C(t,e)+r;return await S(t,e,String(n)),n}async function j(t,e){let r=await D(t,e);if(!r)return null;try{return JSON.parse(r)}catch{return null}}async function dt(t,e,r){await S(t,e,JSON.stringify(r))}var z=new TextEncoder;async function Z(t){let e=await crypto.subtle.digest("SHA-256",z.encode(t));return[...new Uint8Array(e)].map(r=>r.toString(16).padStart(2,"0")).join("")}function ut(){return[...crypto.getRandomValues(new Uint8Array(24))].map(e=>e.toString(16).padStart(2,"0")).join("")}async function X(t,e){let r=await crypto.subtle.importKey("raw",z.encode(t),{name:"HMAC",hash:"SHA-256"},!1,["sign"]),s=await crypto.subtle.sign("HMAC",r,z.encode(e));return e+"."+[...new Uint8Array(s)].map(n=>n.toString(16).padStart(2,"0")).join("")}async function Zt(t,e){let r=e.lastIndexOf(".");if(r<0)return!1;let s=e.slice(0,r),o=(await X(t,s)).split(".")[1],i=e.slice(r+1);if(o.length!==i.length)return!1;let a=0;for(let c=0;c<o.length;c++)a|=o.charCodeAt(c)^i.charCodeAt(c);return a===0}async function ft(t,e){let r=(t.headers.get("Cookie")||"").split(";").map(n=>n.trim()).find(n=>n.startsWith("nika_session="));if(!r)return!1;let s=decodeURIComponent(r.split("=").slice(1).join("="));return Zt(e.sessionSecret,s)}var $="nika_session";var $t=["173.245.48.0/20","103.21.244.0/22","103.22.200.0/22","103.31.4.0/22","141.101.64.0/18","108.162.192.0/18","190.93.240.0/20","188.114.96.0/20","197.234.240.0/22","198.41.128.0/17","162.158.0.0/15","104.16.0.0/13","104.24.0.0/14","172.64.0.0/13","131.0.72.0/22"];function mt(t){let e=t.split(".").map(Number);return(e[0]<<24|e[1]<<16|e[2]<<8|e[3])>>>0}var _t=$t.map(t=>{let[e,r]=t.split("/"),s=parseInt(r,10),n=mt(e),o=s===0?0:4294967295<<32-s>>>0;return{base:n&o,mask:o}});function _(t){let e=(t||"").trim(),r=e.split(".");if(r.length!==4||r.map(Number).some(o=>isNaN(o)||o<0||o>255))return!1;let n=mt(e);for(let o of _t)if((n&o.mask)>>>0===o.base)return!0;return!1}var ht="Nika Paneel | \u06CC\u06A9 \u0633\u0631\u0648\u06CC\u0633 \u0631\u0627\u06CC\u06AF\u0627\u0646 \u0647\u0633\u062A",xt=encodeURIComponent(ht);function te(t){let e=(t.cleanIps||[]).filter(Boolean).filter(_);return e.length?e[Math.floor(Math.random()*e.length)]:t.host}function L(t){let e=(t.fixedIp||"").trim();if(e){let r=e.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::(\d{1,5}))?$/);if(r&&r[1].split(".").map(Number).every(n=>n>=0&&n<=255)&&_(r[1])){let n=r[2]?Math.min(65535,Math.max(1,parseInt(r[2],10))):443;return{host:r[1],port:n}}}return{host:te(t),port:443}}function O(t){return(t.relayDomain||"").trim()||(t.host||"").trim()}function ee(t,e){let r=L(e),s=O(e),n=new URLSearchParams({encryption:"none",security:"tls",sni:s,fp:"chrome",type:"ws",host:s,path:e.wsPath+"?ed=2048&proto=vless"});return`vless://${t.uuid}@${r.host}:${r.port}?${n.toString()}#${xt}`}function re(t,e){let r=L(e),s=O(e),n=new URLSearchParams({security:"tls",sni:s,fp:"chrome",type:"ws",host:s,path:e.wsPath+"?ed=2048&proto=trojan"});return`trojan://${t.password}@${r.host}:${r.port}?${n.toString()}#${xt}`}function N(t,e){let r=[];return e.protocols.vless&&r.push(ee(t,e)),e.protocols.trojan&&r.push(re(t,e)),btoa(r.join(`
`)).replace(/=+$/,"")}function tt(t,e){let r=L(e),s=O(e),n=[],o=`# Nika Net \u2014 ${ht}
mixed-port: 7890
allow-lan: false
mode: rule
log-level: info
dns:
  enable: true
  enhanced-mode: fake-ip
  nameserver: [1.1.1.1, 8.8.8.8]
proxies:
`;return e.protocols.vless&&(n.push("Nika Paneel - VLESS"),o+=`  - name: "Nika Paneel - VLESS"
    type: vless
    server: ${r.host}
    port: ${r.port}
    uuid: ${t.uuid}
    network: ws
    tls: true
    udp: false
    servername: ${s}
    client-fingerprint: chrome
    ws-opts:
      path: "${e.wsPath}?ed=2048&proto=vless"
      headers: { Host: "${s}" }
`),e.protocols.trojan&&(n.push("Nika Paneel - Trojan"),o+=`  - name: "Nika Paneel - Trojan"
    type: trojan
    server: ${r.host}
    port: ${r.port}
    password: ${t.password}
    network: ws
    tls: true
    udp: false
    sni: ${s}
    client-fingerprint: chrome
    ws-opts:
      path: "${e.wsPath}?ed=2048&proto=trojan"
      headers: { Host: "${s}" }
`),o+=`proxy-groups:
  - name: "Nika Paneel"
    type: select
    proxies: [${n.map(i=>`"${i}"`).join(", ")}]
`,o+=`rules:
  - GEOIP,IR,DIRECT
  - MATCH,Nika Paneel
`,o}function et(t,e){let r=L(e),s=O(e),n=[],o=[];e.protocols.vless&&(o.push("Nika Paneel - VLESS"),n.push({tag:"Nika Paneel - VLESS",type:"vless",server:r.host,server_port:r.port,uuid:t.uuid,network:"ws",tls:{enabled:!0,server_name:s,utls:{enabled:!0,fingerprint:"chrome"}},transport:{type:"ws",path:e.wsPath+"?ed=2048&proto=vless",headers:{Host:s}}})),e.protocols.trojan&&(o.push("Nika Paneel - Trojan"),n.push({tag:"Nika Paneel - Trojan",type:"trojan",server:r.host,server_port:r.port,password:t.password,network:"ws",tls:{enabled:!0,server_name:s,utls:{enabled:!0,fingerprint:"chrome"}},transport:{type:"ws",path:e.wsPath+"?ed=2048&proto=trojan",headers:{Host:s}}}));let i={log:{level:"info"},dns:{servers:[{tag:"cf",address:"https://1.1.1.1/dns-query",detour:"select"}]},outbounds:n.concat([{tag:"select",type:"selector",outbounds:o},{tag:"direct",type:"direct"}]),route:{rules:[{geoip:"ir",outbound:"direct"}],final:"select"}};return JSON.stringify(i,null,2)}function ne(t){let e=(t.uuid.replace(/-/g,"")+(t.password||"")).slice(0,64).padEnd(64,"0"),r=new Uint8Array(32);for(let n=0;n<32;n++)r[n]=parseInt(e.slice(n*2,n*2+2),16)||0;let s="";for(let n=0;n<32;n++)s+=String.fromCharCode(r[n]);return btoa(s)}function bt(t){return`[Interface]
PrivateKey = ${ne(t)}
Address = 172.16.0.2/32, 2606:4700:110:8f3e:1c5e:9a2b:7d4f::/128
DNS = 1.1.1.1
MTU = 1280

[Peer]
PublicKey = bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=
AllowedIPs = 0.0.0.0/0, ::/0
Endpoint = engage.cloudflareclient.com:2408
`}var k=new Map,wt=new Map,yt=0,Q=()=>{let t=new Date,e=String(t.getMonth()+1).padStart(2,"0"),r=String(t.getDate()).padStart(2,"0");return`${t.getFullYear()}-${e}-${r}`};function At(){k.set("req:total",(k.get("req:total")||0)+1),k.set("req:"+Q(),(k.get("req:"+Q())||0)+1)}async function It(t){let e=Date.now();if(!(e-yt<15e3)){yt=e;for(let[r,s]of k)s&&await J(t,r,s);k.clear()}}async function kt(t){return await C(t,"req:"+Q())+(k.get("req:"+Q())||0)}async function Et(t){return await C(t,"req:total")+(k.get("req:total")||0)}async function P(t,e,r,s){if(!r&&!s)return;let n=await A(t),o=n.find(a=>a.id===e);o&&(o.used=(o.used||0)+(r+s)/1e9,await U(t,n)),await J(t,"traffic:"+Q(),r+s);let i=wt.get(e)||0;Date.now()-i>6e4&&(wt.set(e,Date.now()),await E(t,{icon:"\u{1F4E1}",text:`\u0627\u062A\u0635\u0627\u0644 \u062C\u062F\u06CC\u062F${o?` \u2014 ${o.name}`:""}`,time:Date.now()}))}async function vt(t){let e=[];for(let r=6;r>=0;r--){let s=new Date;s.setDate(s.getDate()-r);let n=String(s.getMonth()+1).padStart(2,"0"),o=String(s.getDate()).padStart(2,"0"),i=`${s.getFullYear()}-${n}-${o}`,a=await C(t,"traffic:"+i);e.push({date:i.slice(5),gb:Math.round(a/1e9*100)/100})}return e}async function E(t,e){let r=await j(t,"activity")||[];r.unshift(e),r.length>40&&(r.length=40),await dt(t,"activity",r)}async function St(t){return await j(t,"activity")||[]}import{connect as se}from"cloudflare:sockets";var ae=100,ie=12,Ut=2500,ce=/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::(\d{1,5}))?$/;function le(t,e){let r=Date.now();return new Promise(s=>{let n=!1,o=l=>{n||(n=!0,s({ok:l,ms:l?Date.now()-r:0}))},i=setTimeout(()=>o(!1),Ut),a=null;try{a=se({hostname:t,port:e})}catch{clearTimeout(i),o(!1);return}let c=a.opened;if(c&&typeof c.then=="function")c.then(()=>{clearTimeout(i),o(!0);try{a.close()}catch{}},()=>{clearTimeout(i),o(!1);try{a.close()}catch{}});else{let l=()=>{if(!n){try{if(a.readable||a.writable){clearTimeout(i),o(!0);try{a.close()}catch{}return}}catch{}if(Date.now()-r>Ut){clearTimeout(i),o(!1);return}setTimeout(l,25)}};l()}})}async function Rt(t){let e=[];for(let i of t.slice(0,ae)){let a=(i||"").trim();if(!a)continue;let c=a.match(ce);if(!c){e.push({addr:a||i,host:"",port:0});continue}e.push({addr:a,host:c[1],port:c[2]?parseInt(c[2],10):443})}let r=[],s=0,n=async()=>{for(;s<e.length;){let i=e[s++];if(!i.host){r.push({addr:i.addr,ok:!1,ms:0});continue}let a=await le(i.host,i.port);r.push({addr:i.addr,ok:a.ok,ms:a.ms})}};await Promise.all(Array.from({length:Math.min(ie,Math.max(1,e.length))},n));let o=new Map(r.map(i=>[i.addr,i]));return e.map(i=>o.get(i.addr)||{addr:i.addr,ok:!1,ms:0})}import{connect as de}from"cloudflare:sockets";function q(t){let e=new WebSocketPair,[r,s]=Object.values(e);return s.accept(),{client:r,server:s}}function K(t,e,r){let s=!1;return new ReadableStream({start(o){let i=a=>{if(s)return;let c=a.data;c instanceof ArrayBuffer?o.enqueue(new Uint8Array(c)):Array.isArray(c)?o.enqueue(new Uint8Array(c)):typeof c=="string"&&o.enqueue(new TextEncoder().encode(c))};if(t.addEventListener("message",i),t.addEventListener("close",()=>{try{o.close()}catch{}}),t.addEventListener("error",()=>{try{o.error(new Error("ws error"))}catch{}}),e)try{let a=e.replace(/-/g,"+").replace(/_/g,"/");for(;a.length%4;)a+="=";let c=Uint8Array.from(atob(a),l=>l.charCodeAt(0));c.length&&o.enqueue(c)}catch{}},pull(){},cancel(){s=!0;try{t.close()}catch{}}})}function g(t,e=200){return new Response(JSON.stringify(t),{status:e,headers:{"content-type":"application/json; charset=utf-8","access-control-allow-origin":"*"}})}async function nt(t,e,r,s){let{client:n,server:o}=q(t);o.binaryType="arraybuffer";let i=t.headers.get("sec-websocket-protocol")||"",a=K(o,i,()=>{}),c=f=>{try{o.send(f)}catch{}},l=null,d=0,m=0,h=null,x=!1,b="";return a.pipeTo(new WritableStream({async write(f){if(x){d+=f.byteLength;let p=l.writable.getWriter();try{await p.write(f)}finally{p.releaseLock()}return}let w=h?ge(h,f):f,u=ue(w);if(!u.ok){if(u.incomplete){h=w;return}h=null;try{o.close()}catch{}return}h=null;let y=e.find(p=>p.uuid.toLowerCase()===u.uuid.toLowerCase());if(!y||!y.active){try{o.close()}catch{}return}if(b=y.id,x=!0,l=de({hostname:u.address,port:u.port}),c(new Uint8Array([0,0])),u.payload.length){d+=u.payload.length;let p=l.writable.getWriter();try{await p.write(u.payload)}finally{p.releaseLock()}}l.readable.pipeTo(new WritableStream({write(p){m+=p.byteLength,c(p)}})).catch(()=>{try{o.close()}catch{}}).finally(()=>{P(s,b,d,m).catch(()=>{})})},close(){try{l?.close()}catch{}},abort(){try{l?.close()}catch{}try{o.close()}catch{}}})).catch(()=>{try{o.close()}catch{}try{l?.close()}catch{}}),new Response(null,{status:101,webSocket:n})}function ge(t,e){let r=new Uint8Array(t.length+e.length);return r.set(t),r.set(e,t.length),r}function ue(t){try{if(t.length<1)return{ok:!1,incomplete:!0};if(t[0]!==0)return{ok:!1,incomplete:!1};if(t.length<17)return{ok:!1,incomplete:!0};let e=fe(t.slice(1,17));if(t.length<18)return{ok:!1,incomplete:!0};let s=18+t[17];if(t.length<s+4)return{ok:!1,incomplete:!0};if(t[s]!==1)return{ok:!1,incomplete:!1};let o=t[s+1]<<8|t[s+2],i=t[s+3],a=s+4,c="";if(i===1){if(t.length<a+4)return{ok:!1,incomplete:!0};c=`${t[a]}.${t[a+1]}.${t[a+2]}.${t[a+3]}`,a+=4}else if(i===2){if(t.length<a+1)return{ok:!1,incomplete:!0};let l=t[a];if(a+=1,t.length<a+l)return{ok:!1,incomplete:!0};c=new TextDecoder().decode(t.slice(a,a+l)),a+=l}else if(i===3){if(t.length<a+16)return{ok:!1,incomplete:!0};c=me(t.slice(a,a+16)),a+=16}else return{ok:!1,incomplete:!1};return{ok:!0,uuid:e,address:c,port:o,payload:t.slice(a)}}catch{return{ok:!1,incomplete:!1}}}function fe(t){let e=[...t].map(r=>r.toString(16).padStart(2,"0")).join("");return`${e.slice(0,8)}-${e.slice(8,12)}-${e.slice(12,16)}-${e.slice(16,20)}-${e.slice(20)}`}function me(t){let e=[];for(let r=0;r<16;r+=2)e.push((t[r]<<8|t[r+1]).toString(16));return e.join(":")}import{connect as he}from"cloudflare:sockets";async function ot(t,e,r,s){let{client:n,server:o}=q(t);o.binaryType="arraybuffer";let i=t.headers.get("sec-websocket-protocol")||"",a=K(o,i,()=>{}),c=f=>{try{o.send(f)}catch{}},l=null,d=0,m=0,h=null,x=!1,b="";return a.pipeTo(new WritableStream({async write(f){if(x){d+=f.byteLength;let p=l.writable.getWriter();try{await p.write(f)}finally{p.releaseLock()}return}let w=h?xe(h,f):f,u=be(w);if(!u.ok){if(u.incomplete){h=w;return}h=null;try{o.close()}catch{}return}h=null;let y=e.find(p=>Ie(p.password)===u.hash);if(!y||!y.active){try{o.close()}catch{}return}if(b=y.id,x=!0,l=he({hostname:u.address,port:u.port}),u.payload.length){d+=u.payload.length;let p=l.writable.getWriter();try{await p.write(u.payload)}finally{p.releaseLock()}}l.readable.pipeTo(new WritableStream({write(p){m+=p.byteLength,c(p)}})).catch(()=>{try{o.close()}catch{}}).finally(()=>{P(s,b,d,m).catch(()=>{})})},close(){try{l?.close()}catch{}},abort(){try{l?.close()}catch{}try{o.close()}catch{}}})).catch(()=>{try{o.close()}catch{}try{l?.close()}catch{}}),new Response(null,{status:101,webSocket:n})}function xe(t,e){let r=new Uint8Array(t.length+e.length);return r.set(t),r.set(e,t.length),r}function be(t){try{if(t.length<56)return{ok:!1,incomplete:!0};let e=new TextDecoder().decode(t.slice(0,56));if(t.length<58)return{ok:!1,incomplete:!0};if(t[56]!==13||t[57]!==10)return{ok:!1,incomplete:!1};if(t.length<60)return{ok:!1,incomplete:!0};if(t[58]!==1)return{ok:!1,incomplete:!1};let s=t[59],n=60,o="";if(s===1){if(t.length<n+4)return{ok:!1,incomplete:!0};o=`${t[n]}.${t[n+1]}.${t[n+2]}.${t[n+3]}`,n+=4}else if(s===3){if(t.length<n+1)return{ok:!1,incomplete:!0};let a=t[n];if(n+=1,t.length<n+a)return{ok:!1,incomplete:!0};o=new TextDecoder().decode(t.slice(n,n+a)),n+=a}else if(s===4){if(t.length<n+16)return{ok:!1,incomplete:!0};o=we(t.slice(n,n+16)),n+=16}else return{ok:!1,incomplete:!1};if(t.length<n+2)return{ok:!1,incomplete:!0};let i=t[n]<<8|t[n+1];return n+=2,t.length<n+2?{ok:!1,incomplete:!0}:t[n]!==13||t[n+1]!==10?{ok:!1,incomplete:!1}:(n+=2,{ok:!0,hash:e,address:o,port:i,payload:t.slice(n)})}catch{return{ok:!1,incomplete:!1}}}function we(t){let e=[];for(let r=0;r<16;r+=2)e.push((t[r]<<8|t[r+1]).toString(16));return e.join(":")}var ye=new Uint32Array([1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298]);function I(t,e){return t>>>e|t<<32-e}function Ae(t){let e=new Uint32Array([3238371032,914150663,812702999,4144912697,4290775857,1750603025,1694076839,3204075428]),r=t.length,s=Math.floor(r/536870912),n=r<<3>>>0,o=new Uint8Array((r+8>>6)+1<<6);o.set(t),o[r]=128;let i=new DataView(o.buffer);i.setUint32(o.length-8,s),i.setUint32(o.length-4,n);let a=new Uint32Array(64);for(let d=0;d<o.length;d+=64){for(let p=0;p<16;p++)a[p]=i.getUint32(d+p*4);for(let p=16;p<64;p++){let V=I(a[p-15],7)^I(a[p-15],18)^a[p-15]>>>3,F=I(a[p-2],17)^I(a[p-2],19)^a[p-2]>>>10;a[p]=a[p-16]+V+a[p-7]+F>>>0}let[m,h,x,b,f,w,u,y]=e;for(let p=0;p<64;p++){let V=I(f,6)^I(f,11)^I(f,25),F=f&w^~f&u,it=y+V+F+ye[p]+a[p]>>>0,Vt=I(m,2)^I(m,13)^I(m,22),Ft=m&h^m&x^h&x,Wt=Vt+Ft>>>0;y=u,u=w,w=f,f=b+it>>>0,b=x,x=h,h=m,m=it+Wt>>>0}e[0]=e[0]+m>>>0,e[1]=e[1]+h>>>0,e[2]=e[2]+x>>>0,e[3]=e[3]+b>>>0,e[4]=e[4]+f>>>0,e[5]=e[5]+w>>>0,e[6]=e[6]+u>>>0,e[7]=e[7]+y>>>0}let c=new Uint8Array(28),l=new DataView(c.buffer);for(let d=0;d<7;d++)l.setUint32(d*4,e[d]);return c}function Ie(t){return[...Ae(new TextEncoder().encode(t))].map(e=>e.toString(16).padStart(2,"0")).join("")}var Bt="https://api.cloudflare.com/client/v4";async function H(t,e,r){return(await fetch(Bt+e,{...r,headers:{authorization:`Bearer ${t}`,...r?.headers||{}}})).json()}async function Ct(t,e,r){let s=await H(t,`/accounts/${e}/storage/kv/namespaces?per_page=100`);for(let n of s?.result||[])if(r.includes(n.title))return n.id;return null}async function Qt(t,e,r,s,n){let o="----NikaNetBoundary"+Math.random().toString(16).slice(2),a=[`--${o}\r
Content-Disposition: form-data; name="metadata"\r
\r
${JSON.stringify({main_module:"worker.js",compatibility_date:"2026-05-01",workers_dev:!0,bindings:n})}\r
`,`--${o}\r
Content-Disposition: form-data; name="worker.js"; filename="worker.js"\r
Content-Type: application/javascript+module\r
\r
${s}\r
`,`--${o}--\r
`].join(""),c=await fetch(`${Bt}/accounts/${e}/workers/scripts/${r}`,{method:"PUT",headers:{authorization:`Bearer ${t}`,"content-type":`multipart/form-data; boundary=${o}`},body:a}),l=await c.json();return{ok:!!l?.success,err:l?.errors?.[0]?.message||`HTTP ${c.status}`}}async function Ht(t,e,r){let s=await H(t,`/accounts/${e}/workers/scripts/${r}/subdomain`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({enabled:!0})});return{ok:!!s?.success,err:s?.errors?.[0]?.message}}var Dt="data:image/png;base64,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",Lt="data:image/png;base64,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",Ot="data:image/png;base64,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",Nt="data:image/png;base64,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";var R=t=>String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),Ee="\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9",Y=t=>String(t).replace(/\d/g,e=>Ee[+e]);function Pt(t){let e=`${t.origin}/sub/${t.token}`,r=`${e}.yaml`,s=`${e}.json`,n=encodeURIComponent,o=`v2rayng://install-sub?url=${n(e)}&name=${n("Nika Net")}`,i=`v2box://install-sub?url=${n(e)}&name=${n("Nika Net")}`,a=`hiddify://import/${e}#Nika%20Net`,c=`happ://add/${e}`,l=t.quota>0?Math.max(0,Math.min(100,Math.round(t.used/t.quota*100))):0,d=t.active?"\u0641\u0639\u0627\u0644":"\u063A\u06CC\u0631\u0641\u0639\u0627\u0644",m=t.active?"on":"off",h=[t.protocols.vless?"VLESS":"",t.protocols.trojan?"Trojan":"",t.protocols.warp?"WARP":""].filter(Boolean),x=`/**
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
    <h1>\u0633\u0644\u0627\u0645 ${R(t.name)} \u{1F44B}</h1>
    <p>\u0627\u0634\u062A\u0631\u0627\u06A9 \u0634\u062E\u0635\u06CC \u062A\u0648 \u0622\u0645\u0627\u062F\u0647\u200C\u0633\u062A \u2014 \u0628\u0627 \u06CC\u0647 \u0644\u0645\u0633 \u0648\u0635\u0644 \u0634\u0648</p>
    <div class="chip ${m}"><span class="b"></span>${d}</div>
  </header>

  <section class="card">
    <h2>\u{1F4CA} \u0648\u0636\u0639\u06CC\u062A \u0627\u0634\u062A\u0631\u0627\u06A9</h2>
    <div class="meter"><i style="width:${l}%"></i></div>
    <div class="mlabel"><span>\u0645\u0635\u0631\u0641</span><span>${Y(l)}\u066A</span></div>
    <div class="stats">
      <div class="stat"><b>${Y(t.quota)} GB</b><span>\u062D\u062C\u0645 \u06A9\u0644</span></div>
      <div class="stat"><b>${Y(t.used)} GB</b><span>\u0645\u0635\u0631\u0641 \u0634\u062F\u0647</span></div>
      <div class="stat"><b>${Y(t.days)}</b><span>\u0631\u0648\u0632 \u0627\u0639\u062A\u0628\u0627\u0631</span></div>
    </div>
    <div class="protos">${h.map(b=>`<i>${b}</i>`).join("")}</div>
  </section>

  <section class="card">
    <h2>\u{1F4CB} \u06A9\u067E\u06CC \u0644\u06CC\u0646\u06A9 \u0633\u0627\u0628</h2>
    <p class="sub">\u0627\u06CC\u0646 \u0644\u06CC\u0646\u06A9 \u0627\u0634\u062A\u0631\u0627\u06A9 \u0634\u062E\u0635\u06CC \u062A\u0648\u0626\u0647 \u2014 \u06A9\u067E\u06CC\u0634 \u06A9\u0646 \u06CC\u0627 \u0645\u0633\u062A\u0642\u06CC\u0645 \u0648\u0627\u0631\u062F \u0627\u067E \u06A9\u0646.</p>
    <div class="linkbox">
      <input id="rawLink" readonly value="${R(e)}"/>
      <button class="btn" onclick="copyRaw()">\u06A9\u067E\u06CC</button>
    </div>
    <div class="formats">
      <div class="frow">
        <div class="k">Base64<em>V2rayNG</em></div>
        <code>${R(e)}</code>
        <button class="btn ghost small" onclick="copyRaw()">\u06A9\u067E\u06CC</button>
      </div>
      <div class="frow">
        <div class="k">Clash<em>YAML</em></div>
        <code>${R(r)}</code>
        <button class="btn ghost small" onclick="copyClash()">\u06A9\u067E\u06CC</button>
      </div>
      <div class="frow">
        <div class="k">Sing-box<em>JSON</em></div>
        <code>${R(s)}</code>
        <button class="btn ghost small" onclick="copySing()">\u06A9\u067E\u06CC</button>
      </div>
    </div>
  </section>

  <section class="card">
    <h2>\u{1F4F1} \u0627\u062A\u0635\u0627\u0644 \u0633\u0631\u06CC\u0639 \u0628\u0627 \u0627\u067E</h2>
    <p class="sub">\u0631\u0648\u06CC \u0627\u067E \u0645\u0648\u0631\u062F\u0646\u0638\u0631\u062A \u0628\u0632\u0646 \u062A\u0627 \u06A9\u0627\u0646\u0641\u06CC\u06AF \u062E\u0648\u062F\u06A9\u0627\u0631 \u0648\u0627\u0631\u062F\u0634 \u0628\u0634\u0647 \u26A1</p>
    <div class="apps">
      <a class="app" href="${o}"><span class="go">\u26A1</span><img src="${Ot}" alt="V2rayNG"/><b>V2rayNG</b><em>\u0627\u0646\u062F\u0631\u0648\u06CC\u062F</em></a>
      <a class="app" href="${a}"><span class="go">\u26A1</span><img src="${Dt}" alt="Hiddify"/><b>Hiddify</b><em>\u0647\u0645\u0647\u200C\u06CC \u067E\u0644\u062A\u0641\u0631\u0645\u200C\u0647\u0627</em></a>
      <a class="app" href="${c}"><span class="go">\u26A1</span><img src="${Lt}" alt="Happ"/><b>Happ</b><em>\u0627\u0646\u062F\u0631\u0648\u06CC\u062F \xB7 iOS</em></a>
      <a class="app" href="${i}"><span class="go">\u26A1</span><img src="${Nt}" alt="V2Box"/><b>V2Box</b><em>iOS \xB7 macOS</em></a>
    </div>
  </section>

  <section class="card">
    <h2>\u{1F533} \u0627\u0633\u06A9\u0646 \u0633\u0631\u06CC\u0639</h2>
    <div class="qrbox">
      <div id="qr"></div>
      <div class="t"><b>\u0628\u0627 \u062F\u0648\u0631\u0628\u06CC\u0646 \u0627\u0633\u06A9\u0646 \u06A9\u0646</b>\u062F\u0627\u062E\u0644 \u0627\u067E\u060C \u0627\u0632 \u0628\u062E\u0634 \xAB\u0627\u0633\u06A9\u0646 QR\xBB \u0647\u0645\u06CC\u0646 \u06A9\u062F \u0631\u0648 \u0628\u062E\u0648\u0646 \u062A\u0627 \u0645\u0633\u062A\u0642\u06CC\u0645 \u0648\u0627\u0631\u062F \u0628\u0634\u0647.</div>
    </div>
  </section>

  <footer class="foot">\u0633\u0627\u062E\u062A\u0647\u200C\u0634\u062F\u0647 \u0628\u0627 <b>NIKA NET</b> \xB7 \u0646\u0633\u062E\u0647 ${R(t.version)}<br/>\u0644\u06CC\u0646\u06A9 \u0633\u0627\u0628\u062A \u0631\u0648 \u062C\u0627\u06CC\u06CC \u0627\u0645\u0646 \u0646\u06AF\u0647 \u062F\u0627\u0631 \u{1F510}</footer>
</div>

<div id="toast">\u06A9\u067E\u06CC \u0634\u062F \u2713</div>

<script>${x}<\/script>
<script>
(function(){
  var RAW=${JSON.stringify(e)};
  var CLASH=${JSON.stringify(r)};
  var SING=${JSON.stringify(s)};
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
</html>`}var qt=`<!doctype html>
<html lang="fa" dir="rtl" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="color-scheme" content="dark light" />
<title>Nika Net \u2014 \u067E\u0646\u0644 \u0645\u062F\u06CC\u0631\u06CC\u062A</title>
<link rel="icon" href="data:image/jpeg;base64,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" />
<style>
    /* ============================================================
       Nika Net Panel \u2014 \xABAurora\xBB skin
       \u06AF\u0631\u0627\u0641\u06CC\u062A\u0650 \u0634\u0628\u0647\u0646\u06AF\u0627\u0645 + \u0634\u0641\u0642 \u0642\u0637\u0628\u06CC (\u0627\u06CC\u0646\u062F\u06CC\u06AF\u0648 \u2192 \u0641\u06CC\u0631\u0648\u0632\u0647\u200C\u0627\u06CC \u2192 \u0646\u0639\u0646\u0627\u06CC\u06CC)
       ============================================================ */
    :root{
      /* ---------- \u0634\u0628 / \u0634\u0641\u0642 ---------- */
      --bg:#0a0e18; --bg-soft:#0e1424; --card:rgba(19,26,44,.78); --card-2:rgba(28,37,62,.55);
      --border:#26314e; --text:#e9eef9; --muted:#93a0bd;
      --accent:#7dd3fc; --accent-2:#34d399;
      --grad:linear-gradient(135deg,#4f46e5,#0ea5e9);
      --grad-2:linear-gradient(135deg,#6366f1,#22d3ee 55%,#34d399);
      --grad-soft:linear-gradient(135deg,rgba(99,102,241,.16),rgba(34,211,238,.10));
      --ok:#34d399; --warn:#fbbf24; --bad:#fb7185; --info:#818cf8;
      --radius:18px;
      --shadow:0 22px 60px -32px rgba(0,0,0,.85);
      --glow:0 8px 26px -12px rgba(34,211,238,.5);
      --aura-a:rgba(99,102,241,.22); --aura-b:rgba(34,211,238,.15); --aura-op:1;
      --serif:Georgia,"Times New Roman",serif;
      --mono:ui-monospace,"SF Mono","Cascadia Code","JetBrains Mono","Courier New",monospace;
      --paper-line:transparent;
      --grain-op:.035;
      --avatar:url(data:image/jpeg;base64,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);
    }
    [data-theme="light"]{
      --bg:#f4efe4; --bg-soft:#fbf8f0; --card:rgba(255,253,248,.9); --card-2:#f2ecdd;
      --border:#e4dcc6; --text:#232022; --muted:#7b7466;
      --accent:#0891b2; --accent-2:#059669;
      --grad:linear-gradient(135deg,#6366f1,#0891b2);
      --grad-2:linear-gradient(135deg,#6366f1,#06b6d4 55%,#10b981);
      --grad-soft:linear-gradient(135deg,rgba(99,102,241,.10),rgba(6,182,212,.08));
      --ok:#059669; --warn:#d97706; --bad:#e11d48; --info:#6366f1;
      --shadow:0 18px 44px -26px rgba(80,60,30,.35);
      --glow:0 8px 24px -12px rgba(8,145,178,.4);
      --aura-a:rgba(99,102,241,.13); --aura-b:rgba(6,182,212,.11); --aura-op:.6;
      --paper-line:repeating-linear-gradient(0deg,transparent 0 31px,rgba(120,105,70,.06) 31px 32px);
      --grain-op:.05;
    }
    *{margin:0;padding:0;box-sizing:border-box}
    html{scroll-behavior:smooth}
    body{
      font-family:"Vazirmatn",-apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,Roboto,sans-serif;
      background:var(--bg); color:var(--text); min-height:100vh;
      transition:background .4s ease,color .4s ease;
      -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
    }
    body::before{ /* \u0647\u0627\u0644\u0647\u200C\u06CC \u0634\u0641\u0642 \u0642\u0637\u0628\u06CC */
      content:""; position:fixed; inset:0; pointer-events:none; z-index:0;
      background-image:
        var(--paper-line),
        radial-gradient(900px 520px at 86% -12%, var(--aura-a), transparent 62%),
        radial-gradient(820px 640px at -8% 112%, var(--aura-b), transparent 60%);
      opacity:var(--aura-op);
      transition:opacity .4s ease;
    }
    body::after{ /* \u062F\u0627\u0646\u0647\u200C\u062F\u0627\u0646\u0647\u200C\u0634\u062F\u0646 \u06A9\u0627\u063A\u0630 */
      content:""; position:fixed; inset:0; pointer-events:none; z-index:0;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");
      opacity:var(--grain-op); mix-blend-mode:overlay;
    }
    ::-webkit-scrollbar{width:10px;height:10px}
    ::-webkit-scrollbar-thumb{background:linear-gradient(180deg,var(--accent),var(--info));border-radius:99px;border:2px solid var(--bg)}
    ::-webkit-scrollbar-track{background:transparent}
    button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit}
    input,textarea,select{font-family:inherit;color:var(--text)}
    .hidden{display:none!important}

    /* ---------- \u0648\u0631\u0648\u062F ---------- */
    #loginView{min-height:100vh;display:grid;place-items:center;padding:24px;position:relative;z-index:1}
    .login-card{width:min(410px,100%);background:var(--card);border:1px solid var(--border);
      border-radius:24px;padding:42px 34px;text-align:center;backdrop-filter:blur(14px);
      box-shadow:var(--shadow); position:relative; overflow:hidden}
    .login-card::before{ /* \u0646\u0648\u0627\u0631 \u0628\u0627\u0644\u0627\u06CC \u06A9\u0627\u0631\u062A */
      content:""; position:absolute; top:0; left:0; right:0; height:3px;
      background:var(--grad-2);
    }
    .logo-big{width:100px;height:100px;margin:8px auto 18px;position:relative;border-radius:50%;
      padding:6px; background:var(--bg-soft); box-shadow:var(--glow)}
    .logo-big .av{background:var(--avatar);background-size:cover;background-position:center;width:100%;height:100%;border-radius:50%;display:block;filter:contrast(1.02)}
    .logo-big img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;
      filter:contrast(1.02); }
    .logo-big::after{ /* \u062D\u0644\u0642\u0647\u200C\u06CC \u0645\u062F\u0627\u062F\u06CC \u062F\u0633\u062A\u06CC */
      content:""; position:absolute; inset:-7px; border-radius:50%;
      border:1.5px dashed var(--accent); transform:rotate(6deg); opacity:.7;
    }
    .login-card h1{font-family:var(--serif);font-size:28px;font-weight:700;letter-spacing:.5px;
      background:var(--grad-2); -webkit-background-clip:text; background-clip:text;
      -webkit-text-fill-color:transparent; color:transparent}
    .login-card h1 .dot{color:var(--accent-2);-webkit-text-fill-color:var(--accent-2);background:none}
    .login-card p.sub{color:var(--muted);margin:8px 0 24px;font-size:13px;font-family:var(--mono)}
    .field{text-align:right;margin-bottom:14px}
    .field label{display:block;font-size:12px;color:var(--muted);margin-bottom:7px;font-weight:600;font-family:var(--mono);letter-spacing:.4px}
    .input{width:100%;background:var(--bg-soft);border:1px solid var(--border);border-radius:12px;
      padding:13px 15px;font-size:14px;transition:all .2s;outline:none}
    .input:focus{border-color:var(--accent);box-shadow:0 0 0 4px rgba(34,211,238,.14)}
    .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 18px;
      border-radius:12px;font-size:14px;font-weight:700;transition:all .18s}
    .btn:active{transform:translateY(1px)}
    .btn-primary{background:var(--grad);color:#fff;width:100%;
      box-shadow:var(--glow), inset 0 1px 0 rgba(255,255,255,.18)}
    .btn-primary:hover{filter:brightness(1.08)}
    .btn-primary:active{filter:brightness(.95)}
    .btn-danger{background:rgba(251,113,133,.13);color:var(--bad);border:1px solid rgba(251,113,133,.3)}
    .btn-danger:hover{background:rgba(251,113,133,.2)}
    .btn-ghost{background:transparent;border:1px solid var(--border);color:var(--muted)}
    .btn-ghost:hover{background:var(--card-2);color:var(--text)}
    .hint{background:var(--grad-soft);border:1px solid var(--border);
      border-radius:12px;padding:11px 13px;font-size:12px;margin-top:18px;font-family:var(--mono);color:var(--muted)}
    .error{color:var(--bad);font-size:12.5px;margin-top:10px;min-height:18px}

    /* ---------- \u0642\u0627\u0628 \u0628\u0631\u0646\u0627\u0645\u0647 ---------- */
    #appView{display:grid;grid-template-columns:264px 1fr;min-height:100vh;position:relative;z-index:1}
    #sidebar{padding:22px 16px;border-left:1px solid var(--border);display:flex;flex-direction:column;
      gap:6px;background:var(--card);backdrop-filter:blur(14px);position:sticky;top:0;height:100vh}
    .brand{display:flex;align-items:center;gap:12px;padding:4px 8px 18px}
    .logo{width:46px;height:46px;border-radius:50%;flex:none;position:relative;padding:3px;background:var(--bg-soft);box-shadow:var(--glow)}
    .logo .av{background:var(--avatar);background-size:cover;background-position:center;width:100%;height:100%;border-radius:50%;display:block}
    .logo img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block}
    .logo::after{content:"";position:absolute;inset:-4px;border-radius:50%;border:1.2px dashed var(--accent);transform:rotate(8deg);opacity:.7}
    .brand-name{font-size:16.5px;font-weight:700;font-family:var(--serif);letter-spacing:.3px}
    .brand-sub{font-size:10.5px;color:var(--muted);font-family:var(--mono)}
    .brand-underline{width:100%;height:8px;margin-top:2px}
    .brand-underline path{fill:none;stroke:var(--accent-2);stroke-width:1.6;stroke-dasharray:4 4}
    .nav{display:flex;flex-direction:column;gap:4px}
    .nav-item{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:13px;font-size:14px;
      color:var(--muted);font-weight:600;transition:all .2s;width:100%;border:1px solid transparent}
    .nav-item svg{width:19px;height:19px;flex:none}
    .nav-item:hover{background:var(--card-2);color:var(--text);border-color:var(--border)}
    .nav-item.active{background:var(--grad);color:#fff;border-color:transparent;box-shadow:var(--glow)}
    .sidebar-foot{margin-top:auto;padding-top:16px;border-top:1px solid var(--border);font-size:11px;color:var(--muted);font-family:var(--mono)}
    #main{padding:26px 30px;max-width:1180px;width:100%;margin:0 auto}
    .topbar{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:24px;flex-wrap:wrap}
    .page-title{font-size:23px;font-weight:700;letter-spacing:.2px;font-family:var(--serif)}
    .page-desc{color:var(--muted);font-size:12.5px;margin-top:5px;font-family:var(--mono)}
    .top-actions{display:flex;gap:10px;align-items:center}
    .icon-btn{width:42px;height:42px;border-radius:13px;background:var(--card);border:1px solid var(--border);
      display:grid;place-items:center;transition:all .2s;color:var(--muted)}
    .icon-btn:hover{background:var(--card-2);color:var(--text);border-color:var(--accent);transform:translateY(-1px)}
    .icon-btn svg{width:19px;height:19px}

    /* ---------- \u06A9\u0627\u0631\u062A\u200C\u0647\u0627 ---------- */
    .grid{display:grid;gap:16px}
    .stats{grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-bottom:16px}
    .card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;
      backdrop-filter:blur(12px);box-shadow:var(--shadow);transition:all .3s;position:relative}
    .card:hover{box-shadow:var(--shadow),0 0 0 1px rgba(125,211,252,.12)}
    .stat{position:relative;overflow:hidden}
    .stat::after{content:"";position:absolute;top:0;right:0;left:0;height:2px;background:var(--grad-2);opacity:.6}
    .stat .icon{width:44px;height:44px;border-radius:13px;display:grid;place-items:center;margin-bottom:14px;
      background:var(--grad-soft);border:1px solid var(--border);color:var(--accent);transform:rotate(-2deg)}
    .stat .icon svg{width:21px;height:21px;stroke:currentColor}
    .stat .val{font-size:27px;font-weight:700;letter-spacing:-1px;font-family:var(--mono);
      background:var(--grad-2);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
    .stat .lbl{color:var(--muted);font-size:12.5px;margin-top:3px}
    .stat .trend{position:absolute;top:20px;left:20px;font-size:10.5px;font-weight:700;padding:4px 9px;border-radius:99px;font-family:var(--mono);background:var(--card-2);color:var(--muted)}
    .trend.up{background:rgba(52,211,153,.14);color:var(--ok)}
    .trend.down{background:rgba(251,113,133,.14);color:var(--bad)}
    .two-col{grid-template-columns:1.4fr 1fr}
    @media(max-width:900px){.two-col{grid-template-columns:1fr}}

    .card-title{font-size:15px;font-weight:700;display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;font-family:var(--serif)}
    .card-title .mini{font-size:10.5px;color:var(--muted);font-weight:500;font-family:var(--mono)}
    .pencil{margin-left:8px;opacity:.75}
    table{width:100%;border-collapse:collapse}
    th{font-size:11px;color:var(--muted);text-align:right;padding:8px 10px;font-weight:600;border-bottom:1px solid var(--border);font-family:var(--mono);letter-spacing:.4px}
    td{padding:12px 10px;font-size:13.5px;border-bottom:1px solid var(--border);transition:background .15s}
    tbody tr:hover td{background:var(--card-2)}
    tr:last-child td{border-bottom:none}
    .badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:99px;font-size:11px;font-weight:700;font-family:var(--mono)}
    .badge.ok{background:rgba(52,211,153,.13);color:var(--ok)}
    .badge.off{background:rgba(251,113,133,.13);color:var(--bad)}
    .badge.warn{background:rgba(251,191,36,.14);color:var(--warn)}
    .dot{width:7px;height:7px;border-radius:99px;background:currentColor;box-shadow:0 0 8px currentColor}

    .chart{width:100%;height:190px}
    .chart path.area{fill:url(#areaGrad)}
    .chart path.line{fill:none;stroke:url(#lineGrad);stroke-width:2.5;stroke-linecap:round}
    .legend{display:flex;gap:16px;margin-top:10px;font-size:12px;color:var(--muted);font-family:var(--mono)}
    .legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-left:6px}

    .toggle{position:relative;width:46px;height:26px;background:var(--border);border-radius:99px;transition:.25s;flex:none;border:1px solid var(--muted)}
    .toggle::after{content:"";position:absolute;top:2px;right:2px;width:20px;height:20px;border-radius:99px;background:var(--muted);transition:.25s}
    .toggle.on{background:var(--grad);border-color:transparent;box-shadow:var(--glow)}
    .toggle.on::after{transform:translateX(-20px);background:#fff}
    .row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:1px solid var(--border)}
    .row:last-child{border-bottom:none}
    .row .k{font-size:13.5px;font-weight:600}
    .row .d{font-size:12px;color:var(--muted);margin-top:2px;font-family:var(--mono)}

    textarea.input{resize:vertical;min-height:110px;font-family:var(--mono);font-size:12px;line-height:1.7}
    pre.code{background:var(--bg-soft);border:1px solid var(--border);border-radius:12px;padding:16px;font-size:11.5px;
      line-height:1.8;direction:ltr;text-align:left;overflow:auto;max-height:340px;font-family:var(--mono);white-space:pre-wrap;word-break:break-all}
    .tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
    .tab{padding:8px 14px;border-radius:10px;font-size:12px;font-weight:700;background:var(--card-2);border:1px solid var(--border);color:var(--muted);font-family:var(--mono);transition:all .15s}
    .tab:hover{color:var(--text);border-color:var(--accent)}
    .tab.active{background:var(--grad);color:#fff;border-color:transparent;box-shadow:var(--glow)}
    .copy-row{display:flex;gap:8px;align-items:center;margin-top:10px}
    .copy-row .btn{width:auto;padding:9px 16px;font-size:12.5px}
    .field-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    @media(max-width:640px){.field-grid{grid-template-columns:1fr}}
    .modal-back{position:fixed;inset:0;background:rgba(4,6,12,.7);backdrop-filter:blur(8px);display:grid;place-items:center;z-index:50;padding:20px}
    .modal{width:min(560px,100%);max-height:88vh;overflow:auto;background:var(--bg-soft);border:1px solid var(--border);border-radius:20px;padding:26px;box-shadow:var(--shadow)}
    .modal h3{font-size:17px;font-weight:700;margin-bottom:16px;font-family:var(--serif)}
    .seg{display:flex;background:var(--card-2);border:1px solid var(--border);border-radius:12px;padding:4px;gap:4px}
    .seg button{flex:1;padding:9px;border-radius:9px;font-size:12.5px;font-weight:700;color:var(--muted);transition:all .15s}
    .seg button.on{background:var(--grad);color:#fff;box-shadow:var(--glow)}
    .toast{position:fixed;bottom:22px;right:50%;transform:translateX(50%);background:var(--bg-soft);border:1px solid var(--border);border-right:3px solid var(--accent-2);
      padding:12px 22px;border-radius:14px;font-size:13px;font-weight:600;box-shadow:var(--shadow);z-index:99;opacity:0;transition:.3s;pointer-events:none;backdrop-filter:blur(10px)}
    .toast.show{opacity:1}
    .empty{text-align:center;color:var(--muted);padding:40px 10px;font-size:13px;font-family:var(--mono)}
    .progress{height:8px;background:var(--card-2);border-radius:99px;overflow:hidden;margin-top:10px;border:1px solid var(--border)}
    .progress>div{height:100%;border-radius:99px;transition:width .5s;
      background:linear-gradient(90deg,var(--info),var(--accent),var(--accent-2),var(--accent),var(--info));background-size:200% 100%;animation:aurora 2.2s linear infinite}
    @keyframes aurora{to{background-position:200% 0}}
    .qty{width:74px;text-align:center}

    /* ---------- \u0627\u0633\u06A9\u0646\u0631 IP ---------- */
    .seg button.on{background:var(--grad);color:#fff}
    .chips{display:flex;gap:8px;flex-wrap:wrap}
    .pchip{padding:7px 13px;border-radius:9px;font-size:12px;font-weight:700;font-family:var(--mono);
      background:var(--card-2);border:1px solid var(--border);color:var(--muted);transition:all .15s}
    .pchip:hover{color:var(--text);border-color:var(--accent)}
    .pchip.on{background:var(--grad);color:#fff;border-color:transparent;box-shadow:var(--glow)}
    .scan-counters{display:flex;gap:12px;margin-top:14px;flex-wrap:wrap}
    .scan-counters#scanStatus{display:block;font-family:var(--mono);font-size:12.5px;color:var(--muted);min-height:18px}
    #scanStatus.live{color:var(--ok)}
    .scan-counters .sc{flex:1;min-width:84px;background:var(--card-2);border:1px solid var(--border);border-radius:12px;padding:10px 12px;text-align:center}
    .scan-counters .sc .v{font-family:var(--mono);font-size:21px;font-weight:700}
    .scan-counters .sc .l{font-size:10.5px;color:var(--muted);font-family:var(--mono)}
    .scan-counters .sc.ok .v{color:var(--ok)}
    .scan-counters .sc.bad .v{color:var(--bad)}
    .scan-top{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
    .top-chip{display:inline-flex;align-items:center;gap:8px;background:var(--card-2);border:1px solid var(--border);
      border-radius:11px;padding:6px 12px;cursor:pointer;transition:all .15s}
    .top-chip:hover{border-color:var(--accent);transform:translateY(-1px)}
    .top-chip .top-rank{width:20px;height:20px;border-radius:50%;background:var(--grad);color:#fff;display:grid;place-items:center;font-size:11px;font-weight:700}
    .top-chip code{font-family:var(--mono);font-size:12px}
    .top-chip b{font-family:var(--mono);font-size:11.5px;color:var(--ok)}
    .scan-list{display:flex;flex-direction:column;gap:6px;max-height:420px;overflow:auto}
    .scan-row{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;background:var(--card-2);
      border:1px solid transparent;cursor:pointer;transition:all .12s}
    .scan-row:hover{border-color:var(--accent)}
    .scan-ip{font-family:var(--mono);font-size:12.5px;font-weight:700;min-width:130px}
    .scan-port{font-family:var(--mono);font-size:11px;color:var(--muted)}
    .scan-latbar{flex:1;height:7px;background:var(--border);border-radius:99px;overflow:hidden;min-width:40px}
    .scan-latfill{height:100%;border-radius:99px;
      background:linear-gradient(90deg,var(--info),var(--accent),var(--accent-2));background-size:200% 100%;animation:aurora 2s linear infinite}
    .scan-ms{font-family:var(--mono);font-size:11.5px;min-width:56px;text-align:left}
    .scan-ms.ok{color:var(--ok)} .scan-ms.warn{color:var(--warn)} .scan-ms.bad{color:var(--bad)}

    /* ---------- Proxy IP Pool ---------- */
    .pool-search{width:100%;margin-bottom:12px}
    .country-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:8px;max-height:210px;overflow:auto;padding:2px}
    .country-chip{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:var(--card-2);
      border:1px solid var(--border);cursor:pointer;transition:all .15s;font-size:12.5px;font-weight:600;text-align:right}
    .country-chip:hover{border-color:var(--accent);transform:translateY(-1px)}
    .country-chip.on{background:var(--grad);color:#fff;border-color:transparent;box-shadow:var(--glow)}
    .country-chip .fl{font-size:16px;line-height:1}
    .country-chip .nm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .country-chip .cnt{font-family:var(--mono);font-size:10px;opacity:.75}
    .country-chip.on .cnt{color:#fff}
    .pool-hint{font-size:12px;color:var(--muted);line-height:1.9;margin-top:10px;font-family:var(--mono)}
    .pool-hint b{color:var(--warn)}
    .cf-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;font-family:var(--mono)}
    .cf-badge.cf{background:rgba(52,211,153,.14);color:var(--ok)}
    .cf-badge.nocf{background:rgba(251,191,36,.15);color:var(--warn)}
    .fixed-chip{display:inline-flex;align-items:center;gap:8px;background:var(--grad-soft);border:1px solid var(--border);
      border-radius:11px;padding:7px 13px;margin-top:10px;font-family:var(--mono);font-size:12px}
    .fixed-chip code{color:var(--accent);font-weight:700}


    /* ---------- \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC ---------- */
    .upd-ver{font-family:var(--mono);font-size:14px;font-weight:700;
      background:var(--grad-2);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
    .upd-status{display:inline-block;margin-top:12px;padding:6px 14px;border-radius:99px;font-family:var(--mono);font-size:12px;font-weight:700}
    .upd-status.ok{background:rgba(52,211,153,.13);color:var(--ok)}
    .upd-status.warn{background:rgba(251,191,36,.14);color:var(--warn)}
    .upd-status.bad{background:rgba(251,113,133,.13);color:var(--bad)}
    .upd-notes{background:var(--card-2);border:1px solid var(--border);border-radius:12px;padding:12px 14px;font-size:12.5px;color:var(--muted);line-height:1.9;font-family:var(--mono)}

    @media(max-width:760px){
      #appView{grid-template-columns:1fr}
      #sidebar{position:fixed;bottom:0;top:auto;left:0;right:0;height:auto;flex-direction:row;align-items:center;
        z-index:40;border-left:none;border-top:1px solid var(--border);padding:8px 10px;justify-content:space-around}
      .brand{display:none}.sidebar-foot{display:none}
      .nav{flex-direction:row;width:100%;justify-content:space-around}
      .nav-item{flex-direction:column;gap:4px;font-size:10.5px;padding:8px 10px}
      .nav-item span{display:none}
      #main{padding:20px 14px 90px}
    }
    @media (prefers-reduced-motion: reduce){
      .progress>div,.scan-latfill{animation:none}
      *{transition:none!important}
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
    <div class="sidebar-foot">Nika Net \xB7 Aurora<br/>Cloudflare Workers</div>
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
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22d3ee" stop-opacity=".3"/><stop offset="1" stop-color="#6366f1" stop-opacity="0"/></linearGradient>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6366f1"/><stop offset=".6" stop-color="#22d3ee"/><stop offset="1" stop-color="#34d399"/></linearGradient>
            </defs>
            <path class="area" id="areaPath" d=""/>
            <path class="line" id="linePath" d=""/>
          </svg>
          <div class="empty hidden" id="chartEmpty"></div>
          <div class="legend"><span><i style="background:linear-gradient(135deg,#6366f1,#22d3ee)"></i><span data-i18n="dash.usage">\u0645\u0635\u0631\u0641</span></span></div>
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
        <div class="field" style="margin-top:14px"><label data-i18n="set.fixedip">IP \u062B\u0627\u0628\u062A (\u0627\u062E\u062A\u06CC\u0627\u0631\u06CC)</label>
          <input class="input" id="setFixedIp" dir="ltr" placeholder="188.114.96.9 \u06CC\u0627 104.16.1.1:443" />
          <div class="d" style="color:var(--muted);font-size:12px;margin-top:6px;font-family:var(--mono)" data-i18n="set.fixedipD">\u0648\u0642\u062A\u06CC \u0633\u062A \u0634\u0648\u062F\u060C \u0647\u0645\u0647\u0654 \u06A9\u0627\u0646\u0641\u06CC\u06AF\u200C\u0647\u0627 \u0628\u0627 \u0647\u0645\u06CC\u0646 IP \u0633\u0627\u062E\u062A\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F (\u0628\u062F\u0648\u0646 \u0686\u0631\u062E\u0634 \u062A\u0635\u0627\u062F\u0641\u06CC). \u062E\u0627\u0644\u06CC = \u062A\u0635\u0627\u062F\u0641\u06CC \u0627\u0632 \u0628\u06CC\u0646 IP \u0647\u0627\u06CC \u062A\u0645\u06CC\u0632</div>
        </div>
        <div class="copy-row"><button class="btn btn-primary" id="saveBtn" style="width:auto">\u{1F4BE} <span data-i18n="set.save">\u0630\u062E\u06CC\u0631\u0647 \u062A\u0646\u0638\u06CC\u0645\u0627\u062A</span></button></div>
      </div>
    </section>

    <!-- \u0627\u0633\u06A9\u0646\u0631 IP -->
    <section id="page-scanner" class="hidden">
      <div class="card" style="margin-bottom:16px">
        <div class="card-title"><span>\u{1F30D} <span data-i18n="pool.title">Proxy IP Pool</span></span><span class="mini" data-i18n="pool.sub">\u06AF\u0644\u0686\u06CC\u0646 \u062E\u0648\u062F\u06A9\u0627\u0631 \u0628\u0647\u062A\u0631\u06CC\u0646 IP \u0627\u0632 \u06A9\u0634\u0648\u0631 \u0627\u0646\u062A\u062E\u0627\u0628\u06CC</span></div>
        <div class="d" style="margin-top:6px" data-i18n="pool.desc">\u06A9\u0634\u0648\u0631 \u0645\u0648\u0631\u062F \u0646\u0638\u0631\u062A \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646 \u062A\u0627 \u0633\u06CC\u0633\u062A\u0645 \u062E\u0648\u062F\u06A9\u0627\u0631 IP \u0647\u0627\u06CC \u0622\u0646 \u06A9\u0634\u0648\u0631 \u0631\u0627 \u062A\u0633\u062A \u0648 \u0628\u0647\u062A\u0631\u06CC\u0646\u200C\u0647\u0627 \u0631\u0627 \u06AF\u0644\u0686\u06CC\u0646 \u06A9\u0646\u062F. \u0628\u0647\u062A\u0631\u06CC\u0646 IP \u0631\u0627 \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u06CC \u0628\u0647\u200C\u0639\u0646\u0648\u0627\u0646 \xABIP \u062B\u0627\u0628\u062A\xBB \u0642\u0641\u0644 \u06A9\u0646\u06CC \u062A\u0627 \u0647\u0645\u0647\u0654 \u06A9\u0627\u0646\u0641\u06CC\u06AF\u200C\u0647\u0627 \u0628\u0627 \u0647\u0645\u0627\u0646 IP \u0633\u0631\u06CC\u0639 \u0648 \u067E\u0627\u06CC\u062F\u0627\u0631 \u0633\u0627\u062E\u062A\u0647 \u0634\u0648\u0646\u062F.</div>
        <div class="field" style="margin-top:14px"><label data-i18n="pool.search">\u062C\u0633\u062A\u062C\u0648\u06CC \u06A9\u0634\u0648\u0631</label>
          <input class="input pool-search" id="poolSearch" dir="ltr" data-i18n-ph="pool.searchPh" placeholder="Germany, \u0627\u06CC\u0631\u0627\u0646, NL, \u2026" />
        </div>
        <div class="country-grid" id="poolGrid"></div>
        <div class="pool-hint" id="poolNote"></div>
        <div class="field-grid" style="margin-top:14px">
          <div class="field"><label data-i18n="pool.selected">\u06A9\u0634\u0648\u0631 \u0627\u0646\u062A\u062E\u0627\u0628\u200C\u0634\u062F\u0647</label><div class="input" id="poolSel" dir="ltr" style="display:flex;align-items:center;gap:8px">\u2014</div></div>
          <div class="field"><label data-i18n="pool.sample">\u062A\u0639\u062F\u0627\u062F \u0646\u0645\u0648\u0646\u0647 \u0628\u0631\u0627\u06CC \u062A\u0633\u062A</label>
            <select class="input" id="poolSample">
              <option value="50">50</option><option value="100" selected>100</option><option value="200">200</option><option value="0">\u0647\u0645\u0647</option>
            </select>
          </div>
        </div>
        <div class="copy-row" style="margin-top:14px">
          <button class="btn btn-primary" id="poolStart" style="width:auto">\u25B6 <span data-i18n="pool.start">\u062A\u0633\u062A \u062E\u0648\u062F\u06A9\u0627\u0631 \u0648 \u06AF\u0644\u0686\u06CC\u0646</span></button>
          <button class="btn btn-danger hidden" id="poolStop" style="width:auto">\u25A0 <span data-i18n="scan.stop">\u062A\u0648\u0642\u0641</span></button>
          <button class="btn btn-primary hidden" id="poolLock" style="width:auto">\u{1F512} <span data-i18n="pool.lock">\u0642\u0641\u0644 \u0628\u0647\u062A\u0631\u06CC\u0646 IP \u0628\u0647\u200C\u0639\u0646\u0648\u0627\u0646 IP \u062B\u0627\u0628\u062A</span></button>
        </div>
        <div class="progress" style="margin-top:16px"><div id="poolBar" style="width:0%"></div></div>
        <div class="scan-counters" id="poolStatus" style="margin-top:10px"><span data-i18n="pool.empty">\u0647\u0646\u0648\u0632 \u06A9\u0634\u0648\u0631\u06CC \u0627\u0646\u062A\u062E\u0627\u0628 \u0646\u0634\u062F\u0647</span></div>
        <div class="scan-counters">
          <div class="sc"><div class="v" id="poTested">0</div><div class="l" data-i18n="scan.tested">\u062A\u0633\u062A \u0634\u062F\u0647</div></div>
          <div class="sc ok"><div class="v" id="poAlive">0</div><div class="l" data-i18n="scan.alive">\u0633\u0627\u0644\u0645</div></div>
          <div class="sc bad"><div class="v" id="poDead">0</div><div class="l" data-i18n="scan.dead">\u0645\u0631\u062F\u0647</div></div>
        </div>
        <div class="scan-top" id="poolTop"></div>
        <div class="scan-list" id="poolList" style="margin-top:10px;max-height:300px"><div class="empty" data-i18n="pool.empty">\u0647\u0646\u0648\u0632 \u06A9\u0634\u0648\u0631\u06CC \u0627\u0646\u062A\u062E\u0627\u0628 \u0646\u0634\u062F\u0647</div></div>
        <div class="row" style="margin-top:10px"><div><div class="k">\u{1F512} <span data-i18n="pool.fixed">IP \u062B\u0627\u0628\u062A \u0641\u0639\u0644\u06CC</span></div><div class="d" data-i18n="pool.fixedD">\u0648\u0642\u062A\u06CC \u062E\u0627\u0644\u06CC \u0628\u0627\u0634\u062F\u060C \u06A9\u0627\u0646\u0641\u06CC\u06AF\u200C\u0647\u0627 \u0627\u0632 \u0628\u06CC\u0646 IP \u0647\u0627\u06CC \u062A\u0645\u06CC\u0632 \u062A\u0635\u0627\u062F\u0641\u06CC \u0627\u0646\u062A\u062E\u0627\u0628 \u0645\u06CC\u200C\u06A9\u0646\u0646\u062F</div></div>
          <div style="display:flex;gap:8px;align-items:center"><span id="poolFixed" class="fixed-chip" style="margin-top:0">\u2014</span><button class="btn btn-ghost hidden" id="poolUnlock" style="padding:8px 14px;font-size:12px">\u{1F513} <span data-i18n="pool.unlock">\u0628\u0627\u0632 \u06A9\u0631\u062F\u0646</span></button></div>
        </div>
      </div>
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
            <button class="btn btn-ghost" id="scanLock" style="padding:8px 14px;font-size:12px" title="" data-i18n="scan.lock">\u{1F512} IP \u062B\u0627\u0628\u062A</button>
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
  $("#setFixedIp").value = (state.settings && state.settings.fixedIp) || "";
}
$("#saveBtn").onclick = async () => {
  if (MODE !== "live") { toast(t("toast.preview")); return; }
  const body = {
    title: $("#setTitle").value || "Nika Net",
    host: $("#setHost").value,
    sni: $("#setSni").value,
    wsPath: $("#setWsPath").value || "/nika-ws",
    cleanIps: $("#setIps").value.split("\\n").map((x) => x.trim()).filter(Boolean),
    fixedIp: $("#setFixedIp").value.trim(),
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
I18N.fa["relay.help"] = "\u0647\u0645\u0647\u0654 \u062F\u0627\u0645\u0646\u0647\u200C\u0647\u0627 \u062E\u0648\u062F\u06A9\u0627\u0631 \u062C\u0645\u0639 \u0648 \u062A\u0633\u062A \u0645\u06CC\u200C\u0634\u0648\u0646\u062F: \u062F\u0627\u0645\u0646\u0647\u0654 \u0648\u0631\u06A9\u0631\u060C \u062F\u0627\u0645\u0646\u0647\u0654 \u0631\u0644\u0647\u0654 \u0641\u0639\u0644\u06CC\u060C \u0632\u06CC\u0631\u062F\u0627\u0645\u0646\u0647\u200C\u0647\u0627\u06CC \u0627\u062D\u062A\u0645\u0627\u0644\u06CC\u060C \u0641\u0647\u0631\u0633\u062A \u0639\u0645\u0648\u0645\u06CC \u0648 \u0647\u0631 \u062F\u0627\u0645\u0646\u0647\u200C\u0627\u06CC \u06A9\u0647 \u0627\u06CC\u0646\u062C\u0627 \u0628\u0646\u0648\u06CC\u0633\u06CC. \u0628\u0647\u062A\u0631\u06CC\u0646 (\u0633\u0627\u0644\u0645 + \u0633\u0631\u06CC\u0639 + \u0645\u062A\u0635\u0644 \u0628\u0647 \u0648\u0631\u06A9\u0631) \u062E\u0648\u062F\u06A9\u0627\u0631 \u0627\u0646\u062A\u062E\u0627\u0628 \u0648 \u0627\u0639\u0645\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u062F.";
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
I18N.fa["relay.phaseA"] = "\u0628\u0631\u0631\u0633\u06CC \u0633\u0644\u0627\u0645\u062A \u0647\u0645\u0647\u0654 \u062F\u0627\u0645\u0646\u0647\u200C\u0647\u0627\u2026";
I18N.fa["relay.autopicked"] = "\u0628\u0647\u062A\u0631\u06CC\u0646 \u062F\u0627\u0645\u0646\u0647\u0654 \u0631\u0644\u0647 \u0627\u0646\u062A\u062E\u0627\u0628 \u0648 \u0627\u0639\u0645\u0627\u0644 \u0634\u062F \u2713";
I18N.fa["relay.public"] = "\u0641\u0647\u0631\u0633\u062A \u0639\u0645\u0648\u0645\u06CC";

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
I18N.en["relay.help"] = "All domains are collected & tested automatically: your worker domain, current relay domain, likely subdomains, a public pool, plus anything you type here. The best (healthy + fast + reaching your worker) is picked & applied automatically.";
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
I18N.en["relay.phaseA"] = "Checking health of all domains\u2026";
I18N.en["relay.autopicked"] = "Best relay domain picked & applied \u2713";
I18N.en["relay.public"] = "Public pool";
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
    $("#relayApply").onclick = () => applyRelay(false);
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

  /* ---------------- relay test (\u062A\u0633\u062A \u0631\u0644\u0647) \u2014 every candidate ---------------- */
  // Built-in pool of popular / Cloudflare-fronted domains (health + fronting test)
  const RELAY_POOL = [
    "www.cloudflare.com", "one.one.one.one", "speed.cloudflare.com", "www.speedtest.net",
    "cdn.jsdelivr.net", "unpkg.com", "www.npmjs.com", "dl.google.com", "www.gstatic.com",
    "www.microsoft.com", "www.openai.com", "chat.openai.com", "gateway.icloud.com",
    "www.bing.com", "zoom.us", "www.whatsapp.com", "www.okx.com", "www.uptodown.com",
    "www.github.com", "raw.githubusercontent.com", "www.alibaba.com", "www.cloudflare-cn.com",
  ];

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

  function baseDomain(d) {
    const p = d.split(".");
    if (p.length <= 2) return d;
    if (p.slice(-2).join(".") === "workers.dev") return d;
    const multi = ["com.ir","co.ir","ac.ir","org.ir","net.ir","gov.ir","co.uk","com.au","com.tr","org.uk"];
    const last2 = p.slice(-2).join(".");
    const last3 = p.slice(-3).join(".");
    return multi.includes(last3) ? last3 : last2;
  }

  // For custom domains, generate likely subdomains (they work when a wildcard
  // Worker route like *.example.com fronts this worker).
  function variantDomains(hosts) {
    const subs = ["www","cdn","relay","vpn","proxy","net","edge","node","speed","api","panel","sub"];
    const out = new Set();
    for (const h of hosts) {
      if (!h || /^\\d{1,3}(\\.\\d{1,3}){3}$/.test(h)) continue;
      const base = baseDomain(h);
      out.add(h);
      if (base !== h) out.add(base);
      if (base.split(".").length > 2) for (const s of subs) out.add(s + "." + base);
    }
    return [...out];
  }

  // Gather EVERY candidate: live host, saved host, current relay, textarea,
  // generated subdomains and the public pool.
  function collectCandidates() {
    const hosts = [];
    if (location.hostname) hosts.push(location.hostname);
    const sh = (state.settings && state.settings.host) || "";
    if (sh) hosts.push(sh);
    const rd = (state.settings && state.settings.relayDomain) || "";
    if (rd) hosts.push(rd);
    const set = new Set([...hosts, ...parseDomains($("#relayCandidates").value), ...variantDomains(hosts), ...RELAY_POOL]);
    return [...set];
  }

  function httpProbe(domain) {
    return new Promise((resolve) => {
      const ctl = new AbortController();
      const t0 = setTimeout(() => ctl.abort(), 6000);
      const start = performance.now();
      fetch("https://" + domain + "/", { mode: "no-cors", cache: "no-store", signal: ctl.signal, redirect: "manual" })
        .then(() => { clearTimeout(t0); resolve({ ok: true, ms: Math.max(1, Math.round(performance.now() - start)) }); })
        .catch(() => {
          clearTimeout(t0);
          const ms = performance.now() - start;
          resolve({ ok: !ctl.signal.aborted && ms >= 12, ms: Math.round(ms) });
        });
    });
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

  async function pool(items, n, fn) {
    let cursor = 0;
    const workers = [];
    for (let w = 0; w < Math.min(n, items.length); w++) {
      workers.push((async () => { while (cursor < items.length) { const it = items[cursor++]; await fn(it); } })());
    }
    await Promise.all(workers);
  }

  async function runRelay() {
    const candidates = collectCandidates();
    if (!candidates.length) { toast(t("relay.none")); return; }
    R.running = true; R.results = []; R.best = null;
    $("#relayStart").classList.add("hidden");
    $("#relayApply").classList.add("hidden");
    renderRelay();

    // Phase A \u2014 health check on EVERY candidate (parallel)
    $("#relayStatus").textContent = t("relay.phaseA");
    const liveness = new Map();
    let done = 0;
    await pool(candidates, 10, async (d) => {
      const r = await httpProbe(d);
      liveness.set(d, r);
      done++;
      $("#relayStatus").textContent = t("relay.phaseA") + " " + done + "/" + candidates.length;
    });

    // Phase B \u2014 fronting probe on healthy candidates (2 tries each)
    const alive = candidates.filter((d) => liveness.get(d) && liveness.get(d).ok);
    done = 0;
    await pool(alive, 8, async (d) => {
      let best = null;
      for (let tr = 0; tr < 2; tr++) {
        const r = await wsProbe(d);
        if (r.ok) { best = r; break; }
      }
      const live = liveness.get(d);
      R.results.push({
        domain: d,
        alive: !!(live && live.ok),
        httpMs: live && live.ok ? live.ms : null,
        front: !!(best && best.ok),
        ms: best ? best.ms : null,
      });
      done++;
      $("#relayStatus").textContent = t("relay.running") + " " + done + "/" + alive.length;
      renderRelay();
    });

    R.results.sort((a, b) => {
      if (a.front !== b.front) return a.front ? -1 : 1;
      if (a.front && b.front) return (a.ms || 0) - (b.ms || 0);
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      return (a.httpMs || 9999) - (b.httpMs || 9999);
    });
    R.best = R.results.find((r) => r.front) || null;
    R.running = false;
    renderRelay();
    if (R.best) await applyRelay(true);
    else toast(t("relay.none"));
  }

  function renderRelay() {
    const el = $("#relayList");
    if (!R.results.length) {
      el.innerHTML = \`<div class="empty">\${R.running ? t("relay.running") : t("relay.empty")}</div>\`;
      $("#relayStart").classList.toggle("hidden", R.running);
      $("#relayApply").classList.add("hidden");
      if (!R.running) $("#relayStatus").textContent = "";
      return;
    }
    el.innerHTML = R.results.map((r) => {
      const best = R.best && r.domain === R.best.domain;
      let status;
      if (r.front) status = \`<code class="scan-ms ok">\${t("relay.front")} \xB7 \${r.ms}ms</code>\`;
      else if (r.alive) status = \`<code class="scan-ms warn">\${t("relay.notfront")} \xB7 \${r.httpMs}ms</code>\`;
      else status = \`<code class="scan-ms bad">\${t("scan.dead")}</code>\`;
      return \`<div class="scan-row" onclick="SCANNER.copyIp('\${r.domain}')" title="\${t("scan.copy")}">
        <code class="scan-ip">\${r.domain}</code>
        \${best ? '<span class="badge ok" style="font-size:10px">\u2605 ' + t("relay.best") + '</span>' : ""}
        <div style="flex:1"></div>
        \${status}
      </div>\`;
    }).join("");
    $("#relayStart").classList.toggle("hidden", R.running);
    $("#relayApply").classList.toggle("hidden", !R.best);
    if (!R.running) $("#relayStatus").textContent = t("relay.done");
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
    const hosts = [];
    if (location.hostname) hosts.push(location.hostname);
    const sh = (state.settings && state.settings.host) || "";
    if (sh && !hosts.includes(sh)) hosts.push(sh);
    const rd = (state.settings && state.settings.relayDomain) || "";
    if (rd && !hosts.includes(rd)) hosts.push(rd);
    ta.value = "# " + t("relay.candidates") + "\\n" + hosts.join("\\n");
  }

  async function applyRelay(auto) {
    if (!R.best) { toast(t("relay.none")); return; }
    if (MODE !== "live") { if (!auto) toast(t("toast.preview")); return; }
    const res = await api("/api/settings", { method: "POST", body: { relayDomain: R.best.domain } });
    if (res.ok) {
      toast(auto ? t("relay.autopicked") : t("relay.applied"));
      if (state.settings) state.settings.relayDomain = R.best.domain;
      renderRelayCurrent();
    } else toast(t("common.error"));
  }

  return {
    onOpen, copyIp, initUI, _seed: SEED.length,
    /* best alive results as "ip" / "ip:port" (for the fixed-IP lock) */
    topAlive: () => aliveResults().slice(0, 20).map((r) => (r.port && r.port !== 443 ? r.ip + ":" + r.port : r.ip)),
    aliveCount: () => aliveResults().length,
  };
})();

/* expose for inline onclick */
window.SCANNER = SCANNER;
SCANNER.initUI();
if (typeof applyLang === "function") applyLang(); // translate scanner labels (keys added above)

<\/script>
<script>
/* ================================================================
   Nika Net \u2014 Proxy IP Pool (per-country, auto-test & best-pick)
   + "fixed IP" lock so configs are built with one stable, fast IP.
   ================================================================ */
/* pool data (injected at build time) */
window.PROXY_POOL = {"DE":["102.215.228.162:443","103.109.234.61:443","103.121.48.87:8443","103.167.235.99:443","103.228.168.182:443","103.228.170.23:2053","103.241.51.153:2053","103.27.156.147:443","103.31.76.16:443","103.56.84.189:443","103.7.55.148:2053","103.7.55.148:8443","103.75.197.18:8443","103.75.197.94:443","103.75.199.16:443","104.105.9.100:443","104.105.9.142:443","104.152.49.13:443","104.152.49.155:443","104.152.49.87:443","104.194.156.155:8443","104.194.156.84:443","104.194.158.111:443","104.194.159.48:443","104.194.159.86:8443","104.207.130.92:443","104.238.177.144:443","104.248.132.134:2053","104.248.132.134:2083","104.248.132.134:2087","104.248.132.134:2096","104.248.132.134:443","104.248.132.134:8443","104.248.136.46:2053","104.248.136.46:2083","104.248.136.46:2087","104.248.136.46:2096","104.248.136.46:443","104.248.136.46:8443","104.248.140.196:443","104.248.142.217:2053","104.248.142.217:2083","104.248.142.217:2087","104.248.142.217:2096","104.248.142.217:443","104.248.142.217:8443","104.248.18.117:443","104.248.20.104:443","104.248.20.85:443","104.248.23.56:443","104.248.240.93:443","104.248.242.82:443","104.248.245.101:2053","104.248.245.101:2083","104.248.245.101:2087","104.248.245.101:2096","104.248.245.101:443","104.248.245.101:8443","104.248.249.73:2053","104.248.249.73:2083","104.248.249.73:2087","104.248.249.73:2096","104.248.249.73:443","104.248.249.73:8443","104.248.25.208:443","104.248.33.8:443","104.248.35.74:443","104.248.42.90:443","104.248.46.180:443","104.248.46.73:2053","104.248.46.73:2083","104.248.46.73:2087","104.248.46.73:2096","104.248.46.73:443","104.248.46.73:8443","104.248.47.17:443","108.165.173.197:443","108.165.173.95:8443","108.165.174.53:443","108.165.236.142:443","108.165.236.247:443","108.165.236.6:443","108.165.236.90:443","109.120.137.148:8443","109.120.138.131:8443","109.120.138.149:443","109.120.138.15:443","109.120.138.174:443","109.120.138.192:443","109.120.140.190:443","109.120.176.145:8443","109.120.176.152:443","109.120.176.17:443","109.120.176.4:443","109.120.177.192:2053","109.122.196.101:8443","109.122.196.62:443","109.122.196.98:8443","109.122.197.126:443","109.122.197.39:443","109.122.198.5:2053","109.122.198.64:443","109.122.198.83:8443","109.162.249.19:8443","109.162.249.64:8443","109.172.94.248:443","109.175.211.150:443","109.230.230.38:443","109.237.96.82:443","109.69.58.188:8443","109.94.170.104:443","111.88.74.167:443","113.30.190.244:2053","113.30.190.244:8443","113.30.190.30:443","113.30.191.181:443","116.202.132.205:443","116.202.14.249:8443","116.202.16.211:8443","116.202.178.68:443","116.202.187.28:8443","116.202.25.67:443","116.202.9.203:443","116.203.195.246:8443","116.203.255.88:443","116.203.44.119:443","116.203.57.178:2096","116.203.58.165:443","116.203.70.33:8443","116.203.94.129:2083","116.203.94.129:8443","128.140.32.214:8443","128.140.69.244:443","128.140.73.159:443","128.140.78.248:443","128.140.94.162:443","129.159.25.87:443","13.140.25.114:2053","13.140.25.210:443","13.140.25.46:2083","13.140.25.68:443","13.140.28.247:443","13.140.28.46:443","130.17.0.12:443","130.17.10.101:443","130.17.10.144:8443","130.17.10.196:443","130.17.10.20:443","130.17.10.230:443","130.17.12.236:8443","130.17.12.35:443","130.17.13.115:443","130.17.13.244:443","130.17.13.244:8443","130.17.13.65:8443","130.17.13.88:8443","130.17.17.181:8443","130.17.20.113:8443","130.17.20.156:443","130.17.20.158:443","130.17.20.4:8443","130.17.21.173:8443","130.17.21.52:8443","130.17.25.103:443","130.17.25.165:443","130.17.25.197:443","130.17.27.116:2053","130.17.27.199:443","130.17.27.204:443","130.17.27.204:8443","130.17.27.25:443","130.17.4.60:443","130.17.4.73:8443","130.17.4.76:443","130.17.4.94:443","130.17.6.46:2053","130.17.6.46:2087","130.17.6.46:8443","130.185.123.191:8443","130.61.187.66:443","130.61.208.80:443","130.61.48.18:443","130.61.71.239:443","131.143.125.248:443","131.143.125.68:443","131.246.53.124:443","132.145.232.171:443","132.226.197.103:443","132.226.199.170:443","132.226.199.170:8443","134.122.69.115:443","134.122.69.33:2053","134.122.69.33:2083","134.122.69.33:2087","134.122.69.33:2096","134.122.69.33:443","134.122.69.33:8443","134.122.71.185:8443","134.122.71.33:2053","134.122.71.33:2083","134.122.71.33:2087","134.122.71.33:2096","134.122.71.33:443","134.122.71.33:8443","134.122.71.85:443","134.122.72.43:443","134.122.75.164:443","134.122.77.148:443","134.122.84.25:2053","134.122.84.25:2083","134.122.84.25:2087","134.122.84.25:2096","134.122.84.25:443","134.122.84.25:8443","134.122.87.45:443","134.122.88.119:443","134.122.90.61:443","134.122.93.66:443","134.122.93.75:2053","134.122.93.75:2083","134.122.93.75:2087","134.122.93.75:2096","134.122.93.75:443","134.122.93.75:8443","134.122.94.19:443","134.122.95.34:443","134.209.224.221:2053","134.209.224.221:2083","134.209.224.221:2087","134.209.224.221:2096","134.209.224.221:443","134.209.224.221:8443","134.209.227.233:443","134.209.229.9:8443","134.209.230.176:443","134.209.232.62:2053","134.209.236.15:443","134.209.241.224:443","134.209.243.55:443","134.209.244.186:443","134.209.244.217:443","134.209.246.179:443","134.209.252.112:2053","134.209.252.112:2083","134.209.252.112:2087","134.209.252.112:2096","134.209.252.112:443","134.209.252.112:8443","134.209.252.120:2053","134.209.252.120:2083","134.209.252.120:2087","134.209.252.120:2096","134.209.252.120:443","134.209.252.120:8443","134.209.255.57:8443","134.255.247.200:443","135.125.152.124:8443","135.125.159.211:8443","135.125.202.69:8443","136.243.104.33:8443","136.243.86.65:2053","136.243.86.66:2053","136.243.86.67:2053","136.243.86.68:2053","136.243.86.69:2053","136.243.86.70:2053","136.243.86.71:2053","136.243.86.72:2053","136.243.86.73:2053","136.243.86.74:2053","136.243.86.75:2053","136.243.86.76:2053","136.243.86.77:2053","136.243.86.78:2053","136.243.86.79:2053","136.243.86.80:2053","136.243.86.81:2053","136.243.86.82:2053","136.243.86.83:2053","136.243.86.84:2053","136.243.86.85:2053","136.243.86.86:2053","136.243.86.87:2053","136.243.86.88:2053","136.243.86.89:2053","136.243.86.90:2053","136.243.86.91:2053","136.243.86.92:2053","136.243.86.93:2053","136.243.86.94:2053","136.244.94.142:443","136.244.94.162:443","138.124.114.167:443","138.124.126.109:8443","138.124.126.116:443","138.124.228.122:443","138.124.228.127:443","138.124.228.38:443","138.124.229.46:443","138.124.229.85:443","138.124.230.140:443","138.124.230.175:443","138.124.230.248:443","138.124.231.159:443","138.124.231.200:443","138.124.28.173:443","138.124.28.6:443","138.124.28.78:443","138.124.37.177:443","138.124.37.47:443","138.124.38.244:443","138.124.38.41:8443","138.124.39.82:443","138.124.50.24:443","138.124.51.101:443","138.124.53.160:8443","138.124.53.196:8443","138.124.53.254:443","138.124.54.218:443","138.124.54.68:8443","138.124.61.153:443","138.124.61.184:2087","138.124.61.184:443","138.124.61.26:443","138.124.66.187:443","138.124.93.120:443","138.124.93.143:443","138.124.93.150:443","138.124.93.5:2083","138.16.173.23:443","138.197.176.152:2053","138.197.176.152:2083","138.197.176.152:2087","138.197.176.152:2096","138.197.176.152:443","138.197.176.152:8443","138.197.178.126:443","138.197.180.246:2053","138.197.180.246:2083","138.197.180.246:2087","138.197.180.246:2096","138.197.180.246:443","138.197.180.246:8443","138.197.181.22:2053","138.197.181.22:2083","138.197.181.22:2087","138.197.181.22:2096","138.197.181.22:443","138.197.181.22:8443","138.197.182.222:443","138.197.183.219:443","138.197.185.198:443","138.197.188.233:443","138.197.190.75:2053","138.197.190.75:2083","138.197.190.75:2087","138.197.190.75:2096","138.197.190.75:443","138.197.190.75:8443","138.199.144.252:8443","138.199.147.113:443","138.199.175.118:443","138.201.194.249:8443","138.201.246.107:8443","138.249.8.78:443","138.3.254.178:443","138.68.102.212:2053","138.68.103.102:443","138.68.106.184:2053","138.68.106.184:2083","138.68.106.184:2087","138.68.106.184:2096","138.68.106.184:443","138.68.106.184:8443","138.68.64.213:2053","138.68.64.213:2083","138.68.64.213:2087","138.68.64.213:2096","138.68.64.213:443","138.68.64.213:8443","138.68.66.142:443","138.68.70.30:2053","138.68.70.30:2083","138.68.70.30:2087","138.68.70.30:2096","138.68.70.30:443","138.68.70.30:8443","138.68.75.58:2053","138.68.75.58:2083","138.68.75.58:2087","138.68.75.58:2096","138.68.75.58:443","138.68.75.58:8443","138.68.78.45:2053","138.68.78.45:2083","138.68.78.45:2087","138.68.78.45:2096","138.68.78.45:443","138.68.78.45:8443","138.68.80.136:443"],"NL":["101.99.75.101:8443","101.99.76.88:2053","103.102.228.113:443","103.118.208.202:443","103.137.248.103:8443","103.137.248.227:443","103.251.166.229:443","103.251.167.112:8443","103.251.167.92:443","103.41.47.2:443","103.45.247.67:443","103.54.16.49:443","103.54.16.86:443","103.54.18.18:2053","103.54.18.18:8443","103.54.18.22:2053","103.54.18.47:8443","103.65.231.157:443","103.65.231.245:443","103.74.92.83:443","103.80.86.172:8443","103.80.86.19:443","103.80.86.19:8443","103.80.87.114:443","103.90.72.221:8443","103.90.72.71:443","103.90.73.87:443","103.90.75.121:443","103.90.75.141:2053","103.90.75.41:2053","103.90.75.41:8443","104.194.133.95:443","104.194.134.129:2053","104.194.134.135:443","104.194.134.81:443","104.238.27.188:8443","104.248.193.241:443","104.248.198.46:443","104.248.202.10:2053","104.248.202.10:2083","104.248.202.10:2087","104.248.202.10:2096","104.248.202.10:443","104.248.202.10:8443","104.248.204.227:8443","104.248.80.71:2053","104.248.80.71:2083","104.248.80.71:2087","104.248.80.71:2096","104.248.80.71:443","104.248.80.71:8443","104.248.81.178:2053","104.248.81.178:2083","104.248.81.178:2087","104.248.81.178:2096","104.248.81.178:443","104.248.81.178:8443","104.248.84.93:2053","104.248.84.93:2083","104.248.84.93:2087","104.248.84.93:2096","104.248.84.93:443","104.248.84.93:8443","104.248.86.57:443","104.248.89.156:443","104.248.89.43:443","104.248.94.160:443","104.249.40.214:2053","104.249.40.225:443","104.255.70.56:443","107.161.175.246:443","107.161.175.50:443","107.189.16.188:443","107.189.17.137:2053","107.189.17.140:443","107.189.17.141:443","107.189.17.175:443","107.189.17.214:443","107.189.17.225:443","107.189.18.255:443","107.189.19.56:443","107.189.19.56:8443","107.189.20.216:443","107.189.21.187:443","107.189.21.196:443","107.189.21.196:8443","107.189.22.146:443","107.189.22.197:443","107.189.22.25:443","107.189.23.153:2053","107.189.23.153:8443","107.189.23.204:443","107.189.23.26:443","107.189.23.84:8443","107.189.24.163:8443","107.189.24.92:443","107.189.25.131:8443","107.189.25.136:443","107.189.25.144:8443","107.189.25.2:443","107.189.26.160:443","107.189.26.37:443","107.189.27.138:8443","108.61.164.231:443","109.104.153.94:443","109.107.164.64:2053","109.107.164.64:8443","109.107.172.152:8443","109.107.178.144:8443","109.120.139.2:443","109.120.142.143:443","109.120.142.45:443","109.120.150.5:443","109.120.150.5:8443","109.120.150.80:443","109.120.154.167:443","109.120.158.149:443","109.172.92.91:443","109.172.93.59:443","109.172.93.59:8443","109.176.207.168:443","109.196.98.158:443","109.207.173.100:2053","109.234.34.17:443","109.234.34.234:443","109.248.162.239:443","109.248.162.244:443","109.248.162.47:2053","109.248.162.47:8443","109.248.162.70:2053","109.248.162.70:8443","109.69.56.15:443","109.69.56.90:8443","109.71.240.135:443","109.71.240.135:8443","109.71.241.47:443","109.71.244.208:443","109.71.246.177:443","109.73.204.202:443","113.30.188.83:443","13.140.0.127:443","13.140.0.188:443","13.140.2.133:443","13.140.2.136:443","13.140.3.237:443","13.143.202.200:443","13.143.245.157:2053","13.143.245.157:8443","13.143.245.184:443","130.12.242.117:443","130.12.46.23:443","130.12.46.75:443","130.17.18.85:8443","130.49.176.227:2053","130.49.176.227:8443","132.243.115.239:8443","132.243.125.30:443","132.243.210.178:2083","132.243.217.22:8443","132.243.218.203:443","132.243.221.138:443","132.243.235.53:2096","132.243.249.238:8443","132.243.251.194:443","132.243.251.38:8443","134.122.52.20:2053","134.122.52.20:2083","134.122.52.20:2087","134.122.52.20:2096","134.122.52.20:443","134.122.52.20:8443","134.122.53.66:443","134.122.53.88:443","134.122.54.149:443","134.122.56.133:443","134.122.56.211:443","134.209.136.197:443","134.209.192.5:2053","134.209.192.5:2083","134.209.192.5:2087","134.209.192.5:2096","134.209.192.5:443","134.209.192.5:8443","134.209.194.199:2053","134.209.194.199:2083","134.209.194.199:2087","134.209.194.199:2096","134.209.194.199:443","134.209.194.199:8443","134.209.201.61:2053","134.209.201.61:2083","134.209.201.61:2087","134.209.201.61:2096","134.209.201.61:443","134.209.201.61:8443","134.209.202.182:2053","134.209.202.182:2083","134.209.202.182:2087","134.209.202.182:2096","134.209.202.182:443","134.209.202.182:8443","134.209.205.250:2053","134.209.205.250:8443","134.209.82.151:2053","134.209.82.151:2083","134.209.82.151:2087","134.209.82.151:2096","134.209.82.151:443","134.209.82.151:8443","134.209.85.210:2053","134.209.85.210:2083","134.209.85.210:2087","134.209.85.210:2096","134.209.85.210:443","134.209.85.210:8443","134.209.86.85:443","134.209.87.204:443","134.209.93.32:443","134.98.143.133:443","135.106.164.247:8443","136.0.141.220:443","136.144.243.91:443","136.244.101.151:2053","136.244.101.151:8443","136.244.105.62:443","138.124.101.100:8443","138.124.101.149:443","138.124.101.79:2087","138.124.101.98:8443","138.124.106.215:443","138.124.106.34:443","138.124.106.45:443","138.124.108.177:2083","138.124.108.219:2053","138.124.108.224:443","138.124.113.115:2053","138.124.113.200:2053","138.124.113.200:2083","138.124.117.102:443","138.124.117.46:8443","138.124.2.178:443","138.124.3.109:443","138.124.3.156:443","138.124.3.201:443","138.124.3.59:443","138.124.52.146:8443","138.124.52.150:8443","138.124.52.178:443","138.124.67.239:443","138.124.74.104:2053","138.124.78.157:443","138.124.78.212:443","138.124.79.224:443","138.124.79.250:443","138.124.79.250:8443","138.124.79.40:443","138.124.89.138:443","138.124.89.144:443","138.124.89.90:8443","138.124.90.150:443","138.124.90.81:443","138.124.90.85:8443","138.124.91.235:443","138.16.141.105:2053","138.16.141.50:2053","138.16.141.50:8443","138.226.220.233:443","138.226.220.60:443","138.226.222.186:8443","138.226.222.18:8443","139.100.225.27:2096","139.100.225.27:8443","139.28.240.24:443","139.28.240.39:443","141.11.246.52:443","141.11.246.54:443","141.11.246.57:443","141.11.246.60:443","141.11.246.63:443","141.11.62.65:2053","141.144.195.228:443","141.144.200.19:8443","141.227.131.193:2053","141.98.235.196:2087","141.98.6.66:8443","142.111.194.211:443","142.111.194.4:8443","142.54.23.15:8443","142.93.128.40:443","142.93.130.29:443","142.93.131.113:2053","142.93.131.113:2083","142.93.131.113:2087","142.93.131.113:2096","142.93.131.113:443","142.93.131.113:8443","142.93.132.36:443","142.93.133.252:443","142.93.133.46:443","142.93.135.188:443","142.93.136.4:2053","142.93.136.4:2083","142.93.136.4:2087","142.93.136.4:2096","142.93.136.4:443","142.93.136.4:8443","142.93.140.86:2053","142.93.142.199:8443","142.93.224.188:2053","142.93.224.188:2083","142.93.224.188:2087","142.93.224.188:2096","142.93.224.188:443","142.93.224.188:8443","142.93.225.182:443","142.93.225.99:2053","142.93.225.99:2083","142.93.225.99:2087","142.93.225.99:2096","142.93.225.99:443","142.93.226.43:2053","142.93.226.43:2083","142.93.226.43:2087","142.93.226.43:2096","142.93.226.43:443","142.93.226.43:8443","142.93.239.223:443","143.14.1.4:443","143.14.1.8:443","143.20.82.16:443","143.20.82.24:2083","143.244.218.122:443","144.124.224.75:8443","144.124.226.215:443","144.124.232.187:8443","144.124.233.74:8443","144.124.235.123:2053","144.124.235.197:443","144.124.237.204:443","144.124.238.55:443","144.124.239.222:443","144.124.239.32:443","144.124.244.223:2053","144.124.245.51:443","144.124.255.136:443","144.31.100.143:2083","144.31.111.105:8443","144.31.111.118:8443","144.31.111.172:443","144.31.111.62:443","144.31.111.66:2087","144.31.122.162:2083","144.31.122.162:8443","144.31.122.254:443","144.31.122.66:443","144.31.123.104:443","144.31.123.30:443","144.31.123.64:443","144.31.134.42:443","144.31.135.223:443","144.31.200.207:443","144.31.203.40:443","144.31.207.208:2053","144.31.224.58:8443","144.31.224.75:443","144.31.233.163:2087","144.31.233.89:443","144.31.234.82:8443","144.31.91.62:443","144.31.92.160:443","144.31.92.218:443","144.31.92.9:443","144.31.97.135:443","145.249.115.89:443","146.0.73.202:443","146.0.73.251:443","146.0.79.33:443","146.103.100.127:2053","146.103.100.127:8443","146.103.103.122:443","146.103.114.246:2053","146.103.114.43:443","146.103.115.143:443","146.103.116.222:443","146.103.120.167:443","146.103.122.49:443","146.103.127.73:8443","146.103.50.202:8443","146.103.96.164:443","146.103.96.48:443","146.103.96.54:443","146.185.128.197:443","146.185.129.17:443","146.185.129.42:443","146.185.129.48:443","146.185.131.217:443","146.185.132.220:443","146.185.132.26:443","146.185.132.50:443","146.185.133.163:443"],"US":["103.11.76.116:443","103.11.76.162:443","103.11.76.183:443","103.11.76.196:443","103.11.76.45:443","103.11.77.104:443","103.11.77.93:8443","103.11.78.142:2053","103.11.78.211:8443","103.11.78.25:443","103.152.113.60:443","103.152.113.60:8443","103.196.20.32:8443","103.196.20.33:443","103.232.92.167:8443","103.232.93.113:443","103.232.93.75:443","103.232.94.154:443","103.232.94.154:8443","103.232.95.134:443","103.232.95.177:8443","103.232.95.178:443","103.232.95.249:8443","103.232.95.94:443","103.233.74.215:443","103.242.133.57:443","103.54.57.172:2053","103.7.136.78:443","103.7.137.163:443","103.7.137.210:443","103.7.137.51:443","103.7.138.172:2053","103.91.219.19:443","103.91.219.234:443","103.91.219.234:8443","103.91.219.6:8443","104.128.141.187:8443","104.129.183.226:443","104.129.183.69:443","104.131.166.120:443","104.131.172.195:443","104.156.252.234:8443","104.168.125.179:443","104.168.132.109:443","104.168.132.123:443","104.168.132.21:8443","104.168.133.189:8443","104.168.133.207:443","104.168.138.2:8443","104.168.142.4:8443","104.168.144.213:443","104.168.144.216:443","104.168.145.98:443","104.168.152.245:443","104.168.155.113:443","104.168.155.113:8443","104.168.202.51:443","104.168.24.34:443","104.168.56.73:443","104.168.88.111:2096","104.194.79.122:443","104.194.87.242:443","104.194.87.242:8443","104.202.107.113:8443","104.202.107.130:8443","104.202.107.55:8443","104.207.145.249:8443","104.207.151.42:443","104.207.157.238:8443","104.223.38.6:443","104.223.40.83:2053","104.224.157.136:8443","104.225.154.171:443","104.234.50.168:443","104.234.50.215:2053","104.236.186.204:443","104.237.132.51:443","104.238.129.180:443","104.238.129.93:8443","104.238.140.120:443","104.238.152.102:2053","104.245.13.12:443","104.245.13.161:443","104.245.13.47:443","104.245.13.88:443","104.248.208.69:2053","104.248.208.69:2083","104.248.208.69:2087","104.248.208.69:2096","104.248.208.69:443","104.248.208.69:8443","104.248.68.179:2053","104.248.68.179:2083","104.248.68.179:2087","104.248.68.179:2096","104.248.68.179:443","104.248.68.179:8443","104.249.156.155:8443","104.249.159.201:443","104.249.159.219:443","104.249.159.248:443","104.252.77.72:443","104.253.1.248:443","104.36.71.153:443","104.52.226.83:443","107.150.0.204:443","107.150.96.171:443","107.155.57.29:443","107.158.13.157:443","107.161.24.195:443","107.161.82.69:443","107.170.235.229:443","107.170.240.26:443","107.170.244.118:443","107.170.246.220:443","107.170.248.68:443","107.170.249.50:443","107.170.40.201:443","107.170.49.53:443","107.172.137.69:2053","107.172.137.69:8443","107.172.180.151:443","107.172.187.94:443","107.172.190.151:443","107.172.201.15:2053","107.172.201.15:8443","107.172.216.84:2096","107.172.222.174:443","107.172.241.7:443","107.172.32.207:443","107.172.79.112:443","107.173.15.138:443","107.173.154.24:2096","107.173.155.70:2053","107.173.156.153:443","107.173.202.209:443","107.173.29.58:443","107.173.29.58:8443","107.173.34.130:2053","107.173.34.130:8443","107.173.38.240:8443","107.173.58.201:2087","107.173.87.103:443","107.174.137.99:443","107.174.141.201:443","107.174.154.23:443","107.174.2.185:8443","107.174.210.240:2083","107.174.214.238:443","107.174.219.56:8443","107.174.240.198:2053","107.174.242.250:443","107.174.252.170:2087","107.174.40.115:443","107.174.71.164:443","107.174.81.92:2096","107.174.83.113:443","107.174.84.152:8443","107.175.132.4:443","107.175.206.50:443","107.175.209.186:443","107.175.215.100:2096","107.175.215.100:8443","107.175.228.15:8443","107.175.239.32:8443","107.175.79.48:2053","107.191.119.176:443","108.165.12.120:8443","108.165.189.78:443","108.165.191.3:2083","108.165.191.3:8443","108.171.194.50:2083","108.171.194.50:2087","108.171.194.50:2096","108.186.158.34:8443","108.186.198.35:443","108.186.246.227:443","108.186.246.232:8443","108.61.0.242:443","108.61.218.27:443","108.61.242.146:443","108.62.160.192:8443","108.62.160.198:2053","108.62.160.92:2083","108.62.160.92:2087","108.62.160.92:2096","108.62.161.139:8443","108.62.161.27:443","111.88.227.71:2053","113.20.0.14:443","113.20.0.3:443","113.20.12.85:443","113.20.13.195:2087","113.20.14.20:443","113.20.15.175:443","113.20.15.176:443","113.20.4.112:443","113.20.4.250:443","113.20.5.18:8443","113.20.5.210:8443","113.20.6.129:443","113.20.7.116:443","113.20.7.205:8443","113.20.8.15:8443","117.55.224.10:8443","117.55.224.251:443","117.55.226.118:443","117.55.227.223:2053","117.55.227.223:443","117.55.228.179:443","117.55.228.23:8443","117.55.228.53:443","117.55.230.97:443","117.55.231.178:443","117.55.231.219:443","117.55.232.150:443","117.55.233.107:443","117.55.233.119:443","117.55.233.168:443","117.55.233.250:443","117.55.233.77:443","117.55.233.87:443","117.55.234.179:443","117.55.234.38:443","117.55.234.50:443","117.55.235.168:2053","117.55.235.180:443","117.55.235.8:443","117.55.236.137:443","117.55.237.222:443","117.55.237.224:443","117.55.238.117:443","117.55.239.57:443","121.127.34.119:443","124.156.157.6:8443","128.1.163.186:8443","128.1.163.188:8443","128.14.140.2:2053","129.146.109.208:2053","129.146.131.158:443","129.146.196.8:443","129.146.201.236:443","129.146.231.203:443","129.146.31.14:2053","129.146.46.164:443","129.146.47.135:443","129.146.49.224:443","129.146.7.155:443","129.146.86.192:443","129.146.94.18:443","129.153.70.191:8443","129.153.74.231:443","129.158.198.241:2053","129.158.198.241:8443","129.158.215.178:8443","129.158.241.2:8443","129.159.119.161:443","129.159.121.208:443","129.159.177.196:8443","129.159.34.196:443","129.159.37.136:443","129.159.41.150:443","129.159.47.168:2053","129.159.84.71:443","129.80.111.1:8443","129.80.221.237:443","13.143.176.206:8443","13.56.86.137:443","130.12.44.182:443","130.12.47.179:2053","130.51.22.56:443","130.51.23.127:443","132.148.73.21:8443","132.226.156.134:443","134.122.0.192:443","134.122.122.207:8443","134.122.9.53:443","134.195.211.254:443","134.195.91.66:8443","134.199.213.162:443","134.209.166.117:443","134.209.166.201:2053","134.209.166.201:8443","134.209.175.62:443","134.209.72.77:443","136.0.116.127:2087","136.0.39.11:8443","136.0.39.40:443","136.0.39.41:443","136.0.39.54:443","136.0.39.60:443","136.0.39.65:443","136.175.179.113:8443","137.131.24.133:8443","137.175.44.124:443","137.175.62.104:8443","137.184.11.137:443","137.184.115.179:443","137.184.122.138:443","137.184.159.228:8443","137.184.191.160:443","137.184.216.171:443","137.184.228.85:443","137.184.36.156:443","137.184.39.15:443","137.184.46.183:443","137.184.90.41:8443","137.220.33.177:443","137.220.37.145:443","137.220.38.195:443","137.220.42.121:443","137.220.43.88:8443","137.220.50.108:443","138.124.123.201:443","138.124.60.33:2087","138.128.194.154:443","138.128.220.159:8443","138.197.116.217:443","138.197.194.78:2053","138.197.194.78:2083","138.197.194.78:2087","138.197.194.78:2096","138.197.194.78:443","138.197.194.78:8443","138.197.195.117:8443","138.197.209.118:443","138.197.28.178:443","138.199.43.137:443","138.2.232.216:8443","138.2.236.17:443","138.249.133.40:443","138.68.1.18:2053","138.68.1.18:2083","138.68.1.18:2087","138.68.1.18:2096","138.68.1.18:443","138.68.1.18:8443","138.68.222.33:443","138.68.43.97:443","138.68.9.159:443","139.28.232.197:8443","139.60.161.170:2083","140.82.20.24:443","140.82.30.237:443","140.82.49.187:8443","140.99.254.179:443","141.148.140.81:8443","141.148.159.253:443","141.148.181.105:443","141.148.182.172:8443","141.148.187.195:443","142.111.135.124:443","142.111.135.164:443","142.248.218.100:2053","142.248.218.101:2053","142.248.218.102:2053","142.248.218.103:2053","142.248.218.104:2053","142.248.218.105:2053","142.248.218.106:2053","142.248.218.107:2053","142.248.218.108:2053","142.248.218.109:2053","142.248.218.10:2053","142.248.218.110:2053","142.248.218.111:2053","142.248.218.112:2053","142.248.218.113:2053","142.248.218.114:2053","142.248.218.115:2053","142.248.218.116:2053","142.248.218.117:2053","142.248.218.118:2053","142.248.218.119:2053","142.248.218.11:2053","142.248.218.120:2053","142.248.218.121:2053","142.248.218.122:2053","142.248.218.123:2053","142.248.218.124:2053","142.248.218.125:2053","142.248.218.126:2053","142.248.218.127:2053","142.248.218.128:2053","142.248.218.129:2053","142.248.218.12:2053","142.248.218.130:2053","142.248.218.131:2053","142.248.218.132:2053","142.248.218.133:2053","142.248.218.134:2053","142.248.218.135:2053","142.248.218.136:2053","142.248.218.137:2053","142.248.218.138:2053","142.248.218.139:2053","142.248.218.13:2053","142.248.218.140:2053","142.248.218.141:2053","142.248.218.142:2053"],"FI":["103.71.22.129:443","103.71.22.133:8443","103.71.22.234:8443","103.71.22.26:443","103.71.23.244:443","103.71.23.247:443","103.71.23.39:443","103.71.23.75:443","103.85.112.57:443","103.85.112.97:2053","103.85.113.213:443","103.85.113.232:2053","103.85.113.59:2053","103.85.114.144:443","103.85.114.160:443","103.85.115.166:443","103.85.115.229:443","103.85.115.39:443","103.85.115.51:443","104.128.131.94:443","104.128.142.134:443","104.238.29.173:443","109.107.155.76:2053","109.107.155.76:443","109.107.171.147:443","109.107.190.100:443","109.107.190.36:2053","109.120.134.104:443","109.120.184.98:8443","109.120.185.18:443","109.172.54.225:8443","109.172.54.73:443","109.206.243.100:2053","109.206.243.100:2087","109.206.243.100:2096","109.206.243.100:443","109.206.243.198:443","109.69.61.110:443","109.69.61.17:2053","109.69.61.17:443","111.88.215.50:443","130.12.45.7:443","132.243.20.114:443","132.243.206.187:8443","132.243.21.182:443","132.243.22.221:443","132.243.22.224:443","132.243.223.182:8443","132.243.226.83:8443","132.243.23.172:8443","132.243.23.180:8443","132.243.23.188:8443","132.243.23.245:8443","132.243.23.44:8443","132.243.23.59:443","132.243.24.12:443","132.243.24.196:443","132.243.24.222:443","132.243.24.252:443","132.243.25.208:8443","135.106.130.62:8443","135.136.176.156:443","135.136.176.183:443","135.136.177.125:8443","135.136.177.137:443","135.136.177.174:443","135.136.177.57:8443","135.136.181.113:443","135.136.186.84:443","135.181.145.226:8443","135.181.169.136:443","135.181.200.5:443","135.181.204.201:443","135.181.204.201:8443","135.181.22.167:443","135.181.24.140:8443","135.181.24.30:443","135.181.249.78:443","135.181.250.100:2053","135.181.250.100:8443","135.181.78.188:443","135.181.84.31:443","135.181.95.131:8443","138.124.102.224:443","138.124.103.161:443","138.124.118.160:443","138.124.17.63:443","138.124.241.14:443","138.124.241.205:2096","138.124.241.205:8443","138.124.244.145:443","138.124.244.176:443","138.124.244.182:443","138.124.244.182:8443","138.124.244.33:443","138.124.25.223:443","138.124.26.195:2053","138.124.26.195:8443","138.124.26.200:2053","138.124.26.200:8443","138.124.26.228:443","138.124.6.162:443","138.124.7.136:443","138.124.75.161:443","138.124.8.145:443","138.124.8.37:8443","138.124.8.82:443","138.124.80.13:443","138.124.9.125:443","138.124.9.140:443","138.124.9.233:2053","138.124.9.236:443","138.124.9.49:8443","139.28.220.204:443","139.28.220.254:443","141.0.184.108:443","141.0.184.183:2087","141.105.143.132:2053","141.105.143.132:8443","141.98.87.145:8443","144.31.109.167:443","144.31.119.16:443","144.31.119.82:2083","144.31.126.104:443","144.31.132.149:2053","144.31.132.187:443","144.31.132.190:443","144.31.132.231:443","144.31.133.175:443","144.31.133.234:443","144.31.133.243:443","144.31.133.243:8443","144.31.143.6:443","144.31.152.127:443","144.31.155.232:8443","144.31.155.30:443","144.31.156.174:8443","144.31.170.231:8443","144.31.170.30:443","144.31.18.41:443","144.31.18.5:443","144.31.18.67:8443","144.31.182.130:443","144.31.182.130:8443","144.31.182.202:443","144.31.182.64:443","144.31.182.64:8443","144.31.183.229:8443","144.31.183.235:443","144.31.183.67:2053","144.31.183.93:443","144.31.185.137:8443","144.31.185.206:443","144.31.212.58:443","144.31.217.77:443","144.31.226.131:443","144.31.226.176:8443","144.31.226.65:8443","144.31.230.112:8443","144.31.230.94:8443","144.31.232.73:2053","144.31.232.93:443","144.31.239.123:443","144.31.239.65:2053","144.31.240.86:8443","144.31.243.234:8443","144.31.245.192:8443","144.31.245.201:443","144.31.245.33:443","144.31.245.91:2053","144.31.245.91:443","144.31.249.101:443","144.31.27.118:443","144.31.27.160:443","144.31.27.87:443","144.31.28.106:8443","144.31.66.244:443","144.31.66.40:443","144.31.66.8:2053","144.31.67.127:443","144.31.7.200:8443","144.31.7.71:443","144.31.7.95:443","144.31.71.182:8443","144.31.75.156:443","144.31.75.156:8443","144.31.75.16:443","144.31.75.199:443","144.31.75.251:443","144.31.79.12:443","144.31.79.143:443","144.31.79.193:443","144.31.79.251:8443","144.31.79.63:2053","144.31.82.152:443","144.31.82.218:443","144.31.82.218:8443","144.31.99.228:443","144.31.99.252:443","144.31.99.87:443","147.45.72.32:8443","147.45.73.197:2083","147.45.76.146:443","147.45.76.82:2053","147.45.76.82:8443","147.45.79.231:2096","147.78.181.190:8443","149.33.36.94:443","150.241.101.185:443","150.241.101.188:443","150.241.74.200:443","150.241.74.241:443","150.241.75.194:443","150.241.86.28:443","150.241.86.68:443","150.241.86.74:2053","150.241.88.11:2053","150.241.88.14:443","150.241.88.243:443","150.241.89.233:8443","151.241.229.145:443","151.241.234.84:8443","151.243.145.139:443","151.243.208.197:443","151.243.208.197:8443","151.245.139.125:443","151.245.140.134:2087","151.245.140.204:443","151.245.140.223:443","153.52.117.170:2053","153.52.117.170:2087","153.52.117.170:2096","153.52.117.170:8443","157.180.112.12:443","157.180.112.176:443","157.180.121.219:2053","157.180.121.219:8443","157.180.37.174:8443","157.180.39.164:8443","157.180.40.120:443","157.180.69.202:2053","157.180.69.202:8443","157.180.73.13:443","157.180.76.243:443","157.180.76.49:8443","157.180.81.127:443","157.180.82.236:443","157.180.92.230:443","157.180.94.32:2053","157.180.94.32:443","157.228.142.148:8443","157.228.142.190:443","157.228.142.191:443","157.228.142.192:443","157.228.142.192:8443","157.228.142.197:443","157.228.142.197:8443","157.228.143.42:8443","157.228.153.6:443","157.228.153.7:443","159.255.32.113:443","159.255.32.56:443","159.255.32.80:443","163.5.153.228:2053","163.5.153.228:8443","167.17.177.118:443","167.17.177.66:8443","176.124.202.62:2083","176.124.220.119:443","176.124.220.122:443","176.124.220.173:8443","176.125.254.194:8443","176.125.254.216:443","176.125.254.216:8443","177.1.188.39:443","177.1.188.68:443","178.17.53.10:443","178.17.53.85:443","178.17.60.14:443","178.17.61.156:8443","178.17.61.227:443","178.17.61.231:443","178.236.244.41:443","178.253.16.165:443","178.253.16.201:443","178.253.16.60:443","178.253.16.60:8443","178.253.16.70:8443","178.253.16.88:8443","178.253.31.14:443","178.253.31.163:8443","178.253.31.180:443","178.253.31.210:443","178.253.31.232:443","178.253.31.37:443","178.253.31.60:443","178.253.31.69:8443","178.253.31.79:443","178.253.31.99:443","179.198.50.130:443","179.198.50.202:443","179.198.50.231:443","179.198.50.29:443","179.198.50.32:443","179.198.51.110:8443","179.198.51.167:8443","179.198.51.77:443","179.198.51.87:443","185.102.136.148:8443","185.102.136.201:443","185.103.103.148:2053","185.104.250.62:443","185.104.250.9:443","185.105.118.126:2053","185.105.118.126:8443","185.105.118.210:8443","185.106.94.143:443","185.112.82.28:443","185.112.83.221:443","185.117.119.146:443","185.125.228.74:8443","185.125.230.128:443","185.125.231.119:443","185.125.231.161:2053","185.125.231.161:8443","185.17.2.113:443","185.17.2.116:443","185.17.2.147:443","185.17.2.161:443","185.17.2.195:443","185.188.181.14:443","185.188.181.196:443","185.188.181.237:443","185.20.138.179:8443","185.200.190.149:443","185.202.207.165:443","185.202.207.30:443","185.202.207.3:8443","185.202.207.62:443","185.202.207.89:443","185.212.119.102:2053","185.212.149.7:443","185.221.23.212:443","185.221.23.243:443","185.221.23.250:8443","185.221.23.98:443","185.227.144.223:443","185.227.144.91:443","185.227.68.190:443","185.228.233.167:443","185.229.65.105:443","185.229.65.51:443","185.229.65.51:8443","185.229.66.149:443","185.229.66.32:443","185.230.190.148:443","185.230.190.29:443","185.232.204.201:443","185.232.204.222:443","185.232.204.37:443","185.232.204.66:443","185.233.82.34:8443","185.233.82.5:443","185.238.189.184:443","185.239.141.120:443","185.239.141.178:443","185.239.141.59:443","185.239.141.89:443","185.246.191.117:2053","185.246.191.117:2083","185.246.191.154:8443","185.246.191.168:2053","185.246.191.194:443","185.246.191.194:8443","185.246.191.196:443","185.246.191.196:8443","185.246.191.222:443","185.246.191.235:8443","185.246.191.25:2096","185.246.191.40:443","185.250.181.147:8443","185.250.181.176:8443","185.252.144.185:2053","185.252.144.185:8443","185.252.177.1:443","185.254.158.104:443","185.254.158.105:8443","185.254.158.69:8443","185.254.158.77:443","185.26.48.167:443","185.58.204.218:443","185.58.207.112:443","185.58.207.126:443","185.72.145.61:2087","185.74.44.188:443","185.9.26.11:443","185.94.167.193:443","185.94.167.223:443","185.94.167.63:443","186.246.35.225:443"],"GB":["104.128.190.209:443","104.194.140.26:443","104.194.140.95:443","104.194.143.130:443","104.194.144.105:443","104.194.144.212:443","104.194.144.48:443","104.194.149.229:443","104.248.160.220:443","104.248.161.136:443","104.248.164.212:443","104.248.167.119:443","104.248.170.104:443","104.248.172.66:443","104.248.173.190:443","109.107.190.110:2053","109.107.190.110:443","109.120.132.115:443","109.120.133.148:443","109.120.134.11:443","109.120.134.130:443","109.120.134.87:443","109.120.135.49:443","109.120.135.55:443","109.120.138.102:443","109.120.138.129:443","109.120.139.169:2053","109.120.151.180:2053","109.120.155.164:443","109.120.155.244:8443","109.120.156.105:443","109.120.156.132:443","109.120.157.232:443","109.120.176.204:8443","109.120.184.94:8443","109.120.185.201:443","109.120.185.231:443","109.120.185.29:443","109.120.186.137:2053","109.120.187.173:8443","109.169.76.23:443","109.172.94.111:8443","109.176.229.45:2083","109.73.70.139:2053","109.73.70.139:8443","111.88.152.158:443","129.151.70.70:443","130.162.164.201:2053","130.185.144.78:443","130.185.249.139:443","132.145.29.208:443","132.145.46.142:443","134.122.102.10:443","134.122.102.234:443","134.122.110.17:443","134.122.111.219:2053","134.122.111.219:2083","134.122.111.219:2087","134.122.111.219:2096","134.122.111.219:443","134.122.111.219:8443","134.209.16.44:443","134.209.16.4:443","134.209.17.159:443","134.209.176.127:2053","134.209.176.127:2083","134.209.176.127:2087","134.209.176.127:2096","134.209.176.127:443","134.209.176.127:8443","134.209.179.157:443","134.209.181.79:443","134.209.183.179:2053","134.209.183.179:2083","134.209.183.179:2087","134.209.183.179:2096","134.209.183.179:443","134.209.183.179:8443","134.209.183.227:443","134.209.184.129:443","134.209.184.156:443","134.209.185.10:2083","134.209.185.10:2087","134.209.185.10:2096","134.209.185.10:443","134.209.185.10:8443","134.209.185.80:443","134.209.186.12:443","134.209.186.163:2053","134.209.186.163:2083","134.209.186.163:2087","134.209.186.163:2096","134.209.186.163:443","134.209.186.163:8443","134.209.188.15:443","134.209.188.236:443","134.209.19.88:2053","134.209.19.88:2083","134.209.19.88:2087","134.209.19.88:2096","134.209.19.88:443","134.209.19.88:8443","134.209.24.145:443","134.209.27.159:443","134.209.27.216:2053","134.209.27.216:2083","134.209.27.216:2087","134.209.27.216:2096","134.209.27.216:443","134.209.27.216:8443","134.209.27.74:443","134.209.28.89:2053","134.209.28.89:2083","134.209.28.89:2087","134.209.28.89:2096","134.209.28.89:443","134.209.28.89:8443","134.209.30.166:443","136.244.79.235:2053","136.244.79.235:2083","138.124.101.248:443","138.124.102.89:443","138.124.103.252:443","138.124.110.110:2053","138.124.110.110:443","138.124.110.110:8443","138.124.117.179:443","138.124.117.179:8443","138.124.118.76:8443","138.124.119.229:8443","138.124.124.133:8443","138.124.124.157:443","138.124.124.97:443","138.124.127.144:443","138.124.127.1:443","138.124.18.134:443","138.124.24.60:2053","138.124.25.104:443","138.124.25.159:443","138.124.25.250:443","138.124.25.46:2053","138.124.25.51:443","138.124.26.41:8443","138.124.34.103:443","138.124.34.25:8443","138.124.34.38:443","138.124.35.154:2053","138.124.35.154:443","138.124.49.157:443","138.124.49.180:443","138.124.49.50:8443","138.124.55.177:443","138.124.78.178:443","138.124.78.178:8443","138.124.93.139:443","138.124.93.184:443","138.124.99.166:443","138.124.99.67:443","138.249.138.5:443","138.68.130.235:2053","138.68.130.235:2083","138.68.130.235:2087","138.68.130.235:2096","138.68.130.235:443","138.68.130.235:8443","138.68.131.141:2053","138.68.131.141:2083","138.68.131.141:2087","138.68.131.141:2096","138.68.131.141:443","138.68.131.141:8443","138.68.131.253:2053","138.68.131.253:2083","138.68.131.253:2087","138.68.131.253:2096","138.68.131.253:443","138.68.131.253:8443","138.68.131.25:2053","138.68.131.25:2083","138.68.131.25:2087","138.68.131.25:2096","138.68.131.25:443","138.68.131.25:8443","138.68.133.141:443","138.68.138.226:443","138.68.139.232:443","138.68.140.118:443","138.68.141.202:8443","138.68.141.216:443","138.68.142.165:2083","138.68.142.165:2087","138.68.142.165:2096","138.68.142.165:443","138.68.142.165:8443","138.68.146.39:443","138.68.147.146:443","138.68.147.255:443","138.68.150.145:443","138.68.152.227:2053","138.68.152.227:2083","138.68.152.227:2087","138.68.152.227:2096","138.68.152.227:443","138.68.152.227:8443","138.68.154.57:443","138.68.157.59:443","138.68.158.110:443","138.68.158.50:443","138.68.160.78:443","138.68.161.226:443","138.68.162.133:443","138.68.166.125:443","138.68.171.126:443","138.68.178.185:2053","138.68.178.185:2083","138.68.178.185:2087","138.68.178.185:2096","138.68.178.185:443","138.68.178.185:8443","138.68.179.125:2053","138.68.179.125:2083","138.68.179.125:2087","138.68.179.125:2096","138.68.179.125:443","138.68.179.125:8443","138.68.184.166:443","138.68.184.48:443","138.68.188.142:443","139.162.210.228:443","139.59.177.252:443","139.59.178.6:443","139.59.180.89:443","139.59.183.33:2053","139.59.183.33:2083","139.59.183.33:2087","139.59.183.33:2096","139.59.183.33:443","139.59.183.33:8443","139.59.184.201:443","139.59.186.121:443","139.59.186.54:443","139.59.187.72:443","139.59.188.85:443","139.59.189.127:443","139.59.190.23:2053","139.59.190.23:2083","139.59.190.23:2087","139.59.190.23:2096","139.59.190.23:443","139.59.190.23:8443","140.235.74.26:443","142.93.34.208:443","142.93.34.72:2053","142.93.34.72:2083","142.93.34.72:2087","142.93.34.72:2096","142.93.34.72:443","142.93.34.72:8443","142.93.42.57:443","142.93.45.254:443","142.93.47.157:443","143.110.160.185:443","143.110.161.220:2053","143.110.161.220:2083","143.110.161.220:2087","143.110.161.220:2096","143.110.161.220:443","143.110.161.220:8443","143.110.163.137:2053","143.110.163.137:2083","143.110.163.137:2087","143.110.163.137:2096","143.110.163.137:443","143.110.163.137:8443","143.110.164.56:443","143.110.167.132:443","143.110.167.65:443","143.110.170.188:443","143.110.171.182:443","143.110.173.56:443","143.110.175.165:443","143.20.165.178:443","143.20.165.187:443","144.126.193.181:2053","144.126.193.181:2083","144.126.193.181:2087","144.126.193.181:2096","144.126.193.181:443","144.126.193.181:8443","144.126.193.72:443","144.126.199.79:2053","144.126.199.79:2083","144.126.199.79:2087","144.126.199.79:2096","144.126.199.79:443","144.126.199.79:8443","144.126.199.82:443","144.126.201.81:2053","144.126.201.81:2083","144.126.201.81:2087","144.126.201.81:2096","144.126.201.81:443","144.126.201.81:8443","144.126.224.101:443","144.126.224.204:443","144.126.226.250:443","144.126.226.76:2053","144.126.226.76:2083","144.126.226.76:2087","144.126.226.76:2096","144.126.226.76:443","144.126.226.76:8443","144.126.227.116:443","144.126.227.160:443","144.126.230.21:2053","144.126.230.21:2083","144.126.230.21:2087","144.126.230.21:2096","144.126.230.21:443","144.126.230.21:8443","144.126.237.116:443","144.126.239.205:2053","144.126.239.205:2083","144.126.239.205:2087","144.126.239.205:2096","144.126.239.205:443","144.126.239.205:8443","144.31.213.127:443","144.31.213.4:443","144.31.58.51:8443","144.31.94.49:443","145.241.230.227:2053","146.70.30.19:443","146.70.30.22:443","146.70.30.23:443","146.70.30.31:443","146.70.30.39:443","146.70.30.53:443","147.45.41.85:8443","147.45.71.56:443","147.45.72.191:8443","147.45.72.251:443","147.45.73.177:443","147.45.73.180:8443","147.45.74.11:443","147.45.76.226:8443","147.45.76.230:443","147.45.76.29:443","147.45.76.61:443","147.45.77.176:443","147.45.77.27:443","147.45.77.57:443","147.45.77.64:443","147.45.79.77:8443","149.102.157.131:443","157.245.33.149:443","157.245.34.157:2053","157.245.34.157:2083","157.245.34.157:2087","157.245.34.157:2096","157.245.34.157:443","157.245.34.157:8443","157.245.34.181:443","157.245.34.199:443","157.245.38.182:443","157.245.44.217:443","157.245.46.237:2053","157.245.46.237:2083","157.245.46.237:2087","157.245.46.237:2096","157.245.46.237:443","157.245.46.237:8443","158.220.88.180:2053","158.220.88.180:8443","159.65.16.164:443","159.65.16.241:443","159.65.17.200:443","159.65.19.63:443","159.65.21.201:443","159.65.23.226:443","159.65.24.159:443","159.65.26.21:443","159.65.30.83:443","159.65.30.90:443","159.65.31.213:443","159.65.31.38:443","159.65.51.105:2053","159.65.51.105:2083","159.65.51.105:2087","159.65.51.105:2096","159.65.51.105:443","159.65.51.105:8443","159.65.51.189:2053","159.65.51.189:2083","159.65.51.189:2087","159.65.51.189:2096","159.65.51.189:443","159.65.51.189:8443","159.65.57.61:443","159.65.58.183:443"],"JP":["101.142.129.72:443","101.33.55.147:443","102.134.49.108:8443","103.106.228.126:2053","103.115.18.54:443","103.150.8.155:443","103.150.8.222:443","103.194.42.152:443","103.201.130.126:443","103.201.130.31:443","103.201.131.197:443","103.201.131.215:443","103.238.129.20:443","103.245.235.254:443","103.27.186.119:443","103.27.186.141:443","103.27.186.147:443","103.27.186.195:443","103.27.186.207:443","103.27.186.39:443","103.27.187.111:443","103.27.187.127:443","103.27.187.162:8443","103.27.187.197:443","103.27.187.254:443","103.27.187.73:443","103.47.186.135:443","103.47.186.31:443","103.47.186.3:2053","103.47.186.75:443","103.53.80.239:443","103.53.80.24:443","103.53.80.44:443","103.53.80.84:443","103.53.81.197:443","103.75.118.144:2053","103.76.85.210:443","103.85.24.232:443","103.85.25.182:2083","103.85.25.226:8443","103.85.25.231:443","103.85.27.115:443","103.85.27.26:443","104.105.128.153:443","104.105.138.244:443","104.105.138.250:443","104.156.238.23:443","104.156.239.15:443","104.238.149.235:443","104.238.149.30:443","104.238.150.161:443","104.238.161.103:443","107.148.118.151:443","107.174.141.61:8443","107.191.53.84:443","108.160.128.188:443","108.160.131.197:443","108.160.132.132:443","108.160.136.71:443","108.61.160.16:443","108.61.163.117:443","108.61.183.45:443","109.107.140.133:443","109.107.140.86:443","109.107.140.90:443","116.62.138.224:443","118.25.185.127:8443","126.78.133.130:443","129.225.147.112:443","129.225.175.227:443","13.112.165.78:443","13.113.187.222:443","13.114.101.22:443","13.114.50.138:8443","13.115.139.162:443","13.158.39.80:443","13.158.71.221:443","13.158.86.30:443","13.193.106.143:443","13.193.212.73:443","13.193.215.10:443","13.231.172.130:443","13.231.221.179:443","131.143.214.247:8443","131.143.215.40:443","131.186.32.99:8443","131.186.35.161:8443","131.186.41.103:443","131.186.45.53:443","131.186.58.223:8443","132.145.116.32:8443","132.145.118.177:8443","132.226.10.72:2083","132.226.14.144:8443","132.226.5.163:443","132.226.8.35:8443","132.243.30.210:443","133.18.105.95:443","134.122.164.41:443","134.122.164.55:443","136.0.11.107:443","137.220.225.56:443","138.2.10.165:443","138.2.11.127:8443","138.2.11.185:8443","138.2.21.171:8443","138.2.21.53:443","138.2.25.230:443","138.2.31.37:443","138.2.41.8:443","138.2.44.32:443","138.2.49.113:2053","138.2.5.136:443","138.2.52.152:443","138.2.52.92:443","138.2.59.112:443","138.3.209.71:2053","138.3.212.160:8443","138.3.214.112:8443","138.3.217.198:8443","139.162.120.169:443","139.162.70.21:443","139.162.72.62:443","139.162.75.44:443","139.162.79.178:443","139.162.81.219:8443","139.162.96.110:443","139.180.193.51:443","139.180.194.242:443","139.180.196.14:443","139.180.202.209:443","14.137.230.82:8443","14.137.235.113:443","14.137.235.40:443","140.235.37.203:443","140.238.45.222:8443","140.238.58.181:2053","140.245.82.2:8443","140.245.86.141:8443","140.245.92.121:8443","140.83.37.230:8443","140.83.37.243:8443","140.83.37.2:443","140.83.50.165:443","140.83.55.25:443","140.83.87.85:443","141.11.138.102:443","141.11.138.167:443","141.11.138.202:8443","141.11.138.218:443","141.11.138.72:2053","141.11.138.72:8443","141.11.139.128:443","141.11.139.207:443","141.11.139.215:443","141.147.152.9:443","141.147.160.110:8443","141.147.162.33:443","141.147.168.3:443","141.147.170.192:8443","141.147.174.243:443","141.147.176.154:443","141.147.181.67:8443","141.147.182.70:443","141.147.183.179:8443","141.147.185.63:443","141.98.197.42:443","142.91.106.99:2053","142.91.106.99:2083","142.91.106.99:8443","142.91.108.54:443","142.91.109.150:2053","142.91.109.150:443","142.91.109.17:2053","142.91.109.17:2083","142.91.109.17:8443","142.91.109.197:443","142.91.109.199:443","142.91.109.211:443","144.48.4.159:443","147.78.246.3:8443","147.79.20.129:443","147.79.20.144:443","147.79.20.177:443","147.79.20.197:443","148.135.183.33:443","149.28.18.65:8443","149.28.19.44:443","149.28.21.106:443","149.28.21.186:8443","149.28.25.203:8443","149.28.26.137:443","149.28.26.9:443","15.168.27.230:443","150.230.105.26:8443","150.230.2.165:443","150.230.204.234:8443","150.230.206.130:443","150.230.210.236:8443","150.230.212.247:443","150.230.221.238:8443","150.251.158.169:443","150.251.158.69:443","150.31.3.137:8443","151.145.67.90:8443","151.145.74.6:8443","151.145.78.30:443","151.241.129.194:443","151.241.129.79:443","151.242.164.101:443","151.242.164.227:443","151.242.165.86:2087","152.175.38.45:443","152.69.199.75:443","152.69.200.164:443","152.69.200.216:443","152.70.104.197:8443","152.70.108.9:443","152.70.109.128:8443","152.70.86.199:443","153.121.45.101:443","153.121.51.228:443","154.19.187.141:443","154.19.187.190:443","154.31.114.162:8443","154.36.155.70:443","154.83.91.181:443","154.83.91.222:443","154.83.92.252:443","154.83.92.252:8443","154.83.93.208:8443","154.83.93.23:443","154.83.93.247:443","154.83.94.200:8443","154.83.95.129:443","154.83.95.25:443","154.83.95.6:443","155.117.155.115:443","155.248.162.213:8443","155.248.166.225:8443","155.248.168.66:8443","155.248.169.104:8443","155.248.172.43:8443","155.248.181.189:443","156.231.112.80:443","156.231.113.115:443","156.231.113.69:443","156.231.116.179:443","156.231.117.95:443","156.231.117.99:443","156.243.244.138:443","156.243.244.18:443","156.246.89.93:443","156.246.90.21:443","156.246.95.196:443","158.101.132.216:8443","158.101.135.234:8443","158.101.143.19:443","158.101.145.187:2053","158.101.65.33:8443","158.101.89.74:8443","158.179.176.111:8443","158.179.179.140:8443","158.179.183.25:8443","158.179.184.164:8443","158.179.184.243:8443","158.51.109.130:443","158.51.109.51:443","158.51.110.12:443","158.51.110.159:443","16.76.81.233:443","160.16.103.102:443","160.16.109.149:443","160.16.120.16:443","160.16.123.110:443","160.16.209.61:443","160.16.62.225:443","160.191.40.63:2053","160.191.40.63:2083","160.191.40.63:2087","160.191.40.63:8443","161.248.254.27:443","161.33.131.94:443","161.33.135.140:443","161.33.135.154:443","161.33.138.142:443","161.33.14.183:8443","161.33.141.218:8443","161.33.148.146:443","161.33.15.101:443","161.33.172.160:443","161.33.181.105:443","161.33.205.231:443","161.33.29.213:443","161.33.29.51:443","161.33.4.103:443","162.141.117.191:443","162.141.131.145:443","163.44.124.82:443","164.70.117.150:8443","165.154.241.192:443","166.88.100.231:443","166.88.14.28:8443","166.88.2.14:443","166.88.95.142:443","166.88.95.180:443","166.88.98.137:443","166.88.98.13:443","166.88.98.219:443","166.88.98.239:443","166.88.98.48:443","166.88.98.69:443","166.88.98.83:443","166.88.98.94:443","166.88.99.20:443","167.148.6.161:2083","167.148.6.161:2087","167.179.103.224:443","167.179.106.168:443","167.179.110.68:8443","167.179.111.237:443","167.179.113.206:443","167.179.114.75:2053","167.179.115.135:443","167.179.117.9:443","167.179.119.229:443","167.179.75.237:443","167.179.77.74:443","167.179.84.175:443","167.179.90.137:443","167.179.90.164:443","167.179.94.160:443","167.179.95.9:443","167.179.99.0:443","168.110.28.153:8443","168.138.218.160:8443","168.138.52.221:443","168.93.214.185:443","170.205.39.165:8443","172.104.120.92:443","172.104.77.231:443","172.104.80.248:443","172.104.81.253:443","172.104.86.229:443","172.105.209.25:443","172.105.225.6:443","172.233.64.181:8443","172.233.90.222:443","172.233.91.71:443","172.233.93.201:443","172.233.93.39:443","172.234.89.153:443","172.235.198.90:443","172.235.216.213:443","172.237.0.160:443","172.237.1.32:443","172.237.12.70:443","172.237.13.152:443","172.237.27.202:443","172.237.5.208:2053","172.237.5.239:443","172.237.5.76:443","172.237.6.18:443","172.237.6.212:443","172.237.7.122:443","172.237.7.216:443","172.238.18.137:443","172.238.19.239:443","172.238.19.67:443","175.41.232.194:443","176.97.73.228:443","177.3.89.135:443","177.3.89.135:8443","177.3.89.196:443","178.214.214.203:443","178.214.214.53:443","178.214.214.56:443","178.239.117.127:443","178.239.117.205:8443","178.239.117.24:443","178.239.117.27:443","178.239.117.56:443","18.166.216.113:443","18.179.10.27:8443","18.180.127.240:8443","18.180.86.39:443","18.181.170.52:443","18.182.141.80:443","18.182.63.120:443","180.149.230.33:443","180.196.128.122:443","185.141.219.232:443","185.195.66.47:2053","185.195.66.47:2087","185.195.66.47:443","185.200.64.15:443","185.200.64.25:2053","185.200.65.32:443","185.200.66.206:443","188.253.118.241:443"],"FR":["104.105.202.167:443","104.238.191.179:443","104.252.111.38:8443","104.252.30.225:2053","104.252.30.225:8443","104.253.79.6:443","107.161.160.34:443","107.161.160.91:443","107.191.46.91:443","107.191.47.95:443","109.120.134.91:2053","109.120.134.91:443","109.120.134.98:8443","109.120.178.177:2053","109.120.178.218:8443","109.120.179.13:443","109.120.179.35:2053","109.120.179.99:443","109.172.55.133:443","109.172.55.148:443","109.199.107.175:8443","109.199.122.5:443","109.199.126.6:443","109.199.127.101:443","109.61.110.151:443","129.151.245.96:443","13.140.128.171:443","13.140.139.31:8443","13.140.143.53:443","13.140.156.31:8443","13.140.170.145:443","13.140.170.145:8443","13.140.178.234:443","13.37.29.92:443","13.38.2.92:443","130.49.179.159:8443","132.243.204.84:443","134.209.19.200:443","135.125.57.244:443","136.244.119.61:443","138.124.58.123:8443","138.124.58.31:8443","138.124.70.97:443","138.124.78.38:443","138.124.92.107:2053","138.124.92.114:2053","138.124.92.131:443","141.94.79.80:443","141.98.84.98:8443","144.24.207.108:443","144.91.116.209:443","144.91.116.209:8443","144.91.124.149:443","144.91.67.143:8443","144.91.77.167:443","144.91.81.243:443","144.91.85.183:8443","144.91.90.91:8443","145.223.69.87:443","145.239.78.20:8443","145.241.163.196:443","146.19.168.188:443","146.19.168.188:8443","147.45.42.73:2053","147.45.42.73:8443","147.45.68.177:2053","147.90.14.132:443","147.90.26.10:443","147.90.26.11:443","147.90.26.12:443","147.90.26.13:443","147.90.26.14:443","147.90.26.15:443","147.90.26.16:443","147.90.26.17:443","147.90.26.18:443","147.90.26.19:443","147.90.26.20:443","147.90.26.21:443","147.90.26.22:443","147.90.26.23:443","147.90.26.25:443","147.90.26.26:443","147.90.26.27:443","147.90.26.28:443","147.90.26.29:443","147.90.26.30:443","147.90.26.31:443","147.90.26.32:443","147.90.26.33:443","147.90.26.34:443","147.90.26.35:443","147.90.26.36:443","147.90.26.37:443","147.90.26.38:443","147.90.26.39:443","147.90.26.3:443","147.90.26.40:443","147.90.26.41:443","147.90.26.42:443","147.90.26.43:443","147.90.26.44:443","147.90.26.45:443","147.90.26.47:443","147.90.26.48:443","147.90.26.49:443","147.90.26.4:443","147.90.26.50:443","147.90.26.51:443","147.90.26.52:443","147.90.26.53:443","147.90.26.54:443","147.90.26.55:443","147.90.26.57:443","147.90.26.58:443","147.90.26.59:443","147.90.26.60:443","147.90.26.61:443","147.90.26.62:443","147.90.26.63:443","147.90.26.64:443","147.90.26.65:443","147.90.26.66:443","147.90.26.67:443","147.90.26.68:443","147.90.26.69:443","147.90.26.6:443","147.90.26.70:443","147.90.26.71:443","147.90.26.72:443","147.90.26.73:443","147.90.26.74:443","147.90.26.75:443","147.90.26.76:443","147.90.26.77:443","147.90.26.78:443","147.90.26.79:443","147.90.26.7:443","147.90.26.80:443","147.90.26.81:443","147.90.26.82:443","147.90.26.83:443","147.90.26.84:443","147.90.26.85:443","147.90.26.86:443","147.90.26.87:443","147.90.26.88:443","147.90.26.89:443","147.90.26.8:443","147.90.26.90:443","147.90.26.91:443","147.90.26.92:443","147.90.26.93:443","147.90.26.94:443","147.90.26.9:443","149.202.25.143:443","149.33.1.252:443","151.242.159.68:443","151.242.159.82:443","151.242.159.84:443","151.242.159.86:443","151.243.217.243:8443","151.247.196.24:8443","151.247.197.206:443","152.228.191.232:443","152.228.232.186:2053","152.228.232.186:443","152.89.253.87:8443","153.80.179.83:443","155.117.6.12:443","155.117.6.133:443","157.173.107.245:443","157.173.117.184:443","157.173.121.92:443","157.173.124.38:443","157.173.125.214:2087","157.173.125.214:8443","157.173.97.132:443","158.178.215.52:443","158.220.106.239:8443","158.220.123.76:443","161.97.143.99:8443","161.97.169.200:2053","161.97.169.200:443","161.97.179.61:443","161.97.183.222:443","161.97.183.222:8443","161.97.66.16:443","161.97.90.78:8443","161.97.99.175:2053","161.97.99.175:443","164.132.101.80:443","164.132.240.103:443","164.132.45.112:8443","166.0.132.137:443","167.104.216.173:8443","167.104.216.211:2083","167.86.70.68:8443","167.86.87.233:443","167.86.97.39:443","169.128.116.73:8443","169.128.116.98:443","169.58.141.244:2053","169.58.141.244:2083","169.58.141.244:8443","169.58.143.71:8443","169.58.145.130:443","169.58.154.188:443","169.58.154.188:8443","169.58.17.109:443","169.58.216.193:8443","169.58.27.199:8443","169.58.70.72:443","169.58.73.116:8443","169.58.8.139:8443","169.58.90.147:8443","169.58.91.180:443","172.233.249.145:443","172.234.185.220:443","172.239.19.98:8443","172.239.28.107:2053","172.99.189.217:443","173.212.207.89:2053","173.212.207.89:8443","173.212.215.195:443","173.212.217.87:443","173.212.235.186:2053","173.212.235.186:8443","173.249.15.173:443","173.249.25.78:443","173.249.31.130:8443","173.249.57.210:2096","178.238.237.6:443","179.255.188.48:443","179.255.188.76:443","179.255.188.78:443","179.255.188.80:443","179.255.188.88:443","179.255.188.89:443","179.255.188.90:443","179.255.188.91:443","179.255.188.92:443","179.255.188.93:443","179.255.188.94:443","179.255.188.95:443","179.255.188.96:443","179.255.188.97:443","185.10.18.238:443","185.10.18.88:443","185.10.19.205:443","185.13.37.173:443","185.137.122.2:443","185.157.245.136:2053","185.157.245.44:443","185.171.202.243:443","185.182.185.224:443","185.182.185.224:8443","185.182.186.175:8443","185.205.246.169:443","185.225.233.150:8443","185.234.100.241:443","185.234.100.40:443","185.234.100.41:443","185.248.33.239:443","185.250.37.47:443","185.252.233.195:443","185.253.116.152:443","185.253.117.147:443","185.253.117.26:443","185.253.118.139:443","185.253.118.213:443","188.130.207.119:2053","188.130.207.119:8443","188.130.207.163:443","188.130.207.30:2053","188.130.207.30:8443","188.130.207.72:8443","188.92.28.145:443","188.92.28.24:443","193.233.133.168:443","193.42.60.235:443","193.42.60.24:443","193.42.61.121:8443","193.42.62.122:2053","193.42.62.215:2053","193.42.62.215:8443","193.42.62.86:443","194.113.235.229:443","194.113.235.58:2053","194.147.58.242:443","194.163.154.147:443","194.163.184.205:443","194.163.186.153:443","194.226.169.25:443","194.59.221.122:443","194.59.245.245:8443","194.60.87.28:2096","194.61.28.39:2053","194.76.146.25:443","194.76.147.168:443","194.76.154.223:8443","194.76.155.83:443","194.76.155.83:8443","194.76.155.84:443","194.76.155.84:8443","194.76.155.85:443","194.76.155.85:8443","195.154.112.135:443","195.95.144.81:8443","2.56.215.195:8443","2.7.113.69:443","20.33.23.66:443","207.180.209.128:443","207.180.218.132:443","207.180.232.150:8443","207.180.241.216:443","207.180.252.131:443","212.47.65.101:8443","213.108.2.225:8443","213.136.65.69:8443","213.136.74.96:8443","213.165.48.10:443","213.32.66.197:2053","213.32.66.197:2083","213.32.66.197:8443","217.179.6.219:8443","217.60.252.106:443","217.60.252.115:443","217.60.252.116:8443","217.60.252.139:2053","217.60.252.139:8443","217.60.252.18:2053","217.60.252.18:8443","217.60.252.191:2053","217.60.252.191:8443","217.60.252.25:443","217.60.36.42:2053","217.60.36.42:8443","217.60.37.137:443","217.60.37.28:2053","217.60.37.28:8443","217.60.37.34:443","217.60.37.35:2053","217.60.37.35:8443","217.60.37.77:2053","217.60.37.77:8443","217.60.39.127:443","217.60.39.139:2053","217.60.39.139:8443","217.60.39.188:443","217.60.39.195:2053","217.60.39.195:8443","217.60.39.196:2053","217.60.39.196:8443","217.60.39.240:2053","217.60.39.240:8443","217.60.39.39:2053","217.60.39.39:8443","217.60.5.223:2053","217.60.5.223:8443","217.60.5.249:443","217.60.5.81:2053","217.60.5.81:8443","217.60.63.14:2053","217.60.63.14:8443","217.60.63.160:2053","217.60.63.160:8443","217.60.63.206:2053","217.60.63.206:8443","217.60.63.207:443","217.60.63.211:2053","217.60.63.211:8443","217.60.63.232:2053","217.60.63.232:8443","217.60.63.233:2053","217.60.63.44:2053","217.60.63.44:8443","217.69.7.236:8443","217.69.8.236:443","31.220.79.185:443","31.220.79.185:8443","31.24.251.152:2053","31.24.251.152:8443","31.56.146.139:443","31.56.146.185:2053","31.56.146.185:8443","31.56.146.206:2053","31.56.146.6:443","31.56.146.89:8443","31.56.176.239:443","31.56.176.37:2053","31.56.176.37:8443","31.56.176.44:443","31.56.228.151:443","31.56.228.210:2053","31.56.228.210:8443","31.56.228.216:8443","31.56.228.225:443","31.56.228.250:2053","31.56.228.250:8443"],"SG":["101.32.169.108:443","103.106.229.173:2053","103.170.217.60:443","103.195.188.192:443","103.195.188.206:443","103.195.188.229:443","103.195.191.118:443","103.195.191.121:443","103.195.191.165:443","103.195.191.240:443","103.195.191.70:443","103.25.202.102:443","103.25.202.25:443","103.253.145.105:443","103.3.61.43:443","103.72.62.113:443","104.192.92.190:443","104.248.152.221:443","104.248.158.149:443","104.248.158.76:443","104.64.192.116:443","109.123.232.71:8443","109.176.19.174:443","109.176.19.244:443","116.251.216.12:8443","116.251.216.23:8443","122.248.238.214:443","124.156.202.172:443","124.243.136.65:8443","128.199.119.5:443","128.199.128.117:443","128.199.255.242:443","128.199.82.20:443","129.212.225.217:443","129.212.227.64:443","129.212.228.160:443","129.212.229.240:443","129.212.229.72:443","129.212.230.32:443","129.212.232.171:443","129.212.232.220:8443","129.212.233.225:443","129.212.236.172:443","129.212.236.5:443","129.212.237.187:443","129.212.239.183:443","129.212.239.59:443","129.226.202.149:443","13.212.102.10:443","13.212.126.228:443","13.212.185.30:443","13.212.207.124:443","13.213.218.87:443","13.213.65.117:443","13.228.167.160:443","13.250.131.37:443","13.250.27.210:443","13.250.39.15:443","132.243.238.192:8443","134.185.85.155:443","134.185.88.235:8443","134.185.91.72:443","134.185.93.131:8443","134.209.101.154:443","134.209.102.229:443","134.209.103.4:443","134.209.104.130:443","134.209.106.237:443","134.209.108.21:443","134.209.96.76:443","134.209.98.39:443","136.85.58.238:443","138.2.108.213:443","138.2.64.229:443","138.2.66.236:443","138.2.87.237:443","138.2.95.33:443","139.162.17.105:443","139.162.20.206:443","139.162.33.165:443","139.162.37.6:443","139.162.40.240:443","139.162.41.109:443","139.162.44.222:443","139.162.60.149:443","139.162.61.198:443","139.177.185.196:443","139.180.132.106:443","139.180.135.10:443","139.180.137.157:443","139.180.143.248:8443","139.180.152.37:443","139.180.154.75:443","139.180.158.70:443","139.180.159.58:443","139.180.212.225:8443","139.180.216.198:443","139.180.220.7:443","139.180.220.87:443","139.180.223.202:443","139.59.101.96:443","139.59.102.170:443","139.59.114.19:443","139.59.115.36:443","139.59.115.38:443","139.59.115.7:443","139.59.123.238:443","139.59.124.100:443","139.59.127.117:443","139.59.192.91:443","139.59.225.43:443","139.59.231.131:443","139.59.250.212:443","139.59.250.249:443","139.59.97.194:443","139.99.91.38:8443","140.235.9.57:2087","140.235.9.57:443","140.235.9.57:8443","140.245.103.72:443","140.245.104.189:443","140.245.107.0:8443","140.245.114.190:443","140.245.127.48:443","140.245.38.33:2096","140.245.97.215:443","141.11.43.124:443","141.11.43.55:443","141.98.199.148:443","141.98.199.168:443","142.91.103.90:443","143.198.203.199:443","143.198.209.123:443","143.198.211.180:443","143.198.213.40:443","143.198.213.81:443","143.198.219.131:443","143.198.80.220:443","143.198.87.50:8443","143.198.88.27:443","143.198.90.188:443","143.42.66.91:443","146.190.100.44:443","146.190.102.51:443","146.190.104.194:443","146.190.87.188:443","146.190.93.62:443","146.190.97.53:443","149.118.48.187:443","149.118.55.215:2053","149.118.55.215:2096","149.118.55.215:8443","149.28.129.123:443","149.28.135.30:443","149.28.140.125:443","149.28.150.141:443","149.28.150.210:443","149.28.153.207:443","149.28.154.5:443","149.28.159.222:443","149.28.159.87:443","149.33.30.122:443","15.235.164.127:443","15.235.212.159:8443","150.109.11.223:443","152.175.67.191:443","152.42.161.156:443","152.42.163.208:443","152.42.169.132:443","152.42.173.234:443","152.42.174.66:443","152.42.174.94:443","152.42.175.157:443","152.42.187.204:443","152.42.187.83:443","152.42.194.191:443","152.42.196.47:443","152.42.198.190:443","152.42.198.52:8443","152.42.199.134:443","152.42.212.65:443","152.42.217.192:443","152.42.229.215:443","152.42.231.213:443","152.42.232.186:443","152.42.232.41:443","152.42.232.4:443","152.42.235.119:443","152.42.243.45:443","152.42.246.148:443","152.42.246.230:443","152.42.246.237:443","152.42.247.235:443","152.42.254.219:443","152.69.213.60:2053","154.26.128.147:443","156.244.57.227:443","157.228.130.145:8443","157.228.130.240:443","157.228.130.244:443","157.230.193.169:443","157.230.243.63:443","157.230.244.86:443","157.230.248.19:443","157.230.248.87:443","157.230.254.79:443","157.230.255.59:443","157.230.32.24:443","157.230.38.88:443","157.230.39.201:2053","157.230.39.201:8443","157.230.44.100:443","157.230.44.151:443","157.245.144.174:443","157.245.148.160:443","157.245.151.130:443","157.245.151.248:443","157.245.155.10:443","157.245.159.88:443","157.245.198.117:443","157.245.203.240:443","157.245.207.10:443","157.245.50.181:443","157.245.54.118:8443","157.245.56.32:443","157.245.60.179:443","158.178.224.158:8443","158.178.230.113:8443","158.178.241.110:8443","159.223.33.4:443","159.223.36.150:443","159.223.38.160:8443","159.223.78.76:443","159.223.79.119:443","159.223.84.236:443","159.223.88.166:443","159.65.0.116:443","159.65.1.74:443","159.65.10.227:443","159.65.141.109:443","159.65.142.9:8443","159.65.143.223:443","159.65.15.18:443","159.65.8.14:443","159.89.199.63:443","159.89.200.153:443","159.89.203.141:443","160.187.141.134:443","160.187.141.61:443","160.191.77.194:443","160.191.77.52:443","161.117.181.127:443","161.118.195.117:8443","161.118.196.58:443","161.118.198.6:8443","161.118.200.170:443","161.118.210.121:443","161.118.227.139:8443","161.118.235.148:443","161.118.244.3:443","162.128.72.114:443","162.4.173.130:443","162.4.173.148:443","162.4.173.156:443","162.4.173.177:443","162.4.173.241:443","164.52.2.98:443","164.52.2.99:443","165.22.102.89:443","165.22.104.36:443","165.22.106.241:443","165.22.106.244:443","165.22.253.232:443","165.22.57.237:8443","165.22.59.195:443","165.22.59.251:443","165.22.99.110:443","165.22.99.214:443","165.232.161.8:443","165.232.165.200:443","165.232.173.161:443","165.232.175.180:443","165.245.176.192:443","165.245.178.114:443","165.245.181.71:443","165.245.181.72:443","165.245.181.74:443","165.245.181.78:443","165.245.181.83:443","165.245.182.116:443","165.245.184.76:443","165.245.184.86:2083","165.245.190.53:443","166.108.238.41:8443","167.150.100.46:443","167.172.65.175:443","167.172.67.51:443","167.172.68.31:443","167.172.75.2:443","167.172.86.195:443","167.172.90.175:443","167.253.159.197:443","167.71.194.170:443","167.71.198.82:8443","167.71.199.136:443","167.71.203.125:443","167.71.213.95:443","167.71.217.55:443","167.71.219.37:443","167.71.220.89:443","167.71.222.177:443","167.99.69.85:443","167.99.71.38:443","167.99.77.156:443","168.107.90.208:443","168.138.165.174:443","168.138.176.180:443","168.144.100.103:443","168.144.102.226:443","168.144.103.195:443","168.144.109.68:443","168.144.128.35:443","168.144.128.4:443","168.144.129.207:8443","168.144.240.183:443","168.144.33.100:443","168.144.36.249:443","168.144.39.64:443","168.144.41.69:443","168.144.44.150:443","168.144.44.84:443","168.144.45.134:8443","168.144.46.234:443","168.144.47.94:443","168.144.96.147:443","168.144.97.250:443","168.144.97.78:443","172.104.170.72:443","172.104.171.151:443","172.104.186.18:8443","172.104.49.9:443","172.104.59.103:443","172.104.59.187:443","172.104.59.228:8443","172.104.60.181:8443","172.105.121.230:443","172.236.130.176:443","172.236.130.18:443","172.236.132.46:443","172.236.140.241:443","172.236.151.116:443","172.237.79.99:443","172.237.81.164:443","172.237.81.42:443","172.237.91.206:443","172.93.186.166:443","174.138.17.183:443","174.138.20.108:443","174.138.24.13:443","174.138.27.228:443","178.128.100.218:443","178.128.114.149:443","178.128.117.127:443","178.128.118.19:443","178.128.125.147:443","178.128.19.168:443","178.128.20.158:443","178.128.209.190:443","178.128.211.191:443","178.128.220.178:443","178.128.223.148:443","178.128.56.59:443","178.128.58.101:443","178.128.60.89:443","178.128.82.93:443","178.128.86.3:443","178.128.90.108:443","178.128.92.205:2087","178.128.92.205:8443","178.128.95.74:443","178.128.97.53:443","178.128.99.226:443","178.93.160.236:443","18.138.34.221:443","18.139.143.168:443","18.139.30.198:443","18.140.28.73:443","18.141.208.166:443","18.141.237.52:443","18.143.165.1:443","185.115.207.102:443","185.115.207.141:443","185.115.207.149:443","185.115.207.190:443","185.115.207.82:443","185.115.207.94:443","185.194.54.104:443","185.225.20.99:8443","185.229.222.122:443","185.229.222.122:8443"],"LV":["104.252.127.144:443","104.252.127.31:443","104.252.127.38:2053","104.252.127.38:8443","104.252.127.58:443","104.252.127.63:2053","104.252.127.97:8443","104.252.19.110:443","104.252.19.29:2053","104.253.18.195:443","104.253.18.221:443","104.253.25.143:2053","104.253.25.144:443","104.253.43.214:8443","109.248.161.188:443","109.248.163.151:443","13.140.16.131:443","13.140.16.160:443","13.140.16.35:443","13.140.16.60:8443","13.140.17.122:443","13.140.17.214:443","135.106.183.231:443","151.242.43.34:443","151.242.43.44:2053","151.242.43.44:8443","151.242.43.65:2053","151.242.43.65:8443","168.222.255.164:443","168.222.255.166:8443","169.40.1.41:443","169.40.1.72:443","169.40.2.78:443","169.40.6.31:443","176.126.162.12:2053","176.126.162.156:2053","176.126.162.160:443","185.135.86.217:8443","185.135.86.34:443","185.135.86.41:443","185.22.172.249:443","185.22.173.141:443","185.22.173.157:443","185.22.173.162:443","185.22.173.35:8443","185.22.175.116:443","185.22.175.166:443","185.22.175.53:8443","185.22.175.9:443","185.237.218.147:8443","185.237.218.22:443","185.237.219.224:2087","185.237.219.224:8443","185.237.219.85:8443","185.242.106.205:443","185.242.106.251:443","185.242.107.169:443","185.82.126.184:2053","185.82.126.185:2053","185.82.126.206:2053","185.82.126.216:2053","185.82.126.217:2053","185.82.126.247:2053","185.82.126.37:443","185.82.126.64:2053","185.82.126.9:2053","185.82.127.6:2053","185.92.183.102:443","185.92.183.190:443","185.92.183.193:2053","185.92.183.193:8443","185.92.183.217:443","185.92.183.36:443","185.92.183.41:2053","185.92.183.41:8443","188.130.154.155:443","188.130.154.220:443","188.130.154.229:8443","188.130.206.184:2053","188.130.206.208:2053","188.130.206.208:8443","188.130.206.254:2053","188.130.206.254:8443","188.130.206.87:443","188.130.206.93:2053","188.130.206.93:443","188.190.27.6:8443","188.214.39.175:443","188.215.31.134:2053","188.215.31.134:8443","188.215.31.18:443","188.215.31.36:2053","188.215.31.36:8443","188.220.205.125:443","188.220.205.59:443","188.220.205.64:2053","188.220.205.64:8443","188.253.16.168:443","188.253.16.16:443","188.253.16.38:443","188.253.17.14:443","188.253.17.202:443","188.253.18.103:8443","188.253.18.55:2083","188.253.18.55:443","188.253.18.92:443","188.253.19.202:2053","188.253.19.227:443","188.253.20.190:443","188.253.21.146:8443","188.253.22.211:443","188.253.22.28:443","188.253.22.32:443","188.253.23.155:443","188.253.23.41:443","188.64.142.58:8443","192.144.39.33:443","193.124.22.112:443","193.124.22.133:443","193.124.22.210:443","193.124.22.212:443","193.124.22.24:443","193.164.155.115:443","193.164.155.179:2053","193.164.155.179:8443","193.164.155.212:443","193.164.155.212:8443","193.164.155.223:443","193.164.155.38:443","193.164.155.46:8443","193.164.155.76:443","193.68.89.220:443","193.68.89.220:8443","193.68.89.45:443","193.68.89.45:8443","194.1.134.124:443","194.58.34.139:443","194.58.34.59:443","194.87.89.41:443","195.123.209.135:443","195.123.209.144:2083","195.123.209.217:2053","195.123.209.217:8443","195.123.209.7:2053","195.123.209.7:8443","195.123.210.109:443","195.123.210.147:443","195.123.211.161:443","195.123.211.244:443","195.123.212.222:2053","195.123.212.222:8443","195.123.212.80:443","195.135.252.148:2053","195.135.252.148:8443","195.135.252.224:443","195.135.253.121:443","195.135.253.164:443","195.135.253.236:2053","195.135.253.236:443","195.135.253.236:8443","195.135.254.135:443","195.135.254.15:443","195.135.254.168:443","195.135.254.173:8443","195.135.254.235:443","195.135.254.59:443","195.135.254.59:8443","195.135.255.116:8443","195.135.255.129:2053","195.135.255.229:443","195.20.208.18:443","195.20.208.235:8443","195.20.208.4:443","2.26.88.78:443","203.18.98.14:8443","203.18.98.163:8443","212.6.44.68:443","213.232.204.134:443","213.232.204.148:443","213.232.204.154:2087","213.232.204.154:443","213.232.204.28:2053","213.232.204.28:8443","216.173.68.132:2083","216.173.68.133:2087","216.173.68.165:443","216.173.68.33:443","216.173.69.202:443","216.173.69.248:8443","216.173.70.105:443","216.173.70.149:2053","216.173.70.15:443","216.173.70.60:8443","216.173.71.163:443","216.173.71.171:443","216.173.71.187:443","216.173.71.221:8443","217.145.79.119:2053","217.145.79.119:8443","217.145.79.186:2053","217.145.79.186:443","217.177.34.98:443","217.19.4.161:2053","217.19.4.161:8443","217.19.4.177:2053","217.19.4.177:8443","217.19.4.61:443","217.28.49.84:8443","217.60.0.168:8443","217.60.0.194:443","217.60.1.206:443","217.60.2.212:443","217.60.3.126:443","217.60.3.126:8443","217.60.3.136:443","217.60.3.163:2053","217.60.3.198:443","217.60.4.170:443","217.60.6.103:443","217.60.6.168:443","217.60.60.151:443","217.60.60.34:2053","217.60.60.34:8443","217.60.60.38:443","217.60.60.49:443","217.60.60.5:2053","217.60.60.5:8443","217.60.60.83:443","217.60.61.199:443","217.60.61.25:443","217.60.61.61:443","217.60.62.185:2053","31.42.120.97:8443","31.56.113.117:443","31.56.113.127:443","31.56.113.17:443","31.56.113.202:443","31.56.113.20:443","31.56.113.67:8443","31.56.113.6:443","31.56.117.141:2053","31.56.117.15:443","31.56.117.193:443","31.56.117.64:443","31.56.177.6:8443","31.56.177.75:443","31.56.179.218:443","31.56.196.172:443","31.56.196.181:443","31.56.196.34:8443","31.56.196.3:8443","31.56.197.181:2053","31.56.197.181:8443","31.56.197.250:2053","31.56.197.250:8443","31.56.197.63:443","31.56.204.117:443","31.56.204.131:443","31.56.204.248:443","31.56.204.252:8443","31.56.205.124:443","31.56.205.135:8443","31.56.205.233:2053","31.56.205.233:8443","31.56.205.254:443","31.56.205.40:2053","31.56.205.40:8443","31.56.205.87:443","31.56.206.126:443","31.56.206.215:443","31.56.206.92:2053","31.56.206.92:8443","31.56.227.187:443","31.56.227.253:443","31.56.227.49:8443","31.56.27.128:443","31.56.27.129:443","31.56.27.138:443","31.56.27.96:443","31.57.105.128:8443","31.57.105.139:443","31.57.105.140:443","31.57.105.157:2053","31.57.105.157:8443","31.57.105.164:443","31.57.105.27:443","31.57.105.33:2053","31.57.105.33:8443","31.57.105.51:443","31.57.105.53:443","31.57.106.126:443","31.57.106.189:2053","31.57.106.252:443","31.57.106.35:443","31.57.106.46:443","31.57.107.14:443","31.57.107.178:443","31.57.107.41:2053","31.57.107.41:8443","31.57.107.4:443","31.57.107.56:8443","31.57.157.140:443","31.57.26.184:443","31.57.26.194:2053","31.57.26.194:8443","31.57.26.223:2053","31.57.26.223:8443","31.57.26.227:2053","31.57.26.227:8443","31.57.26.96:443","31.57.27.38:443","31.57.27.42:8443","31.57.28.140:8443","31.57.28.199:2053","31.57.28.199:8443","31.57.28.22:443","31.57.29.13:443","31.57.29.8:443","31.57.61.182:2053","31.57.62.105:443","31.57.62.110:2053","31.57.62.110:8443","31.57.62.124:443","31.57.62.173:2053","31.57.62.173:8443","31.57.62.175:2053","31.57.62.175:8443","31.57.62.75:443","31.57.62.89:443","31.57.92.105:443","31.57.92.211:2053","31.57.92.211:8443","31.57.92.251:2053","31.57.92.251:8443","31.57.93.11:2053","31.57.93.81:2053","31.57.93.81:8443","31.58.137.126:2053","31.58.137.126:8443","31.58.137.132:2053","31.58.137.132:8443","31.58.137.143:2053","31.58.137.143:8443","31.58.137.14:443","31.58.137.8:2053","31.58.137.8:8443","31.58.137.94:443","31.58.77.150:443","31.58.77.174:443","31.58.77.194:2053","31.58.77.194:8443","31.58.77.225:443","31.58.77.252:443","31.58.78.46:8443","31.59.102.212:2083","31.59.102.96:2053","31.59.102.96:8443","31.59.104.146:2087","31.59.104.162:443","31.59.106.71:443","31.59.168.155:8443","31.59.41.129:2053","31.59.41.140:2053","31.59.41.140:8443","31.59.41.159:443","31.59.41.182:2053","31.59.41.182:8443","31.59.41.214:443","31.59.41.76:2053","31.59.41.76:8443","31.59.45.136:8443","31.76.62.188:443","37.128.204.127:443","37.128.204.20:443","37.128.205.129:443","37.128.205.31:8443","37.128.205.43:443","37.128.206.173:443","37.128.207.210:443","37.128.207.210:8443","45.132.17.159:2053","45.158.169.159:2053","45.158.169.159:8443","45.158.169.176:2053","45.158.169.176:8443","45.38.139.136:8443","45.38.139.214:2053","45.38.139.214:8443","45.38.139.23:443","45.38.139.23:8443","45.38.139.244:443","45.38.143.54:2053","45.38.143.54:8443","45.38.143.62:2053","45.38.143.62:8443","45.38.143.97:8443","45.38.198.129:2083","45.38.198.129:2087","45.38.198.150:443","45.38.41.177:443"],"RU":["103.74.93.72:8443","103.88.243.11:443","104.128.136.206:8443","104.128.136.52:443","104.128.141.202:443","109.107.189.54:443","109.107.189.6:443","109.172.100.226:2053","109.172.84.229:2087","109.205.56.213:443","109.248.168.38:443","109.61.108.158:8443","109.71.197.27:443","109.71.197.28:443","109.71.242.243:8443","109.73.197.19:443","109.73.203.18:443","130.49.153.240:2053","130.49.153.240:443","130.49.186.203:443","130.49.213.116:443","132.243.18.24:8443","132.243.19.144:443","138.124.14.10:2087","138.16.177.13:443","138.16.178.43:443","139.100.219.120:2053","139.100.219.120:8443","139.100.226.187:8443","139.100.227.28:443","141.8.196.120:443","141.98.190.45:443","144.31.222.137:2053","144.31.222.137:2083","144.31.222.137:443","144.31.61.139:8443","147.45.103.56:8443","147.45.113.224:8443","147.45.147.212:2053","147.45.147.212:8443","147.45.151.179:443","147.45.185.8:443","147.45.212.207:443","147.45.213.57:443","147.45.245.15:443","152.89.218.135:443","153.80.246.79:443","155.212.128.22:8443","155.212.160.127:443","155.212.175.143:2053","155.212.175.87:2053","155.212.216.144:443","155.212.247.200:8443","155.212.247.226:8443","157.22.185.110:2053","157.22.185.45:2053","157.22.185.54:2053","157.22.185.57:2053","157.22.185.58:2053","157.22.185.60:2053","157.22.185.68:2053","157.22.190.184:2053","157.22.190.189:2053","157.22.190.203:2053","157.22.190.213:2053","157.22.190.220:2053","157.22.230.81:443","157.22.231.205:443","157.228.134.64:443","157.228.136.133:443","158.160.171.90:8443","158.160.206.62:443","158.160.237.189:8443","158.255.6.5:2053","158.255.6.5:8443","159.194.196.121:443","159.194.202.103:8443","159.194.204.159:8443","159.194.205.207:8443","159.194.212.131:8443","159.194.230.55:8443","159.194.230.89:8443","161.104.44.138:443","170.168.89.146:443","171.22.134.119:443","176.108.243.167:8443","176.113.81.56:443","176.118.214.216:443","176.12.67.240:443","176.32.33.75:8443","176.32.34.68:8443","176.32.35.223:443","176.32.37.118:443","178.154.222.149:443","178.20.41.204:443","178.20.41.204:8443","178.20.46.58:2053","178.20.46.58:8443","178.208.156.194:2053","178.208.156.194:8443","178.250.246.243:443","178.253.44.165:2096","178.253.55.190:443","178.253.55.191:2053","178.253.55.191:8443","178.253.55.45:443","178.255.127.200:443","185.103.100.114:443","185.103.100.52:8443","185.105.117.222:443","185.105.91.243:443","185.125.219.207:443","185.128.107.175:443","185.146.158.78:8443","185.147.27.144:443","185.147.27.21:443","185.154.192.95:443","185.170.10.170:8443","185.174.139.49:2053","185.174.139.49:8443","185.179.189.75:443","185.185.71.66:443","185.192.247.99:443","185.20.224.44:8443","185.20.225.208:8443","185.20.227.208:8443","185.209.85.248:443","185.212.148.65:443","185.217.199.148:443","185.218.0.67:443","185.22.154.173:2053","185.22.154.173:8443","185.221.199.75:443","185.228.235.6:443","185.233.185.99:8443","185.239.51.52:443","185.247.185.103:443","185.26.121.79:443","185.5.249.0:443","185.50.203.26:2053","185.72.146.162:443","185.72.147.237:443","185.84.162.74:443","186.246.5.254:2053","186.246.5.26:2053","188.120.239.45:2053","188.127.254.51:443","188.127.254.51:8443","188.225.34.155:443","188.225.45.209:2053","188.225.45.209:8443","188.225.47.173:443","188.225.9.158:8443","188.246.226.106:8443","188.93.211.164:8443","191.44.37.141:8443","192.144.37.23:443","192.144.56.137:2053","192.144.56.137:8443","192.144.57.214:443","193.124.130.225:443","193.124.65.248:8443","193.233.216.200:8443","193.233.216.219:8443","193.233.219.205:443","193.233.244.159:443","193.233.244.29:443","193.233.247.145:443","193.233.247.145:8443","193.233.247.191:443","193.233.247.191:8443","193.233.247.77:443","193.233.90.139:443","193.233.90.139:8443","193.233.90.14:2087","193.233.90.5:443","193.233.90.91:443","193.32.188.215:8443","193.37.71.95:443","193.42.115.43:2087","193.9.60.54:443","193.9.60.54:8443","194.113.106.174:8443","194.190.153.170:443","194.226.142.120:443","194.226.20.225:443","194.28.31.154:443","194.55.235.11:8443","194.55.235.205:443","194.55.235.8:443","194.55.244.117:8443","194.55.245.26:443","194.58.109.206:8443","194.87.140.126:443","194.87.218.134:443","194.87.94.186:443","195.133.145.236:443","195.133.146.112:443","195.133.5.93:8443","195.133.50.84:8443","195.170.193.40:8443","195.19.20.80:2053","195.19.20.80:443","195.19.20.80:8443","195.211.36.60:443","195.58.48.222:8443","195.58.48.252:8443","195.58.48.58:443","195.58.49.159:8443","195.58.54.223:2053","195.78.48.205:8443","195.80.238.101:443","2.26.10.137:443","2.26.104.109:443","2.26.104.119:443","2.26.104.131:8443","2.26.104.64:443","2.26.104.66:443","2.26.104.87:443","2.26.104.87:8443","2.26.119.158:443","2.26.119.255:443","2.26.89.250:443","2.27.54.132:443","2.27.54.132:8443","2.56.89.202:8443","2.59.161.182:8443","200.165.230.239:443","201.24.120.221:443","201.24.126.250:8443","201.24.51.69:443","201.24.54.245:8443","201.24.57.254:2053","201.34.136.160:443","201.34.136.83:443","201.34.138.145:8443","201.34.141.209:443","201.51.0.23:8443","212.109.220.55:443","212.109.220.55:8443","212.113.98.115:443","212.113.98.132:443","212.113.98.154:443","212.113.98.97:8443","212.116.115.69:443","212.192.14.28:443","212.193.26.83:443","212.22.82.144:443","212.60.5.118:2053","212.60.5.118:8443","212.67.10.224:8443","212.67.15.76:443","212.67.17.226:443","212.74.227.162:443","213.111.187.51:443","213.171.19.229:8443","213.171.29.38:443","213.226.124.66:443","213.247.229.165:443","217.114.12.143:443","217.114.43.99:443","217.114.5.41:443","217.114.7.17:8443","217.149.23.17:8443","217.18.60.228:443","217.198.13.18:8443","217.25.90.220:443","217.26.26.14:443","217.26.28.58:443","217.26.29.24:443","217.28.141.222:8443","217.60.186.23:443","217.60.186.23:8443","217.70.20.11:443","31.128.42.183:8443","31.129.48.139:8443","31.129.49.103:8443","31.130.144.235:443","31.130.144.235:8443","31.135.32.122:443","31.207.74.215:443","31.56.208.158:443","31.56.208.59:443","31.59.37.201:2083","31.76.230.241:443","31.77.143.234:443","31.77.232.73:443","31.77.232.73:8443","37.140.199.59:8443","37.18.102.113:443","37.193.126.81:2053","37.230.113.248:8443","37.232.238.29:8443","45.12.75.91:8443","45.129.2.201:443","45.129.3.125:8443","45.131.40.58:2087","45.132.255.173:443","45.133.234.81:443","45.139.184.183:2053","45.139.184.183:8443","45.139.25.72:443","45.140.169.106:8443","45.141.102.169:443","45.141.103.35:8443","45.142.211.239:2083","45.142.44.199:443","45.144.178.209:8443","45.144.64.36:443","45.146.165.68:8443","45.147.200.141:8443","45.151.102.159:8443","45.151.102.19:8443","45.151.102.216:443","45.152.198.197:2087","45.152.198.44:2053","45.152.198.97:2087","45.152.198.97:443","45.157.160.102:8443","45.74.3.80:443","45.8.249.237:443","45.9.13.99:443","45.90.218.109:443","45.90.218.11:443","45.90.218.180:443","45.91.52.102:443","45.95.203.111:443","45.95.203.214:2053","45.95.203.214:8443","46.149.66.235:443","46.149.70.52:8443","46.17.40.146:443","46.17.43.161:8443","46.17.45.216:443","46.19.64.207:443","46.29.115.144:443","46.29.115.144:8443","46.29.118.247:2053","46.29.118.247:443","46.29.118.247:8443","46.29.166.202:8443","46.39.255.99:8443","46.8.255.223:443","5.101.4.178:443","5.101.50.226:443","5.128.145.96:443","5.129.211.144:8443","5.129.222.94:443","5.129.241.70:8443","5.129.243.72:443","5.129.245.158:443","5.129.253.122:443","5.181.108.232:443","5.183.190.46:443","5.183.190.46:8443","5.188.26.53:443","5.188.26.85:443","5.188.26.9:443","5.188.30.178:443","5.188.89.62:443","5.189.239.36:2053","5.189.239.36:443","5.189.239.36:8443","5.23.52.184:443","5.23.53.228:2053","5.35.127.57:443","5.42.102.195:8443","5.42.111.68:8443","5.42.112.211:443","5.42.113.212:443","5.42.116.33:443","5.42.122.192:8443","5.42.123.117:8443","5.44.40.157:8443","5.44.40.31:443","5.8.52.100:443","62.109.1.5:2053","62.109.10.123:8443","62.113.99.22:8443","72.56.14.212:443","72.56.236.198:8443","72.56.236.46:443","72.56.237.107:443","72.56.250.192:443","72.56.252.7:8443","72.56.33.176:443","72.56.34.110:443","77.110.113.163:8443","77.221.151.125:8443","77.222.32.11:443","77.223.96.12:443","77.246.156.46:8443","77.73.68.124:443","77.73.70.240:8443","77.91.90.224:443","77.91.90.225:443","79.137.192.30:2053","79.137.192.30:443","79.143.30.23:443","80.249.146.46:2087"],"HK":["1.13.254.140:8443","101.32.41.107:443","101.96.234.244:443","103.101.0.73:443","103.115.64.205:443","103.118.252.100:443","103.118.252.211:443","103.118.254.37:443","103.118.40.94:443","103.118.40.94:8443","103.118.41.121:443","103.118.41.130:443","103.118.41.198:443","103.118.42.100:443","103.118.42.190:443","103.122.247.65:443","103.143.81.126:8443","103.143.81.178:443","103.143.81.222:2053","103.143.81.250:443","103.158.117.184:443","103.158.117.226:443","103.171.34.48:8443","103.192.179.132:443","103.193.172.196:443","103.193.173.115:443","103.213.4.57:443","103.213.4.77:443","103.214.174.192:443","103.214.174.194:443","103.219.192.72:443","103.219.193.95:443","103.219.194.43:443","103.224.80.7:2087","103.242.2.181:443","103.242.2.214:8443","103.244.90.20:8443","103.247.28.26:443","103.253.42.37:8443","103.39.78.112:8443","103.39.78.118:8443","103.39.78.14:8443","103.97.200.42:443","103.97.201.37:443","103.97.201.65:443","103.97.201.71:443","108.165.100.35:443","108.165.100.62:443","108.165.147.184:443","108.165.147.34:443","108.165.155.56:443","108.165.255.238:8443","108.165.255.243:443","108.165.255.81:443","116.48.104.171:443","116.48.104.171:8443","116.49.177.246:8443","119.45.41.162:8443","122.10.119.252:443","124.244.55.157:443","129.211.188.184:8443","138.124.111.115:443","138.252.80.70:443","139.177.185.88:443","139.28.169.72:443","141.11.148.138:443","141.11.149.78:443","141.11.149.89:2053","141.11.149.89:443","141.11.238.183:443","141.11.76.66:443","143.14.189.170:443","143.20.156.163:443","146.56.221.148:8443","149.104.24.132:443","149.104.24.156:443","149.104.24.57:8443","149.104.25.194:443","149.104.27.213:443","149.104.28.251:443","149.104.29.237:443","149.104.30.51:443","149.104.31.208:443","149.104.5.247:443","149.104.6.130:443","149.104.6.15:443","149.104.6.78:8443","149.104.6.99:443","150.109.71.243:443","151.158.0.104:443","151.158.0.138:443","151.242.11.238:443","151.242.125.102:443","151.242.125.197:443","151.242.125.29:443","151.243.229.150:443","151.245.90.160:443","151.245.90.60:8443","151.245.90.96:8443","152.175.7.30:443","154.16.10.45:443","154.16.183.190:443","154.21.203.206:443","154.219.104.114:443","154.3.35.193:2053","154.3.35.193:2083","154.83.87.115:443","154.83.87.174:443","155.117.224.127:443","155.117.224.193:443","155.117.224.63:443","155.117.82.92:443","156.224.76.187:443","156.224.77.87:443","156.224.79.105:443","156.224.79.247:443","156.224.79.83:443","156.226.168.206:443","156.226.169.122:443","156.226.172.129:443","156.239.13.217:8443","156.239.245.134:443","156.239.8.173:443","156.241.191.236:443","157.119.103.64:443","16.163.174.115:443","16.163.98.204:443","162.4.136.79:443","166.88.11.105:443","166.88.11.211:443","166.88.141.130:443","166.88.55.224:443","166.88.61.187:443","166.88.77.236:443","167.148.203.107:443","167.148.203.140:443","167.148.203.140:8443","167.148.203.173:443","167.148.203.3:443","167.148.203.71:443","175.29.23.179:443","175.29.23.34:443","175.29.23.87:443","176.98.181.167:443","178.83.206.103:443","178.83.206.250:443","178.83.207.31:443","18.166.157.154:443","185.132.125.163:443","185.155.235.235:443","185.155.235.39:443","185.155.235.58:443","185.155.235.58:8443","191.222.217.144:2083","191.222.219.124:2053","191.222.219.124:2083","191.222.219.124:2096","193.134.209.123:443","193.134.209.165:443","193.134.211.209:443","195.58.144.166:443","195.58.144.166:8443","195.58.144.220:2087","195.58.144.220:443","195.58.144.24:443","195.58.144.77:443","198.20.133.223:443","199.15.78.83:443","2.26.201.194:443","2.27.109.236:443","2.27.109.35:443","2.27.132.136:443","2.27.132.160:8443","2.27.173.136:443","20.2.9.133:443","20.205.121.200:443","202.155.155.41:443","202.61.72.129:443","202.61.72.8:443","203.25.119.9:8443","203.9.150.220:443","205.189.160.50:443","206.237.12.76:8443","206.237.16.91:443","206.237.19.237:443","206.237.31.197:443","206.237.8.62:8443","207.57.122.127:443","207.57.123.190:443","207.57.123.31:443","207.57.123.38:443","207.57.123.77:443","207.57.124.100:2087","207.57.124.101:443","207.57.124.108:2083","207.57.124.108:443","207.57.128.105:443","207.57.131.117:443","207.57.131.171:443","207.57.131.172:443","207.57.132.107:443","207.57.134.29:443","207.57.135.199:8443","207.57.135.204:8443","208.66.229.158:443","208.75.133.153:443","209.33.160.61:443","209.33.161.104:443","209.33.161.187:443","209.33.166.199:443","209.33.166.49:443","216.23.93.131:443","216.23.93.27:443","216.23.94.147:443","216.23.94.49:443","216.235.248.141:443","216.235.248.57:443","216.236.43.166:443","219.76.13.166:443","219.76.13.167:443","219.76.13.169:443","219.76.13.177:443","219.76.13.181:443","222.167.138.95:8443","23.133.52.10:2053","23.141.12.134:8443","23.147.172.135:443","23.156.153.40:443","23.175.201.2:8443","23.26.201.11:443","23.26.201.79:443","23.27.96.145:443","34.92.9.131:8443","38.147.171.110:443","38.147.171.13:443","38.147.172.176:443","38.147.172.53:443","38.147.173.136:443","38.147.190.29:443","38.147.190.29:8443","38.190.210.250:443","38.207.133.195:8443","38.207.133.222:8443","38.207.133.48:443","38.207.174.111:443","38.207.176.130:443","38.207.176.48:443","38.207.177.113:443","38.207.177.125:8443","38.207.177.204:443","38.207.178.173:2087","38.207.179.77:443","38.207.184.202:443","38.207.185.28:443","38.207.185.35:443","38.55.106.154:443","38.55.107.91:443","38.55.192.202:443","38.55.195.57:443","38.55.195.57:8443","38.55.199.128:443","38.6.219.125:443","38.6.219.125:8443","39.109.110.17:443","39.109.50.124:443","39.109.50.127:443","39.109.50.142:443","39.109.50.208:443","42.200.173.201:443","42.200.176.168:443","42.200.231.108:443","43.132.231.159:443","43.132.234.175:443","43.154.51.232:8443","43.159.1.170:443","43.161.254.71:443","43.168.16.112:443","43.175.131.30:443","43.230.9.121:443","43.247.132.74:2053","43.247.132.74:2083","43.247.132.74:2087","43.247.132.74:2096","43.247.132.74:443","43.247.132.74:8443","43.247.134.129:443","43.247.135.181:443","43.254.164.50:8443","43.254.216.175:8443","45.136.12.21:443","45.136.14.61:2053","45.144.136.136:443","45.144.137.68:443","45.145.228.222:443","45.145.229.223:443","45.152.64.16:443","45.152.67.18:443","45.153.130.61:2053","45.153.130.61:8443","45.192.204.72:443","45.192.247.155:2053","45.192.247.199:443","45.202.248.172:443","45.202.248.41:8443","45.207.156.131:443","45.207.156.146:443","45.207.156.204:443","45.207.156.69:443","45.207.156.69:8443","45.207.157.136:443","45.221.113.57:443","45.221.113.58:8443","45.221.113.70:443","45.221.115.170:443","45.221.115.3:443","45.38.42.216:443","45.39.190.24:2053","45.39.190.24:8443","45.39.199.233:443","45.39.199.233:8443","45.8.186.20:443","47.239.4.246:2053","47.239.4.246:443","47.239.4.246:8443","47.76.171.37:8443","47.79.78.40:443","64.120.121.89:2053","68.64.178.184:443","68.64.178.42:443","68.64.178.52:443","68.64.179.129:443","68.64.182.121:443","68.64.182.177:443","68.64.182.205:443","68.64.182.74:443","68.64.182.79:443","68.64.183.37:443","8.210.29.68:443","8.218.22.14:443","82.22.31.122:443","82.27.11.11:443","82.27.11.155:443","82.27.11.24:443","82.27.116.117:443","82.27.116.181:8443","82.27.116.182:443","82.27.116.182:8443","82.27.116.56:8443","82.47.34.237:8443","83.147.60.79:443","83.229.123.121:443","83.229.123.85:443","85.121.244.201:443","85.121.245.104:443","85.121.245.177:443","85.121.245.35:443","85.121.51.14:2083","85.121.51.14:2087","85.121.51.14:2096","85.121.51.201:443","85.121.51.219:443","91.103.123.202:8443","91.103.123.226:8443","91.110.174.173:8443","91.110.174.198:8443","91.110.174.201:8443","91.110.174.202:8443","91.110.174.205:8443","91.110.174.222:8443","91.110.231.249:8443","91.149.237.61:443","91.213.174.177:443","91.213.174.82:443","91.213.186.189:443","91.213.186.64:443","91.213.189.132:443","91.213.189.4:2087","95.182.95.178:443","95.182.95.41:443","95.182.95.75:443","95.40.77.144:443","96.126.179.194:443","96.126.179.43:443","96.126.179.43:8443","96.126.179.91:443","96.9.228.207:443","96.9.228.216:443","96.9.228.241:443","103.190.232.236:443","154.84.154.37:443","156.224.76.205:443","156.226.168.252:443","156.226.169.60:443","185.206.171.53:443","185.216.118.161:443","185.92.47.93:443","191.223.217.68:8443","2.27.109.12:443","2.27.109.62:443","216.176.237.166:443"],"PL":["103.31.77.108:2053","103.68.110.188:443","104.245.245.16:8443","13.143.139.207:8443","13.143.139.31:8443","13.143.139.84:443","13.143.139.84:8443","13.143.143.21:8443","13.143.143.223:443","132.243.212.81:8443","138.124.104.104:443","138.124.20.162:8443","138.124.242.56:443","139.28.97.231:443","144.31.1.122:8443","144.31.1.178:8443","144.31.101.42:443","144.31.102.121:443","144.31.102.149:8443","144.31.102.181:443","144.31.102.222:443","144.31.102.235:443","144.31.112.139:2083","144.31.112.151:443","144.31.112.194:443","144.31.113.162:443","144.31.171.82:443","144.31.2.121:443","144.31.248.164:8443","144.31.248.39:2053","144.31.248.39:8443","144.31.248.94:2087","144.31.29.26:443","144.31.29.27:443","144.31.29.27:8443","144.31.29.97:443","145.239.85.117:2053","145.239.85.117:8443","145.239.88.255:2053","145.239.88.255:8443","145.239.90.29:443","145.239.91.9:443","145.63.134.175:443","146.59.19.208:2053","146.59.19.208:8443","146.59.34.209:2053","148.253.212.172:443","148.253.212.215:8443","148.253.212.218:443","148.253.212.42:443","149.50.105.18:443","150.251.112.236:443","150.251.112.236:8443","150.251.113.76:8443","151.115.61.151:2053","151.243.196.148:8443","151.243.196.73:443","151.243.232.6:443","151.245.112.193:8443","151.245.112.24:443","151.245.112.31:443","176.105.255.38:443","176.105.255.43:443","176.105.255.59:443","176.124.33.223:443","178.17.59.103:2053","178.236.243.162:443","178.236.243.40:443","178.236.253.119:8443","185.126.64.13:443","185.126.64.143:443","185.126.64.240:2053","185.126.64.240:443","185.126.64.4:2053","185.126.64.4:2083","185.126.64.7:8443","185.151.246.220:443","185.224.132.21:443","185.224.132.33:443","185.224.132.92:443","185.226.181.184:2053","185.253.44.25:443","185.253.44.34:443","185.253.44.97:443","185.253.7.22:443","185.40.86.159:443","188.116.40.37:443","188.137.178.174:8443","188.255.163.12:443","188.255.163.90:2053","188.255.163.90:8443","191.101.184.50:443","191.44.113.139:8443","191.44.81.76:443","191.44.81.91:443","192.145.28.239:443","193.108.170.80:443","193.124.41.236:443","193.200.17.236:443","193.42.36.84:443","194.59.186.97:443","194.88.150.221:443","194.88.151.163:443","194.88.151.93:443","195.137.244.43:2053","195.137.244.43:2083","195.137.244.43:2087","195.137.244.47:2053","195.137.244.47:2083","195.137.244.47:2087","195.3.221.219:8443","195.3.223.111:8443","195.58.137.118:443","195.72.189.4:8443","2.26.224.210:443","2.26.225.19:8443","2.26.225.64:443","2.26.5.200:443","2.27.244.113:443","2.27.244.118:8443","2.27.244.160:2083","2.27.244.160:8443","2.27.244.161:2083","2.27.244.161:8443","2.27.244.162:2083","2.27.244.162:8443","2.27.244.163:2083","2.27.244.163:8443","2.27.244.164:2083","2.27.244.164:8443","2.27.244.83:443","2.27.57.123:443","2.27.57.123:8443","2.27.57.22:8443","2.27.57.85:443","2.27.57.87:8443","2.58.95.153:8443","2.58.95.52:443","2.58.95.90:443","2.59.163.11:8443","2.59.163.33:443","201.10.90.2:8443","204.77.3.103:8443","212.119.43.76:443","212.119.43.79:2053","212.162.155.222:2053","212.192.11.96:8443","213.134.31.23:443","217.182.79.55:443","217.182.79.55:8443","217.30.10.55:2053","217.30.10.55:2087","217.30.10.55:443","217.30.10.55:8443","217.60.33.218:443","222.167.248.37:443","23.27.24.101:443","31.133.0.122:2053","31.133.0.124:2053","31.133.0.133:2053","31.133.0.55:2053","31.133.0.55:8443","31.133.1.8:2053","31.169.126.145:443","31.169.126.35:443","31.169.126.66:443","31.169.126.66:8443","31.56.188.106:443","31.59.143.122:443","31.76.22.109:443","31.76.22.15:443","31.76.22.28:443","31.76.22.28:8443","31.76.22.44:2053","31.76.22.45:2053","31.76.22.46:2053","31.76.22.81:443","31.76.22.81:8443","31.76.22.83:443","31.76.251.97:8443","31.76.94.169:8443","31.77.228.84:443","31.77.56.117:8443","31.77.56.26:443","31.77.56.26:8443","34.116.216.59:443","37.252.11.221:443","37.252.11.49:8443","37.252.6.119:443","45.140.204.37:8443","45.140.204.38:8443","45.142.212.24:443","45.144.48.185:2083","45.144.48.193:8443","45.144.48.51:443","45.144.49.163:443","45.144.50.4:443","45.144.51.139:8443","45.144.51.246:8443","45.144.51.254:2053","45.144.51.254:8443","45.144.51.40:2053","45.144.51.40:443","45.144.51.40:8443","45.148.119.127:443","45.148.119.222:2083","45.148.119.233:8443","45.148.119.35:443","45.148.119.97:8443","45.192.12.142:443","45.192.12.8:8443","45.194.66.88:443","45.43.137.179:443","45.66.11.133:8443","51.250.114.234:2083","51.250.114.234:2096","51.38.128.30:443","51.68.130.118:443","51.68.130.66:8443","51.68.141.223:443","51.68.142.243:8443","51.75.32.106:443","51.75.32.106:8443","51.77.58.226:443","51.83.128.182:8443","51.83.129.15:443","51.83.135.182:443","51.83.160.93:443","51.83.160.93:8443","51.83.167.100:443","51.83.186.193:443","51.83.199.98:443","54.37.139.89:8443","54.38.203.239:443","54.38.203.96:443","57.128.203.189:443","57.128.214.118:443","57.128.227.152:8443","57.128.246.84:2087","57.128.246.84:443","64.176.68.73:443","64.176.70.24:2053","64.176.73.123:443","64.176.73.77:443","70.34.242.81:443","70.34.243.123:443","70.34.243.176:2087","70.34.243.176:443","70.34.243.176:8443","70.34.243.2:443","70.34.247.220:443","70.34.250.153:443","70.34.251.88:443","70.34.252.186:443","77.83.246.110:8443","78.11.241.61:443","78.17.173.106:8443","78.17.36.133:2053","78.17.44.186:443","78.17.44.186:8443","78.17.8.231:2053","80.211.249.240:2053","80.211.249.240:8443","80.211.249.68:2053","80.211.249.68:8443","80.211.250.20:2053","80.211.250.20:8443","81.27.102.159:443","81.27.102.88:443","81.85.73.76:443","81.90.17.201:8443","81.90.17.212:443","81.91.177.34:8443","82.118.20.234:443","82.118.20.55:8443","82.118.20.91:443","82.118.21.71:443","82.118.21.88:443","82.118.23.112:443","82.118.23.154:8443","82.118.23.155:2053","82.118.23.18:2053","82.118.23.93:443","82.118.23.95:443","82.22.40.113:2053","82.22.40.129:2053","82.22.41.137:443","82.22.41.205:443","82.22.41.241:2053","82.26.91.140:443","82.38.65.237:8443","82.38.65.242:2087","82.40.37.125:443","82.40.37.125:8443","82.40.38.216:443","82.40.62.9:443","87.239.135.188:8443","89.125.27.97:2053","89.125.93.222:8443","89.46.235.14:8443","89.46.235.32:2053","89.46.235.32:8443","91.108.237.23:443","91.108.249.113:8443","91.149.253.249:443","91.149.253.26:443","91.193.18.144:443","91.193.18.155:443","91.196.161.188:443","91.196.161.66:8443","91.196.162.207:443","91.196.162.254:8443","91.196.163.129:443","91.196.163.239:443","91.196.163.31:443","91.224.75.127:2053","91.224.75.242:2053","91.224.75.242:443","91.224.75.49:2053","91.224.75.86:443","91.92.46.117:443","91.92.46.238:443","91.92.46.42:443","92.118.150.57:443","92.118.150.93:443","92.118.150.93:8443","92.118.205.177:443","92.62.251.175:443","93.95.97.23:443","94.103.0.67:443","94.142.255.4:443","94.183.157.236:443","94.183.157.241:443","94.183.209.60:8443","94.183.209.96:443","95.214.53.116:8443","95.85.227.129:443","95.85.227.192:8443","95.85.227.52:443","95.85.227.76:443","95.85.229.100:443","95.85.229.60:8443","95.85.246.250:443","95.85.254.170:443","95.85.255.148:443","95.85.255.215:2083","95.85.255.215:8443","95.85.255.220:2083","95.85.255.220:8443","95.85.255.253:443","138.124.20.123:443","144.31.102.16:443","144.31.113.130:443","2.27.57.100:443","213.134.31.144:8443","217.30.10.55:2083","31.76.251.97:443","45.194.66.96:443","45.198.0.236:443","82.22.172.40:2053","83.168.78.129:443","83.168.89.9:443","83.168.90.104:443","94.125.102.157:8443","95.85.227.117:8443","103.167.234.26:443","104.222.177.183:443","144.31.112.152:443","185.126.64.101:443","188.137.178.179:2053","193.106.196.231:443","193.106.196.250:443","194.88.150.23:443","217.30.10.55:2096","31.133.0.122:8443","82.118.23.149:443","91.196.162.237:443","91.196.163.130:443","91.196.163.185:443","95.85.227.117:2083"],"SE":["103.177.249.40:2083","103.177.249.40:443","109.120.132.6:443","109.120.133.26:8443","109.120.134.216:443","109.120.134.243:443","109.120.156.163:2053","109.120.156.163:8443","109.120.185.227:443","109.122.201.22:443","109.172.95.93:2053","109.172.95.93:8443","121.127.33.130:443","121.127.33.246:443","129.151.198.25:443","129.151.198.3:2053","129.151.198.3:8443","13.140.10.28:2087","13.140.8.149:443","13.140.8.254:443","13.140.9.211:443","13.62.127.104:443","13.63.216.71:443","13.63.243.189:443","130.49.178.104:8443","130.49.178.164:8443","130.49.190.27:443","138.124.102.248:443","138.124.118.113:443","138.124.127.235:443","138.124.59.252:443","138.124.71.139:443","138.124.86.149:8443","138.124.87.163:8443","138.124.96.173:443","138.124.99.90:8443","143.246.193.136:2053","143.246.193.25:2053","143.246.193.89:2053","143.246.194.49:2053","143.246.194.65:2053","143.246.194.65:8443","143.246.195.147:2053","143.246.195.152:2053","143.246.195.179:8443","147.45.75.24:443","147.45.75.26:443","148.253.211.49:443","148.253.211.51:443","153.92.126.18:443","16.170.253.163:443","16.171.11.113:8443","167.104.104.226:443","168.220.85.211:443","172.232.149.77:443","172.232.157.154:443","172.234.118.48:443","176.124.205.77:8443","176.124.206.42:2087","176.126.70.158:443","176.126.84.104:8443","176.97.77.91:443","178.236.251.194:2053","185.103.103.236:2053","185.117.88.115:443","185.130.46.202:443","185.130.46.91:443","185.186.78.15:443","185.193.126.248:443","185.21.11.91:443","185.58.115.45:443","188.126.76.51:8443","188.93.140.230:443","192.145.30.27:443","193.148.58.33:443","193.181.29.95:443","194.104.94.214:443","194.87.30.102:443","194.87.30.102:8443","195.72.60.249:8443","195.72.61.22:443","196.196.102.22:8443","196.196.102.2:8443","196.196.102.33:8443","196.196.5.26:443","196.196.5.28:443","2.26.124.15:443","2.27.14.94:443","202.181.177.116:443","202.181.177.8:8443","206.168.213.106:443","206.168.215.172:2053","206.168.215.172:443","212.147.224.250:443","212.147.244.158:2083","213.165.32.245:443","213.165.33.192:443","213.165.46.55:443","213.176.112.198:443","213.176.119.139:443","213.176.119.213:8443","213.21.229.240:443","213.21.229.240:8443","213.21.240.183:8443","213.21.254.15:8443","217.147.14.128:8443","217.147.14.244:8443","31.192.244.235:443","31.192.244.36:443","37.203.209.18:8443","37.203.209.26:443","37.203.209.42:443","37.203.209.50:443","37.252.9.236:443","41.216.182.98:443","45.141.177.62:443","45.145.13.114:443","45.145.14.168:8443","45.145.14.72:443","45.151.73.72:2053","45.248.37.164:2053","45.248.37.164:8443","45.80.229.147:443","45.80.229.147:8443","45.80.229.169:443","45.80.229.176:443","45.80.230.122:8443","45.80.230.215:443","45.80.230.2:443","45.80.231.41:443","45.80.231.71:443","45.80.231.90:443","45.82.80.96:443","46.226.160.232:443","46.226.160.92:8443","46.226.161.129:2053","46.226.161.12:2053","46.226.161.21:443","46.226.164.229:443","46.226.165.199:443","46.246.109.107:443","46.246.109.107:8443","46.246.97.51:8443","46.249.103.248:8443","46.249.103.50:443","5.175.236.14:443","5.178.109.14:443","51.20.201.220:443","51.20.202.203:443","51.21.18.89:443","62.182.192.194:443","62.182.192.195:443","62.182.192.214:2053","62.182.193.108:2087","62.182.193.10:8443","62.182.193.175:443","62.182.193.220:443","62.182.195.147:443","62.182.195.166:443","62.182.195.6:443","62.182.196.194:8443","62.182.196.230:8443","62.182.196.83:443","62.182.197.18:443","62.182.197.237:443","62.182.197.238:443","62.182.197.238:8443","62.182.198.178:443","62.182.198.47:8443","62.182.198.85:443","62.60.149.222:2053","62.60.149.222:8443","62.60.150.187:8443","62.60.151.191:443","62.60.151.202:443","62.60.151.236:443","62.60.152.13:443","62.60.152.13:8443","62.60.152.187:443","62.60.152.31:443","62.60.153.23:443","62.60.159.239:8443","62.60.230.51:443","62.60.250.190:443","64.112.127.41:8443","64.188.81.151:443","64.188.81.49:443","65.20.113.2:443","65.20.114.152:443","65.20.115.191:8443","70.34.194.199:443","70.34.200.203:2053","70.34.204.111:8443","70.34.210.205:443","70.34.212.154:8443","70.34.214.142:8443","70.34.214.205:443","70.34.220.180:2053","77.110.120.16:443","77.110.120.45:8443","77.110.121.151:443","77.110.96.220:443","77.110.96.249:8443","77.110.97.158:443","77.110.97.230:443","77.110.97.7:443","77.221.136.163:443","77.221.136.45:443","77.221.138.243:443","77.221.139.114:443","77.221.139.155:2053","77.221.139.167:443","77.221.139.39:443","77.221.140.151:443","77.221.141.1:443","77.221.141.26:8443","77.221.143.197:2096","77.221.143.197:8443","77.221.143.81:2053","77.232.143.130:2053","77.232.143.130:2083","77.232.143.130:8443","77.232.143.161:443","77.232.143.39:2053","77.232.143.39:8443","77.232.143.94:443","79.137.206.195:443","79.141.175.246:443","79.72.19.53:2083","80.66.78.190:443","80.66.78.207:443","81.27.106.235:443","83.147.216.129:8443","83.147.254.102:443","83.147.254.115:443","83.147.254.132:443","83.147.254.245:443","83.147.254.254:443","83.147.254.63:443","83.147.254.70:443","83.147.254.71:443","84.22.148.114:443","84.22.148.196:443","84.22.148.95:443","84.32.208.198:443","84.32.208.201:443","84.32.217.120:8443","84.32.217.6:8443","84.32.99.133:443","84.32.99.133:8443","84.32.99.175:8443","84.32.99.229:443","85.192.37.138:443","87.251.85.34:443","89.125.243.165:443","89.125.37.1:8443","89.125.76.229:443","89.127.201.202:443","89.169.34.174:443","89.22.224.236:8443","89.22.226.89:443","89.22.226.89:8443","89.22.227.108:8443","89.22.227.112:443","89.22.227.132:443","89.22.229.107:8443","89.22.229.170:2053","89.22.229.253:443","89.22.230.89:8443","89.22.232.138:8443","89.22.233.52:443","89.22.236.205:443","90.156.168.199:8443","91.184.240.196:443","91.184.247.38:443","91.186.217.49:443","91.186.217.94:443","91.186.218.54:443","91.186.219.82:443","91.196.161.21:443","93.115.23.9:443","94.228.168.161:2053","94.242.59.196:443","94.242.59.208:443","94.242.59.31:443","95.141.241.216:443","121.127.33.216:443","138.124.18.207:2087","16.171.218.156:443","193.188.22.47:8443","213.176.116.141:443","31.56.197.196:2096","45.142.140.132:443","45.142.140.55:443","45.142.142.200:443","45.145.13.146:443","77.221.138.243:8443","77.221.143.238:443","80.78.22.178:443","80.78.23.208:443","80.78.30.157:443","80.78.31.117:443","13.50.199.225:443","185.159.75.51:443","185.159.75.65:443","185.231.102.159:2053","31.220.15.39:2083","46.249.103.176:2083","46.249.103.176:443","5.175.236.36:443","5.175.236.48:443","5.175.236.4:443","5.175.236.53:443","5.175.236.54:443","5.175.236.58:443","5.175.236.6:2096","79.108.164.203:443","80.78.25.208:443","80.78.27.134:443"],"CH":["103.63.30.163:443","103.63.30.19:443","103.63.30.230:443","103.63.30.73:443","107.189.2.206:8443","107.189.30.77:443","107.189.7.124:2053","131.123.34.141:443","132.243.161.155:2053","132.243.174.185:443","132.243.241.12:8443","132.243.241.190:443","140.238.170.32:443","140.238.208.210:443","140.238.208.240:443","140.238.209.8:443","141.227.139.175:443","141.227.139.21:443","141.227.149.108:443","141.227.149.145:443","141.227.149.235:2053","141.227.151.68:2053","141.255.164.15:443","144.225.188.205:443","146.70.233.11:2083","146.70.233.11:443","146.70.233.25:443","146.70.233.51:2083","146.70.233.51:443","146.70.71.157:443","151.158.1.131:443","151.158.1.213:443","151.241.252.42:443","151.243.190.222:2053","151.243.190.222:8443","152.67.70.113:2053","152.67.85.239:443","167.17.181.19:443","167.17.181.45:443","167.17.181.72:443","167.17.183.183:2083","167.17.183.184:443","171.22.16.201:443","171.22.16.231:443","171.22.16.237:443","176.10.119.35:443","176.10.125.114:443","179.237.100.143:2053","179.237.100.143:8443","179.237.104.215:443","179.237.105.131:2053","179.237.105.131:2083","179.237.105.131:443","179.237.105.131:8443","179.237.108.163:443","179.237.108.163:8443","179.237.111.118:443","179.237.64.55:2053","179.237.67.171:8443","179.237.70.208:443","179.237.82.177:8443","179.237.83.141:8443","179.237.87.154:443","179.237.87.184:443","179.255.191.76:443","179.255.191.82:443","179.255.191.84:443","179.255.191.85:443","179.255.191.86:443","179.255.191.87:443","179.255.191.89:443","179.43.180.236:443","185.167.234.192:443","185.191.239.133:443","185.191.239.217:443","185.191.239.218:443","185.195.69.158:443","185.195.69.200:8443","185.195.69.209:2053","185.195.69.64:443","185.195.69.72:443","185.218.204.205:443","185.234.213.169:443","185.237.225.26:8443","185.237.225.47:443","185.237.225.95:443","186.246.53.150:443","188.244.117.27:443","193.228.128.110:443","194.154.29.114:443","194.154.29.139:8443","194.154.29.151:8443","194.154.29.164:443","194.154.29.200:8443","194.154.29.245:443","194.154.29.72:443","194.154.29.81:443","194.246.118.199:443","199.68.196.28:443","2.59.219.220:443","2.59.219.29:8443","2.59.219.90:443","213.176.18.108:443","213.176.18.232:443","31.7.56.138:443","37.143.131.141:8443","38.180.161.128:443","38.180.85.203:443","45.140.205.7:443","45.143.200.102:443","45.143.200.135:443","45.143.200.141:443","45.143.200.211:443","45.143.200.245:443","45.143.200.68:443","45.148.102.235:443","45.148.102.244:443","45.148.118.224:443","45.59.113.85:443","45.59.117.171:443","45.59.122.12:443","45.59.122.74:443","45.59.123.132:443","45.59.123.140:443","45.59.124.39:443","45.59.125.106:8443","45.59.125.193:443","45.59.125.242:8443","45.59.125.61:443","45.85.93.49:443","45.90.56.23:2053","45.90.57.139:8443","45.90.57.216:8443","45.90.57.242:443","45.90.58.17:2053","45.90.59.186:443","45.90.59.18:443","45.91.92.104:2087","45.95.232.113:2053","45.95.232.113:443","45.95.232.113:8443","45.95.232.18:2053","45.95.232.18:8443","5.175.236.36:443","5.175.236.48:443","5.175.236.4:443","5.175.236.53:443","5.175.236.54:443","5.175.236.58:443","5.175.236.6:2096","62.113.106.85:8443","79.132.141.125:443","79.132.141.152:443","80.68.159.43:443","82.21.4.172:443","82.38.64.162:443","83.172.136.214:443","83.228.193.162:443","83.228.193.162:8443","83.228.193.177:443","83.228.193.177:8443","83.228.193.188:443","83.228.193.188:8443","83.228.193.229:443","83.228.193.229:8443","83.228.198.53:443","83.228.198.53:8443","83.228.199.3:443","83.228.207.179:443","83.228.217.38:8443","83.228.219.7:443","83.228.221.170:443","83.228.222.61:443","83.228.226.11:8443","83.228.227.62:443","83.228.240.71:443","83.228.242.220:443","84.234.16.169:443","84.234.16.169:8443","84.234.17.132:443","84.234.17.132:8443","84.234.31.84:443","85.4.221.234:443","87.120.222.125:443","87.120.222.168:443","87.120.222.172:443","87.120.222.188:443","87.120.222.199:443","87.120.222.207:443","87.120.222.207:8443","87.120.222.26:443","89.125.95.85:443","89.127.196.117:443","89.127.196.14:443","89.127.196.31:443","89.127.196.42:443","89.127.196.71:443","91.192.102.155:8443","91.192.102.170:2053","91.192.102.170:8443","91.192.102.219:443","91.192.102.55:443","91.245.225.69:443","91.245.225.79:2053","91.245.225.79:8443","91.90.193.106:443","91.90.193.24:443","91.90.193.54:443","140.238.214.95:443","152.67.64.55:443","179.255.191.81:443","179.255.191.88:443","179.255.191.90:443","179.43.151.23:443","179.43.156.121:443","199.68.196.67:443","45.59.124.103:443","83.228.207.11:443","179.255.191.75:443","45.59.125.191:443","45.90.58.140:443"],"EE":["109.206.241.16:443","109.206.241.56:8443","114.129.9.132:8443","132.243.65.198:8443","144.31.170.4:443","150.241.101.102:8443","153.56.171.124:2053","153.56.171.124:8443","153.56.171.212:2053","153.56.171.216:443","153.56.171.216:8443","153.56.171.219:2053","153.56.171.97:2053","153.56.171.97:8443","159.253.20.80:8443","159.253.21.228:443","159.253.21.82:443","159.253.23.52:443","176.97.74.41:2053","176.97.74.41:8443","185.114.116.54:443","185.122.185.94:443","185.122.185.94:8443","185.123.53.176:443","185.123.53.53:443","185.155.222.7:443","185.174.135.12:443","185.174.135.56:8443","185.194.53.139:8443","185.194.53.95:443","185.215.187.143:443","185.223.168.172:2053","185.23.236.107:443","185.23.236.134:443","185.23.236.202:443","185.23.236.29:443","185.23.236.32:443","185.23.236.44:443","185.252.177.115:8443","185.36.140.119:443","185.36.140.228:2053","185.36.140.228:8443","185.36.140.244:443","185.36.140.47:8443","185.36.140.86:2083","185.36.141.193:443","185.36.141.23:443","185.36.141.81:443","185.36.142.21:8443","185.36.142.88:443","185.4.72.110:8443","185.4.72.18:2083","185.4.74.111:443","185.4.74.230:443","185.4.74.247:8443","188.190.18.31:443","188.255.236.80:443","188.255.236.80:8443","188.255.236.84:2087","188.255.236.84:8443","194.76.227.72:443","2.27.170.209:443","209.131.70.109:443","209.131.70.198:8443","209.131.70.229:443","209.131.70.51:443","209.131.70.96:8443","213.111.181.20:8443","217.60.182.149:443","217.9.12.65:443","31.56.187.21:443","31.56.187.26:443","38.180.10.173:443","38.180.10.51:443","38.180.10.97:443","38.180.164.234:443","38.180.216.120:443","38.180.230.178:443","38.180.248.167:8443","38.180.45.235:443","38.244.154.141:443","38.244.154.149:443","45.12.28.108:443","45.12.28.129:443","45.12.28.134:443","45.12.28.170:443","45.12.28.202:443","45.12.28.95:443","45.12.28.96:443","45.83.181.112:443","45.83.182.60:443","46.22.211.155:8443","46.36.216.195:443","46.36.216.57:443","46.36.216.81:8443","46.36.217.167:443","46.36.218.29:8443","46.36.219.229:8443","46.36.220.183:8443","46.36.221.203:443","5.101.114.105:443","5.101.114.177:443","5.101.114.44:2053","5.101.114.88:8443","5.101.115.117:8443","5.101.115.34:443","5.101.115.69:8443","5.101.116.108:443","5.101.116.62:8443","5.101.116.7:8443","5.101.116.91:8443","5.101.117.184:443","5.101.117.253:443","5.101.118.146:443","5.101.118.52:443","5.101.118.60:8443","5.101.122.59:443","5.101.126.33:8443","5.101.180.112:443","5.101.180.125:2053","5.101.180.125:8443","5.101.180.145:443","5.101.180.19:8443","5.101.181.135:8443","5.175.178.191:443","5.175.178.254:443","5.175.178.254:8443","5.181.202.134:443","5.181.202.75:443","5.188.16.113:443","5.188.21.38:443","5.188.21.38:8443","5.189.254.168:2053","5.189.254.168:443","5.189.254.168:8443","5.189.254.185:443","5.42.221.131:443","5.42.221.155:443","5.42.221.16:443","5.45.112.149:443","5.45.112.211:443","5.45.114.210:8443","5.45.115.162:2083","5.45.115.162:2087","5.45.115.168:2053","5.45.115.168:8443","5.45.115.238:8443","5.45.115.87:443","5.45.116.161:443","5.45.116.230:443","5.45.117.125:443","5.45.118.220:443","5.45.118.55:443","5.45.119.170:8443","5.45.119.69:2053","5.45.122.10:8443","5.45.124.170:443","5.45.126.36:443","5.45.126.8:443","5.45.127.148:8443","5.45.127.84:443","5.45.127.87:8443","80.77.25.228:443","80.79.123.100:443","82.47.22.11:8443","89.125.13.108:443","89.125.13.108:8443","93.113.214.39:443","93.123.39.34:443","93.123.39.44:8443","94.126.224.146:443","94.126.224.238:443","94.156.236.118:443","94.156.236.200:443","95.85.243.118:443","95.85.243.122:443","95.85.243.171:8443","95.85.243.240:443","114.129.9.131:443","212.7.7.155:8443","31.56.187.223:8443","38.180.163.250:443","5.181.202.60:443","5.45.126.50:443","77.83.198.184:8443","82.47.22.177:8443","82.47.22.22:443","93.123.39.11:443","46.22.211.46:443","95.165.79.244:8443"],"ES":["103.45.245.208:2053","103.45.245.208:8443","113.30.149.24:443","141.227.129.202:2053","141.227.129.211:2053","141.227.188.153:443","141.253.194.63:443","152.114.195.163:8443","162.141.93.190:2083","162.141.93.191:443","162.141.93.191:8443","162.141.93.208:2087","172.233.116.56:2053","172.233.96.242:443","172.233.97.34:443","179.255.189.10:443","179.255.189.17:443","179.255.189.42:443","185.114.72.31:2053","185.114.72.31:8443","185.121.12.169:8443","185.121.12.24:8443","185.121.12.28:8443","185.121.12.44:443","185.121.15.105:443","185.121.15.18:443","185.121.15.33:443","185.121.15.33:8443","185.223.82.230:443","185.223.82.30:443","185.223.82.30:8443","185.223.82.57:443","185.232.205.100:2053","185.232.205.200:8443","185.232.205.216:8443","185.237.234.67:443","188.213.5.74:443","193.17.183.157:2053","193.17.183.157:8443","193.17.183.166:443","193.17.183.166:8443","193.17.183.169:8443","193.17.183.188:443","193.17.183.6:8443","193.24.235.95:443","194.154.28.227:443","195.96.132.164:443","195.96.132.180:443","195.96.132.195:2053","195.96.132.219:443","208.76.223.14:8443","208.85.16.133:443","208.85.21.8:443","212.227.144.37:8443","212.227.90.142:443","217.154.185.87:443","217.72.207.16:8443","31.57.190.10:443","31.57.190.11:443","31.57.190.12:443","31.57.190.14:443","31.57.190.15:443","31.57.190.16:443","31.57.190.18:443","31.57.190.19:443","31.57.190.21:443","31.57.190.22:443","31.57.190.23:443","31.57.190.26:443","31.57.190.27:443","31.57.190.28:443","31.57.190.29:443","31.57.190.31:443","31.57.190.33:443","31.57.190.36:443","31.57.190.37:443","31.57.190.3:443","31.57.190.40:443","31.57.190.41:443","31.57.190.42:443","31.57.190.44:443","31.57.190.46:443","31.57.190.47:443","31.57.190.4:443","31.57.190.53:443","31.57.190.55:443","31.57.190.57:443","31.57.190.58:443","31.57.190.59:443","31.57.190.5:443","31.57.190.60:443","31.57.190.61:443","31.57.190.63:443","31.57.190.64:443","31.57.190.65:443","31.57.190.66:443","31.57.190.67:443","31.57.190.68:443","31.57.190.69:443","31.57.190.6:443","31.57.190.70:443","31.57.190.71:443","31.57.190.72:443","31.57.190.73:443","31.57.190.75:443","31.57.190.76:443","31.57.190.77:443","31.57.190.78:443","31.57.190.79:443","31.57.190.7:443","31.57.190.80:443","31.57.190.81:443","31.57.190.82:443","31.57.190.85:443","31.57.190.87:443","31.57.190.88:443","31.57.190.89:443","31.57.190.90:443","31.57.190.91:443","31.57.190.92:443","31.57.190.93:443","31.57.190.94:443","31.57.190.95:443","31.57.190.96:443","31.57.190.97:443","31.57.190.98:443","31.57.190.9:443","34.175.202.195:443","34.175.46.70:8443","35.42.169.95:443","45.150.195.167:443","45.150.195.181:8443","45.150.195.31:443","45.150.195.67:443","45.154.206.84:443","45.86.229.28:443","5.134.119.210:443","5.22.218.163:443","65.20.103.129:8443","65.20.105.75:443","66.163.118.128:443","78.138.9.206:8443","78.17.180.30:443","82.223.196.199:443","83.147.242.56:8443","84.246.215.90:443","91.149.242.134:443","92.178.109.187:443","93.93.118.60:8443","93.93.119.91:443","94.143.138.159:443","179.255.189.37:443","185.114.73.145:443","185.121.12.28:2053","185.47.131.138:443","185.47.131.138:8443","195.96.132.175:443","195.96.132.189:443","208.85.19.254:8443","212.227.134.254:443","212.227.134.254:8443","212.46.38.93:443","31.57.190.13:443","31.57.190.17:443","31.57.190.20:443","31.57.190.24:443","31.57.190.25:443","31.57.190.30:443","31.57.190.32:443","31.57.190.34:443","31.57.190.39:443","31.57.190.43:443","31.57.190.45:443","31.57.190.48:443","31.57.190.49:443","31.57.190.50:443","31.57.190.51:443","31.57.190.52:443","31.57.190.54:443","31.57.190.62:443","46.28.71.145:443","82.223.109.250:443","91.149.243.34:443","195.96.132.88:8443","45.150.195.5:443"],"KZ":["109.235.116.5:443","109.235.116.6:443","109.248.170.245:443","109.248.18.121:443","109.248.18.145:443","109.248.18.147:2053","109.248.18.147:443","109.248.18.161:443","109.248.18.21:8443","109.248.18.226:443","109.248.18.226:8443","109.248.18.35:443","109.248.18.77:443","109.248.18.87:443","109.248.199.113:2053","109.248.199.113:8443","109.248.247.35:443","109.248.247.86:443","147.45.172.186:443","147.45.184.140:8443","149.33.35.197:443","153.80.194.50:443","176.12.72.166:443","176.12.73.184:443","176.12.76.1:443","176.12.77.119:443","176.12.77.95:443","176.12.78.200:443","176.120.21.20:443","176.120.21.65:443","178.88.167.88:443","185.146.1.16:443","185.146.1.38:443","185.253.8.44:2053","185.253.8.64:2053","185.253.8.65:2053","185.5.74.226:443","185.5.74.226:8443","193.124.204.130:8443","193.47.43.197:443","193.47.43.21:8443","194.32.142.88:443","195.210.47.128:443","195.210.47.233:2053","195.210.47.233:8443","195.210.47.5:443","195.49.215.254:8443","199.189.252.112:2083","199.189.252.44:443","199.189.253.250:443","2.27.130.172:443","2.27.131.10:443","206.223.240.239:2053","206.223.242.242:8443","213.148.1.150:2053","213.148.1.150:8443","213.148.10.155:2053","213.148.10.155:443","213.148.10.170:2053","213.148.10.170:8443","213.148.13.223:443","213.148.2.46:8443","213.148.26.246:2053","213.148.26.246:8443","213.155.13.124:443","213.155.13.178:443","213.155.13.234:443","213.155.20.177:443","213.155.20.203:443","213.155.20.81:443","213.155.21.115:443","213.155.21.40:8443","213.155.21.87:443","213.155.22.169:8443","213.155.29.116:443","213.155.29.120:443","213.155.29.177:443","213.155.29.189:443","213.155.29.228:443","213.155.29.229:443","213.155.29.242:443","213.155.29.37:443","213.155.29.37:8443","217.179.51.131:8443","217.179.51.149:443","217.179.51.43:443","217.179.51.43:8443","31.130.152.102:443","31.130.153.158:443","31.130.154.242:443","37.233.81.105:443","38.107.234.39:8443","38.180.207.241:443","38.180.36.109:443","38.180.38.12:443","38.180.38.137:443","45.10.40.150:443","45.136.57.82:2053","45.136.57.82:8443","45.136.58.223:443","45.43.159.177:443","45.43.159.42:443","45.43.159.74:443","46.247.41.93:8443","46.8.254.102:8443","46.8.254.32:443","46.8.254.63:443","46.8.254.63:8443","5.180.20.134:443","5.180.21.7:443","5.180.40.166:443","5.180.43.145:443","5.39.253.126:443","5.39.253.147:443","5.39.253.245:443","5.39.253.39:443","5.39.253.54:443","72.56.2.96:443","77.67.8.205:8443","78.140.223.131:443","80.90.181.152:2053","80.90.183.47:443","80.90.183.75:2053","80.90.183.75:8443","83.222.22.61:2053","83.222.22.61:8443","83.97.77.35:2053","83.97.77.63:2053","86.107.198.133:2053","86.107.198.133:8443","87.199.129.201:443","87.199.130.156:8443","88.218.70.62:443","89.40.233.90:8443","91.147.92.252:443","91.200.148.120:443","91.207.74.142:443","91.207.74.142:8443","91.207.75.26:443","92.118.115.22:2053","92.60.75.129:2053","92.60.75.174:443","92.60.75.189:443","94.131.83.5:2053","94.131.83.5:8443","94.131.83.94:443","94.131.83.94:8443","153.80.200.96:443","170.168.34.37:8443","188.225.31.180:8443","194.110.54.219:443","5.180.42.79:443","5.39.253.208:2053","93.170.72.138:443","94.131.92.95:443","104.238.24.139:8443","104.238.24.152:443","104.238.24.75:443","109.248.18.169:443"],"CZ":["103.119.18.30:443","103.200.28.113:8443","109.172.8.106:443","109.172.8.37:443","109.172.8.39:443","109.172.8.39:8443","109.172.8.48:8443","109.172.8.73:443","109.172.8.74:443","109.172.8.80:443","109.172.9.242:443","109.172.9.252:443","109.172.9.38:443","109.234.32.32:443","109.238.95.229:443","109.238.95.54:443","132.243.237.53:443","141.133.172.126:2083","141.133.172.132:443","141.133.174.173:443","141.133.174.49:443","141.133.174.59:443","141.133.175.117:443","141.133.175.133:443","141.133.175.178:8443","141.133.175.252:443","148.222.184.178:443","176.74.219.73:8443","178.208.75.153:443","178.208.91.143:8443","178.208.91.177:443","185.122.186.95:443","185.21.223.42:8443","185.253.46.105:8443","185.253.46.235:443","185.253.46.27:443","185.253.46.31:443","185.28.100.60:443","185.72.10.59:443","185.72.10.61:443","185.72.10.61:8443","185.72.10.70:443","185.72.10.70:8443","185.72.10.89:443","185.72.10.89:8443","188.127.247.149:443","188.127.247.67:443","188.127.247.6:443","188.127.247.89:443","188.214.35.66:443","193.124.56.100:2087","193.124.56.100:443","193.124.56.100:8443","193.124.56.89:443","193.124.57.19:443","193.124.57.24:2053","193.124.57.24:2087","193.124.57.253:8443","193.124.57.87:443","193.124.58.171:443","193.124.58.60:443","193.124.58.61:443","193.124.58.89:443","193.162.47.43:8443","193.162.47.60:443","194.182.80.100:443","194.182.80.97:2053","194.87.126.173:443","195.123.244.20:443","195.123.244.230:443","195.123.244.28:443","195.123.244.83:443","195.123.245.46:8443","195.133.35.154:443","195.133.35.63:2053","195.133.35.63:2087","195.133.35.63:2096","195.133.35.63:443","195.133.35.63:8443","212.193.50.149:8443","37.205.15.169:443","37.46.210.193:8443","37.46.211.176:8443","45.151.183.22:443","46.28.70.104:443","46.28.70.105:8443","46.28.70.117:443","46.28.70.200:443","62.233.57.172:8443","62.233.57.193:8443","62.233.57.204:8443","62.233.57.223:443","62.233.57.80:443","80.211.200.113:443","80.211.205.61:443","80.211.206.36:443","84.242.64.86:8443","85.137.164.56:443","85.137.165.164:443","85.137.165.171:443","85.137.165.190:443","85.137.165.71:443","85.137.165.97:443","85.137.166.252:443","85.137.166.6:443","85.137.167.101:443","85.137.167.125:8443","85.137.167.180:443","85.137.167.209:443","85.137.167.21:443","85.137.167.53:443","85.137.25.2:443","85.255.15.65:2053","85.255.6.88:443","87.236.146.111:443","87.236.146.203:8443","87.236.146.43:443","87.236.146.76:443","89.125.106.121:443","89.125.106.138:443","89.125.106.157:443","91.184.248.209:2053","91.184.248.209:8443","91.184.248.98:8443","91.184.249.100:8443","91.184.249.146:443","91.184.249.44:8443","91.184.250.113:8443","91.184.250.16:443","91.184.250.182:443","91.184.250.202:443","91.199.147.228:8443","91.199.147.241:8443","91.199.147.41:443","91.199.154.161:8443","91.199.154.173:443","91.199.154.22:8443","91.199.154.97:443","91.199.160.137:8443","91.199.160.188:2053","91.199.160.188:443","91.199.160.38:443","91.199.160.38:8443","91.199.160.39:443","91.199.160.46:443","92.61.70.205:2053","92.61.71.112:443","92.61.71.49:443","92.61.71.90:8443","93.99.104.227:8443","109.172.9.100:443","193.124.57.24:2083","45.151.183.187:443","62.233.57.167:8443","91.184.248.197:2053"],"TR":["103.83.87.133:443","103.83.87.161:443","103.83.87.219:8443","104.143.204.237:443","104.143.204.23:443","104.143.204.23:8443","104.239.87.51:443","104.239.87.89:8443","107.181.155.40:8443","130.94.0.228:443","130.94.1.150:443","130.94.1.177:443","130.94.1.95:443","138.124.107.35:443","144.225.65.188:443","144.225.65.235:8443","144.225.65.56:2096","153.52.92.136:443","155.103.69.91:8443","155.103.70.208:2053","155.103.70.240:2083","155.103.70.71:443","155.103.70.71:8443","155.103.71.111:443","155.103.71.142:443","155.103.71.142:8443","155.103.71.159:443","155.103.71.207:443","155.103.71.80:443","158.94.216.146:443","176.42.68.134:2053","176.42.68.134:2083","176.42.68.134:2087","178.157.15.73:443","185.113.223.183:8443","185.181.208.241:8443","185.218.139.196:443","185.219.132.27:443","185.219.133.106:443","185.226.92.173:8443","185.234.66.91:443","185.235.243.172:443","185.255.93.189:443","185.39.204.117:8443","185.39.204.17:443","185.71.219.66:443","188.132.141.236:8443","188.132.174.82:2053","188.132.174.98:443","188.132.183.17:443","188.132.183.30:443","188.132.183.40:443","188.132.192.145:2087","188.132.192.190:2053","188.132.192.194:2053","188.132.192.194:8443","188.132.232.192:2053","188.132.232.192:8443","188.132.232.83:8443","193.124.46.252:443","193.124.46.93:443","193.187.132.11:2053","193.46.56.147:443","193.57.136.201:443","194.135.34.198:443","194.36.85.113:443","194.87.129.221:443","194.87.39.224:8443","195.16.74.73:443","198.105.123.86:8443","201.50.115.20:443","201.50.115.25:443","203.202.232.110:443","203.202.232.137:443","203.202.232.211:443","203.202.232.216:8443","203.202.232.253:2053","203.202.232.253:8443","212.115.103.222:8443","212.192.6.66:443","212.87.198.245:443","213.142.150.155:443","213.155.119.28:443","217.11.164.172:2053","31.40.204.131:443","31.40.204.200:443","31.40.204.243:2053","31.40.204.243:2083","31.40.204.243:443","31.40.204.93:443","31.57.225.181:2053","31.57.225.43:443","31.58.245.40:8443","37.221.79.54:8443","38.180.113.155:8443","38.180.172.231:443","38.60.208.92:2087","45.12.143.25:443","45.141.148.137:443","45.141.148.53:2053","45.141.148.76:443","45.144.214.135:2053","45.145.20.139:2087","45.145.20.139:8443","45.74.158.168:443","45.74.158.196:443","45.89.52.247:443","45.89.52.85:443","5.180.32.101:443","62.60.233.121:443","77.83.203.208:443","78.135.110.192:443","78.135.77.252:443","78.135.77.27:443","82.26.198.89:443","83.217.9.70:443","84.51.54.101:8443","89.251.8.228:443","89.45.45.110:443","91.228.227.17:2087","91.228.227.214:443","91.228.227.231:443","93.113.230.133:8443","93.114.98.212:8443","93.115.10.218:2053","93.115.10.237:8443","93.180.134.48:443","94.131.108.136:443","94.131.123.74:443","103.83.86.172:443","104.143.204.62:443","167.104.219.81:443","176.223.66.73:2053","176.223.66.73:8443","188.132.141.239:8443","204.10.192.37:2087","212.80.9.44:443","213.238.182.13:443","37.221.79.194:443","37.221.79.43:443","37.221.79.75:8443","38.180.113.215:443","62.133.63.127:443","77.83.245.48:443","78.135.77.148:443","87.120.106.194:8443","89.45.45.144:443","93.114.98.212:443","93.115.10.218:8443","93.115.10.237:2053","167.104.219.197:2083","194.135.34.121:443","212.102.107.40:443","213.142.132.24:443","84.51.54.101:2053"],"AT":["104.143.0.180:443","104.143.0.61:8443","130.195.222.215:443","132.243.203.112:8443","132.243.203.120:8443","132.243.203.202:8443","132.243.203.203:8443","132.243.203.204:8443","132.243.203.205:8443","132.243.203.206:8443","132.243.203.207:8443","132.243.203.208:8443","132.243.203.209:8443","132.243.203.210:8443","132.243.203.211:8443","132.243.203.212:8443","132.243.203.213:8443","132.243.203.214:8443","132.243.203.215:8443","132.243.203.216:8443","132.243.203.217:8443","132.243.203.218:8443","132.243.203.219:8443","132.243.203.220:8443","132.243.203.221:8443","132.243.203.222:8443","132.243.203.223:8443","132.243.203.224:8443","132.243.203.225:8443","132.243.203.226:8443","132.243.203.227:8443","132.243.203.228:8443","132.243.203.229:8443","132.243.203.230:8443","132.243.203.231:8443","132.243.203.232:8443","132.243.203.233:8443","132.243.203.234:8443","132.243.203.235:8443","132.243.203.236:8443","132.243.203.237:8443","132.243.203.238:8443","132.243.203.239:8443","132.243.203.240:8443","132.243.203.241:8443","132.243.203.242:8443","132.243.203.243:8443","132.243.203.244:8443","132.243.203.245:8443","132.243.203.246:8443","132.243.203.247:8443","132.243.203.248:8443","132.243.203.249:8443","132.243.203.35:8443","132.243.203.9:8443","141.227.165.228:2053","151.236.8.190:443","151.236.8.98:443","152.53.100.114:443","152.53.100.128:443","152.53.100.13:443","152.53.100.177:443","152.53.100.232:443","152.53.100.49:443","152.53.100.85:443","152.53.101.146:443","152.53.101.5:443","152.53.102.19:443","152.53.103.121:443","152.53.103.20:443","152.53.110.2:443","152.53.110.45:443","152.53.111.168:443","152.53.111.169:443","152.53.111.219:443","152.53.112.170:2053","152.53.112.170:443","152.53.19.28:443","152.53.19.28:8443","152.53.2.213:443","152.53.2.213:8443","152.53.3.249:2096","152.53.3.38:443","152.53.35.4:443","152.53.45.7:443","152.53.67.190:443","152.53.67.83:443","157.173.29.46:443","159.195.110.37:443","159.195.112.41:443","159.195.112.45:443","159.195.113.79:8443","159.195.113.91:443","159.195.115.30:443","159.195.141.48:443","159.195.141.48:8443","159.195.141.56:8443","185.119.117.146:8443","185.175.58.196:443","188.172.229.247:443","193.219.97.198:443","193.219.97.198:8443","193.233.233.188:2053","193.233.233.188:8443","194.58.66.139:443","203.98.67.146:443","203.98.67.48:8443","205.147.201.53:8443","37.235.56.86:443","37.252.189.207:443","46.102.156.144:2053","46.102.156.144:8443","77.110.110.254:443","77.73.131.24:443","85.192.42.198:443","87.251.69.20:8443","87.251.69.44:443","89.58.17.201:443","89.58.18.68:443","89.58.61.12:2053","91.244.70.45:8443","92.112.48.142:8443","92.112.48.149:443","93.115.106.139:443","94.177.8.237:443","94.177.8.78:2053","94.177.9.33:8443","185.75.241.170:443","77.110.110.212:8443","89.58.16.199:443"],"CA":["103.214.69.199:443","103.214.69.7:443","137.184.168.37:443","137.220.52.250:443","138.197.160.106:443","138.197.161.103:443","138.197.173.118:443","140.238.144.211:443","142.93.154.249:443","146.190.255.153:443","147.182.144.228:443","147.182.156.112:443","148.113.209.22:443","149.56.109.62:443","149.56.205.55:443","15.157.60.182:443","15.235.104.68:8443","15.235.22.204:443","15.235.22.204:8443","150.242.90.62:443","151.145.33.145:443","152.42.146.174:443","155.138.128.23:443","155.138.131.219:443","155.138.146.165:8443","158.51.123.177:443","158.69.112.254:443","158.69.196.206:8443","158.69.199.251:8443","158.69.201.4:8443","158.69.213.193:443","158.69.219.232:443","158.69.219.232:8443","158.69.220.106:8443","158.69.220.24:443","158.69.220.76:8443","158.69.220.85:443","159.203.18.237:443","159.203.2.180:443","159.203.35.153:443","165.227.41.38:443","166.1.228.218:443","167.114.67.25:443","167.160.188.156:443","167.160.190.137:443","172.105.26.26:2053","172.105.27.172:443","172.93.167.175:443","172.93.167.45:443","172.93.32.125:443","172.93.32.237:443","172.98.207.58:443","178.128.227.189:443","178.128.231.7:443","178.128.237.86:443","184.107.156.96:2053","184.107.156.96:2083","184.107.156.96:8443","185.206.170.192:443","188.119.65.47:2087","192.99.55.53:8443","207.90.192.164:8443","213.255.209.61:2053","213.255.209.61:8443","216.128.176.190:443","216.128.177.153:8443","216.128.177.185:8443","24.109.36.190:8443","24.141.96.92:8443","24.78.21.213:443","24.84.0.55:8443","35.182.59.30:443","38.9.96.61:443","40.233.103.212:443","40.233.110.251:443","40.233.116.225:443","40.233.71.238:443","40.233.77.216:443","40.233.87.120:443","40.233.99.248:443","45.133.16.41:443","45.133.17.106:443","45.133.17.118:443","5.61.27.190:2087","50.114.177.200:443","51.161.11.51:443","51.222.136.162:8443","51.222.30.98:8443","51.79.50.234:8443","54.39.17.220:8443","65.49.232.101:443","68.183.207.130:443","68.233.122.42:443","70.79.240.221:443","72.11.145.117:443","89.251.9.144:2087","96.44.136.186:2053","96.44.136.186:8443","99.229.67.145:443","99.79.123.86:443","103.214.69.134:443","142.4.215.110:443","144.217.12.20:8443","144.217.162.188:443","144.217.92.9:443","144.217.93.183:443","155.138.128.135:443","158.69.220.24:8443","158.69.220.85:8443","167.99.183.13:443","192.99.169.176:443","24.84.0.55:443","5.149.253.225:443","104.129.183.69:443","24.150.16.183:8443","103.214.69.149:443","198.199.106.194:443"],"KR":["101.33.68.172:443","110.10.178.240:443","119.205.235.58:443","123.111.169.70:2053","123.111.169.70:2083","123.111.169.70:2087","123.111.169.70:2096","123.111.169.70:443","123.111.169.70:8443","129.154.197.113:443","129.154.50.72:8443","13.124.169.29:443","130.162.137.247:443","130.94.29.155:443","131.186.16.166:443","131.186.26.94:443","132.145.91.135:443","132.145.91.181:8443","134.185.112.134:443","134.185.114.16:443","134.185.123.54:443","134.185.127.173:443","134.185.99.52:443","140.238.15.158:443","140.238.21.85:8443","140.238.30.217:443","140.245.65.122:443","141.164.35.4:443","141.164.37.50:443","141.164.42.2:443","141.164.49.98:443","144.24.73.232:443","146.56.115.180:443","146.56.119.205:443","146.56.135.196:443","146.56.142.151:443","146.56.151.92:443","146.56.187.1:8443","146.56.188.74:443","149.28.128.67:443","152.67.198.36:443","152.67.210.234:443","152.67.214.155:443","152.69.229.110:443","152.70.239.74:443","152.70.254.197:443","152.70.88.124:443","158.247.198.111:443","158.247.198.196:443","158.247.201.201:8443","158.247.210.172:443","158.247.222.168:443","158.247.224.240:443","158.247.240.138:443","158.247.253.111:2087","158.247.253.111:8443","161.118.153.136:443","168.107.0.210:443","168.107.14.233:443","168.107.17.234:8443","168.107.40.4:8443","168.107.56.181:443","168.110.107.218:443","168.110.110.132:2053","168.110.112.196:8443","168.110.121.126:8443","193.122.115.184:443","193.122.119.241:443","193.122.96.190:443","193.123.236.206:443","20.41.123.20:443","203.248.94.49:443","211.110.208.116:443","211.49.57.134:443","3.35.51.12:443","3.37.245.168:443","43.108.46.150:8443","43.128.141.99:443","43.131.225.115:443","43.131.242.223:443","43.131.247.123:8443","43.155.202.169:443","43.155.208.254:443","43.155.221.27:8443","43.164.132.89:8443","43.164.134.99:443","43.201.2.23:443","45.141.139.209:443","45.93.31.34:443","47.80.57.116:443","54.180.141.246:443","54.180.151.15:443","61.109.188.221:443","61.109.188.223:443","64.110.70.64:443","64.110.79.66:8443","64.110.82.71:443","64.176.226.26:8443","64.176.230.12:443","85.155.176.105:8443","85.155.176.11:8443","85.155.176.130:8443","85.155.176.13:8443","85.155.176.154:8443","85.155.176.44:8443","140.238.5.86:443","146.56.167.171:443","146.56.180.103:443","152.67.208.47:443","27.102.134.233:443","43.155.134.179:443","43.155.209.83:2053","43.133.237.158:8443","43.133.251.155:443"],"BG":["103.249.134.29:443","104.143.206.87:443","104.152.48.248:443","108.165.233.223:443","13.140.29.13:443","13.140.29.144:8443","13.140.29.170:443","13.140.29.253:443","13.140.29.45:443","148.253.214.189:8443","164.5.249.34:443","169.40.15.123:8443","185.141.61.113:2053","185.141.61.113:443","185.148.146.9:443","185.162.10.111:2053","185.162.10.111:8443","185.190.250.99:443","185.203.116.131:443","185.203.116.174:443","185.203.119.101:443","185.205.210.144:443","185.206.146.190:8443","185.214.99.235:443","185.214.99.241:443","185.214.99.241:8443","185.223.252.104:443","185.223.252.191:443","185.223.253.115:443","185.223.253.11:443","185.223.253.130:443","185.223.253.13:443","185.223.253.172:443","185.232.171.125:2053","185.232.171.125:8443","185.240.147.103:2053","185.82.218.224:443","185.82.218.224:8443","193.239.160.89:443","194.110.87.161:8443","194.87.230.132:443","194.87.230.83:8443","195.123.225.224:2053","195.123.225.224:8443","195.123.226.211:443","2.27.105.199:443","212.113.118.25:443","217.217.227.126:443","31.13.248.113:8443","31.13.248.201:8443","45.137.201.143:443","45.39.241.116:443","45.9.156.118:443","78.128.99.216:443","79.124.7.237:443","82.118.230.42:8443","83.147.241.139:2096","83.147.241.197:443","85.217.170.56:2053","85.217.170.89:2083","85.217.170.89:2087","85.217.170.89:443","89.251.8.216:2053","89.44.197.64:8443","91.210.166.221:443","91.215.152.37:443","91.215.152.51:443","91.215.152.98:443","91.215.153.143:443","91.215.153.162:443","91.215.154.80:443","91.215.154.88:443","91.215.154.96:443","91.216.104.209:2053","91.216.104.227:8443","91.228.186.165:8443","91.247.36.168:443","91.247.36.169:8443","91.247.37.117:8443","91.247.37.14:443","91.247.37.172:443","91.247.37.58:443","91.92.136.216:2053","94.156.189.144:8443","94.72.140.210:443","89.251.8.228:443"],"IN":["103.111.114.87:443","107.181.139.85:443","13.126.206.240:443","13.200.106.232:443","139.59.63.21:443","139.84.135.130:443","139.84.139.219:443","139.84.146.103:8443","139.84.156.127:443","139.84.156.84:443","139.84.166.44:443","139.84.167.57:443","139.84.168.252:2053","139.84.216.50:443","139.84.221.153:8443","143.110.178.130:443","143.110.188.241:443","143.110.241.197:443","157.20.27.245:8443","157.20.27.35:443","168.144.154.79:443","168.144.155.167:443","168.144.68.202:443","168.144.91.212:443","170.187.237.10:443","170.187.237.195:443","170.187.237.198:443","172.236.187.52:443","172.237.36.109:443","20.219.46.208:8443","20.235.105.146:443","20.235.220.189:443","216.10.243.159:443","3.110.31.232:443","35.154.184.88:443","4.240.110.47:443","5.253.28.107:443","5.253.28.108:443","5.253.28.109:443","5.253.28.110:443","5.253.28.113:443","5.253.28.115:443","5.253.28.234:443","5.253.28.245:443","5.253.29.241:2053","5.253.29.6:443","5.253.29.83:443","5.253.30.171:8443","5.253.30.225:443","5.253.30.228:443","5.253.30.229:443","52.66.200.252:443","64.227.164.129:443","64.227.174.213:2053","64.227.174.213:8443","65.2.215.47:443","65.2.215.47:8443","65.20.71.82:443","65.20.85.14:443","65.20.88.116:443","68.233.107.29:443","94.136.185.7:8443","139.84.168.252:8443","139.84.174.65:443","160.191.183.218:443","172.232.118.174:443","98.70.26.236:443","107.181.139.84:2083","167.71.238.69:443","64.227.146.37:443","64.227.152.150:443","68.233.109.59:2087"],"DK":["109.176.202.20:443","185.111.109.47:443","193.180.208.169:8443","193.180.209.21:443","193.180.209.28:443","193.180.210.125:8443","193.180.211.155:443","193.180.211.40:443","193.180.212.25:443","193.180.213.155:443","193.180.213.29:443","193.180.213.29:8443","193.180.213.58:443","193.180.215.69:443","193.181.208.185:443","193.181.209.232:8443","193.181.210.149:443","193.181.210.232:443","193.181.211.119:8443","193.181.211.185:443","193.181.211.52:2053","193.181.212.101:443","193.181.212.25:443","193.181.212.80:443","193.181.212.81:443","193.181.212.81:8443","193.181.213.173:443","193.181.213.20:8443","193.181.213.45:443","193.181.213.53:443","193.181.215.4:8443","193.181.216.117:2053","193.181.217.70:2053","193.182.143.245:443","195.88.89.92:8443","45.148.28.108:8443","45.148.28.95:443","45.148.29.199:8443","45.148.30.11:443","45.148.31.204:443","45.153.48.132:443","45.153.48.157:443","45.153.48.236:8443","46.29.235.56:443","5.249.255.116:443","77.37.96.186:443","77.37.97.204:8443","77.37.97.211:2053","84.252.138.197:8443","89.185.80.238:443","89.28.236.182:443","89.28.236.192:8443","91.132.92.231:443","92.113.145.132:443","92.113.146.34:443","92.113.146.87:443","92.113.146.87:8443","92.113.148.239:8443","92.113.149.59:443","92.113.149.70:443","92.113.150.186:8443","93.92.112.182:443","93.92.112.182:8443","192.36.27.150:8443","77.37.96.247:443"],"RO":["103.102.229.45:443","103.126.50.196:443","103.126.50.196:8443","154.46.31.118:443","178.214.211.48:8443","178.214.211.99:443","185.104.181.228:443","185.158.248.185:2087","185.165.169.157:443","185.39.30.18:2087","185.39.30.18:8443","193.142.58.170:8443","193.168.140.197:443","193.168.140.197:8443","193.201.82.144:443","196.245.161.74:443","213.218.160.100:2087","213.218.160.100:443","213.218.160.131:443","38.180.253.71:443","38.79.154.232:443","45.11.181.161:443","45.13.38.118:443","45.13.38.174:8443","45.13.38.36:2053","45.134.48.53:8443","45.136.199.148:443","81.180.92.55:443","81.181.166.197:443","82.117.255.136:8443","82.117.255.207:443","82.117.255.237:8443","82.152.132.14:443","82.152.132.50:443","82.152.132.52:443","82.152.132.53:443","82.152.132.60:443","85.120.229.219:443","85.122.122.25:443","85.204.107.39:8443","85.204.107.40:8443","85.204.107.41:8443","85.90.196.11:443","85.90.196.19:8443","85.90.196.38:443","89.125.201.110:2053","89.125.201.241:443","89.37.192.144:443","89.37.192.206:443","89.37.192.32:443","95.133.166.163:443","185.165.169.208:443","185.39.30.67:2053","193.142.58.147:2087","82.152.132.57:443","93.114.194.185:8443","85.121.183.24:2087"],"AU":["103.43.75.82:443","119.9.134.7:443","123.51.23.113:443","125.7.24.251:443","139.84.202.177:2096","139.84.204.218:443","139.84.205.230:443","139.99.134.170:443","139.99.155.180:443","149.28.171.207:443","152.67.104.23:443","152.67.126.254:443","152.69.169.24:443","154.26.156.24:443","158.180.5.171:443","160.187.110.199:443","160.187.110.199:8443","161.33.90.181:443","168.138.110.138:443","170.64.197.150:443","170.64.232.210:443","170.64.237.192:443","172.105.173.161:443","172.236.62.238:443","194.195.248.186:443","194.195.248.195:443","194.195.252.133:443","202.125.16.41:8443","206.168.133.137:443","207.148.81.4:443","207.211.157.214:443","209.38.82.114:443","3.27.159.64:443","45.32.191.198:443","45.32.241.82:443","45.32.243.13:443","51.161.131.192:443","54.253.0.63:443","103.136.146.73:443","108.165.64.147:443","139.84.197.94:443","170.64.221.29:443","176.97.68.17:443","192.9.162.124:8443","192.9.175.224:443","51.161.197.128:443","66.226.145.131:443","207.211.153.234:443","45.77.236.204:443"],"IT":["113.30.151.151:2053","113.30.151.151:8443","132.243.255.51:443","132.243.255.97:8443","149.154.157.213:443","151.241.215.143:8443","172.232.212.218:8443","172.235.229.214:443","179.255.190.10:443","179.255.190.21:443","179.255.190.24:443","179.255.190.3:443","179.255.190.4:443","179.255.190.5:443","179.255.190.7:443","179.255.190.9:443","185.47.172.172:8443","31.14.140.155:443","31.76.113.164:443","31.76.113.61:443","31.77.154.69:443","31.77.201.20:443","31.77.201.26:443","45.144.172.33:443","45.147.250.39:443","46.28.68.7:443","46.28.68.7:8443","5.249.148.85:443","57.131.32.25:2053","66.245.204.103:443","80.211.134.75:443","80.211.238.227:443","80.211.24.141:443","80.211.24.214:443","80.211.24.32:443","80.211.24.43:443","80.211.27.249:443","82.118.16.161:443","82.118.16.181:443","85.155.225.63:8443","89.46.70.144:443","94.177.160.180:443","94.177.202.37:443","172.238.238.203:2053","216.106.191.53:443","4.232.64.201:443","213.109.192.6:8443","72.146.234.10:443","83.229.6.134:443"],"LT":["130.12.171.173:443","144.31.243.120:8443","144.31.243.69:443","176.118.198.175:8443","176.118.198.24:8443","185.237.185.110:2053","185.237.185.182:2053","185.237.185.3:443","185.34.52.147:443","185.80.128.20:443","185.80.128.24:8443","185.80.128.80:443","185.80.129.84:443","185.80.131.182:2053","185.80.131.182:443","188.190.3.42:443","194.135.85.34:443","194.135.91.96:443","194.87.106.196:8443","195.238.126.11:443","195.238.126.150:443","2.59.162.27:443","213.183.55.153:8443","213.189.221.242:8443","213.252.246.17:8443","46.29.234.91:8443","72.56.5.222:443","80.209.231.51:443","80.209.232.78:443","84.32.149.158:443","84.32.149.158:8443","84.32.209.76:443","85.206.161.109:443","85.206.161.198:443","85.206.161.200:443","89.125.248.173:443","89.125.248.243:443","93.115.25.111:443","94.176.235.22:443","2.59.162.230:443","212.192.23.136:8443","212.192.23.30:443","212.192.23.56:443","212.192.23.91:443","46.39.255.99:8443","78.153.131.199:8443","176.223.140.204:443","194.135.83.166:8443","5.199.173.195:443"],"TW":["114.32.9.249:443","130.94.36.232:443","136.0.54.169:443","140.235.38.206:443","140.235.38.47:443","140.235.38.78:443","140.235.39.162:443","140.235.39.19:443","141.11.87.48:443","141.11.87.48:8443","142.249.60.24:443","142.249.60.51:443","151.158.224.84:443","151.242.188.152:443","151.242.188.209:443","151.242.188.249:443","151.242.189.130:8443","151.242.189.137:443","151.242.189.162:443","151.242.189.40:443","151.242.189.48:8443","154.40.60.193:443","188.253.6.249:443","202.148.220.230:443","202.148.220.45:8443","207.56.137.174:443","213.210.4.48:443","23.146.248.149:443","43.213.230.249:443","45.207.159.187:443","60.249.101.167:443","78.105.183.11:8443","82.152.90.178:443","82.152.91.210:443","83.147.12.20:443","83.147.12.252:443","83.147.13.193:443","83.147.15.253:443","83.147.15.86:443","85.237.207.126:443","85.237.207.72:443","2.27.174.68:443","220.135.105.32:2087","78.105.183.40:443","83.147.13.49:443","151.242.189.184:443"],"AE":["109.61.18.28:2087","144.172.88.236:443","146.70.37.253:443","147.78.0.186:2053","147.78.0.186:8443","172.86.76.47:443","172.86.77.145:443","172.86.77.98:443","176.97.66.175:443","193.123.74.174:8443","20.174.15.226:443","45.86.228.104:443","51.170.85.31:8443","84.235.245.65:2096","84.235.250.237:443","84.235.255.82:443","85.237.211.194:2053","85.237.211.194:8443","89.36.162.162:8443","90.156.220.194:2053","91.132.93.153:443","95.174.68.155:2083","95.174.68.179:8443","172.86.76.35:443","181.215.205.172:2053","188.208.110.35:2096","172.86.77.255:443"],"MY":["149.118.144.163:443","149.118.158.90:8443","160.30.5.102:443","166.1.249.151:443","166.88.194.248:443","202.184.53.82:8443","202.187.7.166:443","216.173.67.119:443","216.173.67.144:443","216.173.67.144:8443","216.173.67.159:443","216.173.67.59:443","23.27.113.20:8443","45.194.27.181:443","45.194.27.99:443","47.250.212.59:2053","47.250.212.59:443","47.250.81.46:2087","56.69.183.8:443","56.69.45.182:443","168.93.198.146:8443","202.61.75.68:2053","23.27.53.56:8443"],"IE":["107.150.20.112:8443","108.128.156.233:443","167.160.177.68:2096","194.87.245.205:8443","196.197.21.2:8443","198.55.102.68:2083","198.55.103.168:443","198.55.103.33:443","23.95.225.10:2053","23.95.225.10:8443","5.157.30.26:8443","5.157.30.28:8443","5.157.30.2:8443","5.157.30.3:8443","54.194.24.172:443","54.229.164.147:2053","54.229.164.147:8443","63.32.194.15:2053","63.32.194.15:8443","85.159.229.122:443","205.185.126.59:443","45.141.234.138:443"],"MD":["146.19.213.60:443","178.17.174.137:8443","185.153.198.86:443","185.163.45.40:443","185.216.68.218:8443","193.36.38.17:443","194.180.191.123:443","213.232.235.54:8443","5.181.158.96:443","85.121.176.226:443","85.121.177.192:8443","91.229.239.172:443","93.185.165.175:443","94.103.188.145:443","193.36.38.222:443","80.96.108.136:443","80.96.113.48:443","85.121.177.192:2053","93.185.165.175:8443","194.180.191.249:443"],"RS":["130.49.163.54:2053","130.49.163.54:8443","185.105.108.43:443","185.105.108.92:8443","185.48.250.113:443","185.48.250.113:8443","185.48.250.175:443","185.48.251.100:443","185.48.251.115:443","195.133.18.146:443","38.180.100.80:443","38.180.239.173:443","38.244.190.206:443","89.31.121.165:443","89.46.236.118:443","185.48.250.138:2096","185.48.250.138:443","194.87.85.5:8443","93.86.197.232:443"],"NO":["144.31.217.95:443","185.125.171.128:8443","194.5.98.103:443","194.5.98.105:2053","194.5.98.105:8443","194.5.98.17:443","194.68.32.99:443","195.54.170.148:8443","195.54.170.43:443","202.50.55.76:443","46.29.238.112:443","81.29.149.210:443","81.29.149.219:2053","81.29.149.219:8443","84.208.211.208:8443","89.185.81.54:443","91.190.155.173:2083","194.32.107.150:443"],"IS":["138.16.178.169:443","151.243.181.66:2053","151.243.181.99:443","185.146.234.91:443","194.247.182.120:8443","195.162.68.79:443","195.246.230.125:443","195.246.230.132:443","195.246.231.187:8443","89.127.235.250:443","89.147.108.16:8443","89.147.109.212:443","89.147.111.223:2053","45.147.49.183:443","89.147.110.247:8443","185.146.234.242:443"],"VN":["103.15.91.174:443","103.186.64.182:443","103.197.185.178:443","157.66.26.194:443","160.191.50.99:443","160.22.74.117:443","160.25.74.227:443","160.25.75.40:443","160.30.50.48:443","160.30.54.63:443","163.61.74.121:443","180.93.3.99:443","160.25.74.124:443","160.187.1.101:443"],"BR":["104.64.59.22:443","146.235.59.153:2053","146.235.59.153:8443","157.151.4.93:443","172.237.60.225:443","216.128.168.232:8443","38.180.78.255:443","38.180.79.9:443","43.174.192.1:443","94.131.19.16:443","104.64.59.9:443","216.238.110.198:8443","216.238.116.196:8443","216.238.120.164:443"],"CN":["109.66.88.118:8443","109.66.88.158:443","111.31.95.41:8443","116.62.243.62:443","120.26.92.186:8443","171.83.48.117:8443","183.14.214.138:8443","43.161.226.55:443","43.161.236.173:8443","47.83.139.13:8443","8.134.220.58:8443","43.168.16.112:443","171.83.43.32:8443","39.96.67.3:443"],"BE":["141.227.137.177:2053","141.227.186.221:2053","141.227.186.38:2053","141.98.233.6:443","144.31.94.174:443","185.235.138.60:2053","188.190.26.243:443","192.71.249.186:2053","192.71.249.186:443","194.71.227.213:443","35.210.99.51:443","35.241.172.224:443","89.125.200.144:2053","89.125.200.19:443"],"GR":["38.54.29.210:2053","45.10.190.30:443","85.90.197.156:443","85.90.197.157:443","85.90.197.158:443","85.90.197.159:443","85.90.197.53:443","91.250.248.151:443","91.250.248.223:443","91.250.248.68:443","94.131.16.25:443","94.131.16.36:443","94.131.16.65:443","45.142.31.20:443"],"ID":["116.212.73.46:443","147.139.189.225:443","15.232.137.242:443","15.232.155.235:443","172.232.234.155:443","202.155.95.132:443","43.173.1.153:8443","43.174.193.1:443","43.229.254.182:443","43.229.254.71:443","103.169.206.131:443","172.232.236.252:443","172.232.246.133:8443"],"MX":["131.196.252.97:443","131.196.253.141:443","131.196.254.151:443","131.196.254.212:443","216.238.72.72:443","216.238.78.167:443","216.238.79.164:443","216.238.79.83:8443","216.238.80.148:8443","216.238.86.91:443","38.213.228.141:443","38.213.228.91:443","131.196.252.66:443"],"BY":["144.31.129.7:443","155.212.244.252:443","185.179.82.201:443","185.179.82.246:443","191.44.32.253:443","212.60.4.134:443","62.182.102.93:443","80.71.159.199:8443","91.149.167.147:8443","93.85.236.9:443","95.130.84.36:2053","95.130.84.36:8443","185.66.71.155:443"],"IL":["185.241.7.178:443","185.253.75.119:443","192.71.27.237:443","193.169.228.116:443","64.176.167.56:8443","64.176.170.68:8443","64.177.68.51:443","80.178.58.56:443","85.209.157.33:443","45.150.108.59:443","85.209.157.30:443","92.118.124.18:443","193.169.229.202:443"],"SK":["45.151.70.148:8443","88.218.1.42:443","89.46.42.141:2053","89.46.42.141:8443","89.46.42.92:2053","89.46.42.92:8443","91.242.163.179:2053","91.242.163.179:8443","185.112.249.201:2053","185.112.249.201:8443","5.35.103.185:8443"],"ZA":["139.84.226.30:8443","139.84.230.41:443","139.84.231.16:8443","139.84.236.69:443","139.84.242.103:443","156.38.157.171:2053","139.84.244.9:443","156.38.157.171:8443","38.54.64.204:443","84.8.137.211:443"],"UA":["185.86.77.181:8443","213.111.148.137:443","213.111.149.58:8443","5.34.182.153:8443","91.218.212.223:443","91.231.182.162:8443","91.238.105.102:443","91.239.65.102:443","141.105.130.102:443","173.242.63.235:8443"],"HU":["194.71.130.69:443","37.221.210.113:443","37.221.210.113:8443","38.180.108.148:443","38.180.109.174:443","38.180.225.247:2053","91.219.236.136:2053","5.181.77.132:443","180.149.37.38:8443","84.2.214.217:443"],"AM":["2.56.206.113:443","2.56.207.67:443","88.218.92.231:443","88.218.95.171:2053","88.218.95.171:8443","91.198.108.211:2053","92.223.2.12:2087","91.195.254.34:443","91.198.108.12:443"],"TH":["103.224.84.70:443","118.27.150.97:8443","157.85.105.126:443","43.133.110.81:443","45.150.128.159:443","45.150.131.246:443","8.213.199.128:443","101.108.49.121:443"],"AL":["103.167.234.26:443","185.186.77.54:443","89.125.139.115:443","91.239.6.40:443","91.239.6.47:443","91.239.6.51:8443","93.123.113.47:443"],"CL":["129.151.124.127:443","148.116.110.12:8443","64.176.10.195:443","64.176.4.154:8443","64.176.9.246:443","64.176.12.48:443","64.176.15.110:2053"],"GE":["185.104.192.249:443","206.53.48.205:443","80.75.215.113:443","94.43.238.112:2053","94.43.238.112:2083","94.43.238.112:2087","181.215.15.117:443"],"UZ":["157.22.128.7:443","157.22.133.86:443","46.8.194.76:2053","46.8.194.76:8443","94.154.128.132:443","46.8.194.76:443"],"DO":["181.36.229.212:2053","181.36.229.212:2083","181.36.229.212:2087","181.36.229.212:2096","181.36.229.212:443","181.36.229.212:8443"],"CY":["213.111.177.107:443","213.7.187.34:443","194.55.164.118:443","194.55.164.154:8443","194.55.166.65:2087","194.55.166.65:443"],"IR":["31.58.237.199:2096","31.58.237.200:2096","185.212.51.189:443","37.32.46.68:443","185.212.51.16:443"],"KG":["178.219.159.88:443","188.240.213.98:2053","188.240.213.98:8443","95.215.244.116:443"],"MO":["45.202.246.91:8443","45.202.247.198:8443","45.202.247.152:443","45.202.247.198:443"],"AZ":["85.185.86.111:2053","94.20.154.66:443","31.58.237.199:2096","31.58.237.200:2096"],"NG":["102.130.48.155:2053","169.255.57.210:443","176.97.192.162:443"],"NZ":["114.23.136.104:443","185.71.230.237:443","161.29.46.212:443"],"PT":["194.9.62.133:8443","195.133.92.20:443","195.133.92.74:443"],"AR":["43.174.195.1:443","131.255.6.88:443","38.54.45.184:443"],"SA":["130.94.58.215:443","130.94.58.215:8443"],"Unknown":["185.200.64.132:443","195.96.156.92:443"],"SI":["67.221.249.24:443","91.185.215.214:443"],"OM":["130.94.81.80:443","38.54.116.31:2053"],"HR":["5.181.2.41:443","5.181.2.41:8443"],"BH":["149.104.106.219:443"],"KH":["38.54.4.209:443"],"EG":["38.54.59.70:443"],"MK":["89.185.82.188:443"],"EC":["130.94.116.44:443"],"CU":["190.15.158.234:8443"]};
window.POOL_META = {"DE":{"en":"Germany","fa":"\u0622\u0644\u0645\u0627\u0646"},"NL":{"en":"Netherlands","fa":"\u0647\u0644\u0646\u062F"},"US":{"en":"United States","fa":"\u0622\u0645\u0631\u06CC\u06A9\u0627"},"FI":{"en":"Finland","fa":"\u0641\u0646\u0644\u0627\u0646\u062F"},"GB":{"en":"United Kingdom","fa":"\u0628\u0631\u06CC\u062A\u0627\u0646\u06CC\u0627"},"JP":{"en":"Japan","fa":"\u0698\u0627\u067E\u0646"},"FR":{"en":"France","fa":"\u0641\u0631\u0627\u0646\u0633\u0647"},"SG":{"en":"Singapore","fa":"\u0633\u0646\u06AF\u0627\u067E\u0648\u0631"},"LV":{"en":"Latvia","fa":"\u0644\u062A\u0648\u0646\u06CC"},"RU":{"en":"Russia","fa":"\u0631\u0648\u0633\u06CC\u0647"},"HK":{"en":"Hong Kong","fa":"\u0647\u0646\u06AF\u200C\u06A9\u0646\u06AF"},"PL":{"en":"Poland","fa":"\u0644\u0647\u0633\u062A\u0627\u0646"},"SE":{"en":"Sweden","fa":"\u0633\u0648\u0626\u062F"},"CH":{"en":"Switzerland","fa":"\u0633\u0648\u0626\u06CC\u0633"},"EE":{"en":"Estonia","fa":"\u0627\u0633\u062A\u0648\u0646\u06CC"},"ES":{"en":"Spain","fa":"\u0627\u0633\u067E\u0627\u0646\u06CC\u0627"},"KZ":{"en":"Kazakhstan","fa":"\u0642\u0632\u0627\u0642\u0633\u062A\u0627\u0646"},"CZ":{"en":"Czechia","fa":"\u0686\u06A9"},"TR":{"en":"Turkey","fa":"\u062A\u0631\u06A9\u06CC\u0647"},"AT":{"en":"Austria","fa":"\u0627\u062A\u0631\u06CC\u0634"},"CA":{"en":"Canada","fa":"\u06A9\u0627\u0646\u0627\u062F\u0627"},"KR":{"en":"South Korea","fa":"\u06A9\u0631\u0647 \u062C\u0646\u0648\u0628\u06CC"},"BG":{"en":"Bulgaria","fa":"\u0628\u0644\u063A\u0627\u0631\u0633\u062A\u0627\u0646"},"IN":{"en":"India","fa":"\u0647\u0646\u062F"},"DK":{"en":"Denmark","fa":"\u062F\u0627\u0646\u0645\u0627\u0631\u06A9"},"RO":{"en":"Romania","fa":"\u0631\u0648\u0645\u0627\u0646\u06CC"},"AU":{"en":"Australia","fa":"\u0627\u0633\u062A\u0631\u0627\u0644\u06CC\u0627"},"IT":{"en":"Italy","fa":"\u0627\u06CC\u062A\u0627\u0644\u06CC\u0627"},"LT":{"en":"Lithuania","fa":"\u0644\u06CC\u062A\u0648\u0627\u0646\u06CC"},"TW":{"en":"Taiwan","fa":"\u062A\u0627\u06CC\u0648\u0627\u0646"},"AE":{"en":"United Arab Emirates","fa":"\u0627\u0645\u0627\u0631\u0627\u062A"},"MY":{"en":"Malaysia","fa":"\u0645\u0627\u0644\u0632\u06CC"},"IE":{"en":"Ireland","fa":"\u0627\u06CC\u0631\u0644\u0646\u062F"},"MD":{"en":"Moldova","fa":"\u0645\u0648\u0644\u062F\u0627\u0648\u06CC"},"RS":{"en":"Serbia","fa":"\u0635\u0631\u0628\u0633\u062A\u0627\u0646"},"NO":{"en":"Norway","fa":"\u0646\u0631\u0648\u0698"},"IS":{"en":"Iceland","fa":"\u0627\u06CC\u0633\u0644\u0646\u062F"},"VN":{"en":"Vietnam","fa":"\u0648\u06CC\u062A\u0646\u0627\u0645"},"BR":{"en":"Brazil","fa":"\u0628\u0631\u0632\u06CC\u0644"},"CN":{"en":"China","fa":"\u0686\u06CC\u0646"},"BE":{"en":"Belgium","fa":"\u0628\u0644\u0698\u06CC\u06A9"},"GR":{"en":"Greece","fa":"\u06CC\u0648\u0646\u0627\u0646"},"ID":{"en":"Indonesia","fa":"\u0627\u0646\u062F\u0648\u0646\u0632\u06CC"},"MX":{"en":"Mexico","fa":"\u0645\u06A9\u0632\u06CC\u06A9"},"BY":{"en":"Belarus","fa":"\u0628\u0644\u0627\u0631\u0648\u0633"},"IL":{"en":"Israel","fa":"\u0627\u0633\u0631\u0627\u0626\u06CC\u0644"},"SK":{"en":"Slovakia","fa":"\u0627\u0633\u0644\u0648\u0627\u06A9\u06CC"},"ZA":{"en":"South Africa","fa":"\u0622\u0641\u0631\u06CC\u0642\u0627\u06CC \u062C\u0646\u0648\u0628\u06CC"},"UA":{"en":"Ukraine","fa":"\u0627\u0648\u06A9\u0631\u0627\u06CC\u0646"},"HU":{"en":"Hungary","fa":"\u0645\u062C\u0627\u0631\u0633\u062A\u0627\u0646"},"AM":{"en":"Armenia","fa":"\u0627\u0631\u0645\u0646\u0633\u062A\u0627\u0646"},"TH":{"en":"Thailand","fa":"\u062A\u0627\u06CC\u0644\u0646\u062F"},"AL":{"en":"Albania","fa":"\u0622\u0644\u0628\u0627\u0646\u06CC"},"CL":{"en":"Chile","fa":"\u0634\u06CC\u0644\u06CC"},"GE":{"en":"Georgia","fa":"\u06AF\u0631\u062C\u0633\u062A\u0627\u0646"},"UZ":{"en":"Uzbekistan","fa":"\u0627\u0632\u0628\u06A9\u0633\u062A\u0627\u0646"},"DO":{"en":"Dominican Rep.","fa":"\u062F\u0648\u0645\u06CC\u0646\u06CC\u06A9\u0646"},"CY":{"en":"Cyprus","fa":"\u0642\u0628\u0631\u0633"},"IR":{"en":"Iran","fa":"\u0627\u06CC\u0631\u0627\u0646"},"KG":{"en":"Kyrgyzstan","fa":"\u0642\u0631\u0642\u06CC\u0632\u0633\u062A\u0627\u0646"},"MO":{"en":"Macau","fa":"\u0645\u0627\u06A9\u0627\u0626\u0648"},"AZ":{"en":"Azerbaijan","fa":"\u0622\u0630\u0631\u0628\u0627\u06CC\u062C\u0627\u0646"},"NG":{"en":"Nigeria","fa":"\u0646\u06CC\u062C\u0631\u06CC\u0647"},"NZ":{"en":"New Zealand","fa":"\u0646\u06CC\u0648\u0632\u06CC\u0644\u0646\u062F"},"PT":{"en":"Portugal","fa":"\u067E\u0631\u062A\u063A\u0627\u0644"},"AR":{"en":"Argentina","fa":"\u0622\u0631\u0698\u0627\u0646\u062A\u06CC\u0646"},"SA":{"en":"Saudi Arabia","fa":"\u0639\u0631\u0628\u0633\u062A\u0627\u0646"},"Unknown":{"en":"Unknown","fa":"\u0646\u0627\u0645\u0634\u062E\u0635"},"SI":{"en":"Slovenia","fa":"\u0627\u0633\u0644\u0648\u0648\u0646\u06CC"},"OM":{"en":"Oman","fa":"\u0639\u0645\u0627\u0646"},"HR":{"en":"Croatia","fa":"\u06A9\u0631\u0648\u0627\u0633\u06CC"},"BH":{"en":"Bahrain","fa":"\u0628\u062D\u0631\u06CC\u0646"},"KH":{"en":"Cambodia","fa":"\u06A9\u0627\u0645\u0628\u0648\u062C"},"EG":{"en":"Egypt","fa":"\u0645\u0635\u0631"},"MK":{"en":"N. Macedonia","fa":"\u0645\u0642\u062F\u0648\u0646\u06CC\u0647"},"EC":{"en":"Ecuador","fa":"\u0627\u06A9\u0648\u0627\u062F\u0648\u0631"},"CU":{"en":"Cuba","fa":"\u06A9\u0648\u0628\u0627"}};

/* i18n */
I18N.fa["pool.title"] = "Proxy IP Pool";
I18N.fa["pool.sub"] = "\u06AF\u0644\u0686\u06CC\u0646 \u062E\u0648\u062F\u06A9\u0627\u0631 \u0628\u0647\u062A\u0631\u06CC\u0646 IP \u0627\u0632 \u06A9\u0634\u0648\u0631 \u0627\u0646\u062A\u062E\u0627\u0628\u06CC";
I18N.fa["pool.desc"] = "\u06A9\u0634\u0648\u0631 \u0645\u0648\u0631\u062F \u0646\u0638\u0631\u062A \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646 \u062A\u0627 \u0633\u06CC\u0633\u062A\u0645 \u062E\u0648\u062F\u06A9\u0627\u0631 IP \u0647\u0627\u06CC \u0622\u0646 \u06A9\u0634\u0648\u0631 \u0631\u0627 \u062A\u0633\u062A \u0648 \u0628\u0647\u062A\u0631\u06CC\u0646\u200C\u0647\u0627 \u0631\u0627 \u06AF\u0644\u0686\u06CC\u0646 \u06A9\u0646\u062F. \u062A\u0648\u062C\u0647: \u06A9\u0627\u0646\u0641\u06CC\u06AF\u200C\u0647\u0627 \u0641\u0642\u0637 \u0628\u0627 IP \u06A9\u0644\u0627\u062F\u0641\u0644\u0631 (\u2601\uFE0F) \u0633\u0627\u062E\u062A\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F\u061B \u0628\u0631\u0627\u06CC IP \u062B\u0627\u0628\u062A\u0650 \u0648\u0635\u0644\u200C\u0634\u0648\u0646\u062F\u0647 \u0627\u0632 \xAB\u0627\u0633\u06A9\u0646\u0631 IP \u062A\u0645\u06CC\u0632\xBB \u067E\u0627\u06CC\u06CC\u0646 \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u06A9\u0646.";
I18N.fa["pool.search"] = "\u062C\u0633\u062A\u062C\u0648\u06CC \u06A9\u0634\u0648\u0631";
I18N.fa["pool.searchPh"] = "\u0622\u0644\u0645\u0627\u0646\u060C Germany\u060C NL\u060C \u2026";
I18N.fa["pool.selected"] = "\u06A9\u0634\u0648\u0631 \u0627\u0646\u062A\u062E\u0627\u0628\u200C\u0634\u062F\u0647";
I18N.fa["pool.sample"] = "\u062A\u0639\u062F\u0627\u062F \u0646\u0645\u0648\u0646\u0647 \u0628\u0631\u0627\u06CC \u062A\u0633\u062A";
I18N.fa["pool.start"] = "\u062A\u0633\u062A \u062E\u0648\u062F\u06A9\u0627\u0631 \u0648 \u06AF\u0644\u0686\u06CC\u0646";
I18N.fa["pool.lock"] = "\u0642\u0641\u0644 \u0628\u0647\u062A\u0631\u06CC\u0646 IP \u0628\u0647\u200C\u0639\u0646\u0648\u0627\u0646 IP \u062B\u0627\u0628\u062A";
I18N.fa["pool.lockWarn"] = "\u26A0\uFE0F \u0641\u0642\u0637 IP \u06A9\u0644\u0627\u062F\u0641\u0644\u0631 \u0642\u0627\u0628\u0644 \u0642\u0641\u0644 \u0634\u062F\u0646 \u0627\u0633\u062A \u2014 \u0627\u06CC\u0646 IP \u062F\u06CC\u062A\u0627\u0633\u0646\u062A\u0631 \u0627\u0633\u062A \u0648 \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0628\u0627 \u0622\u0646 \u0648\u0635\u0644 \u0646\u0645\u06CC\u200C\u0634\u0648\u062F";
I18N.fa["pool.nocflock"] = "\u26A0\uFE0F \u0627\u06CC\u0646 IP \u06A9\u0644\u0627\u062F\u0641\u0644\u0631 \u0646\u06CC\u0633\u062A \u2014 \u06A9\u0627\u0646\u0641\u06CC\u06AF \u0628\u0627 \u0622\u0646 \u0648\u0635\u0644 \u0646\u0645\u06CC\u200C\u0634\u0648\u062F. \u0628\u0631\u0627\u06CC IP \u062B\u0627\u0628\u062A\u0650 \u0648\u0635\u0644\u200C\u0634\u0648\u0646\u062F\u0647 \u0627\u0632 \xAB\u0627\u0633\u06A9\u0646\u0631 IP \u062A\u0645\u06CC\u0632\xBB \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u06A9\u0646.";
I18N.fa["pool.empty"] = "\u0647\u0646\u0648\u0632 \u06A9\u0634\u0648\u0631\u06CC \u0627\u0646\u062A\u062E\u0627\u0628 \u0646\u0634\u062F\u0647";
I18N.fa["pool.fixed"] = "IP \u062B\u0627\u0628\u062A \u0641\u0639\u0644\u06CC";
I18N.fa["pool.fixedD"] = "\u0648\u0642\u062A\u06CC \u062E\u0627\u0644\u06CC \u0628\u0627\u0634\u062F\u060C \u06A9\u0627\u0646\u0641\u06CC\u06AF\u200C\u0647\u0627 \u0627\u0632 \u0628\u06CC\u0646 IP \u0647\u0627\u06CC \u062A\u0645\u06CC\u0632 \u062A\u0635\u0627\u062F\u0641\u06CC \u0627\u0646\u062A\u062E\u0627\u0628 \u0645\u06CC\u200C\u06A9\u0646\u0646\u062F";
I18N.fa["pool.unlock"] = "\u0628\u0627\u0632 \u06A9\u0631\u062F\u0646";
I18N.fa["pool.done"] = "\u062A\u0633\u062A \u062A\u0645\u0627\u0645 \u0634\u062F \u2014 \u0628\u0647\u062A\u0631\u06CC\u0646\u200C\u0647\u0627 \u0628\u0627\u0644\u0627 \u06AF\u0644\u0686\u06CC\u0646 \u0634\u062F\u0646\u062F \u2713";
I18N.fa["pool.none"] = "\u0647\u06CC\u0686 IP \u0633\u0627\u0644\u0645\u06CC \u062F\u0631 \u0627\u06CC\u0646 \u06A9\u0634\u0648\u0631 \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F";
I18N.fa["pool.best"] = "\u0628\u0647\u062A\u0631\u06CC\u0646";
I18N.fa["pool.cf"] = "\u06A9\u0644\u0627\u062F\u0641\u0644\u0631 \u2713";
I18N.fa["pool.nocf"] = "\u062F\u06CC\u062A\u0627\u0633\u0646\u062A\u0631";
I18N.fa["pool.locked"] = "IP \u062B\u0627\u0628\u062A \u0642\u0641\u0644 \u0634\u062F \u2713 \u2014 \u06A9\u0627\u0646\u0641\u06CC\u06AF\u200C\u0647\u0627 \u0627\u0632 \u0627\u0644\u0627\u0646 \u0628\u0627 \u0647\u0645\u06CC\u0646 IP \u0633\u0627\u062E\u062A\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F";
I18N.fa["pool.unlocked"] = "\u0642\u0641\u0644 IP \u062B\u0627\u0628\u062A \u0628\u0627\u0632 \u0634\u062F \u2014 \u06A9\u0627\u0646\u0641\u06CC\u06AF\u200C\u0647\u0627 \u062F\u0648\u0628\u0627\u0631\u0647 \u062A\u0635\u0627\u062F\u0641\u06CC \u0627\u0632 IP \u0647\u0627\u06CC \u062A\u0645\u06CC\u0632 \u0627\u0646\u062A\u062E\u0627\u0628 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F";
I18N.fa["pool.note"] = "\u26A0\uFE0F \u0627\u06CC\u0646 \u0644\u06CC\u0633\u062A \u0627\u0632 \u0627\u0633\u06A9\u0646 \u0633\u0631\u0627\u0633\u0631\u06CC \u062C\u0645\u0639 \u0634\u062F\u0647 \u0648 IP\u0647\u0627\u06CC\u0634 \xAB\u062F\u06CC\u062A\u0627\u0633\u0646\u062A\u0631\xBB \u0647\u0633\u062A\u0646\u062F \u0646\u0647 \u06A9\u0644\u0627\u062F\u0641\u0644\u0631 \u2014 \u06A9\u0627\u0646\u0641\u06CC\u06AF\u0650 \u0633\u0627\u062E\u062A\u0647\u200C\u0634\u062F\u0647 \u0628\u0627 \u0622\u0646\u200C\u0647\u0627 \u0648\u0635\u0644 \u0646\u0645\u06CC\u200C\u0634\u0648\u062F. \u06A9\u0627\u0646\u0641\u06CC\u06AF\u200C\u0647\u0627 \u0641\u0642\u0637 \u0628\u0627 IP \u06A9\u0644\u0627\u062F\u0641\u0644\u0631 (\u2601\uFE0F) \u0633\u0627\u062E\u062A\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F. \u0628\u0631\u0627\u06CC IP \u062B\u0627\u0628\u062A\u0650 \u0648\u0627\u0642\u0639\u0627\u064B \u0648\u0635\u0644\u200C\u0634\u0648\u0646\u062F\u0647\u060C \u0627\u0632 \xAB\u0627\u0633\u06A9\u0646\u0631 IP \u062A\u0645\u06CC\u0632\xBB \u067E\u0627\u06CC\u06CC\u0646 \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u06A9\u0646 \u0648 \u0628\u0647\u062A\u0631\u06CC\u0646 IP \u0631\u0627 \u0628\u0627 \u062F\u06A9\u0645\u0647\u0654 \u{1F512} \u0642\u0641\u0644 \u06A9\u0646.";
I18N.fa["pool.running"] = "\u062F\u0631 \u062D\u0627\u0644 \u062A\u0633\u062A IP \u0647\u0627\u06CC \u06A9\u0634\u0648\u0631 \u0627\u0646\u062A\u062E\u0627\u0628\u06CC\u2026";
I18N.fa["pool.selCount"] = "IP";
I18N.fa["scan.lock"] = "\u{1F512} IP \u062B\u0627\u0628\u062A";
I18N.fa["set.fixedip"] = "IP \u062B\u0627\u0628\u062A (\u0627\u062E\u062A\u06CC\u0627\u0631\u06CC)";
I18N.fa["set.fixedipD"] = "\u0648\u0642\u062A\u06CC \u0633\u062A \u0634\u0648\u062F\u060C \u0647\u0645\u0647\u0654 \u06A9\u0627\u0646\u0641\u06CC\u06AF\u200C\u0647\u0627 \u0628\u0627 \u0647\u0645\u06CC\u0646 IP \u0633\u0627\u062E\u062A\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F (\u0628\u062F\u0648\u0646 \u0686\u0631\u062E\u0634 \u062A\u0635\u0627\u062F\u0641\u06CC). \u062E\u0627\u0644\u06CC = \u062A\u0635\u0627\u062F\u0641\u06CC \u0627\u0632 \u0628\u06CC\u0646 IP \u0647\u0627\u06CC \u062A\u0645\u06CC\u0632";

I18N.en["pool.title"] = "Proxy IP Pool";
I18N.en["pool.sub"] = "Auto-test & pick the best IP of a country";
I18N.en["pool.desc"] = "Pick a country and the system auto-tests its IPs and selects the best ones. Note: configs are only ever built with Cloudflare IPs (\u2601\uFE0F); for a working fixed IP use the Clean IP Scanner below.";
I18N.en["pool.search"] = "Search country";
I18N.en["pool.searchPh"] = "Germany, \u0627\u06CC\u0631\u0627\u0646, NL, \u2026";
I18N.en["pool.selected"] = "Selected country";
I18N.en["pool.sample"] = "Sample size to test";
I18N.en["pool.start"] = "Auto-test & pick best";
I18N.en["pool.lock"] = "Lock best IP as fixed IP";
I18N.en["pool.lockWarn"] = "\u26A0\uFE0F Only Cloudflare IPs can be locked \u2014 this is a datacenter IP and configs won't connect";
I18N.en["pool.nocflock"] = "\u26A0\uFE0F Not a Cloudflare IP \u2014 configs won't connect. Use the Clean IP Scanner for a working fixed IP.";
I18N.en["pool.empty"] = "No country selected yet";
I18N.en["pool.fixed"] = "Current fixed IP";
I18N.en["pool.fixedD"] = "When empty, configs pick a random clean IP";
I18N.en["pool.unlock"] = "Unlock";
I18N.en["pool.done"] = "Test finished \u2014 best picked above \u2713";
I18N.en["pool.none"] = "No alive IP found in this country";
I18N.en["pool.best"] = "best";
I18N.en["pool.cf"] = "Cloudflare \u2713";
I18N.en["pool.nocf"] = "datacenter";
I18N.en["pool.locked"] = "Fixed IP locked \u2713 \u2014 configs now use this IP";
I18N.en["pool.unlocked"] = "Fixed IP unlocked \u2014 configs pick randomly again";
I18N.en["pool.note"] = "\u26A0\uFE0F This list comes from a global scan and its IPs are datacenter IPs, not Cloudflare \u2014 configs built with them will NOT connect. Configs are only ever built with Cloudflare IPs (\u2601\uFE0F). For a truly working fixed IP, use the Clean IP Scanner below and lock its best IP with \u{1F512}.";
I18N.en["pool.running"] = "Testing the selected country's IPs\u2026";
I18N.en["pool.selCount"] = "IPs";
I18N.en["scan.lock"] = "\u{1F512} Fixed IP";
I18N.en["set.fixedip"] = "Fixed IP (optional)";
I18N.en["set.fixedipD"] = "When set, all configs use this IP (no random rotation). Empty = random from clean IPs";

window.POOL = (() => {
  const P = (typeof PROXY_POOL !== "undefined" && PROXY_POOL) ? PROXY_POOL : {};
  const M = (typeof POOL_META !== "undefined" && POOL_META) ? POOL_META : {};

  /* Cloudflare IPv4 ranges (official, for the \u2601\uFE0F badge & the lock guard) */
  const CF = ["173.245.48.0/20","103.21.244.0/22","103.22.200.0/22","103.31.4.0/22","141.101.64.0/18","108.162.192.0/18","190.93.240.0/20","188.114.96.0/20","197.234.240.0/22","198.41.128.0/17","162.158.0.0/15","104.16.0.0/13","104.24.0.0/14","172.64.0.0/13","131.0.72.0/22"];
  function isCf(ip) {
    const b = ip.split(".").map(Number);
    if (b.length !== 4 || b.some((x) => isNaN(x) || x < 0 || x > 255)) return false;
    const v = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
    for (const c of CF) {
      const [ip2, bits] = c.split("/");
      const p = ip2.split(".").map(Number);
      const base = ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
      const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
      if ((v & mask) === (base & mask)) return true;
    }
    return false;
  }

  const flag = (cc) => cc === "Unknown" ? "\u{1F3F3}\uFE0F" : String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1F1E6 + c.charCodeAt(0) - 65));
  const ccName = (cc) => { const m = M[cc] || { en: cc, fa: cc }; return LANG === "fa" ? m.fa : m.en; };

  const S = { selected: null, running: false, ctl: null, tested: 0, alive: 0, dead: 0, results: [], lockArmed: false };
  const countries = Object.keys(P).sort((a, b) => P[b].length - P[a].length);

  // Liveness is checked SERVER-SIDE: the worker opens a raw TCP connection to
  // each ip:port (datacenter IPs rarely speak valid HTTPS, so a browser fetch
  // always failed). Returns the same shape as before: { ip, port, min, alive }.
  async function probeBatch(items) {
    const addrs = items.map((it) => (it.port !== 443 ? \`\${it.ip}:\${it.port}\` : it.ip));
    try {
      const res = await api("/api/pooltest", { method: "POST", body: { list: addrs } });
      if (!res.ok) throw new Error("http " + res.status);
      const j = await res.json();
      const byAddr = new Map((j.results || []).map((r) => [r.addr, r]));
      return items.map((it, i) => {
        const r = byAddr.get(addrs[i]);
        return { ip: it.ip, port: it.port, min: r && r.ok ? Math.max(1, Math.round(r.ms)) : null, alive: !!(r && r.ok) };
      });
    } catch (e) {
      return items.map((it) => ({ ip: it.ip, port: it.port, min: null, alive: false }));
    }
  }

  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function renderGrid() {
    const q = ($("#poolSearch").value || "").trim().toLowerCase();
    const el = $("#poolGrid");
    const rows = countries.filter((cc) => {
      if (!q) return true;
      return cc.toLowerCase().includes(q) || ccName(cc).toLowerCase().includes(q) || (M[cc] && M[cc].en.toLowerCase().includes(q));
    });
    el.innerHTML = rows.map((cc) =>
      \`<div class="country-chip \${cc === S.selected ? "on" : ""}" data-cc="\${cc}" onclick="POOL.select('\${cc}')">
        <span class="fl">\${flag(cc)}</span><span class="nm">\${ccName(cc)}</span><span class="cnt">\${num(P[cc].length)}</span>
      </div>\`).join("") || \`<div class="empty">\u2014</div>\`;
  }

  function select(cc) {
    S.selected = cc;
    S.lockArmed = false;
    $("#poolLock").classList.add("hidden");
    renderGrid();
    const el = $("#poolSel");
    el.innerHTML = \`\${flag(cc)} <b>\${ccName(cc)}</b> \xB7 <span style="color:var(--muted);font-family:var(--mono)">\${num(P[cc].length)} \${t("pool.selCount")}</span>\`;
    $("#poolStatus").textContent = t("pool.selCount") + ": " + num(P[cc].length);
    $("#poolStart").classList.remove("hidden");
    $("#poolList").innerHTML = \`<div class="empty">\${t("pool.empty")}</div>\`;
    $("#poolTop").innerHTML = "";
  }

  function aliveList() { return S.results.filter((r) => r.alive).sort((a, b) => a.min - b.min); }

  async function scan() {
    if (!S.selected) { toast(t("pool.empty")); return; }
    if (S.running) return;
    let list = P[S.selected].slice();
    const sample = +($("#poolSample").value || 100);
    if (sample > 0 && list.length > sample) list = shuffle(list).slice(0, sample);
    const queue = list.map((e) => { const i = e.lastIndexOf(":"); return { ip: e.slice(0, i), port: +e.slice(i + 1) || 443 }; });
    if (!queue.length) { toast(t("pool.none")); return; }

    S.running = true; S.ctl = new AbortController(); S.results = []; S.tested = S.alive = S.dead = 0; S.lockArmed = false;
    $("#poolStart").classList.add("hidden");
    $("#poolStop").classList.remove("hidden");
    $("#poolLock").classList.add("hidden");
    $("#poolStatus").textContent = t("pool.running");
    renderCounters(); renderList(true);

    // test in chunks through the worker's TCP probe
    const CHUNK = 40;
    for (let off = 0; off < queue.length && !S.ctl.signal.aborted; off += CHUNK) {
      const batch = await probeBatch(queue.slice(off, off + CHUNK));
      if (S.ctl.signal.aborted) break;
      for (const r of batch) {
        S.tested++;
        if (r.alive) S.alive++; else S.dead++;
        S.results.push(r);
      }
      renderCounters();
      renderList(false);
    }
    S.running = false;
    $("#poolStart").classList.remove("hidden");
    $("#poolStop").classList.add("hidden");
    $("#poolStatus").textContent = t("pool.done");
    renderList(false); renderTop();
    const best = aliveList()[0];
    // Only a Cloudflare IP can be locked as a fixed connect address \u2014 a
    // datacenter IP would build configs that never connect.
    if (best && isCf(best.ip)) $("#poolLock").classList.remove("hidden");
    else if (best) toast(t("pool.nocflock"));
  }

  function stop() { if (S.ctl) S.ctl.abort(); S.running = false; $("#poolStart").classList.remove("hidden"); $("#poolStop").classList.add("hidden"); $("#poolStatus").textContent = t("pool.done"); }

  function renderCounters() {
    $("#poTested").textContent = num(S.tested);
    $("#poAlive").textContent = num(S.alive);
    $("#poDead").textContent = num(S.dead);
    const total = queueLen();
    const pct = total ? Math.min(100, Math.round((S.tested / total) * 100)) : 0;
    $("#poolBar").style.width = pct + "%";
    $("#poolBar").textContent = pct + "%";
  }

  function queueLen() {
    if (!S.selected) return 0;
    const sample = +($("#poolSample").value || 100);
    return sample > 0 ? Math.min(sample, P[S.selected].length) : P[S.selected].length;
  }

  function renderList(forceEmpty) {
    const el = $("#poolList");
    const list = aliveList();
    if (forceEmpty || (!list.length && !S.running)) { el.innerHTML = \`<div class="empty">\${S.running ? t("pool.running") : t("pool.none")}</div>\`; return; }
    if (!list.length) { el.innerHTML = \`<div class="empty">\${t("pool.running")}</div>\`; return; }
    const max = Math.max(...list.map((r) => r.min));
    el.innerHTML = list.slice(0, 60).map((r) => {
      const w = Math.max(4, Math.round((r.min / max) * 100));
      const cls = r.min < 120 ? "ok" : r.min < 300 ? "warn" : "bad";
      const cf = isCf(r.ip);
      return \`<div class="scan-row" onclick="POOL.copy('\${r.ip}:\${r.port}')" title="\${t("scan.copy")}">
        <code class="scan-ip">\${r.ip}</code><span class="scan-port">:\${r.port}</span>
        <span class="cf-badge \${cf ? "cf" : "nocf"}">\${cf ? "\u2601\uFE0F " + t("pool.cf") : "\u26A0 " + t("pool.nocf")}</span>
        <div class="scan-latbar"><div class="scan-latfill" style="width:\${w}%"></div></div>
        <code class="scan-ms \${cls}">\${r.min}ms</code>
      </div>\`;
    }).join("");
  }

  function renderTop() {
    const el = $("#poolTop");
    const list = aliveList().slice(0, 5);
    if (!list.length) { el.innerHTML = ""; return; }
    el.innerHTML = list.map((r, i) =>
      \`<div class="top-chip" onclick="POOL.copy('\${r.ip}:\${r.port}')"><span class="top-rank">\${i + 1}</span><code>\${r.ip}:\${r.port}</code><b>\${r.min}ms</b></div>\`).join("");
  }

  function copy(txt) { try { navigator.clipboard.writeText(txt).then(() => toast(txt)); } catch (e) {} }

  async function lockFixed(addr) {
    if (MODE !== "live") { toast(t("toast.preview")); return; }
    // Guard every lock path (pool, scanner, manual): the fixed IP must be a
    // Cloudflare edge IP or the generated configs can never connect.
    const ip = String(addr || "").split(":")[0];
    if (!isCf(ip)) { toast(t("pool.nocflock")); return; }
    const res = await api("/api/settings", { method: "POST", body: { fixedIp: addr } });
    if (res.ok) { if (state.settings) state.settings.fixedIp = addr; toast(t("pool.locked")); renderFixed(); }
    else toast(t("common.error"));
  }

  async function poolLock() {
    const best = aliveList()[0];
    if (!best) { toast(t("pool.none")); return; }
    // Hard rule: only Cloudflare edge IPs can front the worker.
    if (!isCf(best.ip)) { toast(t("pool.nocflock")); return; }
    const addr = best.port !== 443 ? \`\${best.ip}:\${best.port}\` : best.ip;
    await lockFixed(addr);
  }

  async function unlock() {
    if (MODE !== "live") { toast(t("toast.preview")); return; }
    const res = await api("/api/settings", { method: "POST", body: { fixedIp: "" } });
    if (res.ok) { if (state.settings) state.settings.fixedIp = ""; toast(t("pool.unlocked")); renderFixed(); }
    else toast(t("common.error"));
  }

  function renderFixed() {
    const cur = (state.settings && state.settings.fixedIp) || "";
    const el = $("#poolFixed");
    if (cur && !isCf(cur.split(":")[0])) {
      // Legacy datacenter lock \u2014 configs IGNORE it and use a clean CF IP.
      el.innerHTML = \`\u{1F512} <code>\${cur}</code> <span class="cf-badge nocf">\u26A0 \${t("pool.nocf")}</span> <span class="cf-badge nocf" style="color:var(--bad)">\${t("pool.lockWarn")}</span>\`;
    } else {
      el.innerHTML = cur ? \`\u{1F512} <code>\${cur}</code> <span class="cf-badge cf">\u2601\uFE0F \${t("pool.cf")}</span>\` : "\u2014";
    }
    $("#poolUnlock").classList.toggle("hidden", !cur);
    if (cur && $("#setFixedIp")) $("#setFixedIp").value = cur;
  }

  function note() {
    const el = $("#poolNote");
    if (el) el.innerHTML = t("pool.note");
  }

  function onOpen() { renderFixed(); note(); }

  /* wire UI */
  function initUI() {
    $("#poolSearch").addEventListener("input", renderGrid);
    $("#poolStart").onclick = scan;
    $("#poolStop").onclick = stop;
    $("#poolLock").onclick = poolLock;
    $("#poolUnlock").onclick = unlock;
    $("#poolSample").onchange = renderCounters;
    $("#scanLock").onclick = () => {
      const top = (window.SCANNER && SCANNER.topAlive && SCANNER.topAlive()) || [];
      if (!top.length) { toast(t("scan.none")); return; }
      lockFixed(top[0]);
    };
    if (window.SCANNER && SCANNER.onOpen) {
      const orig = SCANNER.onOpen;
      SCANNER.onOpen = () => { orig(); onOpen(); };
    }
    renderGrid();
    renderFixed();
    note();
    applyLang();
  }
  initUI();
  return { select, copy, onOpen, _countries: countries.length };
})();
<\/script>

</body>
</html>
`,B="0.7.2",ve=["https://raw.githubusercontent.com/XIU2/CloudflareSpeedTest/master/ip.txt","https://raw.githubusercontent.com/vfarid/cf-clean-ips/main/list.txt"],Se=/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g,T=null;async function Ue(){if(T&&Date.now()-T.at<10*6e4)return T.ips;let t=new Set,e=s=>Promise.race([fetch(s),new Promise((n,o)=>setTimeout(()=>o(new Error("timeout")),8e3))]);for(let s of ve)try{let o=await(await e(s)).text(),i,a=0;for(;(i=Se.exec(o))&&a<4e3;){let c=i[1];c.split(".").map(Number).every(d=>d>=0&&d<=255)&&!c.startsWith("0.")&&(t.add(c),a++)}}catch{}let r=[...t];return T={ips:r,at:Date.now()},r}var Kt=(t,e=200)=>new Response(t,{status:e,headers:{"content-type":"text/html; charset=utf-8"}});function Re(t){return t.headers.set("access-control-allow-origin","*"),t}var lr={async fetch(t,e,r){try{At(),r.waitUntil(It(e));let s=new URL(t.url),n=s.pathname,o=await pt(e);if((t.headers.get("Upgrade")||"").toLowerCase()==="websocket")return Ce(t,e,o);if(n==="/admin"||n==="/admin/")return Kt(qt);if(n.startsWith("/api/"))return Re(await Qe(t,e,o,s));if(n.startsWith("/sub/"))return He(t,e,o,n);let i=n.match(/^\/([0-9a-fA-F-]{36})\/?$/);return i?De(t,e,o,i[1]):n==="/health"?g({ok:!0,name:o.title}):o.host===v.host?Kt(qt):Response.redirect("https://www.cloudflare.com",302)}catch(s){return g({error:String(s)},500)}}};function Be(t){let e=new WebSocketPair,[r,s]=Object.values(e);s.accept();let n=JSON.stringify({ok:!0,panel:"nika",v:B});try{s.send(n)}catch{}return setTimeout(()=>{try{s.close()}catch{}},2e3),new Response(null,{status:101,webSocket:r})}async function Ce(t,e,r){let s=new URL(t.url);if(s.searchParams.get("probe")==="nika")return Be(t);let n=(s.searchParams.get("proto")||t.headers.get("x-nika-proto")||"").toLowerCase(),o=await A(e),i=s.searchParams.get("uuid")||"";if(i){let a=o.find(c=>c.uuid.toLowerCase()===i.toLowerCase());return a?a.active?n==="trojan"?ot(t,o,r,e):nt(t,o,r,e):g({error:"user inactive"},403):g({error:"no user for this uuid"},403)}return n==="trojan"?ot(t,o,r,e):nt(t,o,r,e)}async function Qe(t,e,r,s){let n=s.pathname.replace("/api/",""),o=t.method.toUpperCase();if(n==="info")return g({name:r.title,setup:!r.adminPassHash,protocols:r.protocols,version:B});if(n==="update/check"){let i=await Le();return g({current:B,latest:i.version,notes:i.notes||"",upToDate:Oe(B,i.version)>=0})}if(n==="ips"){let i=await Ue();return g({ips:i,count:i.length})}if(n==="login"&&o==="POST"){let a=(await t.json().catch(()=>({}))).password||"",c=!r.adminPassHash;if(c){if(!a||a.length<4)return g({error:"password too short"},400);r.adminPassHash=await Z(a),await G(e,r)}if(!(r.adminPassHash===await Z(a)))return g({error:"wrong password"},401);let d=await X(r.sessionSecret,JSON.stringify({t:Date.now()}));await E(e,{icon:c?"\u{1F6E0}":"\u{1F510}",text:c?"\u0646\u0635\u0628 \u0627\u0648\u0644\u06CC\u0647 \u067E\u0646\u0644 \u2014 \u0631\u0645\u0632 \u0627\u062F\u0645\u06CC\u0646 \u062B\u0628\u062A \u0634\u062F":"\u0648\u0631\u0648\u062F \u0627\u062F\u0645\u06CC\u0646 \u0628\u0647 \u067E\u0646\u0644",time:Date.now()});let m=g({ok:!0,setup:c});return m.headers.set("set-cookie",`${$}=${encodeURIComponent(d)}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax`),m}if(n==="logout"){let i=g({ok:!0});return i.headers.set("set-cookie",`${$}=; HttpOnly; Path=/; Max-Age=0`),i}if(!await ft(t,r))return g({error:"unauthorized"},401);switch(n){case"status":{let i=await A(e);return g({title:r.title,setup:!1,users:i.length,active:i.filter(a=>a.active).length,usedGb:Math.round(i.reduce((a,c)=>a+(c.used||0),0)*100)/100,requestsToday:await kt(e),requestsTotal:await Et(e),protocols:r.protocols,activity:await St(e),traffic7d:await vt(e)})}case"users":{let i=await A(e);if(o==="GET")return g(i);if(o==="POST"){let a=await t.json().catch(()=>({})),c={id:crypto.randomUUID(),name:a.name||"\u06A9\u0627\u0631\u0628\u0631",uuid:crypto.randomUUID(),password:ut(),quota:Number(a.quota)||50,used:0,days:Number(a.days)||30,active:!0,createdAt:Date.now()};return i.push(c),await U(e,i),await E(e,{icon:"\u{1F464}",text:`\u06A9\u0627\u0631\u0628\u0631 \u0633\u0627\u062E\u062A\u0647 \u0634\u062F \u2014 ${c.name}`,time:Date.now()}),g(c)}if(o==="DELETE"){let a=s.searchParams.get("id"),c=i.find(d=>d.id===a),l=i.filter(d=>d.id!==a);return await U(e,l),await E(e,{icon:"\u{1F5D1}",text:`\u06A9\u0627\u0631\u0628\u0631 \u062D\u0630\u0641 \u0634\u062F \u2014 ${c?.name||a}`,time:Date.now()}),g({ok:!0})}break}case"users/toggle":{if(o!=="POST")break;let i=await t.json().catch(()=>({})),a=await A(e),c=a.find(l=>l.id===i.id);return c?(c.active=!c.active,await U(e,a),await E(e,{icon:c.active?"\u{1F7E2}":"\u26D4",text:`${c.name} ${c.active?"\u0641\u0639\u0627\u0644":"\u063A\u06CC\u0631\u0641\u0639\u0627\u0644"} \u0634\u062F`,time:Date.now()}),g({ok:!0,active:c.active})):g({error:"not found"},404)}case"settings":{if(o==="GET")return g(r);if(o==="POST"){let i=await t.json().catch(()=>({})),a={...r};return typeof i.title=="string"&&(a.title=i.title),typeof i.host=="string"&&(a.host=i.host),typeof i.sni=="string"&&(a.sni=i.sni),typeof i.wsPath=="string"&&(a.wsPath=i.wsPath),Array.isArray(i.cleanIps)&&(a.cleanIps=i.cleanIps),typeof i.fixedIp=="string"&&(a.fixedIp=i.fixedIp.trim()),typeof i.relayDomain=="string"&&(a.relayDomain=i.relayDomain.trim()),i.protocols&&(a.protocols={...r.protocols,...i.protocols}),M(a),await G(e,a),await E(e,{icon:"\u2699\uFE0F",text:"\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u067E\u0646\u0644 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0634\u062F",time:Date.now()}),g({ok:!0})}break}case"pooltest":{if(o!=="POST")break;let i=await t.json().catch(()=>({})),a=Array.isArray(i.list)?i.list.filter(d=>typeof d=="string"):[];if(!a.length)return g({results:[],elapsed:0});let c=Date.now(),l=await Rt(a);return g({results:l,elapsed:Date.now()-c})}case"gen":{let i=s.searchParams.get("id"),c=(await A(e)).find(d=>d.id===i);if(!c)return g({error:"user not found"},404);let l={...r,host:at(t,r)};return g({user:{id:c.id,name:c.name,quota:c.quota,used:Math.round((c.used||0)*100)/100,days:c.days,active:c.active},base64:N(c,l),clash:tt(c,l),singbox:et(c,l),warp:r.protocols.warp?bt(c):null})}case"update/apply":{if(o!=="POST")break;let i=await t.json().catch(()=>({})),a=await Ne(e,r,i.token||"");return g(a,a.ok?200:400)}}return g({error:"not found"},404)}function at(t,e){let r=(e.host||"").trim();return r&&r!==v.host?r:new URL(t.url).hostname}async function He(t,e,r,s){let n=s.replace("/sub/",""),o=n.split("/")[0].split(".")[0],i=n.split(".").pop()?.toLowerCase()||"",c=(await A(e)).find(u=>u.password===o||u.uuid.replace(/-/g,"").slice(0,12)===o);if(!c)return g({error:"invalid token"},404);let l=t.headers.get("Accept")||"",d=t.headers.get("Sec-Fetch-Dest")||"",m=t.headers.get("Sec-Fetch-Mode")||"",h=d==="document"||m==="navigate";if(l.includes("text/html")&&h){let u=new URL(t.url).origin;return new Response(Pt({name:c.name,active:!!c.active,quota:Number(c.quota)||0,used:Math.round((c.used||0)*100)/100,days:Number(c.days)||0,origin:u,token:o,version:B,protocols:r.protocols}),{headers:{"content-type":"text/html; charset=utf-8"}})}let x=i==="yaml"||i==="yml",b=i==="json",f={...r,host:at(t,r)},w=x?tt(c,f):b?et(c,f):N(c,f);return new Response(w,{headers:{"content-type":x?"text/yaml":b?"application/json":"text/plain"}})}async function De(t,e,r,s){let o=(await A(e)).find(c=>c.uuid.toLowerCase()===s.toLowerCase());if(!o)return g({error:"unknown uuid"},404);let i={...r,host:at(t,r)},a=N(o,i);return new Response(a,{headers:{"content-type":"text/plain"}})}var Tt="https://raw.githubusercontent.com/NikaTeem/Nika-Net/main",st=null,Yt=0;async function Le(){if(st&&Date.now()-Yt<3e5)return st;try{let t=await fetch(`${Tt}/version.json`,{cf:{cacheTtl:300}});if(!t.ok)throw new Error("fetch failed");let e=await t.json();return st=e,Yt=Date.now(),e}catch{return{version:B,notes:""}}}function Oe(t,e){let r=t.split(".").map(n=>parseInt(n,10)||0),s=e.split(".").map(n=>parseInt(n,10)||0);for(let n=0;n<3;n++){let o=(r[n]||0)-(s[n]||0);if(o!==0)return o}return 0}async function Ne(t,e,r){if(!r||r.length<20)return{ok:!1,error:"token required"};let s=await H(r,"/user/tokens/verify");if(!s?.success)return{ok:!1,error:s?.errors?.[0]?.message||"\u062A\u0648\u06A9\u0646 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A"};let o=(await H(r,"/accounts?per_page=50"))?.result?.[0]?.id;if(!o)return{ok:!1,error:"\u0627\u06A9\u0627\u0646\u062A\u06CC \u0628\u0627 \u0627\u06CC\u0646 \u062A\u0648\u06A9\u0646 \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F"};let i=(e.host||"").split(".")[0];if(!i)return{ok:!1,error:"\u0627\u0628\u062A\u062F\u0627 Host \u0648\u0631\u06A9\u0631 \u0631\u0627 \u062F\u0631 \u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0648\u0627\u0631\u062F \u06A9\u0646"};let a=await Ct(r,o,[`nika-${i}-kv`,`${i}-kv`]),c=await fetch(`${Tt}/dist/worker.js`);if(!c.ok)return{ok:!1,error:"\u062F\u0631\u06CC\u0627\u0641\u062A \u0622\u062E\u0631\u06CC\u0646 \u0646\u0633\u062E\u0647 \u0645\u0645\u06A9\u0646 \u0646\u0634\u062F"};let l=await c.text(),m=await Qt(r,o,i,l,a?[{type:"kv_namespace",name:"NIKA_KV",namespace_id:a}]:[]);return m.ok?(await Ht(r,o,i),await E(t,{icon:"\u{1F504}",text:"\u067E\u0646\u0644 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0634\u062F",time:Date.now()}),{ok:!0}):{ok:!1,error:m.err}}export{lr as default};
