/* ============================================
   Creator2Business - Core JS Engine
   ============================================ */

// =========== CONFIG ===========
const CONFIG = {
  API_URL: 'https://api.anthropic.com/v1/messages',
  MODEL: 'claude-sonnet-4-20250514',
  MAX_TOKENS: 4000,
  FREE_DAILY_LIMIT: 3,
  ADMIN_KEY: 'c2b_admin_2024', // Change this!
  STORAGE_KEY: 'c2b_data',
  API_KEY_STORAGE: 'c2b_api_key',
};

// =========== STORAGE HELPERS ===========
const Store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
  remove(key) { localStorage.removeItem(key); },

  getData() { return this.get(CONFIG.STORAGE_KEY) || {}; },
  setData(d) { this.set(CONFIG.STORAGE_KEY, d); },

  getApiKey() { return this.get(CONFIG.API_KEY_STORAGE) || ''; },
  setApiKey(k) { this.set(CONFIG.API_KEY_STORAGE, k); },

  // Usage tracking
  getUsage() {
    const d = this.getData();
    const today = new Date().toDateString();
    if (!d.usage || d.usage.date !== today) {
      d.usage = { date: today, count: 0 };
      this.setData(d);
    }
    return d.usage;
  },
  incrementUsage() {
    const d = this.getData();
    const usage = this.getUsage();
    usage.count++;
    d.usage = usage;
    this.setData(d);
    return usage.count;
  },
  isPro() {
    const d = this.getData();
    return d.isPro === true;
  },
  isAdmin() {
    return this.get('c2b_admin_auth') === true;
  },

  // Contacts/Help requests
  getHelpRequests() { const d = this.getData(); return d.helpRequests || []; },
  addHelpRequest(req) {
    const d = this.getData();
    if (!d.helpRequests) d.helpRequests = [];
    req.id = Date.now();
    req.date = new Date().toISOString();
    req.status = 'pending';
    d.helpRequests.unshift(req);
    this.setData(d);
    return req;
  },
  updateHelpRequest(id, updates) {
    const d = this.getData();
    if (!d.helpRequests) return;
    const idx = d.helpRequests.findIndex(r => r.id === id);
    if (idx !== -1) { d.helpRequests[idx] = { ...d.helpRequests[idx], ...updates }; }
    this.setData(d);
  },

  // Service inquiries
  getServiceInquiries() { const d = this.getData(); return d.serviceInquiries || []; },
  addServiceInquiry(req) {
    const d = this.getData();
    if (!d.serviceInquiries) d.serviceInquiries = [];
    req.id = Date.now();
    req.date = new Date().toISOString();
    req.status = 'new';
    d.serviceInquiries.unshift(req);
    this.setData(d);
    return req;
  },

  // Analytics
  logEvent(event, data = {}) {
    const d = this.getData();
    if (!d.events) d.events = [];
    d.events.push({ event, data, time: Date.now() });
    if (d.events.length > 500) d.events = d.events.slice(-500);
    this.setData(d);
  },

  getStats() {
    const d = this.getData();
    return {
      totalGenerations: d.usage?.totalCount || 0,
      helpRequests: (d.helpRequests || []).length,
      serviceInquiries: (d.serviceInquiries || []).length,
      pendingHelp: (d.helpRequests || []).filter(r => r.status === 'pending').length,
    };
  },
};

// =========== TOAST NOTIFICATIONS ===========
const Toast = {
  container: null,
  init() {
    if (!document.querySelector('.toast-container')) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.querySelector('.toast-container');
    }
  },
  show(msg, type = 'info', duration = 3500) {
    if (!this.container) this.init();
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
    this.container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; t.style.transition = '0.3s'; setTimeout(() => t.remove(), 300); }, duration);
  },
  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error'); },
  info(msg) { this.show(msg, 'info'); },
  warning(msg) { this.show(msg, 'warning'); },
};

// =========== API ENGINE ===========
const AI = {
  async call(prompt, system = '') {
    const apiKey = Store.getApiKey();
    if (!apiKey) {
      throw new Error('API Key সেট করা নেই। Settings থেকে API Key দিন।');
    }

    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: CONFIG.MODEL,
        max_tokens: CONFIG.MAX_TOKENS,
        system: system || 'You are a Bangladeshi content creation and business expert. Always respond ONLY with valid JSON. No markdown backticks, no extra text. Just raw JSON.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `API Error: ${res.status}`);
    }

    const data = await res.json();
    const raw = data.content.map(c => c.text || '').join('');
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  },

  checkLimit() {
    if (Store.isPro()) return true;
    const usage = Store.getUsage();
    return usage.count < CONFIG.FREE_DAILY_LIMIT;
  },

  getRemainingCount() {
    if (Store.isPro()) return 999;
    return Math.max(0, CONFIG.FREE_DAILY_LIMIT - Store.getUsage().count);
  },
};

