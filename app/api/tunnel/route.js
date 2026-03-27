import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tunnel — auto-detect ngrok public URL.
 * If ngrok is running locally, returns the HTTPS tunnel URL.
 * The frontend uses this to display the correct webhook URL.
 */
export async function GET() {
  try {
    const res = await fetch('http://127.0.0.1:4040/api/tunnels', {
      signal: AbortSignal.timeout(1000),
    });
    const data = await res.json();
    const tunnel = data.tunnels?.find((t) => t.public_url?.startsWith('https://'));
    return NextResponse.json({ url: tunnel?.public_url || null });
  } catch {
    return NextResponse.json({ url: null });
  }
}
