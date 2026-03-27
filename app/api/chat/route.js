import { NextResponse } from 'next/server';
import { sendMessage } from '@/lib/magify-api';

/**
 * POST /api/chat — proxy to Magify chat endpoint.
 * The frontend sends config via custom headers to avoid exposing the API key.
 */
export async function POST(request) {
  const apiUrl = request.headers.get('x-magify-url');
  const apiKey = request.headers.get('x-magify-key');
  const agentId = request.headers.get('x-magify-agent');
  const { message, userId } = await request.json();

  try {
    const data = await sendMessage(apiUrl, apiKey, agentId, message, userId);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(err.data || { error: err.message }, { status: err.status || 502 });
  }
}
