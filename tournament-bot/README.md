# 🎮 Telegram Tournament Earning Bot

A full production-level Telegram bot for hosting tournaments, daily tasks, referrals, and wallet management — built with Node.js and Firebase Realtime Database.

---

## 📁 Folder Structure

```
tournament-bot/
├── src/
│   ├── index.js                  ← Main entry point
│   ├── firebase/
│   │   ├── config.js             ← Firebase connection
│   │   └── db.js                 ← All database functions
│   ├── handlers/
│   │   ├── userHandlers.js       ← /start, /register, /profile
│   │   ├── tournamentHandlers.js ← /tournaments, /join, /leaderboard
│   │   ├── walletHandlers.js     ← /balance, /history, /deposit
│   │   ├── taskHandlers.js       ← /tasks, /submit_task
│   │   ├── referralHandlers.js   ← /referral
│   │   ├── productHandlers.js    ← /products, /buy
│   │   ├── withdrawHandlers.js   ← /withdraw
│   │   ├── adminHandlers.js      ← All admin commands
│   │   └── callbackHandlers.js   ← Inline button callbacks
│   └── utils/
│       └── helpers.js            ← Utility functions
├── .env.example                  ← Environment variable template
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 STEP-BY-STEP SETUP GUIDE

### STEP 1: Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Enter a name: e.g. `My Tournament Bot`
4. Enter a username: e.g. `mytournament_bot` (must end in `bot`)
5. BotFather will give you a **TOKEN** like: `7123456789:ABCdefGHIjklMNOpqrSTUvwxYZ`
6. **Copy and save this token!**

---

### STEP 2: Get Your Telegram User ID

1. Search for **@userinfobot** on Telegram
2. Send `/start`
3. It will show your **User ID** (a number like `123456789`)
4. This is your ADMIN_ID — save it!

---

### STEP 3: Set Up Firebase

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"**
3. Name it (e.g. `tournament-bot`) and click Continue
4. Disable Google Analytics (not needed), click **Create project**

**Set up Realtime Database:**
1. In the left menu, click **"Build" → "Realtime Database"**
2. Click **"Create Database"**
3. Choose location (Singapore is best for Bangladesh)
4. Select **"Start in test mode"** → Click Enable
5. Copy the database URL (looks like: `https://tournament-bot-xxxxx-default-rtdb.firebaseio.com`)

**Get Service Account Key:**
1. Click the gear icon ⚙️ → **"Project settings"**
2. Click **"Service accounts"** tab
3. Click **"Generate new private key"**
4. A JSON file will download — **open it** and you'll need these values:
   - `project_id`
   - `private_key_id`
   - `private_key` (the long key starting with `-----BEGIN PRIVATE KEY-----`)
   - `client_email`
   - `client_id`

---

### STEP 4: Set Up GitHub

1. Go to **https://github.com** and sign up/log in
2. Click **"New repository"**
3. Name it `tournament-bot`
4. Select **Private**
5. Click **"Create repository"**

**Upload your code:**
- If you have Git installed on your PC:
  ```bash
  cd tournament-bot
  git init
  git add .
  git commit -m "Initial commit"
  git remote add origin https://github.com/YOUR_USERNAME/tournament-bot.git
  git push -u origin main
  ```
- OR use GitHub Desktop app to drag and drop the folder

---

### STEP 5: Deploy on Render (Free)

1. Go to **https://render.com** and sign up (use GitHub login)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account
4. Select your `tournament-bot` repository
5. Fill in the settings:
   - **Name**: `tournament-bot`
   - **Region**: Singapore
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

6. Click **"Environment"** tab and add all variables:

| Key | Value |
|-----|-------|
| `BOT_TOKEN` | Your bot token from BotFather |
| `ADMIN_IDS` | Your Telegram user ID |
| `ADMIN_USERNAME` | Your Telegram username (without @) |
| `FIREBASE_PROJECT_ID` | From service account JSON |
| `FIREBASE_PRIVATE_KEY_ID` | From service account JSON |
| `FIREBASE_PRIVATE_KEY` | The full key with `-----BEGIN...` |
| `FIREBASE_CLIENT_EMAIL` | From service account JSON |
| `FIREBASE_CLIENT_ID` | From service account JSON |
| `FIREBASE_DATABASE_URL` | Your database URL |
| `BKASH_NUMBER` | Your bKash number |
| `NAGAD_NUMBER` | Your Nagad number |
| `REFERRAL_BONUS` | `50` (amount in taka) |
| `MIN_WITHDRAW` | `50` (minimum withdraw) |
| `WEBHOOK_URL` | https://your-app-name.onrender.com |
| `PORT` | `3000` |

