const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const enc=new TextEncoder();
const hex=a=>Array.from(new Uint8Array(a)).map(b=>b.toString(16).padStart(2,'0')).join('');
async function mac(secret,value){const k=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',k,enc.encode(value)))}
function equal(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
async function authorized(request,env){if(!env.ADMIN_SECRET)return false;const cookie=(request.headers.get('Cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('jotas_admin='))?.slice(12);if(!cookie)return false;const [expiry,sig]=cookie.split('.');if(!/^\d{10,13}$/.test(expiry)||Number(expiry)<Date.now())return false;return equal(sig,await mac(env.ADMIN_SECRET,expiry))}
async function upstream(env,action,body){if(!env.APPS_SCRIPT_URL||!env.API_SECRET)throw Error('Integração do Google ainda não configurada');const response=await fetch(env.APPS_SCRIPT_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({...body,action,secret:env.API_SECRET}),redirect:'follow'});const raw=await response.text();let data;try{data=JSON.parse(raw)}catch{throw Error('Resposta inválida do Google Apps Script')};return data}
export default{async fetch(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(!path.startsWith('/api/'))return env.ASSETS.fetch(request);
 if(request.method!=='POST')return json({ok:false,error:'Método inválido'},405);
 if(request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)return json({ok:false,error:'Origem não autorizada'},403);
 const action=path.slice(5);
 if(action==='admin-login'){
  if(!env.ADMIN_SECRET)return json({ok:false,error:'ADMIN_SECRET ainda não configurado no Cloudflare'},503);
  let body;try{body=await request.json()}catch{return json({ok:false,error:'JSON inválido'},400)}
  if(!equal(body.password,env.ADMIN_SECRET))return json({ok:false,error:'Senha incorreta'},401);
  const expiry=String(Date.now()+8*60*60*1000),sig=await mac(env.ADMIN_SECRET,expiry);
  return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':`jotas_admin=${expiry}.${sig}; Path=/api/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`}});
 }
 if(action==='admin-logout')return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Set-Cookie':'jotas_admin=; Path=/api/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'}});
 const admin=['admin-list','admin-approve','admin-reject','admin-payment','admin-hours','admin-config','admin-club-list','admin-club-create','admin-club-update'].includes(action);
 if(admin&&!(await authorized(request,env)))return json({ok:false,error:'Sessão expirada. Faça login novamente.'},401);
 if(!admin&&!['catalog','availability','book','lookup'].includes(action))return json({ok:false,error:'Rota inválida'},404);
 // Until Pix details and Google Apps Script deployment are verified, do not accept real bookings.
 if(action==='book'&&env.BOOKING_ENABLED!=='true')return json({ok:false,error:'Agendamento online aguardando ativação e conferência do Pix.'},503);
 try{const body=await request.json();const result=await upstream(env,action,body);return json(result,result.ok?200:400)}catch(e){return json({ok:false,error:String(e.message||e)},502)}
}};
