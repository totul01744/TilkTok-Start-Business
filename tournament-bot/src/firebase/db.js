const { getDb } = require('./config');

// ─── USERS ────────────────────────────────────────────────────────

async function getUser(telegramId) {
  const snap = await getDb().ref(`users/${telegramId}`).once('value');
  return snap.val();
}

async function createUser(telegramId, data) {
  await getDb().ref(`users/${telegramId}`).set(data);
}

async function updateUser(telegramId, updates) {
  await getDb().ref(`users/${telegramId}`).update(updates);
}

async function getAllUsers() {
  const snap = await getDb().ref('users').once('value');
  return snap.val() || {};
}

// ─── WALLET ───────────────────────────────────────────────────────

async function updateBalance(telegramId, amount) {
  const ref = getDb().ref(`users/${telegramId}/balance`);
  const snap = await ref.once('value');
  const current = snap.val() || 0;
  const newBalance = current + amount;
  if (newBalance < 0) throw new Error('Insufficient balance');
  await ref.set(newBalance);
  return newBalance;
}

async function addTransaction(telegramId, transaction) {
  const ref = getDb().ref(`users/${telegramId}/transactions`).push();
  await ref.set({
    ...transaction,
    timestamp: Date.now(),
    id: ref.key,
  });
  return ref.key;
}

async function getTransactions(telegramId) {
  const snap = await getDb().ref(`users/${telegramId}/transactions`).orderByChild('timestamp').limitToLast(10).once('value');
  const data = snap.val() || {};
  return Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
}

// ─── TOURNAMENTS ──────────────────────────────────────────────────

async function createTournament(data) {
  const ref = getDb().ref('tournaments').push();
  await ref.set({ ...data, id: ref.key });
  return ref.key;
}

async function getTournament(id) {
  const snap = await getDb().ref(`tournaments/${id}`).once('value');
  return snap.val();
}

async function updateTournament(id, updates) {
  await getDb().ref(`tournaments/${id}`).update(updates);
}

async function getAllTournaments() {
  const snap = await getDb().ref('tournaments').once('value');
  return snap.val() || {};
}

async function getActiveTournaments() {
  const snap = await getDb().ref('tournaments').orderByChild('status').equalTo('open').once('value');
  return snap.val() || {};
}

async function joinTournament(tournamentId, telegramId) {
  await getDb().ref(`tournaments/${tournamentId}/participants/${telegramId}`).set({
    joinedAt: Date.now(),
    score: 0,
    kills: 0,
  });
}

async function isParticipant(tournamentId, telegramId) {
  const snap = await getDb().ref(`tournaments/${tournamentId}/participants/${telegramId}`).once('value');
  return snap.exists();
}

async function updateParticipantScore(tournamentId, telegramId, score, kills) {
  await getDb().ref(`tournaments/${tournamentId}/participants/${telegramId}`).update({ score, kills });
}

// ─── TASKS ────────────────────────────────────────────────────────

async function createTask(data) {
  const ref = getDb().ref('tasks').push();
  await ref.set({ ...data, id: ref.key });
  return ref.key;
}

async function getAllTasks() {
  const snap = await getDb().ref('tasks').once('value');
  return snap.val() || {};
}

async function getTask(id) {
  const snap = await getDb().ref(`tasks/${id}`).once('value');
  return snap.val();
}

async function submitTask(userId, taskId, proof) {
  const ref = getDb().ref(`task_submissions/${taskId}_${userId}`);
  await ref.set({
    userId,
    taskId,
    proof,
    status: 'pending',
    submittedAt: Date.now(),
  });
}

async function getTaskSubmission(taskId, userId) {
  const snap = await getDb().ref(`task_submissions/${taskId}_${userId}`).once('value');
  return snap.val();
}

async function getPendingTaskSubmissions() {
  const snap = await getDb().ref('task_submissions').orderByChild('status').equalTo('pending').once('value');
  return snap.val() || {};
}

async function updateTaskSubmission(submissionId, updates) {
  await getDb().ref(`task_submissions/${submissionId}`).update(updates);
}

// ─── REFERRALS ────────────────────────────────────────────────────

async function addReferral(referrerId, referredId) {
  await getDb().ref(`referrals/${referrerId}/${referredId}`).set({
    referredAt: Date.now(),
    bonusPaid: false,
  });
}

async function getReferrals(referrerId) {
  const snap = await getDb().ref(`referrals/${referrerId}`).once('value');
  return snap.val() || {};
}

async function markReferralBonusPaid(referrerId) {
  await getDb().ref(`users/${referrerId}/referralBonusPaid`).set(true);
}

// ─── WITHDRAW ─────────────────────────────────────────────────────

async function createWithdrawRequest(data) {
  const ref = getDb().ref('withdrawals').push();
  await ref.set({ ...data, id: ref.key });
  return ref.key;
}

async function getWithdrawRequest(id) {
  const snap = await getDb().ref(`withdrawals/${id}`).once('value');
  return snap.val();
}

async function updateWithdrawRequest(id, updates) {
  await getDb().ref(`withdrawals/${id}`).update(updates);
}

async function getPendingWithdrawals() {
  const snap = await getDb().ref('withdrawals').orderByChild('status').equalTo('pending').once('value');
  return snap.val() || {};
}

async function getUserWithdrawals(userId) {
  const snap = await getDb().ref('withdrawals').orderByChild('userId').equalTo(String(userId)).once('value');
  return snap.val() || {};
}

// ─── PRODUCTS ─────────────────────────────────────────────────────

async function addProduct(data) {
  const ref = getDb().ref('products').push();
  await ref.set({ ...data, id: ref.key });
  return ref.key;
}

async function getAllProducts() {
  const snap = await getDb().ref('products').once('value');
  return snap.val() || {};
}

async function getProduct(id) {
  const snap = await getDb().ref(`products/${id}`).once('value');
  return snap.val();
}

async function recordPurchase(data) {
  const ref = getDb().ref('purchases').push();
  await ref.set({ ...data, id: ref.key });
  return ref.key;
}

module.exports = {
  getUser, createUser, updateUser, getAllUsers,
  updateBalance, addTransaction, getTransactions,
  createTournament, getTournament, updateTournament, getAllTournaments,
  getActiveTournaments, joinTournament, isParticipant, updateParticipantScore,
  createTask, getAllTasks, getTask, submitTask, getTaskSubmission,
  getPendingTaskSubmissions, updateTaskSubmission,
  addReferral, getReferrals, markReferralBonusPaid,
  createWithdrawRequest, getWithdrawRequest, updateWithdrawRequest,
  getPendingWithdrawals, getUserWithdrawals,
  addProduct, getAllProducts, getProduct, recordPurchase,
};
