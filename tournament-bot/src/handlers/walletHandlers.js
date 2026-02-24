const db = require('../firebase/db');
const { formatAmount, formatDate } = require('../utils/helpers');

// /balance
async function balance(ctx) {
  const userId = String(ctx.from.id);
  const user = await db.getUser(userId);
  if (!user) return ctx.reply('❌ Please /register first.');

  await ctx.reply(
    `💰 *Your Wallet*\n\n` +
    `Available Balance: *${formatAmount(user.balance || 0)}*\n\n` +
    `/history - View transactions\n` +
    `/deposit - Add funds\n` +
    `/withdraw - Withdraw funds`,
    { parse_mode: 'Markdown' }
  );
}

// /history
async function history(ctx) {
  const userId = String(ctx.from.id);
  const user = await db.getUser(userId);
  if (!user) return ctx.reply('❌ Please /register first.');

  const transactions = await db.getTransactions(userId);

  if (transactions.length === 0) {
    return ctx.reply('📋 No transactions yet.');
  }

  let text = `📋 *Transaction History* (last 10)\n\n`;
  for (const tx of transactions) {
    const sign = tx.amount > 0 ? '➕' : '➖';
    text += `${sign} ${formatAmount(Math.abs(tx.amount))} — ${tx.description}\n`;
    text += `📅 ${formatDate(tx.timestamp)}\n\n`;
  }

  await ctx.reply(text, { parse_mode: 'Markdown' });
}

// /deposit
async function deposit(ctx) {
  const userId = String(ctx.from.id);
  const user = await db.getUser(userId);
  if (!user) return ctx.reply('❌ Please /register first.');

  const text = `💳 *How to Deposit*\n\n` +
    `Send money to admin via bKash/Nagad:\n\n` +
    `📱 bKash: \`${process.env.BKASH_NUMBER || 'Contact Admin'}\`\n` +
    `📱 Nagad: \`${process.env.NAGAD_NUMBER || 'Contact Admin'}\`\n\n` +
    `After sending, screenshot the transaction and send to admin:\n` +
    `👤 @${process.env.ADMIN_USERNAME || 'Admin'}\n\n` +
    `📌 Your Telegram ID: \`${userId}\`\n` +
    `_(Send this ID to admin with your payment screenshot)_`;

  await ctx.reply(text, { parse_mode: 'Markdown' });
}

module.exports = { balance, history, deposit };
