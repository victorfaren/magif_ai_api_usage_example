/**
 * In-memory queue for webhook messages.
 *
 * How it works:
 *   1. You send a chat message → Magify API processes it asynchronously.
 *   2. Magify POSTs the agent's reply to YOUR webhook (POST /api/webhook).
 *   3. The webhook handler stores it here, keyed by user_id.
 *   4. The frontend polls GET /api/messages/[userId] to pick it up.
 *   5. On read, the queue is drained (messages returned + cleared).
 *
 * This is intentionally simple — for production, use Redis or a database.
 */

const store = new Map();

export function addMessage(userId, message) {
  if (!store.has(userId)) store.set(userId, []);
  store.get(userId).push(message);
}

export function drainMessages(userId) {
  const messages = store.get(userId) || [];
  store.set(userId, []);
  return messages;
}