// =========== AI PROMPTS ===========
const Prompts = {
  content_ideas: (v) => `বাংলাদেশের ক্রিয়েটরদের জন্য ২০টি ভাইরাল ভিডিও আইডিয়া তৈরি করো।
নিশ: ${v.niche||'সাধারণ'}, অডিয়েন্স: ${v.audience||'বাংলাদেশি তরুণ'}, টপিক: ${v.topic||'সাধারণ কন্টেন্ট'}
JSON: {"ideas":[{"id":1,"title":"...","hook":"...","script":"...","caption":"...","hashtags":["#..."],"cta":"...","emotion":"curiosity/fear/humor/greed"},...]}
- title: আকর্ষণীয় বাংলা শিরোনাম | hook: প্রথম ৩ সেকেন্ড | script: ৩০ সেকেন্ডের সম্পূর্ণ বাংলা স্ক্রিপ্ট | caption: বাংলা ক্যাপশন | hashtags: ৫টি`,

  hook_script: (v) => `৫টি শক্তিশালী হুক ও স্ক্রিপ্ট বানাও।
নিশ: ${v.niche||'সাধারণ'}, অডিয়েন্স: ${v.audience||'বাংলাদেশি তরুণ'}, টপিক: ${v.topic||'সাধারণ'}
JSON: {"hooks":[{"id":1,"hook_type":"curiosity","hook":"...","script":"...","cta":"...","why":"..."},...]}
- hook_type: curiosity/fear/humor/greed/emotion | script: পূর্ণ ৩০ সেকেন্ড বাংলা | cta: call-to-action | why: কেন এই হুক কাজ করবে`,

  niche_finder: (v) => `এই ব্যক্তির জন্য সবচেয়ে প্রফিটেবল নিশ খুঁজে দাও।
স্কিল: ${v.skills||'অজানা'}, আগ্রহ: ${v.interests||'অজানা'}, অভিজ্ঞতা: ${v.experience||'নেই'}
JSON: {"niches":[{"rank":1,"niche":"...","why":"...","audience":"...","monetization":["..."],"competition":"low/medium/high","income_potential":"...","starter_content":["..."]},...5টি],"recommendation":"...","action_plan":["...",...3টি]}`,

  product_ideas: (v) => `এই ক্রিয়েটরের জন্য ডিজিটাল প্রোডাক্ট আইডিয়া দাও।
নিশ: ${v.niche||'সাধারণ'}, ফলোয়ার: ${v.followers||'১০০০'}, দক্ষতা: ${v.skills||'কন্টেন্ট'}
JSON: {"products":[{"type":"course/ebook/service/template","name":"...","description":"...","price_bdt":"...","target":"...","effort":"low/medium/high","time_to_create":"...","why":"..."},...6টি],"quick_start":"...","recommended":"..."}`,

  service_package: (v) => `এই ক্রিয়েটরের জন্য ৩টি সার্ভিস প্যাকেজ তৈরি করো।
নিশ: ${v.niche||'সাধারণ'}, স্কিল: ${v.skills||'কন্টেন্ট ক্রিয়েশন'}, অভিজ্ঞতা: ${v.experience||'১ বছর'}
JSON: {"packages":[{"name":"Basic","price_bdt":"...","delivery_days":"...","includes":["..."],"not_includes":["..."],"best_for":"..."},{"name":"Standard","price_bdt":"...","delivery_days":"...","includes":["..."],"not_includes":["..."],"best_for":"..."},{"name":"Premium","price_bdt":"...","delivery_days":"...","includes":["..."],"not_includes":["..."],"best_for":"..."}],"pitch":"...","platform_suggestion":["..."]}`,

  bio_optimizer: (v) => `এই ক্রিয়েটরের সোশ্যাল মিডিয়া বায়ো অপটিমাইজ করো।
নিশ: ${v.niche||'সাধারণ'}, প্ল্যাটফর্ম: ${v.platform||'Facebook'}, লক্ষ্য: ${v.goal||'ফলোয়ার বাড়ানো'}
JSON: {"bios":{"facebook":"...","instagram":"...","tiktok":"...","youtube":"..."},"keywords":["..."],"cta_suggestions":["..."],"profile_tips":["...",...5টি]}`,

  course_outline: (v) => `এই টপিকের উপর একটি সম্পূর্ণ কোর্স আউটলাইন তৈরি করো।
টপিক: ${v.topic||'ডিজিটাল মার্কেটিং'}, লেভেল: ${v.level||'বিগিনার'}, দৈর্ঘ্য: ${v.duration||'৪ সপ্তাহ'}
JSON: {"title":"...","tagline":"...","price_bdt":"...","target_audience":"...","outcome":"...","modules":[{"number":1,"title":"...","duration":"...","lessons":["..."]},...4-6টি],"bonuses":["..."],"prerequisites":["..."],"sales_points":["...",...5টি]}`,

  growth_plan: (v) => `৭ দিনের গ্রোথ প্ল্যান তৈরি করো।
নিশ: ${v.niche||'সাধারণ'}, ফলোয়ার: ${v.followers||'১০০০'}, লক্ষ্য: ${v.goal||'ফলোয়ার বাড়ানো'}
JSON: {"plan":[{"day":1,"day_name":"...","content_type":"...","content":"...","posting_time":"...","engagement_strategy":"...","goal":"...","tip":"..."},...7টি],"weekly_summary":"...","expected_growth":"..."}`,

  engagement_reply: (v) => `এনগেজমেন্ট রিপ্লাই তৈরি করো।
নিশ: ${v.niche||'সাধারণ'}, প্রোডাক্ট: ${v.product||'সার্ভিস'}, টপিক: ${v.topic||'সাধারণ'}
JSON: {"comment_replies":[{"type":"positive/question/negative/curiosity","comment_example":"...","reply":"..."},...10টি],"dm_replies":[{"stage":"awareness/interest/desire/action","trigger":"...","message":"..."},...10টি],"tips":["...",...3টি]}`,

  content_analysis: (v) => `এই কন্টেন্ট পারফরম্যান্স বিশ্লেষণ করো।
নিশ: ${v.niche||'সাধারণ'}, সমস্যা: ${v.problem||'ভিউ কম'}, বর্তমান অবস্থা: ${v.current||'অজানা'}
JSON: {"scores":{"hook":0,"retention":0,"engagement":0,"cta":0},"problems":["...",...5টি],"analysis":{"hook_analysis":"...","retention_analysis":"...","engagement_analysis":"..."},"solutions":[{"step":1,"title":"...","action":"...","priority":"high/medium/low"},...6টি],"quick_wins":["...",...3টি]}`,

  trend_ideas: (v) => `বর্তমান ট্রেন্ড অনুযায়ী কন্টেন্ট আইডিয়া দাও।
নিশ: ${v.niche||'সাধারণ'}, অডিয়েন্স: ${v.audience||'বাংলাদেশি'}
JSON: {"trends":[{"id":1,"idea":"...","trend_type":"challenge/POV/before-after/reaction/educational","reason":"...","adaptation":"...","viral_score":8,"best_platform":"...","best_time":"..."},...10টি]}`,

  funnel_builder: (v) => `মার্কেটিং ফানেল তৈরি করো।
নিশ: ${v.niche||'সাধারণ'}, প্রোডাক্ট: ${v.product||'কোর্স'}, দাম: ${v.price||'৫০০০'}
JSON: {"funnel":{"awareness":{"content":"...","platform":"...","example":"..."},"interest":{"content":"...","lead_magnet":"...","example":"..."},"desire":{"content":"...","social_proof":"...","example":"..."},"action":{"cta":"...","offer":"...","urgency":"..."}},"weekly_schedule":"...","monthly_target":"...","tools_needed":["..."]}`,

  problem_solver: (v) => `এই ক্রিয়েটর সমস্যা সমাধান করো।
সমস্যা: ${v.problem||'ভিউ কম'}, নিশ: ${v.niche||'সাধারণ'}, ফলোয়ার: ${v.followers||'১০০০'}
JSON: {"problem_analysis":"...","root_causes":["...",...5টি],"solution_steps":[{"step":1,"title":"...","action":"...","timeline":"...","expected_result":"..."},...7টি],"quick_wins":["...",...3টি],"mindset_tip":"...","resources":["...",...3টি]}`,
};

