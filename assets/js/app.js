/* ====================================================
   Creator2Business — Core Engine  v2.0
   ==================================================== */

// ─── CONFIG ───────────────────────────────────────────
const C = {
  API : 'https://api.anthropic.com/v1/messages',
  MDL : 'claude-sonnet-4-20250514',
  SK  : 'c2b_v2',           // localStorage root key
  ADMIN_PASS_KEY : 'c2b_admin_pass',
  API_KEY_SK     : 'c2b_ak',
};

// ─── STORE ────────────────────────────────────────────
const Store = {
  _g(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch{ return null; } },
  _s(k,v){ localStorage.setItem(k, JSON.stringify(v)); },
  _r(k){ localStorage.removeItem(k); },

  getData(){ return this._g(C.SK) || {}; },
  setData(d){ this._s(C.SK, d); },

  /* ---------- USER AUTH / PROFILE ---------- */
  getProfile(){
    const d = this.getData();
    return d.profile || null;
  },
  saveProfile(p){
    const d = this.getData();
    d.profile = { ...p, submittedAt: new Date().toISOString(), status: 'pending' };
    this.setData(d);
  },
  getStatus(){
    // returns: 'none' | 'pending' | 'approved' | 'rejected'
    const p = this.getProfile();
    if(!p) return 'none';
    return p.status || 'pending';
  },

  /* ---------- ADMIN AUTH ---------- */
  isAdmin(){ return this._g('c2b_adm') === true; },
  setAdmin(v){ this._s('c2b_adm', v); },
  getAdminPass(){ return localStorage.getItem(C.ADMIN_PASS_KEY) || 'admin123'; },
  setAdminPass(p){ localStorage.setItem(C.ADMIN_PASS_KEY, p); },

  /* ---------- API KEY ---------- */
  getAK(){ return this._g(C.API_KEY_SK) || ''; },
  setAK(k){ this._s(C.API_KEY_SK, k); },

  /* ---------- REGISTRATIONS ---------- */
  getRegistrations(){
    const d = this.getData();
    return d.regs || [];
  },
  addRegistration(p){
    const d = this.getData();
    if(!d.regs) d.regs = [];
    const reg = { ...p, id: Date.now(), submittedAt: new Date().toISOString(), status: 'pending' };
    d.regs.unshift(reg);
    // also set local profile
    d.profile = reg;
    this.setData(d);
    return reg;
  },
  updateRegistration(id, upd){
    const d = this.getData();
    if(!d.regs) return;
    const i = d.regs.findIndex(r => r.id === id);
    if(i !== -1) d.regs[i] = { ...d.regs[i], ...upd };
    // sync profile if it's the same user
    if(d.profile && d.profile.id === id) d.profile = { ...d.profile, ...upd };
    this.setData(d);
  },

  /* ---------- 90-DAY TASKS ---------- */
  getTasks(){
    const d = this.getData();
    return d.tasks || []; // array of {day:1..90, title, description, type}
  },
  saveTasks(tasks){
    const d = this.getData();
    d.tasks = tasks;
    this.setData(d);
  },
  getUserTaskProgress(){
    const d = this.getData();
    return d.taskProgress || {}; // {dayNum: true/false}
  },
  setTaskDone(day, done){
    const d = this.getData();
    if(!d.taskProgress) d.taskProgress = {};
    d.taskProgress[day] = done;
    this.setData(d);
  },

  /* ---------- MARKETPLACE ---------- */
  getProducts(){
    const d = this.getData();
    return d.products || [];
  },
  saveProducts(products){
    const d = this.getData();
    d.products = products;
    this.setData(d);
  },
  addProduct(p){
    const d = this.getData();
    if(!d.products) d.products = [];
    const prod = { ...p, id: Date.now(), createdAt: new Date().toISOString(), active: true };
    d.products.unshift(prod);
    this.setData(d);
    return prod;
  },
  updateProduct(id, upd){
    const d = this.getData();
    const i = (d.products||[]).findIndex(p => p.id === id);
    if(i !== -1) d.products[i] = { ...d.products[i], ...upd };
    this.setData(d);
  },
  deleteProduct(id){
    const d = this.getData();
    d.products = (d.products||[]).filter(p => p.id !== id);
    this.setData(d);
  },

  /* ---------- ORDERS ---------- */
  getOrders(){
    const d = this.getData();
    return d.orders || [];
  },
  addOrder(o){
    const d = this.getData();
    if(!d.orders) d.orders = [];
    const order = { ...o, id: Date.now(), date: new Date().toISOString(), status: 'pending' };
    d.orders.unshift(order);
    this.setData(d);
    return order;
  },
  updateOrder(id, upd){
    const d = this.getData();
    const i = (d.orders||[]).findIndex(o => o.id === id);
    if(i !== -1) d.orders[i] = { ...d.orders[i], ...upd };
    this.setData(d);
  },

  /* ---------- EVENTS ---------- */
  log(ev, data={}){
    const d = this.getData();
    if(!d.events) d.events = [];
    d.events.push({ ev, data, t: Date.now() });
    if(d.events.length > 600) d.events = d.events.slice(-600);
    this.setData(d);
  },
};

