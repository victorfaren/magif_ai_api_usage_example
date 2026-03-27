'use client';

import { useState } from 'react';

/**
 * Sidebar — API configuration + user management.
 *
 * Props:
 *   config       — { apiUrl, apiKey, agentId }
 *   setConfig    — updater function
 *   userStore    — from useUsers() hook
 *   webhookUrl   — detected webhook URL (ngrok or localhost)
 *   isNgrok      — true if ngrok tunnel is active
 */
export default function Sidebar({ config, setConfig, userStore, webhookUrl, isNgrok }) {
  const [manualUserId, setManualUserId] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');

  const isReady = config.apiKey && config.agentId;

  const submitManualUser = () => {
    if (!manualUserId.trim()) return;
    userStore.addUser({ id: manualUserId.trim(), label: 'User (manual)', source: 'manual' });
    setManualUserId('');
  };

  const commitRename = () => {
    if (editingId && editLabel.trim()) userStore.renameUser(editingId, editLabel.trim());
    setEditingId(null);
  };

  return (
    <div className="p-5 space-y-5">
      {/* Branding */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight">Magify</h1>
        <p className="text-xs text-gray-400 mt-1">Interactive API Playground</p>
      </div>

      {/* ---- API Configuration ---- */}
      <div className="space-y-4">
        <ConfigField label="API URL" value={config.apiUrl}
          onChange={(v) => setConfig((c) => ({ ...c, apiUrl: v }))} />
        <ConfigField label="API Key" value={config.apiKey} type="password" placeholder="Enter your API key"
          onChange={(v) => setConfig((c) => ({ ...c, apiKey: v }))} />
        <ConfigField label="Agent ID" value={config.agentId} placeholder="Enter your agent ID"
          onChange={(v) => setConfig((c) => ({ ...c, agentId: v }))} />
      </div>

      {/* ---- Webhook URL ---- */}
      <div className="pt-4 border-t border-gray-800">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-gray-300">Webhook URL</label>
          {isNgrok && (
            <span className="px-1.5 py-0.5 bg-green-900/50 text-green-300 rounded text-[10px] font-semibold">
              ngrok
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-2">Set this in your agent&apos;s API channel settings</p>
        <div className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-green-400 font-mono break-all select-all cursor-pointer">
          {webhookUrl || 'Detecting\u2026'}
        </div>
        {isNgrok && (
          <p className="text-[10px] text-green-400/70 mt-1.5">Public URL — reachable from the internet</p>
        )}
      </div>

      {/* ---- Users ---- */}
      <div className="pt-4 border-t border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-medium text-gray-300">Users</label>
          <span className="text-[10px] text-gray-500">{userStore.users.length} saved</span>
        </div>

        {/* Paste an existing user_id */}
        <div className="flex gap-1.5 mb-2">
          <input
            type="text" value={manualUserId}
            onChange={(e) => setManualUserId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitManualUser()}
            placeholder="Paste a user_id\u2026"
            className="flex-1 min-w-0 px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
          />
          <button onClick={submitManualUser} disabled={!manualUserId.trim()}
            className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:bg-gray-700 disabled:text-gray-500 transition-colors flex-shrink-0">
            Use
          </button>
        </div>

        {/* Start a new user (no user_id → auto-created on first message) */}
        <button onClick={userStore.startNewUser}
          className={`w-full mb-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left flex items-center gap-2 ${
            !userStore.activeUserId
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
          }`}>
          <PlusIcon />
          New user (auto-created on first message)
        </button>

        {/* Saved users list */}
        {userStore.users.length > 0 && (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {userStore.users.map((user) => (
              <div key={user.id}
                className={`group rounded-lg text-xs transition-colors ${
                  userStore.activeUserId === user.id
                    ? 'bg-indigo-600/20 border border-indigo-500/40'
                    : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
                }`}>
                <div className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                  onClick={() => userStore.selectUser(user.id)}>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    userStore.activeUserId === user.id ? 'bg-indigo-400' : 'bg-gray-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    {editingId === user.id ? (
                      <input type="text" value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null); }}
                        autoFocus onClick={(e) => e.stopPropagation()}
                        className="w-full bg-transparent text-white text-xs outline-none" />
                    ) : (
                      <>
                        <p className="text-gray-200 truncate font-medium">{user.label}</p>
                        <p className="text-gray-500 font-mono truncate text-[10px]">{user.id}</p>
                      </>
                    )}
                  </div>
                  <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); setEditingId(user.id); setEditLabel(user.label); }}
                      className="p-0.5 text-gray-500 hover:text-gray-300" title="Rename">
                      <PencilIcon />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); userStore.removeUser(user.id); }}
                      className="p-0.5 text-gray-500 hover:text-red-400" title="Remove">
                      <XIcon />
                    </button>
                  </div>
                </div>
                {user.source === 'provision' && (
                  <div className="px-3 pb-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 bg-green-900/40 text-green-400 rounded">provisioned</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-gray-600 mt-2">
          Each user = their own conversation. Create multiple to test trial limits and access.
        </p>
      </div>

      {/* ---- Status ---- */}
      <div className="pt-4 border-t border-gray-800">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span className="text-xs text-gray-400">{isReady ? 'Ready to chat' : 'Needs configuration'}</span>
        </div>
      </div>
    </div>
  );
}

// --- Small reusable pieces ---

function ConfigField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-300 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
    </div>
  );
}

function PlusIcon() {
  return (
    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
