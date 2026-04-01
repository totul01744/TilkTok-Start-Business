/* ================================================
   Creator2Business — Firebase Database Engine v3
   ================================================ */

/* ── Firebase SDK (loaded from CDN in HTML) ──── */
let db = null;
let currentPhone = null;

const DB = {
  /* init — called once Firebase loads */
  async init() {
    if (db) return;
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
  },

  ref(path) { return db.ref(path); },

  /* ── USERS ── */
  async getUserByPhone(phone) {
    const snap = await this.ref('users/' + this._key(phone)).get();
    return snap.exists() ? snap.val() : null;
  },
  async saveUser(data) {
    const key = this._key(data.whatsapp);
    await this.ref('users/' + key).set({
      ...data,
      id: key,
      submittedAt: new Date().toISOString(),
      status: 'pending',
      profilePhoto: data.profilePhoto || null,
    });
    return key;
  },
  async updateUser(phone, updates) {
    await this.ref('users/' + this._key(phone)).update(updates);
  },
  async getAllUsers() {
    const snap = await this.ref('users').get();
    if (!snap.exists()) return [];
    return Object.values(snap.val()).sort((a, b) =>
      new Date(b.submittedAt) - new Date(a.submittedAt));
  },
  onUsersChange(cb) {
    this.ref('users').on('value', snap => {
      if (!snap.exists()) { cb([]); return; }
      cb(Object.values(snap.val()).sort((a,b) =>
        new Date(b.submittedAt||0) - new Date(a.submittedAt||0)));
    });
  },

  /* ── TASKS (90-day) ── */
  async getTasks() {
    const snap = await this.ref('tasks').get();
    if (!snap.exists()) return [];
    return Object.values(snap.val());
  },
  async saveTask(day, data) {
    await this.ref('tasks/day' + day).set({ day, ...data });
  },
  async saveBulkTasks(tasks) {
    const obj = {};
    tasks.forEach(t => { obj['day' + t.day] = t; });
    await this.ref('tasks').update(obj);
  },
  onTasksChange(cb) {
    this.ref('tasks').on('value', snap => {
      if (!snap.exists()) { cb([]); return; }
      cb(Object.values(snap.val()).sort((a,b) => a.day - b.day));
    });
  },

  /* ── USER TASK PROGRESS ── */
  async getProgress(phone) {
    const snap = await this.ref('progress/' + this._key(phone)).get();
    return snap.exists() ? snap.val() : {};
  },
  async setProgress(phone, day, done) {
    await this.ref('progress/' + this._key(phone) + '/day' + day).set(done ? true : null);
  },

  /* ── PRODUCTS / MARKETPLACE ── */
  async getProducts() {
    const snap = await this.ref('products').get();
    if (!snap.exists()) return [];
    return Object.values(snap.val()).sort((a,b) =>
      new Date(b.createdAt||0) - new Date(a.createdAt||0));
  },
  async addProduct(data) {
    const ref = this.ref('products').push();
    await ref.set({ ...data, id: ref.key, createdAt: new Date().toISOString(), active: true });
    return ref.key;
  },
  async updateProduct(id, updates) {
    await this.ref('products/' + id).update(updates);
  },
  async deleteProduct(id) {
    await this.ref('products/' + id).remove();
  },
  onProductsChange(cb) {
    this.ref('products').on('value', snap => {
      if (!snap.exists()) { cb([]); return; }
      cb(Object.values(snap.val()).sort((a,b) =>
        new Date(b.createdAt||0) - new Date(a.createdAt||0)));
    });
  },

  /* ── ORDERS ── */
  async addOrder(data) {
    const ref = this.ref('orders').push();
    await ref.set({ ...data, id: ref.key, date: new Date().toISOString(), status: 'pending' });
    return ref.key;
  },
  async updateOrder(id, updates) {
    await this.ref('orders/' + id).update(updates);
  },
  async getOrders() {
    const snap = await this.ref('orders').get();
    if (!snap.exists()) return [];
    return Object.values(snap.val()).sort((a,b) =>
      new Date(b.date||0) - new Date(a.date||0));
  },
  async getOrdersByPhone(phone) {
    const snap = await this.ref('orders').get();
    if (!snap.exists()) return [];
    return Object.values(snap.val())
      .filter(o => o.userPhone === phone)
      .sort((a,b) => new Date(b.date||0) - new Date(a.date||0));
  },
  onOrdersChange(cb) {
    this.ref('orders').on('value', snap => {
      if (!snap.exists()) { cb([]); return; }
      cb(Object.values(snap.val()).sort((a,b) => new Date(b.date||0) - new Date(a.date||0)));
    });
  },

  /* ── NOTIFICATIONS ── */
  async addNotification(data) {
    const ref = this.ref('notifications').push();
    await ref.set({ ...data, id: ref.key, createdAt: new Date().toISOString(), active: true });
    return ref.key;
  },
  async updateNotification(id, updates) {
    await this.ref('notifications/' + id).update(updates);
  },
  onNotificationsChange(cb) {
    this.ref('notifications').on('value', snap => {
      if (!snap.exists()) { cb([]); return; }
      const arr = Object.values(snap.val())
        .filter(n => n.active)
        .sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0));
      cb(arr);
    });
  },

  /* ── HELP MESSAGES ── */
  async addHelpMsg(data) {
    const ref = this.ref('help').push();
    await ref.set({ ...data, id: ref.key, date: new Date().toISOString(), status: 'new' });
  },
  onHelpChange(cb) {
    this.ref('help').on('value', snap => {
      if (!snap.exists()) { cb([]); return; }
      cb(Object.values(snap.val()).sort((a,b) => new Date(b.date||0) - new Date(a.date||0)));
    });
  },
  async updateHelp(id, updates) {
    await this.ref('help/' + id).update(updates);
  },

  /* ── UTILS ── */
  _key(phone) {
    return (phone || '').replace(/\D/g, '').replace(/^880/, '0');
  },
};

