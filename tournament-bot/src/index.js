require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const { initFirebase } = require('./firebase/config');
const userHandlers = require('./handlers/userHandlers');
const tournamentHandlers = require('./handlers/tournamentHandlers');
const walletHandlers = require('./handlers/walletHandlers');
const taskHandlers = require('./handlers/taskHandlers');
const referralHandlers = require('./handlers/referralHandlers');
const productHandlers = require('./handlers/productHandlers');
const withdrawHandlers = require('./handlers/withdrawHandlers');
const adminHandlers = require('./handlers/adminHandlers');

// Initialize Firebase
initFirebase();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Session middleware
bot.use(session());

// ─── USER COMMANDS ───────────────────────────────────────────────
bot.start(userHandlers.start);
bot.command('register', userHandlers.register);
bot.command('profile', userHandlers.profile);
bot.command('balance', walletHandlers.balance);
bot.command('history', walletHandlers.history);
bot.command('deposit', walletHandlers.deposit);
bot.command('withdraw', withdrawHandlers.requestWithdraw);
bot.command('tournaments', tournamentHandlers.listTournaments);
bot.command('join', tournamentHandlers.joinTournament);
bot.command('leaderboard', tournamentHandlers.leaderboard);
bot.command('tasks', taskHandlers.listTasks);
bot.command('submit_task', taskHandlers.submitTask);
bot.command('referral', referralHandlers.referralInfo);
bot.command('products', productHandlers.listProducts);
bot.command('buy', productHandlers.buyProduct);
bot.command('help', userHandlers.help);

// ─── ADMIN COMMANDS ───────────────────────────────────────────────
bot.command('create_tournament', adminHandlers.createTournament);
bot.command('add_match', adminHandlers.addMatch);
bot.command('start_tournament', adminHandlers.startTournament);
bot.command('end_tournament', adminHandlers.endTournament);
bot.command('approve_withdraw', adminHandlers.approveWithdraw);
bot.command('give_bonus', adminHandlers.giveBonus);
bot.command('block_user', adminHandlers.blockUser);
bot.command('unblock_user', adminHandlers.unblockUser);
bot.command('add_product', adminHandlers.addProduct);
bot.command('approve_task', adminHandlers.approveTask);
bot.command('reject_task', adminHandlers.rejectTask);
bot.command('list_withdraws', adminHandlers.listWithdraws);
bot.command('stats', adminHandlers.stats);

// ─── CALLBACK QUERIES ─────────────────────────────────────────────
bot.on('callback_query', require('./handlers/callbackHandlers'));

// ─── ERROR HANDLING ───────────────────────────────────────────────
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('❌ Something went wrong. Please try again later.').catch(() => {});
});

// ─── LAUNCH ───────────────────────────────────────────────────────
if (process.env.WEBHOOK_URL) {
  bot.launch({
    webhook: {
      domain: process.env.WEBHOOK_URL,
      port: process.env.PORT || 3000,
    },
  });
  console.log('🤖 Bot running with webhook on port', process.env.PORT || 3000);
} else {
  bot.launch();
  console.log('🤖 Bot running with long polling');
}

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
