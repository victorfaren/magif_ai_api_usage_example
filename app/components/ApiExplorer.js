'use client';

import { useState } from 'react';

/**
 * ApiExplorer — pre-made actions for every Magify API endpoint.
 *
 * Each card shows:
 *   - The HTTP method + endpoint
 *   - A description of what it does
 *   - Editable fields for customization
 *   - The exact curl command (with your real credentials)
 *   - A "Run" button to execute it
 *   - The full JSON response
 *
 * See lib/magify-api.js for the underlying API functions.
 */
export default function ApiExplorer({ config, userStore }) {
  const isConfigured = config.apiKey && config.agentId;

  if (!isConfigured) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>Configure API Key &amp; Agent ID in the sidebar first.</p>
      </div>
    );
  }

  const actions = buildActions(config, userStore.activeUserId);

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-gray-900">API Explorer</h2>
        <p className="text-sm text-gray-500">
          Click any endpoint to expand it, edit the fields, and run it live.
          Each card shows the exact curl command sent to the Magify API.
        </p>
      </div>
      {actions.map((action) => (
        <ActionCard key={action.id} action={action} userStore={userStore} />
      ))}
    </div>
  );
}

// ============================================================
//  Action definitions — one per API endpoint
// ============================================================

function buildActions(config, activeUserId) {
  const base = config.apiUrl || 'https://www.magif.ai';
  const agentId = config.agentId || 'AGENT_ID';
  const userId = activeUserId || 'USER_ID';
  const authHeader = `Bearer ${config.apiKey || 'YOUR_API_KEY'}`;

  return [
    {
      id: 'chat-new-user',
      method: 'POST',
      title: 'Chat — auto-create a new user',
      path: '/api/agents/chat',
      fullUrl: `${base}/api/agents/chat`,
      description: 'Send a message without a user_id. The API creates a new user and returns the user_id. Save it to continue the conversation.',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: { agent_id: agentId, message: 'Hello! What can you help me with?' },
      editable: ['message'],
      proxyPath: '/api/chat',
      proxyBody: (b) => ({ message: b.message }),
      needsUser: false,
      savesUser: true,
    },
    {
      id: 'chat-existing-user',
      method: 'POST',
      title: 'Chat — continue a thread',
      path: '/api/agents/chat',
      fullUrl: `${base}/api/agents/chat`,
      description: 'Send a message with a user_id to continue the same conversation. Select a user in the sidebar first.',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: { agent_id: agentId, user_id: userId, message: 'Tell me more about that.' },
      editable: ['message'],
      proxyPath: '/api/chat',
      proxyBody: (b) => ({ message: b.message, userId: b.user_id }),
      needsUser: true,
    },
    {
      id: 'provision-auto',
      method: 'POST',
      title: 'Provision — auto-generated user',
      path: `/api/agents/${agentId}/provision-access`,
      fullUrl: `${base}/api/agents/${agentId}/provision-access`,
      description: 'Create a user with full free access. Everything auto-generated — you cover the cost.',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: {},
      proxyPath: '/api/users',
      proxyBody: () => ({}),
      savesUser: true,
    },
    {
      id: 'provision-details',
      method: 'POST',
      title: 'Provision — with email & name',
      path: `/api/agents/${agentId}/provision-access`,
      fullUrl: `${base}/api/agents/${agentId}/provision-access`,
      description: 'Create a user with full free access, specifying their email and name.',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: { user_email: 'test@example.com', user_name: 'Test User' },
      editable: ['user_email', 'user_name'],
      proxyPath: '/api/users',
      proxyBody: (b) => b,
      savesUser: true,
    },
    {
      id: 'list-users',
      method: 'GET',
      title: 'List provisioned users',
      path: `/api/agents/${agentId}/users`,
      fullUrl: `${base}/api/agents/${agentId}/users`,
      description: 'Fetch all users with free access. Shows token balances and allocation.',
      headers: { Authorization: authHeader },
      body: null,
      proxyPath: '/api/users',
      proxyBody: null,
    },
    {
      id: 'cancel-access',
      method: 'POST',
      title: 'Cancel user access',
      path: `/api/agents/${agentId}/users/${userId}/cancel`,
      fullUrl: `${base}/api/agents/${agentId}/users/${userId}/cancel`,
      description: "Revoke a user's free access immediately. Select a user in the sidebar first.",
      headers: { Authorization: authHeader },
      body: null,
      proxyPath: `/api/users/${activeUserId}/cancel`,
      proxyBody: null,
      needsUser: true,
    },
  ];
}