// =========== RENDER HELPERS ===========
const Render = {
  skeleton(count = 3) {
    return Array(count).fill(0).map(() => `
      <div class="card mb-2">
        <div class="skeleton mb-1" style="height:14px;width:60%"></div>
        <div class="skeleton mb-1" style="height:12px;width:90%"></div>
        <div class="skeleton" style="height:12px;width:75%"></div>
      </div>`).join('');
  },

  error(msg) {
    return `<div class="alert alert-error"><span>⚠️</span><div><strong>সমস্যা হয়েছে:</strong> ${msg}<br><small>দয়া করে আবার চেষ্টা করুন।</small></div></div>`;
  },

  limitReached() {
    return `<div class="alert alert-warning" style="flex-direction:column;gap:12px;">
      <div>⚠️ <strong>আজকের ফ্রি লিমিট শেষ (${CONFIG.FREE_DAILY_LIMIT}টি জেনারেশন)</strong></div>
      <div style="font-size:0.85rem;color:var(--text2);">আগামীকাল আবার ফ্রিতে ব্যবহার করুন, অথবা Pro আপগ্রেড করে আনলিমিটেড ব্যবহার করুন।</div>
      <button class="btn btn-primary btn-sm" onclick="showUpgradeModal()">🚀 Pro তে আপগ্রেড করুন</button>
    </div>`;
  },

  hashtags(tags) {
    return `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">
      ${(tags||[]).map(t => `<span class="tag tag-purple">${t}</span>`).join('')}
    </div>`;
  },

  ctaBox(cta) {
    return cta ? `<div style="background:rgba(108,99,255,0.1);border:1px solid rgba(108,99,255,0.2);border-radius:8px;padding:10px 14px;margin-top:10px;font-size:0.85rem;font-weight:600;color:#a78bfa;">📢 CTA: ${cta}</div>` : '';
  },

  scoreBar(score, color = '#6c63ff') {
    return `<div style="flex:1;background:var(--border);border-radius:4px;height:6px;overflow:hidden;">
      <div style="width:${(score||0)*10}%;height:100%;background:${color};border-radius:4px;transition:width .5s;"></div>
    </div>`;
  },

  // Tool result renderers
  renderIdeaList(ideas) {
    return ideas.map((item, i) => `
      <div class="card card-glow mb-2 fade-up" style="position:relative;">
        <div class="tag tag-purple" style="position:absolute;top:14px;right:14px;">#${item.id||i+1}</div>
        <span class="tag tag-${item.emotion==='fear'?'red':item.emotion==='humor'?'green':item.emotion==='greed'?'gold':'purple'} mb-1">${item.emotion||'আইডিয়া'}</span>
        <h3 style="color:#fff;font-size:1rem;margin-bottom:8px;">${item.title}</h3>
        <div class="mb-1"><span class="tag tag-red" style="margin-right:6px;">হুক</span><span style="color:var(--text2);font-size:0.88rem;">${item.hook}</span></div>
        <hr class="divider">
        <div class="mb-1"><span class="tag tag-green mb-1">স্ক্রিপ্ট</span><p style="font-size:0.87rem;white-space:pre-line;">${item.script}</p></div>
        <div class="mb-1"><span class="tag tag-gold mb-1">ক্যাপশন</span><p style="font-size:0.87rem;">${item.caption}</p></div>
        ${this.hashtags(item.hashtags)}
        ${this.ctaBox(item.cta)}
      </div>`).join('');
  },
};

