const db = require('../firebase/db');
const { isAdmin, formatAmount, formatDate } = require('../utils/helpers');

// Helper: Check admin
function checkAdmin(ctx) {
  if (!isAdmin(ctx.from.id)) {
    ctx.reply('🚫 Admin only command.');
    return false;
  }
  return true;
}

// ─── TOURNAMENT MANAGEMENT ────────────────────────────────────────

// /create_tournament <name> | <entryFee> | <maxPlayers> | <startTime> | <map>
// Example: /create_tournament Free Fire Solo | 20 | 50 | 2024-12-25 20:00 | Bermuda
async function createTournament(ctx) {
  if (!checkAdmin(ctx)) return;

  const text = ctx.message.text.replace('/create_tournament', '').trim();
  const parts = text.split('|').map(p => p.trim());

  if (parts.length < 4) {
    return ctx.reply(
      '❌ Usage:\n/create_tournament <name> | <entryFee> | <maxPlayers> | <startTime> | <map>\n\n' +
      'Example:\n/create_tournament FF Solo War | 20 | 50 | 2024-12-25 20:00 | Bermuda'
    );
  }

  const [name, entryFee, maxPlayers, startTime, map] = parts;

  const tournamentId = await db.createTournament({
    name,
    entryFee: parseFloat(entryFee),
    maxPlayers: parseInt(maxPlayers),
    startTime: new Date(startTime).getTime(),
    map: map || 'TBA',
    prizePool: 0,
    status: 'open',
    createdAt: Date.now(),
    createdBy: String(ctx.from.id),
    participants: {},
  });

  await ctx.reply(
    `✅ *Tournament Created!*\n\n` +
    `🆔 ID: \`${tournamentId}\`\n` +
    `🎮 Name: ${name}\n` +
    `💰 Entry Fee: ${formatAmount(parseFloat(entryFee))}\n` +
    `👥 Max Players: ${maxPlayers}\n` +
    `📅 Start Time: ${startTime}\n` +
    `📋 Map: ${map || 'TBA'}\n\n` +
    `Commands:\n` +
    `/add_match ${tournamentId} | <room_id> | <password>\n` +
    `/start_tournament ${tournamentId}\n` +
    `/end_tournament ${tournamentId} | <winner_id> | <2nd_id> | <3rd_id>`,
    { parse_mode: 'Markdown' }
  );
}

// /add_match <tournament_id> | <room_id> | <password>
async function addMatch(ctx) {
  if (!checkAdmin(ctx)) return;

  const text = ctx.message.text.replace('/add_match', '').trim();
  const parts = text.split('|').map(p => p.trim());

  if (parts.length < 3) {
    return ctx.reply('❌ Usage: /add_match <tournament_id> | <room_id> | <password>');
  }

  const [tournamentId, roomId, password] = parts;
  const tournament = await db.getTournament(tournamentId);
  if (!tournament) return ctx.reply('❌ Tournament not found.');

  await db.updateTournament(tournamentId, { roomId, password });

  // Notify all participants
  const participants = tournament.participants || {};
  let notified = 0;
  for (const userId of Object.keys(participants)) {
    try {
      await ctx.telegram.sendMessage(
        userId,
        `🎮 *Match Details - ${tournament.name}*\n\n` +
        `🏠 Room ID: \`${roomId}\`\n` +
        `🔑 Password: \`${password}\`\n\n` +
        `📅 Start Time: ${formatDate(tournament.startTime)}\n` +
        `Good luck! 🍀`,
        { parse_mode: 'Markdown' }
      );
      notified++;
    } catch (e) {}
  }

  await ctx.reply(`✅ Match details added!\n🏠 Room: ${roomId}\n🔑 Pass: ${password}\n📢 Notified ${notified} players.`);
}

