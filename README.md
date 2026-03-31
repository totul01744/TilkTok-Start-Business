# Creator2Business — সম্পূর্ণ সেটআপ গাইড

## 📁 ফাইল স্ট্রাকচার
```
creator2business/
├── index.html          → মেইন অ্যাপ (১১টি AI টুল)
├── agency.html         → এজেন্সি সার্ভিস পেজ
├── help.html           → হেল্প ও সাপোর্ট পেজ
├── admin/
│   └── index.html      → অ্যাডমিন প্যানেল (আলাদা)
├── assets/
│   ├── css/style.css   → ডিজাইন সিস্টেম
│   └── js/app.js       → কোর JS ইঞ্জিন
└── vercel.json         → Vercel কনফিগ
```

## 🚀 GitHub → Vercel ডিপ্লয় গাইড

### ধাপ ১: GitHub
1. GitHub.com এ নতুন repository তৈরি করুন
2. নাম দিন: `creator2business`
3. Public রাখুন (Vercel ফ্রিতে ডিপ্লয় করবে)
4. সব ফাইল আপলোড করুন

### ধাপ ২: Vercel
1. vercel.com এ GitHub দিয়ে লগইন
2. "New Project" → আপনার repository সিলেক্ট
3. Deploy করুন (অটো ডিটেক্ট করবে)
4. আপনার লিংক পাবেন: `https://creator2business.vercel.app`

## ⚙️ প্রথমবার সেটআপ

### Admin পাসওয়ার্ড:
- ডিফল্ট: `admin123`
- Admin লগইন করে Settings → পাসওয়ার্ড পরিবর্তন করুন

### API Key সেটআপ:
1. console.anthropic.com → ফ্রি একাউন্ট খুলুন
2. API Key তৈরি করুন
3. আপনার সাইটে গিয়ে Settings → API Key দিন

## 🔐 Admin Panel
URL: `আপনার-সাইট.vercel.app/admin`
Default Password: `admin123`

Admin থেকে যা করতে পারবেন:
- সব হেল্প রিকোয়েস্ট দেখুন ও রিপ্লাই করুন
- এজেন্সি ইনকোয়ারি ম্যানেজ করুন
- Pro ইউজার যোগ/বাদ দিন
- সাইট সেটিংস পরিবর্তন করুন
- সব ডেটা Export করুন

## 💰 ফিচার লিস্ট
- ১১টি AI-Powered টুল (বাংলায়)
- ফ্রি: দৈনিক ৩টি জেনারেশন
- Pro: আনলিমিটেড (৪৯৯ টাকা/মাস)
- হেল্প সিস্টেম (ইউজার → আপনার কাছে)
- এজেন্সি সার্ভিস পেজ
- সম্পূর্ণ অ্যাডমিন প্যানেল
- WhatsApp লিংক ইন্টিগ্রেশন

## 📞 কাস্টমাইজেশন
`assets/js/app.js` এ:
- `FREE_DAILY_LIMIT` → ফ্রি লিমিট পরিবর্তন
- `CONFIG.ADMIN_KEY` → অ্যাডমিন কী পরিবর্তন

`agency.html` এ:
- সার্ভিস প্যাকেজের দাম পরিবর্তন করুন
- আপনার WhatsApp নম্বর যোগ করুন
