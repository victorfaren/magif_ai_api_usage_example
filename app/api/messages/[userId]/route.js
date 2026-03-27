import { NextResponse } from 'next/server';
import { drainMessages } from '@/lib/webhook-store';

/**
 * GET /api/messages/[userId]
 * The frontend polls this every 1.5s to pick up agent responses
 * that arrived via the webhook. Returns all queued messages and clears the queue.
 */
export async function GET(_request, { params }) {
  return NextResponse.json({ messages: drainMessages(params.userId) });
}