// =========== MODAL HELPERS ===========
const Modal = {
  show(id) { document.getElementById(id)?.classList.remove('hidden'); },
  hide(id) { document.getElementById(id)?.classList.add('hidden'); },
  hideAll() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden')); },
};

// =========== COPY & DOWNLOAD ===========
function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = '✅ কপি হয়েছে!';
    setTimeout(() => { btn.textContent = orig; }, 2000);
  });
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename || 'output.json';
  a.click();
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename || 'output.txt';
  a.click();
}

// =========== UPGRADE MODAL ===========
function showUpgradeModal() {
  const overlay = document.getElementById('upgradeModal');
  if (overlay) overlay.classList.remove('hidden');
}

// =========== API KEY SETUP ===========
function showApiModal() {
  const overlay = document.getElementById('apiModal');
  if (overlay) {
    document.getElementById('apiKeyInput').value = Store.getApiKey() || '';
    overlay.classList.remove('hidden');
  }
}

function saveApiKey() {
  const key = document.getElementById('apiKeyInput')?.value?.trim();
  if (!key || !key.startsWith('sk-ant-')) {
    Toast.error('সঠিক API Key দিন (sk-ant- দিয়ে শুরু হয়)');
    return;
  }
  Store.setApiKey(key);
  Modal.hideAll();
  Toast.success('API Key সেভ হয়েছে! ✅');
  updateUsageDisplay();
}

// =========== USAGE DISPLAY ===========
function updateUsageDisplay() {
  const remaining = AI.getRemainingCount();
  const isPro = Store.isPro();
  const els = document.querySelectorAll('.usage-display');
  els.forEach(el => {
    el.textContent = isPro ? '∞ Pro' : `${remaining}/${CONFIG.FREE_DAILY_LIMIT} বাকি`;
    el.style.color = isPro ? '#4ade80' : remaining > 0 ? '#fbbf24' : '#fb7185';
  });
}

// =========== INIT ===========
document.addEventListener('DOMContentLoaded', () => {
  Toast.init();
  updateUsageDisplay();

  // Mobile nav
  document.querySelector('.hamburger')?.addEventListener('click', () => {
    document.querySelector('.nav')?.classList.toggle('open');
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.add('hidden');
    });
  });

  // Check API key
  if (!Store.getApiKey() && window.location.pathname !== '/admin/') {
    setTimeout(() => {
      Toast.warning('API Key সেট করুন Settings থেকে');
    }, 1500);
  }
});
