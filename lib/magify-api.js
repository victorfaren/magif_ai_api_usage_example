/**
 * ============================================================
 *  Magify Agent API — Reference Implementation
 * ============================================================
 *
 * This file contains every API call you need to integrate with
 * a Magify agent. Copy these functions into your own project.
 *
 * Endpoints covered:
 *   POST /api/agents/chat                            → Send a message
 *   POST /api/agents/{agentId}/provision-access      → Grant user access
 *   GET  /api/agents/{agentId}/users                 → List users
 *   POST /api/agents/{agentId}/users/{userId}/cancel → Revoke access
 *
 * All endpoints require: Authorization: Bearer YOUR_API_KEY
 *
 * Full docs: https://www.magif.ai/api-docs
 * ============================================================
 */

/**
 * Send a message to a Magify agent.
 *
 * Key behaviors:
 * - Omit `userId` → the API creates a new user automatically.
 * - Provide `userId` → continues that user's conversation thread.
 * - The agent's reply is NOT in this response. It arrives via your webhook.
 *
 * @returns {{ success: boolean, user_id?: string }}
 *   `user_id` is returned when a new user was created. Save it!
 */
export async function sendMessage(apiUrl, apiKey, agentId, message, userId) {
  const body = { agent_id: agentId, message };
  if (userId) body.user_id = userId;

  const res = await fetch(`${apiUrl}/api/agents/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return handleResponse(res);
}

/**
 * Grant a user free full-access to an agent (you cover the cost).
 *
 * All fields are optional. Omit everything to auto-generate a user.
 *
 * @param {object} [opts]
 * @param {string} [opts.user_id]    - Existing user ID (creates new if omitted)
 * @param {string} [opts.user_email] - Auto-generated if omitted
 * @param {string} [opts.user_name]  - Auto-generated if omitted
 * @returns {{ success: boolean, user_id: string, access_granted: boolean, token_allocation: number }}
 */
export async function provisionAccess(apiUrl, apiKey, agentId, opts = {}) {
  const res = await fetch(`${apiUrl}/api/agents/${agentId}/provision-access`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(opts),
  });

  return handleResponse(res);
}

/**
 * List all users with provisioned (free) access to an agent.
 *
 * @returns {{ total_users: number, users: Array<{ user_id, user_name, user_email, remaining_tokens, token_per_month }> }}
 */
export async function listUsers(apiUrl, apiKey, agentId) {
  const res = await fetch(`${apiUrl}/api/agents/${agentId}/users`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  return handleResponse(res);
}

/**
 * Revoke a user's free access. Takes effect immediately.
 *
 * @returns {{ success: boolean, message: string }}
 */
export async function cancelAccess(apiUrl, apiKey, agentId, userId) {
  const res = await fetch(`${apiUrl}/api/agents/${agentId}/users/${userId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  return handleResponse(res);
}

// --- Internal helper ---

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
