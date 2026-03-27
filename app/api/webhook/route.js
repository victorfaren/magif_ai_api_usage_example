import { NextResponse } from 'next/server';
import { addMessage } from '@/lib/webhook-store';

/**
 * POST /api/webhook — receives agent responses from the Magify API.
 *
 * Configure this URL in your Magify dashboard:
 *   Agent → Communication Settings → API Channel → Webhook URL
 *
 * The payload includes:
 *   { agent_id, user_id, message, message_content_type, timestamp,
 *     task_id, media_url?, media_type? }
 */
export async function POST(request) {
  const data = await request.json();

  if (!data.user_id) {
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
  }

  addMessage(data.user_id, {
    message: data.message,
    message_content_type: data.message_content_type,
    timestamp: data.timestamp,
    media_url: data.media_url,
    media_type: data.media_type,
    agent_id: data.agent_id,
    task_id: data.task_id,
  });

  return NextResponse.json({ received: true });
}