7. Click **"Create Web Service"**
8. Wait 3-5 minutes for deployment

> ⚠️ **FIREBASE_PRIVATE_KEY tip:** The private key has `\n` line breaks. When pasting into Render, keep it exactly as it appears in the JSON file, with the quotes.

---

### STEP 6: Verify Bot is Running

1. Go to your Render dashboard
2. Click on your service → see the Logs
3. You should see: `✅ Firebase initialized` and `🤖 Bot running`
4. Open Telegram and message your bot `/start`

---

## 👤 USER COMMANDS

| Command | Description |
|---------|-------------|
| `/start` | Welcome message |
| `/register` | Create account |
| `/profile` | View your profile |
| `/balance` | Check wallet balance |
| `/history` | View last 10 transactions |
| `/deposit` | How to deposit money |
| `/withdraw 100 bkash 01700000000` | Request withdrawal |
| `/tournaments` | View open tournaments |
| `/join <id>` | Join a tournament |
| `/leaderboard <id>` | View tournament leaderboard |
| `/tasks` | View available daily tasks |
| `/submit_task <task_id> <proof>` | Submit task proof |
| `/referral` | Your referral link |
| `/products` | View shop products |
| `/buy <product_id>` | Purchase a product |

---

## 🔑 ADMIN COMMANDS

| Command | Description |
|---------|-------------|
| `/create_tournament FF Solo \| 20 \| 50 \| 2024-12-25 20:00 \| Bermuda` | Create tournament |
| `/add_match <t_id> \| <room_id> \| <password>` | Add room details |
| `/start_tournament <id>` | Start a tournament |
| `/end_tournament <id> \| <1st_uid> \| <2nd_uid> \| <3rd_uid>` | End and distribute prizes |
| `/approve_withdraw <id>` | Approve withdrawal |
| `/reject_withdraw <id> [reason]` | Reject withdrawal |
| `/list_withdraws` | See pending withdrawals |
| `/approve_task <submission_id>` | Approve task & pay reward |
| `/reject_task <submission_id> [reason]` | Reject task submission |
| `/give_bonus <user_id> <amount> [reason]` | Give bonus to user |
| `/block_user <user_id> [reason]` | Block a user |
| `/unblock_user <user_id>` | Unblock a user |
| `/add_product FF Diamonds \| 50 \| 100 diamonds \| 100` | Add product to shop |
| `/stats` | View bot statistics |

---

## 💰 Prize Distribution

When you end a tournament, prizes are automatically split:
- 🥇 1st place: **50%** of prize pool
- 🥈 2nd place: **30%** of prize pool
- 🥉 3rd place: **20%** of prize pool

The prize pool is filled from 90% of each entry fee (10% platform fee).

---

## 🔧 How to Add a Daily Task

As admin, tasks must be added directly to Firebase:
1. Go to Firebase Console → Realtime Database
2. Click **"+" icon** to add a node called `tasks`
3. Add a child with these fields:
```json
{
  "title": "Follow our YouTube Channel",
  "description": "Subscribe to our YouTube and send screenshot",
  "reward": 10,
  "active": true
}
```

Or you can add a `/create_task` command by following the same pattern as other admin commands.

---

## ⚠️ Important Notes

- **Keep your `.env` file secret** — never upload it to GitHub
- The bot runs 24/7 on Render free plan (may sleep after 15 min inactivity — upgrade to paid to prevent)
- To prevent sleeping, use a free uptime monitor like **UptimeRobot** to ping your Render URL every 5 minutes
- Firebase free tier supports 1GB storage and 10GB/month transfer — enough for thousands of users

---

## 🆘 Troubleshooting

**Bot not responding:**
- Check Render logs for errors
- Verify BOT_TOKEN is correct
- Ensure Firebase variables are set correctly

**Firebase connection error:**
- Check FIREBASE_PRIVATE_KEY has proper line breaks
- Verify DATABASE_URL ends with `.firebaseio.com`

**Users can't join tournament:**
- Check tournament status is `open`
- Verify user has sufficient balance
