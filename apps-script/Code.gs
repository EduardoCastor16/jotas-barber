const SHEET_ID='1MWCe2Nlxwy-DphNaYL7jdS3bGBw7sDAkzCpuFXmjnc4';
const TZ='America/Sao_Paulo';
function doPost(e){try{const b=JSON.parse(e.postData.contents),secret=PropertiesService.getScriptProperties().getProperty('API_SECRET');if(!secret||b.secret!==secret)throw Error('Acesso negado');let result;if(b.action==='catalog')result={services:services_(),ready:cfg_().horarios_exemplo==='NAO'&&rows_('Horarios').some(r=>String(r.ativo).toUpperCase()==='TRUE'),emailInvites:false,barberPhone:String(cfg_().barbeiro_whatsapp||'').replace(/\D/g,'')};else if(b.action==='availability')result={slots:slots_(b).slots};else if(b.action==='book')result=book_(b);else if(b.action==='lookup')result=lookup_(b);else if(b.action==='admin-club-list')result=clubList_();else if(b.action==='admin-club-create')result=clubCreate_(b);else if(b.action==='admin-club-update')result=clubUpdate_(b);else if(b.action==='admin-list')result=adminList_();else if(b.action==='admin-payment')result=adminPayment_(b);else if(b.action==='admin-hours')result=adminHours_(b);else if(b.action==='admin-config')result=adminConfig_();else if(b.action==='admin-approve')result={message:aprovarReserva(b.id)};else if(b.action==='admin-reject')result={message:rejeitarReserva(b.id)};else throw Error('Ação inválida');return output_({ok:true,...result})}catch(x){return output_({ok:false,error:String(x.message||x)})}}
function output_(x){return ContentService.createTextOutput(JSON.stringify(x)).setMimeType(ContentService.MimeType.JSON)}
function sh_(n){return SpreadsheetApp.openById(SHEET_ID).getSheetByName(n)}
function rows_(n){const a=sh_(n).getDataRange().getValues(),h=a.shift();return a.filter(r=>r[0]!==''&&r[0]!==null).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])))}
function cfg_(){return Object.fromEntries(rows_('Configuracoes').map(r=>[r.chave,String(r.valor)]))}
function services_(){return rows_('Servicos').filter(r=>(r.ativo===true||String(r.ativo).toUpperCase()==='TRUE')&&r.preco_reais!==''&&r.duracao_min!==''&&Number(r.duracao_min)>0).map(r=>({id:String(r.id),name:String(r.nome),description:String(r.descricao),price:Number(r.preco_reais),minutes:Number(r.duracao_min)}))}
function cal_(){const id=cfg_().calendar_id||'primary',c=id==='primary'?CalendarApp.getDefaultCalendar():CalendarApp.getCalendarById(id);if(!c)throw Error('Agenda não encontrada');return c}
function dt_(d,t){if(!/^\d{4}-\d\d-\d\d$/.test(d)||!/^\d\d:\d\d$/.test(t))throw Error('Data inválida');const x=new Date(d+'T'+t+':00-03:00');if(isNaN(x.getTime())||Utilities.formatDate(x,TZ,'yyyy-MM-dd HH:mm')!==d+' '+t)throw Error('Data inválida');return x}
function selected_(ids){if(!Array.isArray(ids)||!ids.length||ids.length>7||new Set(ids).size!==ids.length)throw Error('Serviços inválidos');return ids.map(id=>{const s=services_().find(x=>x.id===id);if(!s)throw Error('Serviço indisponível');return s})}
function activeBookings_(date,events,calendar){const sheet=sh_('Reservas'),data=sheet.getDataRange().getValues(),headers=data[0],col=n=>headers.indexOf(n),statusCol=col('status'),startCol=col('inicio_iso'),endCol=col('fim_iso'),eventCol=col('evento_calendar_id');if([statusCol,startCol,endCol,eventCol].some(i=>i<0))throw Error('Colunas de reservas incompletas');const day=dt_(date,'00:00').getTime(),next=day+86400000,eventIds=new Set(events.map(ev=>ev.getId())),active=[];data.slice(1).forEach((row,i)=>{if(!['confirmada','aguardando_pix'].includes(String(row[statusCol])))return;const start=new Date(row[startCol]).getTime(),end=new Date(row[endCol]).getTime();if(!(start<next&&end>day))return;const id=String(row[eventCol]||'');if(id&&!eventIds.has(id)){if(!calendar.getEventById(id))sheet.getRange(i+2,statusCol+1).setValue('cancelada');return}active.push({inicio_iso:row[startCol],fim_iso:row[endCol]})});return active}
function slots_(b){const cfg=cfg_();if(cfg.horarios_exemplo!=='NAO')throw Error('Agenda em configuração: confirme os horários na planilha');const date=String(b.date||''),day=dt_(date,'00:00'),now=new Date(),list=selected_(b.services),duration=list.reduce((n,s)=>n+s.minutes,0);if(day.getTime()>now.getTime()+Number(cfg.dias_antecedencia||30)*86400000)throw Error('Data fora do período');const weekday=(day.getUTCDay()+6)%7+1,r=rows_('Horarios').find(x=>Number(x.dia_semana_1_seg_7_dom)===weekday);if(!r||!(r.ativo===true||String(r.ativo).toUpperCase()==='TRUE'))return {slots:[],list,duration};const open=dt_(date,String(r.abre)),close=dt_(date,String(r.fecha)),bs=r.intervalo_inicio?dt_(date,String(r.intervalo_inicio)):null,be=r.intervalo_fim?dt_(date,String(r.intervalo_fim)):null;const calendar=cal_(),events=calendar.getEvents(day,new Date(day.getTime()+86400000)),bookings=activeBookings_(date,events,calendar),slots=[];for(let t=open.getTime();t+duration*60000<=close.getTime();t+=Number(cfg.grade_minutos||15)*60000){const end=t+duration*60000;if(t<now.getTime()+Number(cfg.min_antecedencia_horas||2)*3600000)continue;if(bs&&be&&t<be.getTime()&&end>bs.getTime())continue;if(events.some(ev=>ev.isAllDayEvent()||t<ev.getEndTime().getTime()&&end>ev.getStartTime().getTime()))continue;if(bookings.some(x=>t<new Date(x.fim_iso).getTime()&&end>new Date(x.inicio_iso).getTime()))continue;slots.push(Utilities.formatDate(new Date(t),TZ,'HH:mm'))}return {slots,list,duration}}
function hash_(s){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s).map(b=>('0'+(b&255).toString(16)).slice(-2)).join('')}
function phone_(s){const p=String(s||'').replace(/\D/g,'');if(!/^55\d{10,11}$/.test(p))throw Error('WhatsApp inválido');return p}
function email_(value){const email=String(value||'').trim().toLowerCase();if(email&&(email.length>254||!/^\S+@\S+\.\S+$/.test(email)))throw Error('E-mail inválido');return email}
// Fluxo seguro: pedido fica aguardando conferência manual do Pix.
// O calendário só recebe evento depois que o responsável aprova o sinal.
function book_(b){
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(20000))throw Error('Agenda ocupada. Tente novamente');
  try{
    const date=String(b.date||''),time=String(b.time||'');
    const name=String(b.name||'').trim().replace(/[\r\n]/g,' ').slice(0,90);
    const phone=phone_(b.phone),email=email_(b.email);
    if(name.length<3)throw Error('Informe seu nome');
    const result=slots_(b);
    if(!result.slots.includes(time))throw Error('Horário indisponível. Escolha outro');
    const start=dt_(date,time),end=new Date(start.getTime()+result.duration*60000);
    const id=Utilities.getUuid(),code=Utilities.getUuid().replace(/-/g,'').slice(0,12).toUpperCase();
    const names=result.list.map(s=>s.name).join(', ');
    const total=result.list.reduce((n,s)=>n+s.price,0);
    sh_('Reservas').appendRow([id,new Date(),start.toISOString(),end.toISOString(),result.list.map(s=>s.id).join(','),names,total,name,phone,'aguardando_pix','',hash_(code),false,'pix','',email]);
    return {id,code,date,time,services:names,status:'aguardando_pix',emailInvited:false,message:'Solicitação recebida. Horário ainda não confirmado: aguarde conferência do sinal Pix.'};
  }finally{lock.releaseLock()}
}
// Execute esta função no editor do Apps Script, após trocar o ID por uma reserva real.
// NUNCA exponha esta função como ação pública do doPost.
function aprovarReserva(id){
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(20000))throw Error('Tente novamente');
  try{
    const sh=sh_('Reservas'),v=sh.getDataRange().getValues(),h=v[0];
    const col=k=>h.indexOf(k),idx=v.findIndex((r,i)=>i>0&&String(r[col('id')])===String(id));
    if(idx<1)throw Error('Reserva não encontrada');
    const r=v[idx],status=String(r[col('status')]);
    if(status!=='aguardando_pix')throw Error('Reserva não está aguardando Pix: '+status);
    const start=new Date(r[col('inicio_iso')]),end=new Date(r[col('fim_iso')]);
    const cal=cal_(),overlap=cal.getEvents(start,end).some(ev=>ev.isAllDayEvent()||ev.getStartTime()<end&&ev.getEndTime()>start);
    if(overlap)throw Error('Conflito com evento existente. Não confirme');
    const ev=cal.createEvent('Jota | '+r[col('nome_cliente')],start,end,{description:'Reserva '+id+' | '+r[col('servicos_nomes')]+' | '+r[col('telefone_e164')]});
    sh.getRange(idx+1,col('evento_calendar_id')+1).setValue(ev.getId());
    sh.getRange(idx+1,col('sinal_confirmado')+1).setValue(true);
    sh.getRange(idx+1,col('status')+1).setValue('confirmada');
    return 'Reserva confirmada: '+id;
  }finally{lock.releaseLock()}
}
function rejeitarReserva(id){
  const sh=sh_('Reservas'),v=sh.getDataRange().getValues(),h=v[0],idCol=h.indexOf('id'),statusCol=h.indexOf('status');
  const idx=v.findIndex((r,i)=>i>0&&String(r[idCol])===String(id));
  if(idx<1)throw Error('Reserva não encontrada');
  if(String(v[idx][statusCol])!=='aguardando_pix')throw Error('Somente solicitações pendentes podem ser rejeitadas');
  sh.getRange(idx+1,statusCol+1).setValue('rejeitada');
  return 'Solicitação rejeitada: '+id;
}
function testarIntegracao(){
  const cal=cal_();
  const sh=sh_('Reservas');
  Logger.log(JSON.stringify({agenda:cal.getName(),planilha:sh.getParent().getName(),servicos:services_().length}));
}
function adminList_(){
 const items=rows_('Reservas').map(r=>({id:String(r.id),date:Utilities.formatDate(new Date(r.inicio_iso),TZ,'dd/MM/yyyy'),time:Utilities.formatDate(new Date(r.inicio_iso),TZ,'HH:mm'),month:Utilities.formatDate(new Date(r.inicio_iso),TZ,'yyyy-MM'),services:String(r.servicos_nomes),name:String(r.nome_cliente),phone:String(r.telefone_e164),price:Number(r.total_reais)||0,status:String(r.status),paymentStatus:String(r.pagamento_status||'nao_pago'),amountPaid:Number(r.valor_pago)||0,created:String(r.criado_em)})).reverse();
 return {bookings:items.slice(0,500),count:items.length}
}
function adminPayment_(b){
 const lock=LockService.getScriptLock();if(!lock.tryLock(20000))throw Error('Tente novamente');
 try{
  const sheet=sh_('Reservas'),a=sheet.getDataRange().getValues(),h=a[0],idCol=h.indexOf('id'),statusCol=h.indexOf('status'),payCol=h.indexOf('pagamento_status'),valueCol=h.indexOf('valor_pago');
  if(payCol<0||valueCol<0)throw Error('Adicione as colunas pagamento_status e valor_pago na planilha');
  const i=a.findIndex((r,k)=>k>0&&String(r[idCol])===String(b.id));if(i<1)throw Error('Reserva não encontrada');
  if(['rejeitada','cancelada'].includes(String(a[i][statusCol])))throw Error('Reserva cancelada ou rejeitada');
  const status=String(b.paymentStatus||''),paid=Number(b.amountPaid);
  if(!['nao_pago','parcial','pago'].includes(status)||!isFinite(paid)||paid<0||paid>Number(a[i][h.indexOf('total_reais')]))throw Error('Pagamento inválido');
  if(status==='pago'&&paid!==Number(a[i][h.indexOf('total_reais')]))throw Error('Para marcar como pago, informe o valor total');
  if(status==='nao_pago'&&paid!==0)throw Error('Valor pago deve ser zero');
  sheet.getRange(i+1,payCol+1).setValue(status);sheet.getRange(i+1,valueCol+1).setValue(paid);
  return {message:'Pagamento atualizado'}
 }finally{lock.releaseLock()}
}
function adminConfig_(){return {hours:rows_('Horarios').map(r=>({weekday:Number(r.dia_semana_1_seg_7_dom),open:String(r.abre||''),close:String(r.fecha||''),breakStart:String(r.intervalo_inicio||''),breakEnd:String(r.intervalo_fim||''),active:String(r.ativo).toUpperCase()==='TRUE'})),ready:cfg_().horarios_exemplo==='NAO'}}
function adminHours_(b){
 const lock=LockService.getScriptLock();if(!lock.tryLock(20000))throw Error('Tente novamente');
 try{
  const day=Number(b.weekday),active=b.active===true,open=String(b.open||''),close=String(b.close||''),bs=String(b.breakStart||''),be=String(b.breakEnd||'');
  if(!Number.isInteger(day)||day<1||day>7)throw Error('Dia inválido');
  const toMin=s=>{if(!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(s))throw Error('Horário inválido');return Number(s.slice(0,2))*60+Number(s.slice(3))};
  if(active){if(toMin(close)<=toMin(open))throw Error('Fechamento deve ser depois da abertura');if(bs||be){if(!bs||!be||toMin(bs)<toMin(open)||toMin(be)>toMin(close)||toMin(be)<=toMin(bs))throw Error('Intervalo inválido')}}
  const sh=sh_('Horarios'),a=sh.getDataRange().getValues(),h=a[0],col=k=>h.indexOf(k),idx=a.findIndex((r,i)=>i>0&&Number(r[col('dia_semana_1_seg_7_dom')])===day);
  if(idx<1)throw Error('Dia não encontrado');
  [['abre',open],['fecha',close],['intervalo_inicio',bs],['intervalo_fim',be],['ativo',active]].forEach(([k,v])=>sh.getRange(idx+1,col(k)+1).setValue(v));
  const conf=sh_('Configuracoes'),v=conf.getDataRange().getValues(),ch=v.findIndex((r,i)=>i>0&&r[0]==='horarios_exemplo');if(ch>0)conf.getRange(ch+1,2).setValue('NAO');
  return {message:'Horários atualizados'}
 }finally{lock.releaseLock()}
}

