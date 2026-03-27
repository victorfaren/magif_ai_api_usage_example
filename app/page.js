'use client';

import { useState, useEffect, useCallback } from 'react';
import { loadConfig, saveConfig } from '@/lib/storage';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import ApiExplorer from './components/ApiExplorer';
import UserPanel from './components/UserPanel';
import useTunnel from './hooks/use-tunnel';
import useUsers from './hooks/use-users';

const DEFAULT_CONFIG = {
  apiUrl: process.env.NEXT_PUBLIC_MAGIFY_API_URL || 'http://localhost:3001',
  apiKey: process.env.NEXT_PUBLIC_MAGIFY_API_KEY || '',
  agentId: process.env.NEXT_PUBLIC_MAGIFY_AGENT_ID || '',
};

export default function Home() {
  const [config, setConfigState] = useState(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState('chat');
  const [showSetup, setShowSetup] = useState(true);

  const { webhookUrl, isNgrok } = useTunnel();
  const userStore = useUsers();

  // Restore config from localStorage on mount
  useEffect(() => {
    const saved = loadConfig();
    if (saved) setConfigState(saved);
  }, []);

  // Persist config on every change
  const setConfig = useCallback((updater) => {
    setConfigState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveConfig(next);
      return next;
    });
  }, []);

  const isConfigured = config.apiKey && config.agentId;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* ---- Sidebar ---- */}
      <aside className="w-72 bg-gray-900 border-r border-gray-800 flex-shrink-0 overflow-y-auto">
        <Sidebar config={config} setConfig={setConfig} userStore={userStore}
          webhookUrl={webhookUrl} isNgrok={isNgrok} />
      </aside>

      {/* ---- Main area ---- */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* Setup banner (shown until configured) */}
        {showSetup && !isConfigured && (
          <SetupBanner webhookUrl={webhookUrl} onDismiss={() => setShowSetup(false)} />
        )}

        {/* Webhook bar (shown once configured) */}
        {isConfigured && (
          <div className="bg-gray-800 px-4 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3 text-gray-300">
              <span className="font-medium text-gray-400">Webhook:</span>
              <code className="text-green-400 font-mono select-all cursor-pointer">{webhookUrl || 'detecting\u2026'}</code>
              <span className="text-gray-500">\u2014 set in Agent \u2192 API Channel</span>
            </div>
            <div className="flex items-center gap-1.5">
              {isNgrok && <span className="px-1.5 py-0.5 bg-green-900/50 text-green-300 rounded font-medium mr-1">ngrok</span>}
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-green-400 font-medium">{isNgrok ? 'Public' : 'Local'}</span>
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex border-b bg-white">
          {['chat', 'explorer', 'users'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {{ chat: 'Chat', explorer: 'API Explorer', users: 'User Management' }[tab]}
            </button>
          ))}

          {/* Active user indicator */}
          {activeTab === 'chat' && (
            <div className="ml-auto flex items-center px-4 gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${userStore.activeUser ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="text-xs text-gray-500">
                {userStore.activeUser
                  ? `${userStore.activeUser.label} (${userStore.activeUserId.substring(0, 10)}\u2026)`
                  : 'New user \u2014 created on first message'}
              </span>
            </div>
          )}
        </div>

        {/* Content — ChatPanel stays mounted so webhook polling continues in background */}
        <div className="flex-1 min-h-0 relative">
          <div className={`absolute inset-0 ${activeTab === 'chat' ? '' : 'invisible pointer-events-none'}`}>
            <ChatPanel config={config} userStore={userStore} />
          </div>
          {activeTab === 'explorer' && <ApiExplorer config={config} userStore={userStore} />}
          {activeTab === 'users' && <UserPanel config={config} userStore={userStore} />}
        </div>
      </main>
    </div>
  );
}

// --- Setup banner (shown before configuration) ---

function SetupBanner({ webhookUrl, onDismiss }) {
  const steps = [
    { title: '1. Enter your credentials', text: 'Paste your API Key and Agent ID in the sidebar.' },
    { title: '2. Set your webhook', text: 'In Magify Dashboard \u2192 Agent \u2192 API Channel, set:', code: webhookUrl },
    { title: '3. Start chatting', text: 'Send a message. The API creates a user and delivers the reply to the webhook.' },
  ];

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold mb-1">Get started with the Magify API</h2>
          <p className="text-indigo-100 text-sm mb-4">Test every API feature interactively \u2014 faster than docs alone.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {steps.map((s) => (
              <div key={s.title} className="bg-white/10 rounded-lg p-3">
                <p className="font-semibold text-white mb-1">{s.title}</p>
                <p className="text-indigo-200 text-xs">{s.text}</p>
                {s.code && (
                  <code className="block mt-2 bg-black/30 text-green-300 text-xs px-2 py-1.5 rounded font-mono break-all select-all cursor-pointer">
                    {s.code || 'loading\u2026'}
                  </code>
                )}
              </div>
            ))}
          </div>
        </div>
        <button onClick={onDismiss} className="ml-4 text-indigo-200 hover:text-white flex-shrink-0" aria-label="Dismiss">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
