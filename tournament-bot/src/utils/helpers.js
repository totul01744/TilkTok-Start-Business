// Check if user is admin
function isAdmin(telegramId) {
  const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim());
  return adminIds.includes(String(telegramId));
}

// Format currency
function formatAmount(amount) {
  return `৳${Number(amount).toFixed(2)}`;
}

// Format date
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString('en-BD', {
    timeZone: 'Asia/Dhaka',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// Generate referral code
function generateReferralCode(telegramId) {
  return `REF${telegramId}`;
}

// Parse referral code to get user ID
function parseReferralCode(code) {
  const match = code.match(/^REF(\d+)$/);
  return match ? match[1] : null;
}

// Middleware to check if user is registered
async function requireRegistered(ctx, next) {
  const { getUser } = require('../firebase/db');
  const userId = ctx.from.id;
  const user = await getUser(userId);
  
  if (!user) {
    await ctx.reply('❌ You are not registered yet.\nPlease use /register to create your account.');
    return;
  }
  
  if (user.blocked) {
    await ctx.reply('🚫 Your account has been blocked. Contact admin.');
    return;
  }
  
  ctx.user = user;
  return next();
}

// Middleware to check admin
async function requireAdmin(ctx, next) {
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply('🚫 This command is for admins only.');
    return;
  }
  return next();
}

// Safe reply - doesn't crash if user blocked bot
async function safeReply(ctx, message, options = {}) {
  try {
    return await ctx.reply(message, options);
  } catch (err) {
    console.error('Reply failed:', err.message);
  }
}

// Send message to user by ID
async function sendMessage(bot, userId, message, options = {}) {
  try {
    return await bot.telegram.sendMessage(userId, message, options);
  } catch (err) {
    console.error(`Failed to send message to ${userId}:`, err.message);
  }
}

module.exports = {
  isAdmin,
  formatAmount,
  formatDate,
  generateReferralCode,
  parseReferralCode,
  requireRegistered,
  requireAdmin,
  safeReply,
  sendMessage,
};
