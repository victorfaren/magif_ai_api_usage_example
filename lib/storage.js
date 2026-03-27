/**
 * LocalStorage helpers for the playground.
 *
 * Persists three things across page reloads:
 *   1. Config  — API URL, API key, agent ID
 *   2. Users   — saved user list + which one is active
 *   3. Messages — per-user conversation history
 */

const CONFIG_KEY = 'magify_config';
const USERS_KEY = 'magify_users';
const MSG_PREFIX = 'magify_msgs_';

// --- Config ---

export function loadConfig() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY));
  } catch {
    return null;
  }
}

export function saveConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

// --- Users ---

export function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || { users: [], activeUserId: null };
  } catch {
    return { users: [], activeUserId: null };
  }
}

export function saveUsers(data) {
  localStorage.setItem(USERS_KEY, JSON.stringify(data));
}

// --- Per-user messages ---

export function loadMessages(userId) {
  if (!userId) return [];
  try {
    return JSON.parse(localStorage.getItem(MSG_PREFIX + userId)) || [];
  } catch {
    return [];
  }
}

export function saveMessages(userId, messages) {
  if (userId) localStorage.setItem(MSG_PREFIX + userId, JSON.stringify(messages));
}

export function deleteMessages(userId) {
  localStorage.removeItem(MSG_PREFIX + userId);
}
