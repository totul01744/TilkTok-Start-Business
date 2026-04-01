/* Admin Store — localStorage version (no Firebase needed) */
const SK = 'c2b_v3_data';

const Store = {
  _d() { try { return JSON.parse(localStorage.getItem(SK)) || {}; } catch { return {}; } },
  _s(d) { localStorage.setItem(SK, JSON.stringify(d)); },
  key(ph) { return (ph||'').replace(/\D/g,'').replace(/^880/,'0'); },

  getAllUsers() { return Object.values((this._d().users)||{}).sort((a,b)=>new Date(b.submittedAt||0)-new Date(a.submittedAt||0)); },
  getUser(ph) { return (this._d().users||{})[this.key(ph)]||null; },
  updateUser(phone, upd) {
    const d=this._d(); if(!d.users) d.users={};
    const k=this.key(phone);
    if(d.users[k]) d.users[k]={...d.users[k],...upd};
    this._s(d);
  },

  getTasks() { return (this._d().tasks)||[]; },
  saveBulkTasks(tasks) { const d=this._d(); d.tasks=tasks; this._s(d); },

  getProducts() { return Object.values((this._d().products)||{}).sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)); },
  addProduct(data) {
    const d=this._d(); if(!d.products) d.products={};
    const id='p'+Date.now();
    d.products[id]={...data,id,createdAt:new Date().toISOString(),active:true};
    this._s(d); return id;
  },
  updateProduct(id,upd) { const d=this._d(); if(d.products&&d.products[id]) d.products[id]={...d.products[id],...upd}; this._s(d); },
  deleteProduct(id) { const d=this._d(); if(d.products) delete d.products[id]; this._s(d); },

  getOrders() { return Object.values((this._d().orders)||{}).sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)); },
  getOrdersByPhone(ph) { return this.getOrders().filter(o=>this.key(o.userPhone)===this.key(ph)); },
  updateOrder(id,upd) { const d=this._d(); if(d.orders&&d.orders[id]) d.orders[id]={...d.orders[id],...upd}; this._s(d); },

  getHelp() { return Object.values((this._d().help)||{}).sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)); },
  updateHelp(id,upd) { const d=this._d(); if(d.help&&d.help[id]) d.help[id]={...d.help[id],...upd}; this._s(d); },

  getNotifications() { return Object.values((this._d().notifications)||{}).filter(n=>n.active).sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)); },
  addNotification(data) {
    const d=this._d(); if(!d.notifications) d.notifications={};
    const id='n'+Date.now();
    d.notifications[id]={...data,id,createdAt:new Date().toISOString(),active:true};
    this._s(d);
  },
  updateNotification(id,upd) { const d=this._d(); if(d.notifications&&d.notifications[id]) d.notifications[id]={...d.notifications[id],...upd}; this._s(d); },

  getSettings() { return (this._d().settings)||{}; },
  saveSettings(s) { const d=this._d(); d.settings=s; this._s(d); },
  getData() { return this._d(); },
};

/* DB aliases (admin code uses DB.*) */
const DB = {
  _k: (ph) => Store.key(ph),
  getAllUsers: async () => Store.getAllUsers(),
  updateUser: async (ph,upd) => Store.updateUser(ph,upd),
  getTasks: async () => Store.getTasks(),
  saveBulkTasks: async (tasks) => Store.saveBulkTasks(tasks),
  getProducts: async () => Store.getProducts(),
  addProduct: async (data) => Store.addProduct(data),
  updateProduct: async (id,upd) => Store.updateProduct(id,upd),
  deleteProduct: async (id) => Store.deleteProduct(id),
  getOrders: async () => Store.getOrders(),
  getOrdersByPhone: async (ph) => Store.getOrdersByPhone(ph),
  updateOrder: async (id,upd) => Store.updateOrder(id,upd),
  addNotification: async (data) => { Store.addNotification(data); },
  updateNotification: async (id,upd) => Store.updateNotification(id,upd),
  addHelpMsg: async (data) => { const d=Store._d(); if(!d.help) d.help={}; const id='h'+Date.now(); d.help[id]={...data,id,date:new Date().toISOString(),status:'new'}; Store._s(d); },
  updateHelp: async (id,upd) => Store.updateHelp(id,upd),
  ref: (path) => ({
    get: async () => {
      const d = Store._d();
      const parts = path.split('/').filter(Boolean);
      let val = d;
      for(const p of parts) { if(val==null) break; val = val[p]; }
      return { exists: ()=>val!=null&&val!==undefined, val: ()=>val };
    },
    on: (evt, cb) => {
      // Simulate realtime with polling
      const d = Store._d();
      const parts = path.split('/').filter(Boolean);
      let val = d;
      for(const p of parts) { if(val==null) break; val = val[p]; }
      cb({ exists: ()=>val!=null, val: ()=>val });
    }
  }),
  onUsersChange: (cb) => cb(Store.getAllUsers()),
  onOrdersChange: (cb) => cb(Store.getOrders()),
  onNotificationsChange: (cb) => cb(Store.getNotifications()),
  init: async () => {},
};

/* ADMIN_PASSWORD from settings or default */
const ADMIN_PASSWORD = localStorage.getItem('c2b_admin_pass') || 'admin@c2b2024';

/* Store_getAdminPass used in admin */
function Store_getAdminPass() { return localStorage.getItem('c2b_admin_pass') || 'admin@c2b2024'; }

/* Toast */
const Toast = {
  el:null,
  init(){ if(!document.querySelector('.tc')){ this.el=document.createElement('div'); this.el.className='tc'; document.body.appendChild(this.el); } else this.el=document.querySelector('.tc'); },
  show(msg,type='info',ms=3400){
    if(!this.el) this.init();
    const ic={success:'✅',error:'❌',info:'ℹ️',warning:'⚠️'};
    const t=document.createElement('div'); t.className=`toast ${type[0]}`;
    t.innerHTML=`<span>${ic[type]||'ℹ️'}</span><span>${msg}</span>`;
    this.el.appendChild(t);
    setTimeout(()=>{ t.style.cssText='opacity:0;transform:translateX(18px);transition:.3s'; setTimeout(()=>t.remove(),310); },ms);
  },
  success(m){this.show(m,'success');},error(m){this.show(m,'error');},
  info(m){this.show(m,'info');},warning(m){this.show(m,'warning');},
};
const Modal = {
  show(id){document.getElementById(id)?.classList.remove('hidden');},
  hide(id){document.getElementById(id)?.classList.add('hidden');},
};
function fmtDate(iso){ if(!iso) return '—'; return new Date(iso).toLocaleDateString('bn-BD',{day:'numeric',month:'short',year:'numeric'})+' '+new Date(iso).toLocaleTimeString('bn-BD',{hour:'2-digit',minute:'2-digit'}); }
function sanitize(s){ return (s||'').replace(/[<>"&]/g,c=>({'<':'&lt;','>':'&gt;','"':'&quot;','&':'&amp;'}[c])); }
function dlJSON(data,name){ const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=name; a.click(); }

async function exportAll(){ dlJSON(Store.getData(),'c2b_full_backup.json'); }
