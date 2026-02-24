const db = require('../firebase/db');
const { generateReferralCode, parseReferralCode, formatAmount, formatDate } = require('../utils/helpers');

// /start command
async function start(ctx) {
  const userId = String(ctx.from.id);
  const user = await db.getUser(userId);
  const args = ctx.message.text.split(' ');
  const startParam = args[1];

  // Handle referral link
  if (startParam && startParam.startsWith('REF') && !user) {
    const referrerId = parseReferralCode(startParam);
    if (referrerId && referrerId !== userId) {
      ctx.session = ctx.session || {};
      ctx.session.referredBy = referrerId;
    }
  }

  const welcomeText = user
    ? `👋 Welcome back, *${user.firstName}*!\n\nYour balance: ${formatAmount(user.balance || 0)}\n\nUse /help to see all commands.`
    : `🎮 *Welcome to Tournament Bot!*\n\nEarn money by playing tournaments, completing tasks, and referring friends!\n\n📝 Use /register to create your account.\n\n✅ Features:\n• Tournament System\n• Daily Tasks\n• Referral Bonuses\n• Wallet & Withdraw\n• Product Shop`;

  await ctx.reply(welcomeText, { parse_mode: 'Markdown' });
}

// /register command
async function register(ctx) {
  const userId = String(ctx.from.id);
  const existingUser = await db.getUser(userId);

  if (existingUser) {
    await ctx.reply('✅ You are already registered!\n\nUse /profile to see your details.');
    return;
  }

  const args = ctx.message.text.split(' ');
  const name = args.slice(1).join(' ') || ctx.from.first_name;

  const referralCode = generateReferralCode(userId);
  const referredBy = ctx.session?.referredBy || null;

  const newUser = {
    telegramId: userId,
    firstName: ctx.from.first_name,
    lastName: ctx.from.last_name || '',
    username: ctx.from.username || '',
    name: name,
    balance: 0,
    referralCode,
    referredBy,
    registeredAt: Date.now(),
    blocked: false,
    referralBonusPaid: false,
  };

  await db.createUser(userId, newUser);

  // Add referral record
  if (referredBy) {
    await db.addReferral(referredBy, userId);

    // Check if referrer now has 3 referrals
    const referrals = await db.getReferrals(referredBy);
    const referralCount = Object.keys(referrals).length;

    const referrer = await db.getUser(referredBy);
    if (referrer && referralCount >= 3 && !referrer.referralBonusPaid) {
      const bonusAmount = Number(process.env.REFERRAL_BONUS || 50);
      await db.updateBalance(referredBy, bonusAmount);
      await db.addTransaction(referredBy, {
        type: 'referral_bonus',
        amount: bonusAmount,
        description: `Referral bonus for 3 successful referrals`,
      });
      await db.markReferralBonusPaid(referredBy);

      // Notify referrer
      try {
        await ctx.telegram.sendMessage(
          referredBy,
          `🎉 *Referral Bonus Unlocked!*\n\nYou have ${referralCount} successful referrals!\n\n💰 Bonus added: ${formatAmount(bonusAmount)}`,
          { parse_mode: 'Markdown' }
        );
      } catch (e) {}
    }
  }

  await ctx.reply(
    `✅ *Registration Successful!*\n\n👤 Name: ${name}\n🆔 ID: ${userId}\n💰 Balance: ${formatAmount(0)}\n\n🔗 Your Referral Link:\n` +
    `https://t.me/${ctx.botInfo.username}?start=${referralCode}\n\n` +
    `Invite friends and earn bonus after 3 referrals!\n\nUse /help to see all commands.`,
    { parse_mode: 'Markdown' }
  );
}

// /profile command
async function profile(ctx) {
  const userId = String(ctx.from.id);
  const user = await db.getUser(userId);

  if (!user) {
    await ctx.reply('❌ You are not registered. Use /register first.');
    return;
  }

  const referrals = await db.getReferrals(userId);
  const referralCount = Object.keys(referrals).length;

  const text = `👤 *Your Profile*\n\n` +
    `🆔 ID: ${userId}\n` +
    `📛 Name: ${user.firstName} ${user.lastName}\n` +
    `👤 Username: ${user.username ? '@' + user.username : 'N/A'}\n` +
    `💰 Balance: ${formatAmount(user.balance || 0)}\n` +
    `👥 Referrals: ${referralCount}/3\n` +
    `🎁 Referral Bonus: ${user.referralBonusPaid ? '✅ Claimed' : referralCount >= 3 ? '✅ Claimed' : '❌ Pending (need 3)'}\n` +
    `📅 Joined: ${formatDate(user.registeredAt)}\n\n` +
    `🔗 Your Referral Link:\n` +
    `https://t.me/${ctx.botInfo.username}?start=${user.referralCode}`;

  await ctx.reply(text, { parse_mode: 'Markdown' });
}

// /help command
async function help(ctx) {
  const text = `📚 *Available Commands*\n\n` +
    `*👤 Account*\n` +
    `/register - Create account\n` +
    `/profile - View your profile\n` +
    `/balance - Check balance\n` +
    `/history - Transaction history\n\n` +
    `*🎮 Tournaments*\n` +
    `/tournaments - List open tournaments\n` +
    `/join <id> - Join a tournament\n` +
    `/leaderboard <id> - View tournament leaderboard\n\n` +
    `*✅ Tasks*\n` +
    `/tasks - View daily tasks\n` +
    `/submit_task <task_id> <proof> - Submit task proof\n\n` +
    `*👥 Referral*\n` +
    `/referral - Your referral info & link\n\n` +
    `*🛍️ Shop*\n` +
    `/products - View products\n` +
    `/buy <product_id> - Purchase a product\n\n` +
    `*💸 Wallet*\n` +
    `/deposit - How to deposit\n` +
    `/withdraw <amount> <method> <account> - Withdraw funds`;

  await ctx.reply(text, { parse_mode: 'Markdown' });
}

module.exports = { start, register, profile, help };
