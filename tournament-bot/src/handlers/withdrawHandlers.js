const db = require('../firebase/db');
const { formatAmount, formatDate } = require('../utils/helpers');

// /withdraw <amount> <method> <account_number>
async function requestWithdraw(ctx) {
  const userId = String(ctx.from.id);
  const user = await db.getUser(userId);
  if (!user) return ctx.reply('❌ Please /register first.');
  if (user.blocked) return ctx.reply('🚫 Account blocked.');

  const args = ctx.message.text.split(' ');
  if (args.length < 4) {
    return ctx.reply(
      '❌ Usage: /withdraw <amount> <method> <account>\n\n' +
      'Example: /withdraw 100 bkash 01700000000\n\n' +
      'Available methods: bkash, nagad, rocket'
    );
  }

  const amount = parseFloat(args[1]);
  const method = args[2].toLowerCase();
  const account = args[3];

  const validMethods = ['bkash', 'nagad', 'rocket'];
  if (!validMethods.includes(method)) {
    return ctx.reply(`❌ Invalid method. Use one of: ${validMethods.join(', ')}`);
  }

  const minWithdraw = Number(process.env.MIN_WITHDRAW || 50);
  if (isNaN(amount) || amount < minWithdraw) {
    return ctx.reply(`❌ Minimum withdrawal amount is ${formatAmount(minWithdraw)}`);
  }

  const balance = user.balance || 0;
  if (balance < amount) {
    return ctx.reply(`❌ Insufficient balance!\n\nRequested: ${formatAmount(amount)}\nAvailable: ${formatAmount(balance)}`);
  }

  // Check for pending withdrawal
  const existingWithdrawals = await db.getUserWithdrawals(userId);
  const hasPending = Object.values(existingWithdrawals).some(w => w.status === 'pending');
  if (hasPending) {
    return ctx.reply('❌ You already have a pending withdrawal request.\nPlease wait for it to be processed first.');
  }

  // Deduct balance and create request
  await db.updateBalance(userId, -amount);
  await db.addTransaction(userId, {
    type: 'withdrawal',
    amount: -amount,
    description: `Withdrawal via ${method} to ${account}`,
    status: 'pending',
  });

  const withdrawId = await db.createWithdrawRequest({
    userId,
    userName: user.firstName,
    amount,
    method,
    account,
    status: 'pending',
    requestedAt: Date.now(),
  });

  // Notify admins
  const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim());
  for (const adminId of adminIds) {
    try {
      await ctx.telegram.sendMessage(
        adminId,
        `💸 *New Withdrawal Request*\n\n` +
        `🆔 Request ID: \`${withdrawId}\`\n` +
        `👤 User: ${user.firstName} (${userId})\n` +
        `💰 Amount: ${formatAmount(amount)}\n` +
        `📱 Method: ${method.toUpperCase()}\n` +
        `📞 Account: ${account}\n\n` +
        `To approve: /approve_withdraw ${withdrawId}\n` +
        `To reject: /reject_withdraw ${withdrawId}`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {}
  }

  await ctx.reply(
    `✅ *Withdrawal Request Submitted!*\n\n` +
    `🆔 Request ID: \`${withdrawId}\`\n` +
    `💰 Amount: ${formatAmount(amount)}\n` +
    `📱 Method: ${method.toUpperCase()}\n` +
    `📞 Account: ${account}\n` +
    `🕐 Status: Pending admin approval\n\n` +
    `You will be notified when processed.`,
    { parse_mode: 'Markdown' }
  );
}

module.exports = { requestWithdraw };
