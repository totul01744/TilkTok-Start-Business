const db = require('../firebase/db');
const { formatAmount, formatDate } = require('../utils/helpers');

// /tournaments - list open tournaments
async function listTournaments(ctx) {
  const userId = String(ctx.from.id);
  const user = await db.getUser(userId);
  if (!user) return ctx.reply('❌ Please /register first.');
  if (user.blocked) return ctx.reply('🚫 Account blocked.');

  const tournaments = await db.getActiveTournaments();
  const list = Object.values(tournaments);

  if (list.length === 0) {
    return ctx.reply('😔 No open tournaments right now.\nCheck back later!');
  }

  let text = `🏆 *Open Tournaments*\n\n`;
  for (const t of list) {
    text += `🎮 *${t.name}*\n`;
    text += `🆔 ID: \`${t.id}\`\n`;
    text += `💰 Entry Fee: ${formatAmount(t.entryFee)}\n`;
    text += `🏅 Prize Pool: ${formatAmount(t.prizePool)}\n`;
    text += `👥 Players: ${Object.keys(t.participants || {}).length}/${t.maxPlayers}\n`;
    text += `📅 Starts: ${formatDate(t.startTime)}\n`;
    text += `📋 Map: ${t.map || 'TBA'}\n`;
    text += `\n➡️ /join ${t.id}\n\n`;
  }

  await ctx.reply(text, { parse_mode: 'Markdown' });
}

// /join <tournament_id>
async function joinTournament(ctx) {
  const userId = String(ctx.from.id);
  const user = await db.getUser(userId);
  if (!user) return ctx.reply('❌ Please /register first.');
  if (user.blocked) return ctx.reply('🚫 Account blocked.');

  const args = ctx.message.text.split(' ');
  const tournamentId = args[1];

  if (!tournamentId) {
    return ctx.reply('❌ Usage: /join <tournament_id>\n\nUse /tournaments to see available tournaments.');
  }

  const tournament = await db.getTournament(tournamentId);
  if (!tournament) return ctx.reply('❌ Tournament not found.');
  if (tournament.status !== 'open') return ctx.reply('❌ This tournament is not open for joining.');

  // Check if already joined
  const alreadyJoined = await db.isParticipant(tournamentId, userId);
  if (alreadyJoined) return ctx.reply('❌ You already joined this tournament!');

  // Check max players
  const currentPlayers = Object.keys(tournament.participants || {}).length;
  if (currentPlayers >= tournament.maxPlayers) {
    return ctx.reply('❌ Tournament is full!');
  }

  // Check balance
  const balance = user.balance || 0;
  if (balance < tournament.entryFee) {
    return ctx.reply(`❌ Insufficient balance!\n\nRequired: ${formatAmount(tournament.entryFee)}\nYour balance: ${formatAmount(balance)}\n\nUse /deposit to top up.`);
  }

  // Deduct entry fee
  await db.updateBalance(userId, -tournament.entryFee);
  await db.addTransaction(userId, {
    type: 'tournament_entry',
    amount: -tournament.entryFee,
    description: `Entry fee for tournament: ${tournament.name}`,
    tournamentId,
  });

  // Update prize pool
  await db.updateTournament(tournamentId, {
    prizePool: (tournament.prizePool || 0) + (tournament.entryFee * 0.9), // 90% goes to prize pool
  });

  // Join tournament
  await db.joinTournament(tournamentId, userId);

  await ctx.reply(
    `✅ *Successfully Joined!*\n\n` +
    `🎮 Tournament: *${tournament.name}*\n` +
    `💰 Entry Fee Paid: ${formatAmount(tournament.entryFee)}\n` +
    `💳 New Balance: ${formatAmount(balance - tournament.entryFee)}\n\n` +
    `🕐 Match details will be announced soon!\n` +
    `📢 Stay tuned for room ID and password.`,
    { parse_mode: 'Markdown' }
  );
}

// /leaderboard <tournament_id>
async function leaderboard(ctx) {
  const args = ctx.message.text.split(' ');
  const tournamentId = args[1];

  if (!tournamentId) {
    return ctx.reply('❌ Usage: /leaderboard <tournament_id>');
  }

  const tournament = await db.getTournament(tournamentId);
  if (!tournament) return ctx.reply('❌ Tournament not found.');

  const participants = tournament.participants || {};
  const sorted = Object.entries(participants)
    .map(([uid, data]) => ({ uid, ...data }))
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  if (sorted.length === 0) {
    return ctx.reply('😔 No participants yet.');
  }

  let text = `🏆 *Leaderboard: ${tournament.name}*\n\n`;
  const medals = ['🥇', '🥈', '🥉'];

  for (let i = 0; i < Math.min(sorted.length, 20); i++) {
    const p = sorted[i];
    const medal = medals[i] || `${i + 1}.`;
    
    // Get user info
    try {
      const userInfo = await db.getUser(p.uid);
      const name = userInfo ? userInfo.firstName : `User ${p.uid}`;
      text += `${medal} ${name} — Score: ${p.score || 0} | Kills: ${p.kills || 0}\n`;
    } catch {
      text += `${medal} User ${p.uid} — Score: ${p.score || 0}\n`;
    }
  }

  text += `\n💰 Prize Pool: ${formatAmount(tournament.prizePool || 0)}`;

  await ctx.reply(text, { parse_mode: 'Markdown' });
}

module.exports = { listTournaments, joinTournament, leaderboard };
