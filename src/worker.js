export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (request.method !== 'POST') return Response.json({ok:false,error:'Método inválido'},{status:405});
    const action = url.pathname.slice(5);
    // Não criar reservas sem fluxo de sinal Pix e aprovação manual.
    if (action === 'book') return Response.json({ok:false,error:'Agendamentos ainda não habilitados: aguardando integração exclusiva do Jota e aprovação do sinal Pix.'},{status:503});
    if (!['catalog','availability','book','lookup'].includes(action)) return Response.json({ok:false,error:'Rota inválida'},{status:404});
    if (!env.APPS_SCRIPT_URL) return Response.json({ok:false,error:'Falta APPS_SCRIPT_URL no Worker'},{status:503});
    if (!env.API_SECRET) return Response.json({ok:false,error:'Falta API_SECRET no Worker'},{status:503});
    try {
      const body = await request.json();
      let data, failure;
      for (let attempt = 0; attempt < (action === 'book' ? 1 : 2); attempt++) {
        const upstream = await fetch(env.APPS_SCRIPT_URL, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({...body,action,secret:env.API_SECRET}),
          redirect:'follow'
        });
        const raw = await upstream.text();
        try { data = JSON.parse(raw); break; }
        catch {
          const type = (upstream.headers.get('content-type') || 'sem tipo').split(';')[0];
          const host = new URL(upstream.url).hostname;
          const title = raw.match(/<title[^>]*>([^<]{0,80})<\/title>/i)?.[1]?.trim() || '';
          failure = `Apps Script respondeu HTTP ${upstream.status} (${type}, ${host}${title ? ', '+title : ''})`;
        }
      }
      if (!data) return Response.json({ok:false,error:failure},{status:502});
      return Response.json(data,{status:data.ok?200:400,headers:{'Cache-Control':'no-store'}});
    } catch (error) {
      return Response.json({ok:false,error:`Falha de conexão com Apps Script (${error?.name || 'erro'})`},{status:502});
    }
  }
};
