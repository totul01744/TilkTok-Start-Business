/* ================================================
   Creator2Business — Data Engine (localStorage)
   ================================================ */

const STORE_KEY = 'c2b_main';
const ADMIN_PASS_KEY = 'c2b_adm_pass';
const AGENCY_URL = 'https://nexora-pilot.vercel.app/';

/* ── RAW STORAGE ─────────────────────────── */
const LS = {
  get(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch{ return null; } },
  set(k,v){ localStorage.setItem(k, JSON.stringify(v)); },
  del(k){ localStorage.removeItem(k); },
};

/* ── MAIN DATA ───────────────────────────── */
function getData(){ return LS.get(STORE_KEY) || {}; }
function setData(d){ LS.set(STORE_KEY, d); }

/* ── USERS ────────────────────────────────
   কীভাবে এটা কাজ করে:
   - ইউজার ফর্ম fill করলে localStorage-এ সেভ হয়
   - Admin approve করলে সেই ইউজারের status 'approved' হয়
   - ইউজার পরের বার নম্বর দিলে status check হয়
   ─────────────────────────────────────── */
const Users = {
  getAll(){ const d=getData(); return d.users||[]; },
  getByPhone(phone){
    return this.getAll().find(u=> normalizePhone(u.whatsapp)===normalizePhone(phone));
  },
  add(data){
    const d=getData();
    if(!d.users) d.users=[];
    const user={
      ...data,
      id: Date.now(),
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };
    d.users.unshift(user);
    setData(d);
    return user;
  },
  update(phone, updates){
    const d=getData();
    if(!d.users) return;
    const i=d.users.findIndex(u=>normalizePhone(u.whatsapp)===normalizePhone(phone));
    if(i!==-1) d.users[i]={...d.users[i],...updates};
    setData(d);
  },
  getCurrentPhone(){ return localStorage.getItem('c2b_phone')||''; },
  setCurrentPhone(p){ localStorage.setItem('c2b_phone',p); },
  clearCurrentPhone(){ localStorage.removeItem('c2b_phone'); },
};

/* ── TASKS ────────────────────────────── */
const Tasks = {
  getAll(){ const d=getData(); return d.tasks||[]; },
  saveAll(tasks){ const d=getData(); d.tasks=tasks; setData(d); },
  getProgress(phone){
    const d=getData(); const k='prog_'+normalizePhone(phone);
    return d[k]||{};
  },
  setDone(phone,day,done){
    const d=getData(); const k='prog_'+normalizePhone(phone);
    if(!d[k]) d[k]={};
    if(done) d[k]['d'+day]=true; else delete d[k]['d'+day];
    setData(d);
  },
};

/* ── PRODUCTS ─────────────────────────── */
const Products = {
  getAll(){ const d=getData(); return d.products||[]; },
  add(p){
    const d=getData(); if(!d.products) d.products=[];
    const prod={...p,id:'p_'+Date.now(),createdAt:new Date().toISOString(),active:true};
    d.products.unshift(prod); setData(d); return prod;
  },
  update(id,updates){
    const d=getData();
    const i=(d.products||[]).findIndex(p=>p.id===id);
    if(i!==-1) d.products[i]={...d.products[i],...updates};
    setData(d);
  },
  delete(id){
    const d=getData(); d.products=(d.products||[]).filter(p=>p.id!==id); setData(d);
  },
};

/* ── ORDERS ───────────────────────────── */
const Orders = {
  getAll(){ const d=getData(); return d.orders||[]; },
  getByPhone(phone){ return this.getAll().filter(o=>normalizePhone(o.userPhone)===normalizePhone(phone)); },
  add(o){
    const d=getData(); if(!d.orders) d.orders=[];
    const order={...o,id:'o_'+Date.now(),date:new Date().toISOString(),status:'pending'};
    d.orders.unshift(order); setData(d); return order;
  },
  update(id,updates){
    const d=getData();
    const i=(d.orders||[]).findIndex(o=>o.id===id);
    if(i!==-1) d.orders[i]={...d.orders[i],...updates};
    setData(d);
  },
};

