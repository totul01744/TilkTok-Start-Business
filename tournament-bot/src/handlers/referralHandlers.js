const db = require('../firebase/db');
const { formatAmount } = require('../utils/helpers');

// /referral
async function referralInfo(ctx) {
  const userId = String(ctx.from.id);
  const user = await db.getUser(userId);
  if (!user) return ctx.reply('❌ Please /register first.');

  const referrals = await db.getReferrals(userId);
  const referralCount = Object.keys(referrals).length;
  const bonusAmount = Number(process.env.REFERRAL_BONUS || 50);
  const needed = Math.max(0, 3 - referralCount);

  const text = `👥 *Referral Program*\n\n` +
    `🔗 Your Referral Link:\n` +
    `https://t.me/${ctx.botInfo.username}?start=${user.referralCode}\n\n` +
    `👤 Total Referrals: ${referralCount}\n` +
    `🎁 Bonus: ${formatAmount(bonusAmount)} after 3 referrals\n` +
    `✅ Status: ${user.referralBonusPaid ? 'Bonus claimed!' : `Need ${needed} more referral(s)`}\n\n` +
    `📢 *How it works:*\n` +
    `1. Share your referral link\n` +
    `2. Friends register using your link\n` +
    `3. After 3 friends join, you get ${formatAmount(bonusAmount)} bonus!\n\n` +
    `_Share with your friends and earn!_`;

  await ctx.reply(text, { parse_mode: 'Markdown' });
}

module.exports = { referralInfo };
