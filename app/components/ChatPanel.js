'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { loadMessages, saveMessages } from '@/lib/storage';

/**
 * ChatPanel — send messages and display the conversation.
 *
 * How the async flow works:
 *   1. User sends a message → POST /api/chat
 *   2. Magify API returns { success, user_id } immediately
 *   3. The agent's actual reply arrives later via our webhook
 *   4. We poll GET /api/messages/[userId] every 1.5s to pick it up
 *   5. Once received, we stop polling and show the reply
 *
 * This component stays mounted when switching tabs so polling continues.
 */
export default function ChatPanel({ config, userStore }) {
  const { activeUserId, addUser } = userStore;

  const [messages, setMessages] = useState(() =>
    activeUserId ? loadMessages(activeUserId) : []
  );
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  const timeoutRef = useRef(null);
  const prevUserRef = useRef(activeUserId);

  // When the active user changes, load their conversation
  useEffect(() => {
    if (prevUserRef.current !== activeUserId) {
      setMessages(activeUserId ? loadMessages(activeUserId) : []);
      prevUserRef.current = activeUserId;
    }
  }, [activeUserId]);

  // Persist messages to localStorage on every change
  useEffect(() => {
    if (activeUserId && messages.length > 0) saveMessages(activeUserId, messages);
  }, [messages, activeUserId]);

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Cleanup polling on unmount
  useEffect(() => () => { clearInterval(pollRef.current); clearTimeout(timeoutRef.current); }, []);

  // --- Polling ---

  const stopPolling = useCallback(() => {
    clearInterval(pollRef.current);
    clearTimeout(timeoutRef.current);
    pollRef.current = null;
    setSending(false);
  }, []);

  const startPolling = useCallback((uid) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/messages/${uid}`);
        const data = await res.json();
        if (data.messages?.length > 0) {
          setMessages((prev) => {
            const updated = [...prev, ...data.messages.map((m) => ({
              role: 'assistant', content: m.message,
              mediaUrl: m.media_url, mediaType: m.media_type, timestamp: m.timestamp,
            }))];
            saveMessages(uid, updated);
            return updated;
          });
          stopPolling();
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 1500);

    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setMessages((prev) => [...prev, { role: 'system', content: 'Response timed out (60s). The agent may still be processing.' }]);
    }, 60000);
  }, [stopPolling]);

  // --- Send message ---

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    if (!config.apiKey || !config.agentId) {
      setMessages((prev) => [...prev, { role: 'system', content: 'Configure API Key and Agent ID first.' }]);
      return;
    }

    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-magify-url': config.apiUrl,
          'x-magify-key': config.apiKey,
          'x-magify-agent': config.agentId,
        },
        body: JSON.stringify({ message: text, userId: activeUserId || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        const sysMsg = res.status === 403 && data.checkout_url
          ? { role: 'system', content: data.error || 'Access denied', checkoutUrl: data.checkout_url, offer: data.offer }
          : { role: 'system', content: `Error ${res.status}: ${data.error || 'Unknown error'}` };
        setMessages((prev) => [...prev, sysMsg]);
        setSending(false);
        return;
      }

      // New user was created — save it
      if (data.user_id && data.user_id !== activeUserId) {
        addUser({ id: data.user_id, label: `User ${userStore.users.length + 1}`, source: 'chat' });
        saveMessages(data.user_id, [...messages, userMsg]);
      }

      startPolling(data.user_id || activeUserId);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'system', content: `Network error: ${err.message}` }]);
      setSending(false);
    }
  };

  const isConfigured = config.apiKey && config.agentId;

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <ChatIcon />
            <p className="text-lg font-medium mt-4">
              {activeUserId ? 'Continue the conversation' : 'Start a new conversation'}
            </p>
            <p className="text-sm mt-1">
              {activeUserId
                ? `Chatting as ${activeUserId.substring(0, 12)}\u2026`
                : 'A new user will be created on first message'}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={`${msg.timestamp}-${i}`} msg={msg} />
        ))}

        {sending && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-white p-4">
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <textarea value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={isConfigured
              ? (activeUserId ? 'Type a message\u2026' : 'Type to create a new user\u2026')
              : 'Configure API Key & Agent ID first\u2026'}
            disabled={!isConfigured || sending} rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400" />
          <button onClick={sendMessage} disabled={!isConfigured || sending || !input.trim()}
            className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function MessageBubble({ msg }) {
  if (msg.role === 'system') {
    return (
      <div className="flex justify-center">
        <div className="max-w-md px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <p>{msg.content}</p>
          {msg.checkoutUrl && (
            <a href={msg.checkoutUrl} target="_blank" rel="noopener noreferrer"
              className="inline-block mt-2 px-4 py-2 bg-amber-600 text-white rounded-md text-sm font-medium hover:bg-amber-700 transition-colors">
              Complete Payment {msg.offer && <span className="opacity-80">(${msg.offer.price})</span>}
            </a>
          )}
        </div>
      </div>
    );
  }

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] px-4 py-3 bg-indigo-600 text-white rounded-2xl rounded-br-md">
          <p className="whitespace-pre-wrap">{msg.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[70%] px-4 py-3 bg-white border border-gray-200 rounded-2xl rounded-bl-md shadow-sm">
        <p className="whitespace-pre-wrap text-gray-800">{msg.content}</p>
        {msg.mediaUrl && (
          <div className="mt-2">
            {msg.mediaType?.startsWith('image/')
              ? <img src={msg.mediaUrl} alt="Agent media" className="max-w-full rounded-lg" />
              : <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline text-sm">View attachment ({msg.mediaType})</a>}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="px-4 py-3 bg-white border border-gray-200 rounded-2xl rounded-bl-md shadow-sm">
        <div className="flex space-x-1.5">
          {[0, 150, 300].map((delay) => (
            <span key={delay} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatIcon() {
  return (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}
