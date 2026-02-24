const db = require('../firebase/db');
const { formatAmount, formatDate } = require('../utils/helpers');

// /tasks - list available tasks
async function listTasks(ctx) {
  const userId = String(ctx.from.id);
  const user = await db.getUser(userId);
  if (!user) return ctx.reply('❌ Please /register first.');
  if (user.blocked) return ctx.reply('🚫 Account blocked.');

  const tasks = await db.getAllTasks();
  const taskList = Object.values(tasks).filter(t => t.active);

  if (taskList.length === 0) {
    return ctx.reply('😔 No tasks available right now.');
  }

  let text = `✅ *Daily Tasks*\n\n`;
  for (const task of taskList) {
    // Check if already submitted
    const submission = await db.getTaskSubmission(task.id, userId);
    let status = '⬜ Not submitted';
    if (submission) {
      status = submission.status === 'pending' ? '🕐 Pending review' :
                submission.status === 'approved' ? '✅ Approved' : '❌ Rejected';
    }

    text += `📌 *${task.title}*\n`;
    text += `🆔 Task ID: \`${task.id}\`\n`;
    text += `💰 Reward: ${formatAmount(task.reward)}\n`;
    text += `📝 ${task.description}\n`;
    text += `📊 Status: ${status}\n\n`;
  }

  text += `To submit: /submit_task <task_id> <proof_link_or_text>`;

  await ctx.reply(text, { parse_mode: 'Markdown' });
}

// /submit_task <task_id> <proof>
async function submitTask(ctx) {
  const userId = String(ctx.from.id);
  const user = await db.getUser(userId);
  if (!user) return ctx.reply('❌ Please /register first.');
  if (user.blocked) return ctx.reply('🚫 Account blocked.');

  const args = ctx.message.text.split(' ');
  if (args.length < 3) {
    return ctx.reply('❌ Usage: /submit_task <task_id> <proof>\n\nExample: /submit_task task123 https://screenshot-link.com');
  }

  const taskId = args[1];
  const proof = args.slice(2).join(' ');

  const task = await db.getTask(taskId);
  if (!task) return ctx.reply('❌ Task not found.');
  if (!task.active) return ctx.reply('❌ This task is no longer active.');

  // Check if already submitted
  const existingSubmission = await db.getTaskSubmission(taskId, userId);
  if (existingSubmission && existingSubmission.status !== 'rejected') {
    return ctx.reply(`❌ You already submitted this task!\nStatus: ${existingSubmission.status}`);
  }

  const submissionId = `${taskId}_${userId}`;
  await db.submitTask(userId, taskId, proof);

  // Notify admins
  const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim());
  for (const adminId of adminIds) {
    try {
      await ctx.telegram.sendMessage(
        adminId,
        `📋 *New Task Submission*\n\n` +
        `👤 User: ${user.firstName} (${userId})\n` +
        `📌 Task: ${task.title}\n` +
        `💰 Reward: ${formatAmount(task.reward)}\n` +
        `📝 Proof: ${proof}\n\n` +
        `To approve: /approve_task ${submissionId}\n` +
        `To reject: /reject_task ${submissionId}`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {}
  }

  await ctx.reply(
    `✅ *Task Submitted!*\n\n` +
    `📌 Task: ${task.title}\n` +
    `💰 Reward: ${formatAmount(task.reward)}\n` +
    `🕐 Status: Pending admin review\n\n` +
    `You will be notified when approved.`,
    { parse_mode: 'Markdown' }
  );
}

module.exports = { listTasks, submitTask };