function lookup_(b){const name=String(b.name||'').trim().toLocaleLowerCase('pt-BR'),phone=phone_(b.phone),code=String(b.code||'').trim().toUpperCase();if(name.length<3||! /^[A-F0-9]{12}$/.test(code))throw Error('Dados inválidos');return {bookings:rows_('Reservas').filter(r=>String(r.nome_cliente).trim().toLocaleLowerCase('pt-BR')===name&&String(r.telefone_e164)===phone&&String(r.codigo_hash)===hash_(code)).map(r=>({date:Utilities.formatDate(new Date(r.inicio_iso),TZ,'dd/MM/yyyy'),time:Utilities.formatDate(new Date(r.inicio_iso),TZ,'HH:mm'),services:r.servicos_nomes,status:r.status}))}}

const CLUB_PRICES={essencial:[7490,11290,14990],classico:[11490,16990,22490],estilo:[9990,14990,19790],premium:[13890,20490,26990]};
function clubSheet_(){const ss=SpreadsheetApp.openById(SHEET_ID);let sh=ss.getSheetByName('Pacotes');if(!sh){sh=ss.insertSheet('Pacotes');sh.appendRow(['id','cliente','telefone','plano','quantidade','valor_centavos','recebido_centavos','inicio','vencimento','utilizados','historico']);sh.setFrozenRows(1)}return sh}
function clubLock_(fn){const l=LockService.getScriptLock();l.waitLock(20000);try{return fn()}finally{l.releaseLock()}}
function clubList_(){return clubLock_(()=>({packages:clubSheet_().getDataRange().getValues().slice(1).filter(r=>r[0]).map(r=>({id:r[0],name:r[1],phone:String(r[2]),plan:r[3],qty:r[4],price:r[5],paid:r[6],start:String(r[7]),end:String(r[8]),used:r[9],history:String(r[10]||'')}))}))}
function clubCreate_(b){return clubLock_(()=>{const qty=Number(b.qty),prices=CLUB_PRICES[b.plan],name=String(b.name||'').trim().slice(0,90),phone=phone_(b.phone),start=String(b.start),end=String(b.end);if(!prices||![2,3,4].includes(qty)||name.length<3||/^[=+@-]/.test(name))throw Error('Dados inválidos');if(dt_(end,'00:00')<dt_(start,'00:00'))throw Error('Validade inválida');clubSheet_().appendRow([Utilities.getUuid(),name,phone,b.plan,qty,prices[qty-2],0,"'"+start,"'"+end,0,'']);return {message:'Pacote cadastrado'}})}
function clubUpdate_(b){return clubLock_(()=>{const sh=clubSheet_(),a=sh.getDataRange().getValues(),i=a.findIndex((r,k)=>k>0&&r[0]===b.id);if(i<1)throw Error('Pacote não encontrado');const r=a[i],today=Utilities.formatDate(new Date(),TZ,'yyyy-MM-dd');if(b.kind==='payment'){const paid=Number(b.paid);if(!Number.isInteger(paid)||paid<0||paid>r[5])throw Error('Valor inválido');r[6]=paid}else if(b.kind==='use'){if(r[6]<r[5]||r[9]>=r[4]||today<String(r[7])||today>String(r[8]))throw Error('Pacote sem saldo, não quitado ou fora da validade');r[9]++;r[10]=String(r[10]||'')+today+' | Atendimento realizado\\n'}else throw Error('Operação inválida');sh.getRange(i+1,7).setValue(r[6]);sh.getRange(i+1,10,1,2).setValues([[r[9],r[10]]]);return {message:'Pacote atualizado'}})}