// ============================================================
//  ActionCard — expandable card for each endpoint
// ============================================================

const METHOD_COLORS = { POST: 'bg-purple-600', GET: 'bg-blue-600' };

function ActionCard({ action, userStore }) {
  const [expanded, setExpanded] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [editedBody, setEditedBody] = useState(action.body ? { ...action.body } : null);

  const blocked = action.needsUser && !userStore.activeUserId;

  const run = async () => {
    if (blocked || running) return;
    setRunning(true);
    setResult(null);
    const t0 = performance.now();

    try {
      const opts = { method: action.method, headers: { ...action.proxyHeaders, 'Content-Type': 'application/json',
        'x-magify-url': action.fullUrl.split('/api/')[0],
        'x-magify-key': action.headers.Authorization?.replace('Bearer ', ''),
        'x-magify-agent': action.body?.agent_id || action.path.split('/agents/')[1]?.split('/')[0],
      }};
      if (action.proxyBody && action.method !== 'GET') {
        opts.body = JSON.stringify(action.proxyBody(editedBody));
      }
      const res = await fetch(action.proxyPath, opts);
      const data = await res.json();
      setResult({ status: res.status, data, ms: Math.round(performance.now() - t0) });

      if (action.savesUser && data.user_id && res.ok) {
        userStore.addUser({
          id: data.user_id,
          label: editedBody?.user_name || `User ${userStore.users.length + 1}`,
          email: editedBody?.user_email || null,
          source: action.id.startsWith('provision') ? 'provision' : 'chat',
        });
      }
    } catch (err) {
      setResult({ status: 0, data: { error: err.message }, ms: 0 });
    } finally {
      setRunning(false);
    }
  };

  const curl = buildCurl(action, editedBody);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}>
        <span className={`px-2.5 py-1 ${METHOD_COLORS[action.method]} text-white text-xs font-bold rounded flex-shrink-0`}>
          {action.method}
        </span>
        <code className="text-sm font-mono text-gray-700 truncate flex-1">{action.path}</code>
        <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:inline">{action.title}</span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {expanded && (
        <div className="border-t px-5 py-4 space-y-4">
          <p className="text-sm text-gray-600">{action.description}</p>

          {blocked && (
            <div className="px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
              Select a user in the sidebar first.
            </div>
          )}

          {/* Editable fields */}
          {editedBody && action.editable?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {action.editable.map((field) => (
                <div key={field} className="flex-1 min-w-[180px]">
                  <label className="block text-[10px] font-medium text-gray-500 mb-0.5">{field}</label>
                  <input type="text" value={editedBody[field] || ''}
                    onChange={(e) => setEditedBody((b) => ({ ...b, [field]: e.target.value }))}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              ))}
            </div>
          )}

          {/* Request (curl) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Request</h4>
              <button onClick={run} disabled={blocked || running}
                className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
                {running ? 'Running\u2026' : 'Run'}
              </button>
            </div>
            <div className="relative">
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {curl}
              </pre>
              <CopyButton text={curl} />
            </div>
          </div>

          {/* Response */}
          {result && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Response</h4>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  result.status >= 200 && result.status < 300 ? 'bg-green-100 text-green-700'
                    : result.status >= 400 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                }`}>{result.status}</span>
                <span className="text-xs text-gray-400">{result.ms} ms</span>
              </div>
              <pre className="bg-gray-900 text-gray-300 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(result.data, null, 2)}
              </pre>
              {result.data?.user_id && result.status < 300 && (
                <p className="mt-2 text-xs text-green-600 font-medium">User saved: {result.data.user_id}</p>
              )}
              {result.data?.checkout_url && (
                <a href={result.data.checkout_url} target="_blank" rel="noopener noreferrer"
                  className="inline-block mt-2 px-4 py-2 bg-amber-600 text-white rounded-md text-xs font-medium hover:bg-amber-700 transition-colors">
                  Open Stripe Checkout
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
//  Helpers
// ============================================================

function buildCurl(action, editedBody) {
  const parts = [`curl -X ${action.method} ${action.fullUrl}`];
  Object.entries(action.headers).forEach(([k, v]) => parts.push(`  -H "${k}: ${v}"`));
  const payload = editedBody ?? action.body;
  if (payload && action.method !== 'GET' && Object.keys(payload).length > 0) {
    parts.push(`  -d '${JSON.stringify(payload, null, 2)}'`);
  }
  return parts.join(' \\\n');
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="absolute top-2 right-2 px-2 py-1 text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors">
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
