'use client';

import { useState, useCallback } from 'react';

/**
 * UserPanel — provision, list, and cancel user access.
 *
 * API endpoints used:
 *   POST /api/agents/{id}/provision-access  → grant free access
 *   GET  /api/agents/{id}/users             → list users
 *   POST /api/agents/{id}/users/{uid}/cancel → revoke access
 */
export default function UserPanel({ config, userStore }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', name: '' });
  const [provisioning, setProvisioning] = useState(false);
  const [provisionResult, setProvisionResult] = useState(null);

  const isConfigured = config.apiKey && config.agentId;

  const headers = {
    'Content-Type': 'application/json',
    'x-magify-url': config.apiUrl,
    'x-magify-key': config.apiKey,
    'x-magify-agent': config.agentId,
  };

  // --- API calls ---

  const fetchUsers = useCallback(async () => {
    if (!isConfigured) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/users', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [config.apiUrl, config.apiKey, config.agentId]);

  const provisionUser = async (e) => {
    e.preventDefault();
    setProvisioning(true);
    setProvisionResult(null);
    try {
      const body = {};
      if (form.email) body.user_email = form.email;
      if (form.name) body.user_name = form.name;

      const res = await fetch('/api/users', { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      setProvisionResult(data);
      if (data.user_id) {
        userStore.addUser({
          id: data.user_id,
          label: form.name || `Provisioned ${userStore.users.length + 1}`,
          email: form.email || null,
          source: 'provision',
        });
      }
      setForm({ email: '', name: '' });
      fetchUsers();
    } catch (err) {
      setProvisionResult({ error: err.message });
    } finally {
      setProvisioning(false);
    }
  };

  const cancelAccess = async (uid) => {
    if (!confirm("Cancel this user's access?")) return;
    try {
      const res = await fetch(`/api/users/${uid}/cancel`, { method: 'POST', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const chatAsUser = (uid) => {
    const apiUser = users.find((u) => u.user_id === uid);
    userStore.addUser({
      id: uid,
      label: apiUser?.user_name || 'User from API',
      email: apiUser?.user_email || null,
      source: 'provision',
    });
  };

  if (!isConfigured) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Configure API Key &amp; Agent ID in the sidebar first.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 overflow-y-auto h-full">
      {/* ---- Provision ---- */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Provision User Access</h2>
        <p className="text-sm text-gray-500 mb-5">
          Grant free full-coverage access. All fields optional. The user is saved to the sidebar.
        </p>
        <form onSubmit={provisionUser} className="flex flex-wrap gap-3 items-end">
          <Field label="Email (optional)" value={form.email} placeholder="user@example.com"
            onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
          <Field label="Name (optional)" value={form.name} placeholder="John Doe"
            onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
          <button type="submit" disabled={provisioning}
            className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-gray-300 transition-colors">
            {provisioning ? 'Provisioning\u2026' : 'Provision Access'}
          </button>
        </form>
        {provisionResult && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${provisionResult.error
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-green-50 text-green-700 border border-green-200'}`}>
            {provisionResult.error
              ? <p>Error: {provisionResult.error}</p>
              : <div>
                  <p className="font-medium">Access granted! User saved to sidebar.</p>
                  <p className="mt-1 font-mono text-xs">User ID: {provisionResult.user_id}</p>
                  {provisionResult.token_allocation && <p className="font-mono text-xs">Tokens: {provisionResult.token_allocation}</p>}
                </div>}
          </div>
        )}
      </section>

      {/* ---- User list ---- */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Provisioned Users</h2>
          <button onClick={fetchUsers} disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-300 transition-colors">
            {loading ? 'Loading\u2026' : 'Load Users'}
          </button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">{error}</div>}
        {users.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Click &quot;Load Users&quot; to fetch from the API.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">User</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Tokens</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u.user_id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">{u.user_name || 'Unnamed'}</p>
                      <p className="text-xs text-gray-400 font-mono">{u.user_id}</p>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{u.user_email || '\u2014'}</td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900">{u.remaining_tokens ?? '\u2014'}</span>
                      {u.token_per_month != null && <span className="text-gray-400 text-xs"> / {u.token_per_month}</span>}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button onClick={() => chatAsUser(u.user_id)}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-md text-xs font-medium hover:bg-indigo-100 transition-colors">
                        Chat as user
                      </button>
                      <button onClick={() => cancelAccess(u.user_id)}
                        className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-md text-xs font-medium hover:bg-red-100 transition-colors">
                        Cancel Access
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, value, placeholder, onChange }) {
  return (
    <div className="flex-1 min-w-[200px]">
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
    </div>
  );
}