/* ── NOTIFICATIONS ────────────────────── */
const Notifs = {
  getAll(){ const d=getData(); return (d.notifs||[]).filter(n=>n.active); },
  add(n){
    const d=getData(); if(!d.notifs) d.notifs=[];
    const notif={...n,id:'n_'+Date.now(),createdAt:new Date().toISOString(),active:true};
    d.notifs.unshift(notif); setData(d);
  },
  delete(id){
    const d=getData();
    const i=(d.notifs||[]).findIndex(n=>n.id===id);
    if(i!==-1) d.notifs[i].active=false;
    setData(d);
  },
};

/* ── HELP MESSAGES ────────────────────── */
const HelpMsgs = {
  getAll(){ const d=getData(); return d.helpMsgs||[]; },
  add(m){
    const d=getData(); if(!d.helpMsgs) d.helpMsgs=[];
    d.helpMsgs.unshift({...m,id:'h_'+Date.now(),date:new Date().toISOString(),status:'new'});
    setData(d);
  },
  update(id,updates){
    const d=getData();
    const i=(d.helpMsgs||[]).findIndex(h=>h.id===id);
    if(i!==-1) d.helpMsgs[i]={...d.helpMsgs[i],...updates};
    setData(d);
  },
};

/* ── SETTINGS ─────────────────────────── */
const Settings = {
  get(){ return LS.get('c2b_settings')||{}; },
  set(s){ LS.set('c2b_settings',s); },
  getAdminPass(){ return localStorage.getItem(ADMIN_PASS_KEY)||'admin123'; },
  setAdminPass(p){ localStorage.setItem(ADMIN_PASS_KEY,p); },
  isAdmin(){ return localStorage.getItem('c2b_adm')==='1'; },
  setAdmin(v){ if(v) localStorage.setItem('c2b_adm','1'); else localStorage.removeItem('c2b_adm'); },
};

/* ── HELPERS ──────────────────────────── */
function normalizePhone(p){
  if(!p) return '';
  return p.replace(/\D/g,'').replace(/^880/,'0').replace(/^88/,'0');
}
function fmtDate(iso){
  if(!iso) return '—';
  return new Date(iso).toLocaleDateString('bn-BD',{day:'numeric',month:'short',year:'numeric'})
    +' '+new Date(iso).toLocaleTimeString('bn-BD',{hour:'2-digit',minute:'2-digit'});
}
function fmtBDT(n){ return '৳'+(+n||0).toLocaleString('bn-BD'); }
function sanitize(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function dlJSON(data,name){
  const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=name; a.click();
}

/* ── AI ENGINE ────────────────────────── */
const AI = {
  async call(prompt){
    const ak=localStorage.getItem('c2b_ak')||'';
    if(!ak) throw new Error('API Key সেট করা নেই। Settings → ⚙️ থেকে দিন।');
    const r=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':ak,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:4000,system:'Respond ONLY with valid JSON. No markdown backticks.',messages:[{role:'user',content:prompt}]}),
    });
    if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.error?.message||'API Error '+r.status);}
    const data=await r.json();
    return JSON.parse(data.content.map(c=>c.text||'').join('').replace(/```json|```/g,'').trim());
  },
};

/* ── TOAST ────────────────────────────── */
const Toast={
  el:null,
  init(){
    if(!document.querySelector('.tc')){this.el=document.createElement('div');this.el.className='tc';document.body.appendChild(this.el);}
    else this.el=document.querySelector('.tc');
  },
  show(msg,type='info',ms=3400){
    if(!this.el)this.init();
    const icons={success:'✅',error:'❌',info:'ℹ️',warning:'⚠️'};
    const t=document.createElement('div');t.className='toast '+type[0];
    t.innerHTML=`<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
    this.el.appendChild(t);
    setTimeout(()=>{t.style.cssText='opacity:0;transform:translateX(18px);transition:.3s';setTimeout(()=>t.remove(),310);},ms);
  },
  success(m){this.show(m,'success');},error(m){this.show(m,'error');},
  info(m){this.show(m,'info');},warning(m){this.show(m,'warning');},
};

/* ── MODAL ────────────────────────────── */
const Modal={
  show(id){document.getElementById(id)?.classList.remove('hidden');},
  hide(id){document.getElementById(id)?.classList.add('hidden');},
};

document.addEventListener('DOMContentLoaded',()=>{
  Toast.init();
  document.querySelector('.hmb')?.addEventListener('click',()=>{
    document.querySelector('.nav')?.classList.toggle('open');
  });
  document.querySelectorAll('.mo').forEach(o=>{
    o.addEventListener('click',e=>{if(e.target===o)o.classList.add('hidden');});
  });
});
