# Magify Chatbot Demo

An open-source Next.js app that demonstrates **every feature** of the Magify Agent API. Use it to learn the API interactively or as a starting point for your own integration.

## Start here: `lib/magify-api.js`

The most important file in this project. It contains **all 4 API calls** with full documentation — copy it into your own project:

```js
import { sendMessage, provisionAccess, listUsers, cancelAccess } from './lib/magify-api';
```

| Function | Endpoint | What it does |
|---|---|---|
| `sendMessage()` | `POST /api/agents/chat` | Send a message to an agent |
| `provisionAccess()` | `POST /api/agents/{id}/provision-access` | Grant a user free access |
| `listUsers()` | `GET /api/agents/{id}/users` | List users with token balances |
| `cancelAccess()` | `POST /api/agents/{id}/users/{uid}/cancel` | Revoke access |

## How it works

```
┌─────────┐        ┌────────────┐        ┌─────────────┐
│ Browser  │──POST──▶ Next.js    │──POST──▶ Magify API  │
│ (React)  │        │ API Routes │        │             │
│          │◀─poll──│            │◀─POST──│ (webhook)   │
└─────────┘        └────────────┘        └─────────────┘
```

1. You type a message → frontend calls `POST /api/chat` (our proxy).
2. Our proxy calls `POST /api/agents/chat` on the Magify API using `lib/magify-api.js`.
3. Magify processes the message **asynchronously** and POSTs the agent's reply to **your webhook** (`/api/webhook`).
4. The webhook stores the reply in an in-memory queue (`lib/webhook-store.js`).
5. The frontend polls `GET /api/messages/{userId}` every 1.5s to pick it up.

## Quick start

### Prerequisites

- Node.js 18+
- A Magify API key and an agent with the **API channel** enabled
- (Optional) [ngrok](https://ngrok.com/) for public webhook URL

### Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000 and enter your API key + Agent ID in the sidebar.

### Configure the webhook

In the Magify dashboard: **Agent → Communication Settings → API Channel**, set:

```
http://localhost:3000/api/webhook
```

If ngrok is running, the app auto-detects the public URL and displays it.

## Project structure

```
magify-chatbot-demo/
├── lib/
│   ├── magify-api.js        ← THE REFERENCE FILE — all 4 API calls
│   ├── storage.js           ← localStorage helpers (config, users, messages)
│   └── webhook-store.js     ← In-memory queue for webhook → frontend bridge
│
├── app/
│   ├── page.js              ← Main layout: sidebar + tabs
│   ├── layout.js            ← HTML shell
│   ├── globals.css           ← Tailwind imports
│   │
│   ├── hooks/
│   │   ├── use-tunnel.js    ← Auto-detect ngrok
│   │   └── use-users.js     ← User list management (localStorage)
│   │
│   ├── components/
│   │   ├── Sidebar.js       ← Config fields + user selector
│   │   ├── ChatPanel.js     ← Chat UI with polling
│   │   ├── ApiExplorer.js   ← Pre-made actions for every endpoint
│   │   └── UserPanel.js     ← Provision, list, cancel users
│   │
│   └── api/
│       ├── chat/route.js           ← Proxy → sendMessage()
│       ├── webhook/route.js        ← Receives agent responses
│       ├── messages/[userId]/route.js ← Frontend polls this
│       ├── users/route.js          ← Proxy → listUsers() + provisionAccess()
│       ├── users/[userId]/cancel/route.js ← Proxy → cancelAccess()
│       └── tunnel/route.js         ← ngrok detection
```

## Features demonstrated

| Feature | Where |
|---|---|
| Send messages & receive via webhook | Chat tab |
| Automatic user creation (omit user_id) | Chat tab |
| Conversation threading (same user_id) | Chat tab |
| 403 + Stripe checkout URL handling | Chat tab |
| Media attachments (images, documents) | Chat tab |
| Provision user access (owner-paid) | Users tab, API Explorer |
| List users with token balances | Users tab, API Explorer |
| Cancel user access | Users tab, API Explorer |
| Run any endpoint with live curl preview | API Explorer tab |

## Limitations

- **In-memory webhook store** — messages are lost on server restart. Use Redis for production.
- **Single-instance** — the in-memory store doesn't work across multiple processes.
- **Polling** — 1.5s interval. For lower latency, use Server-Sent Events or WebSockets.

## License

MIT
# magif_ai_api_usage_example