/* ── TOAST ──────────────────────────────────── */
const Toast = {
  el: null,
  init() {
    if (!document.querySelector('.tc')) {
      this.el = document.createElement('div');
      this.el.className = 'tc';
      document.body.appendChild(this.el);
    } else this.el = document.querySelector('.tc');
  },
  show(msg, type='info', ms=3400) {
    if (!this.el) this.init();
    const icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
    const t = document.createElement('div');
    t.className = `toast ${type[0]}`;
    t.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
    this.el.appendChild(t);
    setTimeout(() => {
      t.style.cssText = 'opacity:0;transform:translateX(18px);transition:.3s';
      setTimeout(() => t.remove(), 310);
    }, ms);
  },
  success(m) { this.show(m,'success'); },
  error(m)   { this.show(m,'error'); },
  info(m)    { this.show(m,'info'); },
  warning(m) { this.show(m,'warning'); },
};

/* ── MODAL ──────────────────────────────────── */
const Modal = {
  show(id) { document.getElementById(id)?.classList.remove('hidden'); },
  hide(id) { document.getElementById(id)?.classList.add('hidden'); },
  hideAll() { document.querySelectorAll('.mo').forEach(m => m.classList.add('hidden')); },
};

/* ── HELPERS ──────────────────────────────────*/
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('bn-BD', {
    day:'numeric', month:'short', year:'numeric'
  }) + ' ' + new Date(iso).toLocaleTimeString('bn-BD', { hour:'2-digit', minute:'2-digit' });
}
function fmtBDT(n) { return '৳' + (+n||0).toLocaleString('bn-BD'); }
function sanitize(s) { return (s||'').replace(/[<>"]/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function dlJSON(data, name) {
  const b = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(b);
  a.download = name; a.click();
}

/* ── AI ENGINE ───────────────────────────────*/
const AI = {
  async call(prompt) {
    const ak = localStorage.getItem('c2b_ak');
    if (!ak) throw new Error('API Key সেট করা নেই। Settings থেকে দিন।');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ak,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 4000,
        system: 'Respond ONLY with valid JSON. No markdown backticks.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e.error?.message||'API Error '+r.status); }
    const data = await r.json();
    return JSON.parse(data.content.map(c=>c.text||'').join('').replace(/```json|```/g,'').trim());
  },
};

document.addEventListener('DOMContentLoaded', () => {
  Toast.init();
  document.querySelector('.hmb')?.addEventListener('click', () => {
    document.querySelector('.nav')?.classList.toggle('open');
  });
  document.querySelectorAll('.mo').forEach(o => {
    o.addEventListener('click', e => { if(e.target===o) o.classList.add('hidden'); });
  });
});
