const db = require('../firebase/db');
const { formatAmount, formatDate } = require('../utils/helpers');

// /products
async function listProducts(ctx) {
  const userId = String(ctx.from.id);
  const user = await db.getUser(userId);
  if (!user) return ctx.reply('❌ Please /register first.');
  if (user.blocked) return ctx.reply('🚫 Account blocked.');

  const products = await db.getAllProducts();
  const productList = Object.values(products).filter(p => p.active);

  if (productList.length === 0) {
    return ctx.reply('🛍️ No products available right now.');
  }

  let text = `🛍️ *Product Shop*\n\n`;
  for (const p of productList) {
    text += `📦 *${p.name}*\n`;
    text += `🆔 ID: \`${p.id}\`\n`;
    text += `💰 Price: ${formatAmount(p.price)}\n`;
    text += `📝 ${p.description}\n`;
    text += `📦 Stock: ${p.stock === -1 ? 'Unlimited' : p.stock}\n\n`;
  }

  text += `To buy: /buy <product_id>`;

  await ctx.reply(text, { parse_mode: 'Markdown' });
}

// /buy <product_id>
async function buyProduct(ctx) {
  const userId = String(ctx.from.id);
  const user = await db.getUser(userId);
  if (!user) return ctx.reply('❌ Please /register first.');
  if (user.blocked) return ctx.reply('🚫 Account blocked.');

  const args = ctx.message.text.split(' ');
  const productId = args[1];

  if (!productId) {
    return ctx.reply('❌ Usage: /buy <product_id>\n\nUse /products to browse available products.');
  }

  const product = await db.getProduct(productId);
  if (!product) return ctx.reply('❌ Product not found.');
  if (!product.active) return ctx.reply('❌ This product is no longer available.');
  if (product.stock === 0) return ctx.reply('❌ This product is out of stock!');

  const balance = user.balance || 0;
  if (balance < product.price) {
    return ctx.reply(
      `❌ Insufficient balance!\n\n` +
      `Price: ${formatAmount(product.price)}\n` +
      `Your balance: ${formatAmount(balance)}\n\n` +
      `Use /deposit to add funds.`
    );
  }

  // Deduct balance
  await db.updateBalance(userId, -product.price);
  await db.addTransaction(userId, {
    type: 'purchase',
    amount: -product.price,
    description: `Purchased: ${product.name}`,
    productId,
  });

  // Decrease stock if not unlimited
  if (product.stock !== -1) {
    await db.getDb ? null : null; // just using recordPurchase below
    const { getDb } = require('../firebase/config');
    await getDb().ref(`products/${productId}/stock`).set(product.stock - 1);
  }

  // Record purchase
  await db.recordPurchase({
    userId,
    productId,
    productName: product.name,
    price: product.price,
    purchasedAt: Date.now(),
  });

  // Notify admins
  const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim());
  for (const adminId of adminIds) {
    try {
      await ctx.telegram.sendMessage(
        adminId,
        `🛍️ *New Purchase!*\n\n` +
        `👤 User: ${user.firstName} (${userId})\n` +
        `📦 Product: ${product.name}\n` +
        `💰 Price: ${formatAmount(product.price)}\n\n` +
        `Please deliver the product to the user.`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {}
  }

  await ctx.reply(
    `✅ *Purchase Successful!*\n\n` +
    `📦 Product: *${product.name}*\n` +
    `💰 Paid: ${formatAmount(product.price)}\n` +
    `💳 New Balance: ${formatAmount(balance - product.price)}\n\n` +
    `${product.deliveryInfo || 'Admin will contact you shortly with delivery details.'}`,
    { parse_mode: 'Markdown' }
  );
}

module.exports = { listProducts, buyProduct };