// /start_tournament <tournament_id>
async function startTournament(ctx) {
  if (!checkAdmin(ctx)) return;

  const args = ctx.message.text.split(' ');
  const tournamentId = args[1];
  if (!tournamentId) return ctx.reply('❌ Usage: /start_tournament <tournament_id>');

  const tournament = await db.getTournament(tournamentId);
  if (!tournament) return ctx.reply('❌ Tournament not found.');
  if (tournament.status === 'ongoing') return ctx.reply('❌ Tournament already started!');

  await db.updateTournament(tournamentId, { status: 'ongoing', startedAt: Date.now() });

  // Notify participants
  const participants = tournament.participants || {};
  for (const userId of Object.keys(participants)) {
    try {
      await ctx.telegram.sendMessage(
        userId,
        `🚀 *Tournament Started!*\n\n🎮 ${tournament.name}\n\n` +
        `${tournament.roomId ? `🏠 Room: \`${tournament.roomId}\`\n🔑 Pass: \`${tournament.password}\`` : 'Room details coming soon!'}\n\nGood luck! 🍀`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {}
  }

  await ctx.reply(`✅ Tournament "${tournament.name}" started!\n📢 ${Object.keys(participants).length} players notified.`);
}

// /end_tournament <tournament_id> | <1st_userId> | <2nd_userId> | <3rd_userId>
async function endTournament(ctx) {
  if (!checkAdmin(ctx)) return;

  const text = ctx.message.text.replace('/end_tournament', '').trim();
  const parts = text.split('|').map(p => p.trim());

  if (parts.length < 2) {
    return ctx.reply('❌ Usage: /end_tournament <tournament_id> | <1st_uid> | <2nd_uid> | <3rd_uid>');
  }

  const [tournamentId, first, second, third] = parts;
  const tournament = await db.getTournament(tournamentId);
  if (!tournament) return ctx.reply('❌ Tournament not found.');

  const prizePool = tournament.prizePool || 0;

  // Prize distribution: 50%, 30%, 20%
  const prizes = {
    [first]: Math.floor(prizePool * 0.5),
    [second]: second ? Math.floor(prizePool * 0.3) : 0,
    [third]: third ? Math.floor(prizePool * 0.2) : 0,
  };

  const winners = [];
  for (const [userId, prize] of Object.entries(prizes)) {
    if (!userId || prize <= 0) continue;
    const user = await db.getUser(userId);
    if (!user) continue;

    await db.updateBalance(userId, prize);
    await db.addTransaction(userId, {
      type: 'tournament_prize',
      amount: prize,
      description: `Prize from tournament: ${tournament.name}`,
      tournamentId,
    });

    try {
      await ctx.telegram.sendMessage(
        userId,
        `🏆 *Congratulations!*\n\n` +
        `You won in *${tournament.name}*!\n` +
        `💰 Prize: *${formatAmount(prize)}* added to your wallet!`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {}

    winners.push({ userId, prize });
  }

  await db.updateTournament(tournamentId, {
    status: 'ended',
    endedAt: Date.now(),
    winners: winners.map(w => w.userId),
  });

  // Notify all participants about results
  const participants = tournament.participants || {};
  for (const userId of Object.keys(participants)) {
    if (winners.find(w => w.userId === userId)) continue;
    try {
      await ctx.telegram.sendMessage(
        userId,
        `🎮 *Tournament Ended: ${tournament.name}*\n\n` +
        `🥇 1st: User ${first} — ${formatAmount(prizes[first] || 0)}\n` +
        `${second ? `🥈 2nd: User ${second} — ${formatAmount(prizes[second] || 0)}\n` : ''}` +
        `${third ? `🥉 3rd: User ${third} — ${formatAmount(prizes[third] || 0)}\n` : ''}\n` +
        `Better luck next time! 💪`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {}
  }

  await ctx.reply(
    `✅ Tournament ended!\n\n` +
    `💰 Prizes distributed:\n` +
    winners.map(w => `• User ${w.userId}: ${formatAmount(w.prize)}`).join('\n')
  );
}

// ─── WITHDRAW MANAGEMENT ──────────────────────────────────────────

// /approve_withdraw <withdraw_id>
async function approveWithdraw(ctx) {
  if (!checkAdmin(ctx)) return;

  const args = ctx.message.text.split(' ');
  const withdrawId = args[1];
  if (!withdrawId) return ctx.reply('❌ Usage: /approve_withdraw <withdraw_id>');

  const request = await db.getWithdrawRequest(withdrawId);
  if (!request) return ctx.reply('❌ Withdrawal request not found.');
  if (request.status !== 'pending') return ctx.reply(`❌ Request is already ${request.status}.`);

  await db.updateWithdrawRequest(withdrawId, {
    status: 'approved',
    approvedAt: Date.now(),
    approvedBy: String(ctx.from.id),
  });

  try {
    await ctx.telegram.sendMessage(
      request.userId,
      `✅ *Withdrawal Approved!*\n\n` +
      `💰 Amount: ${formatAmount(request.amount)}\n` +
      `📱 Method: ${request.method.toUpperCase()}\n` +
      `📞 Account: ${request.account}\n\n` +
      `Payment will be processed shortly.`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {}

  await ctx.reply(`✅ Withdrawal approved for ${request.userName} — ${formatAmount(request.amount)}`);
}

// /reject_withdraw <withdraw_id> [reason]
async function rejectWithdraw(ctx) {
  if (!checkAdmin(ctx)) return;

  const args = ctx.message.text.split(' ');
  const withdrawId = args[1];
  const reason = args.slice(2).join(' ') || 'No reason provided';

  if (!withdrawId) return ctx.reply('❌ Usage: /reject_withdraw <withdraw_id> [reason]');

  const request = await db.getWithdrawRequest(withdrawId);
  if (!request) return ctx.reply('❌ Request not found.');
  if (request.status !== 'pending') return ctx.reply(`❌ Request already ${request.status}.`);

  await db.updateWithdrawRequest(withdrawId, {
    status: 'rejected',
    rejectedAt: Date.now(),
    reason,
  });

  // Refund balance
  await db.updateBalance(request.userId, request.amount);
  await db.addTransaction(request.userId, {
    type: 'withdrawal_refund',
    amount: request.amount,
    description: `Withdrawal rejected. Refunded. Reason: ${reason}`,
  });

  try {
    await ctx.telegram.sendMessage(
      request.userId,
      `❌ *Withdrawal Rejected*\n\n` +
      `💰 Amount: ${formatAmount(request.amount)}\n` +
      `Reason: ${reason}\n\n` +
      `Your balance has been refunded.`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {}

  await ctx.reply(`✅ Withdrawal rejected and balance refunded.`);
}

// /list_withdraws
async function listWithdraws(ctx) {
  if (!checkAdmin(ctx)) return;

  const withdrawals = await db.getPendingWithdrawals();
  const list = Object.values(withdrawals);

  if (list.length === 0) {
    return ctx.reply('📋 No pending withdrawal requests.');
  }

  let text = `💸 *Pending Withdrawals (${list.length})*\n\n`;
  for (const w of list.slice(0, 10)) {
    text += `🆔 \`${w.id}\`\n`;
    text += `👤 ${w.userName} (${w.userId})\n`;
    text += `💰 ${formatAmount(w.amount)} via ${w.method} → ${w.account}\n`;
    text += `📅 ${formatDate(w.requestedAt)}\n\n`;
  }

  await ctx.reply(text, { parse_mode: 'Markdown' });
}

// ─── TASK MANAGEMENT ──────────────────────────────────────────────

// /approve_task <submission_id>
async function approveTask(ctx) {
  if (!checkAdmin(ctx)) return;

  const args = ctx.message.text.split(' ');
  const submissionId = args[1];
  if (!submissionId) return ctx.reply('❌ Usage: /approve_task <submission_id>');

  const snap = await require('../firebase/config').getDb().ref(`task_submissions/${submissionId}`).once('value');
  const submission = snap.val();
  if (!submission) return ctx.reply('❌ Submission not found.');
  if (submission.status !== 'pending') return ctx.reply(`❌ Already ${submission.status}.`);

  const task = await db.getTask(submission.taskId);
  if (!task) return ctx.reply('❌ Task not found.');

  await db.updateTaskSubmission(submissionId, {
    status: 'approved',
    approvedAt: Date.now(),
    approvedBy: String(ctx.from.id),
  });

  await db.updateBalance(submission.userId, task.reward);
  await db.addTransaction(submission.userId, {
    type: 'task_reward',
    amount: task.reward,
    description: `Task reward: ${task.title}`,
    taskId: task.id,
  });

  try {
    await ctx.telegram.sendMessage(
      submission.userId,
      `✅ *Task Approved!*\n\n` +
      `📌 Task: ${task.title}\n` +
      `💰 Reward: *${formatAmount(task.reward)}* added to your wallet!`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {}

  await ctx.reply(`✅ Task approved! ${formatAmount(task.reward)} sent to user ${submission.userId}.`);
}

// /reject_task <submission_id> [reason]
async function rejectTask(ctx) {
  if (!checkAdmin(ctx)) return;

  const args = ctx.message.text.split(' ');
  const submissionId = args[1];
  const reason = args.slice(2).join(' ') || 'Proof not valid';

  const snap = await require('../firebase/config').getDb().ref(`task_submissions/${submissionId}`).once('value');
  const submission = snap.val();
  if (!submission) return ctx.reply('❌ Submission not found.');

  await db.updateTaskSubmission(submissionId, {
    status: 'rejected',
    rejectedAt: Date.now(),
    reason,
  });

  const task = await db.getTask(submission.taskId);

  try {
    await ctx.telegram.sendMessage(
      submission.userId,
      `❌ *Task Rejected*\n\n` +
      `📌 Task: ${task?.title || 'Unknown'}\n` +
      `Reason: ${reason}\n\n` +
      `You can resubmit with correct proof.`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {}

  await ctx.reply(`✅ Task rejected.`);
}

// ─── USER MANAGEMENT ──────────────────────────────────────────────

// /give_bonus <user_id> <amount> [reason]
async function giveBonus(ctx) {
  if (!checkAdmin(ctx)) return;

  const args = ctx.message.text.split(' ');
  if (args.length < 3) return ctx.reply('❌ Usage: /give_bonus <user_id> <amount> [reason]');

  const userId = args[1];
  const amount = parseFloat(args[2]);
  const reason = args.slice(3).join(' ') || 'Admin bonus';

  if (isNaN(amount) || amount <= 0) return ctx.reply('❌ Invalid amount.');

  const user = await db.getUser(userId);
  if (!user) return ctx.reply('❌ User not found.');

  await db.updateBalance(userId, amount);
  await db.addTransaction(userId, {
    type: 'admin_bonus',
    amount,
    description: reason,
  });

  try {
    await ctx.telegram.sendMessage(
      userId,
      `🎁 *Bonus Received!*\n\n💰 Amount: *${formatAmount(amount)}*\nReason: ${reason}`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {}

  await ctx.reply(`✅ ${formatAmount(amount)} bonus sent to ${user.firstName} (${userId}).`);
}

// /block_user <user_id> [reason]
async function blockUser(ctx) {
  if (!checkAdmin(ctx)) return;

  const args = ctx.message.text.split(' ');
  const userId = args[1];
  const reason = args.slice(2).join(' ') || 'Violation of rules';

  if (!userId) return ctx.reply('❌ Usage: /block_user <user_id> [reason]');

  const user = await db.getUser(userId);
  if (!user) return ctx.reply('❌ User not found.');

  await db.updateUser(userId, { blocked: true, blockReason: reason, blockedAt: Date.now() });

  try {
    await ctx.telegram.sendMessage(userId, `🚫 Your account has been blocked.\nReason: ${reason}\n\nContact admin to appeal.`);
  } catch (e) {}

  await ctx.reply(`✅ User ${user.firstName} (${userId}) has been blocked.`);
}

// /unblock_user <user_id>
async function unblockUser(ctx) {
  if (!checkAdmin(ctx)) return;

  const args = ctx.message.text.split(' ');
  const userId = args[1];
  if (!userId) return ctx.reply('❌ Usage: /unblock_user <user_id>');

  const user = await db.getUser(userId);
  if (!user) return ctx.reply('❌ User not found.');

  await db.updateUser(userId, { blocked: false });

  try {
    await ctx.telegram.sendMessage(userId, `✅ Your account has been unblocked. You can use the bot again!`);
  } catch (e) {}

  await ctx.reply(`✅ User ${user.firstName} (${userId}) unblocked.`);
}

// ─── PRODUCT MANAGEMENT ───────────────────────────────────────────

// /add_product <name> | <price> | <description> | <stock>
async function addProduct(ctx) {
  if (!checkAdmin(ctx)) return;

  const text = ctx.message.text.replace('/add_product', '').trim();
  const parts = text.split('|').map(p => p.trim());

  if (parts.length < 3) {
    return ctx.reply(
      '❌ Usage: /add_product <name> | <price> | <description> | <stock>\n\n' +
      'Use -1 for unlimited stock.\n\n' +
      'Example:\n/add_product FF Diamonds 100 | 50 | 100 Free Fire diamonds | 100'
    );
  }

  const [name, price, description, stock] = parts;

  const productId = await db.addProduct({
    name,
    price: parseFloat(price),
    description,
    stock: stock ? parseInt(stock) : -1,
    active: true,
    createdAt: Date.now(),
    deliveryInfo: 'Admin will contact you after purchase.',
  });

  await ctx.reply(
    `✅ *Product Added!*\n\n` +
    `🆔 ID: \`${productId}\`\n` +
    `📦 Name: ${name}\n` +
    `💰 Price: ${formatAmount(parseFloat(price))}\n` +
    `📝 Description: ${description}\n` +
    `📦 Stock: ${stock === '-1' || !stock ? 'Unlimited' : stock}`,
    { parse_mode: 'Markdown' }
  );
}

// /stats
async function stats(ctx) {
  if (!checkAdmin(ctx)) return;

  const users = await db.getAllUsers();
  const tournaments = await db.getAllTournaments();
  const pendingWithdrawals = await db.getPendingWithdrawals();
  const pendingTasks = await db.getPendingTaskSubmissions();

  const totalUsers = Object.keys(users).length;
  const totalBalance = Object.values(users).reduce((sum, u) => sum + (u.balance || 0), 0);
  const activeTournaments = Object.values(tournaments).filter(t => t.status === 'open' || t.status === 'ongoing').length;
  const pendingWithdrawCount = Object.keys(pendingWithdrawals).length;
  const pendingTaskCount = Object.keys(pendingTasks).length;

  await ctx.reply(
    `📊 *Bot Statistics*\n\n` +
    `👥 Total Users: ${totalUsers}\n` +
    `💰 Total Balance: ${formatAmount(totalBalance)}\n` +
    `🎮 Active Tournaments: ${activeTournaments}\n` +
    `💸 Pending Withdrawals: ${pendingWithdrawCount}\n` +
    `📋 Pending Task Approvals: ${pendingTaskCount}`,
    { parse_mode: 'Markdown' }
  );
}

module.exports = {
  createTournament,
  addMatch,
  startTournament,
  endTournament,
  approveWithdraw,
  rejectWithdraw,
  listWithdraws,
  approveTask,
  rejectTask,
  giveBonus,
  blockUser,
  unblockUser,
  addProduct,
  stats,
};