// ─── TOAST ────────────────────────────────────────────
const Toast = {
  el: null,
  init(){
    if(!document.querySelector('.tc')){
      this.el = document.createElement('div');
      this.el.className = 'tc';
      document.body.appendChild(this.el);
    } else this.el = document.querySelector('.tc');
  },
  show(msg, type='info', ms=3400){
    if(!this.el) this.init();
    const ic = {success:'✅',error:'❌',info:'ℹ️',warning:'⚠️'};
    const t = document.createElement('div');
    t.className = `toast ${type[0]}`;
    t.innerHTML = `<span>${ic[type]||'ℹ️'}</span><span>${msg}</span>`;
    this.el.appendChild(t);
    setTimeout(()=>{ t.style.cssText='opacity:0;transform:translateX(18px);transition:.3s'; setTimeout(()=>t.remove(),310); }, ms);
  },
  success(m){ this.show(m,'success'); },
  error(m){ this.show(m,'error'); },
  info(m){ this.show(m,'info'); },
  warning(m){ this.show(m,'warning'); },
};

// ─── MODAL ────────────────────────────────────────────
const Modal = {
  show(id){ document.getElementById(id)?.classList.remove('hidden'); },
  hide(id){ document.getElementById(id)?.classList.add('hidden'); },
  hideAll(){ document.querySelectorAll('.mo').forEach(m=>m.classList.add('hidden')); },
};

// ─── AI ENGINE ────────────────────────────────────────
const AI = {
  async call(prompt, sys=''){
    const ak = Store.getAK();
    if(!ak) throw new Error('API Key সেট করা নেই। Settings → API Key দিন।');
    const r = await fetch(C.API,{
      method:'POST',
      headers:{ 'Content-Type':'application/json','x-api-key':ak,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true' },
      body: JSON.stringify({
        model: C.MDL, max_tokens: 4000,
        system: sys || 'Respond ONLY with valid JSON. No markdown, no backticks.',
        messages:[{ role:'user', content: prompt }]
      })
    });
    if(!r.ok){ const e=await r.json().catch(()=>({})); throw new Error(e.error?.message||`API Error ${r.status}`); }
    const data = await r.json();
    const raw = data.content.map(c=>c.text||'').join('');
    return JSON.parse(raw.replace(/```json|```/g,'').trim());
  }
};

// ─── HELPERS ──────────────────────────────────────────
function fmtDate(iso){
  if(!iso) return '—';
  const d=new Date(iso);
  return d.toLocaleDateString('bn-BD',{day:'numeric',month:'short',year:'numeric'})+' '+d.toLocaleTimeString('bn-BD',{hour:'2-digit',minute:'2-digit'});
}
function fmtBDT(n){ return '৳'+(+n||0).toLocaleString('bn-BD'); }
function copyTxt(txt,btn){
  navigator.clipboard.writeText(txt).then(()=>{ const o=btn.textContent; btn.textContent='✅ কপি!'; setTimeout(()=>btn.textContent=o,2000); });
}
function dlJSON(data,name){ const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=name||'data.json'; a.click(); }

// ─── INIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  Toast.init();
  // Mobile nav
  document.querySelector('.hmb')?.addEventListener('click',()=>{
    document.querySelector('.nav')?.classList.toggle('open');
  });
  // Close modals on overlay click
  document.querySelectorAll('.mo').forEach(o=>{
    o.addEventListener('click', e=>{ if(e.target===o) o.classList.add('hidden'); });
  });
});
