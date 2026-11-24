const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const enc=new TextEncoder();
const hex=a=>Array.from(new Uint8Array(a)).map(b=>b.toString(16).padStart(2,'0')).join('');
async function mac(secret,value){const k=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',k,enc.encode(value)))}
async function passwordHash(env,password,salt){const k=await crypto.subtle.importKey('raw',enc.encode(await mac(env.CLIENT_SECRET,password)),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},k,256))}
const saltNew=()=>hex(crypto.getRandomValues(new Uint8Array(16)));
const validPassword=p=>typeof p==='string'&&p.length>=8&&p.length<=128;
function equal(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
const tooManyAttempts=()=>json({ok:false,error:'Muitas tentativas. Aguarde um minuto e tente novamente.'},429);
async function authAllowed(request,env,action,phone){
 const ip=request.headers.get('CF-Connecting-IP')||'unknown';
 if(!(await env.AUTH_IP_LIMIT.limit({key:action+':'+ip})).success)return false;
 if(!phone)return true;
 const account=await mac(env.CLIENT_SECRET,'auth-rate:'+phone);
 return (await env.AUTH_ACCOUNT_LIMIT.limit({key:account})).success;
}
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
  if(!(await authAllowed(request,env,action)))return tooManyAttempts();
  let body;try{body=await request.json()}catch{return json({ok:false,error:'JSON inválido'},400)}
  if(!equal(body?.password,env.ADMIN_SECRET))return json({ok:false,error:'Senha incorreta'},401);
  const expiry=String(Date.now()+8*60*60*1000),sig=await mac(env.ADMIN_SECRET,expiry);
  return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':`jotas_admin=${expiry}.${sig}; Path=/api/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`}});
 }
 if(action==='admin-logout')return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Set-Cookie':'jotas_admin=; Path=/api/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'}});
 if(action.startsWith('client-')){
  if(!env.CLIENT_SECRET)return json({ok:false,error:'Área do cliente em configuração'},503);
  try{
   const cookie=(value,age)=>new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':`jotas_client=${value}; Path=/api/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`}});
   if(action==='client-logout')return cookie('',0);
   const session=async d=>{const value=[d.phone,d.version,Date.now()+86400000].join('.');return cookie(value+'.'+await mac(env.CLIENT_SECRET,value),86400)};
   if(action==='client-register'||action==='client-login'){const b=await request.json();if(typeof b?.phone!=='string'||!/^55\d{10,11}$/.test(b.phone)||!validPassword(b.password))return json({ok:false,error:'Dados inválidos'},400);
    if(!(await authAllowed(request,env,action,b.phone)))return tooManyAttempts();
    if(action==='client-register'){const salt=saltNew(),hash=await passwordHash(env,b.password,salt),d=await upstream(env,action,{phone:b.phone,name:b.name,salt,hash});return d.ok?session(d):json({ok:false,error:d.error},400)}
    const d=await upstream(env,'client-credential',{phone:b.phone});if(!d.ok)return json({ok:false,error:'Acesso indisponível'},503);const hash=await passwordHash(env,b.password,d.salt);if(!d.version||!equal(hash,d.hash)||(d.expires&&d.expires<=Date.now()))return json({ok:false,error:'Telefone ou senha inválidos'},401);return session({phone:b.phone,version:d.version})}

   if(!['client-profile','client-change'].includes(action))return json({ok:false,error:'Rota inválida'},404);
   const raw=(request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('jotas_client='))?.slice(13)||'';
   const [phone,version,expiry,sig]=raw.split('.');
   if(!/^55\d{10,11}$/.test(phone)||!version||!/^\d{13}$/.test(expiry||'')||Number(expiry)<=Date.now()||!equal(sig,await mac(env.CLIENT_SECRET,[phone,version,expiry].join('.'))))return json({ok:false,error:'Entre novamente'},401);
   if(action==='client-change'){const b=await request.json();if(!validPassword(b.password))return json({ok:false,error:'Senha inválida'},400);const salt=saltNew(),hash=await passwordHash(env,b.password,salt),d=await upstream(env,action,{phone,version,salt,hash});return d.ok?session(d):json({ok:false,error:d.error},400)}
   const d=await upstream(env,action,{phone,version});return json(d,d.ok?200:401);
  }catch{return json({ok:false,error:'Não foi possível acessar a conta'},502)}
 }
 const admin=['admin-client-find','admin-client-verify','admin-client-access','admin-list','admin-approve','admin-reject','admin-payment','admin-hours','admin-config','admin-club-list','admin-club-create','admin-club-update'].includes(action);
 if(admin&&!(await authorized(request,env)))return json({ok:false,error:'Sessão expirada. Faça login novamente.'},401);
 if(!admin&&!['catalog','availability','book','lookup'].includes(action))return json({ok:false,error:'Rota inválida'},404);
 // Until Pix details and Google Apps Script deployment are verified, do not accept real bookings.
 if(action==='book'&&env.BOOKING_ENABLED!=='true')return json({ok:false,error:'Agendamento online aguardando ativação e conferência do Pix.'},503);
 try{const body=await request.json();if(action==='admin-client-access'){if(!env.CLIENT_SECRET)return json({ok:false,error:'CLIENT_SECRET ausente'},503);const password=saltNew(),salt=saltNew(),hash=await passwordHash(env,password,salt),d=await upstream(env,action,{phone:body.phone,salt,hash});return json(d.ok?{ok:true,code:password}:d,d.ok?200:400)}const result=await upstream(env,action,body);return json(result,result.ok?200:400)}catch(e){return json({ok:false,error:String(e.message||e)},502)}
}};
