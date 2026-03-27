import { NextResponse } from 'next/server';
import { cancelAccess } from '@/lib/magify-api';

/** POST /api/users/[userId]/cancel — revoke a user's access */
export async function POST(request, { params }) {
  const apiUrl = request.headers.get('x-magify-url');
  const apiKey = request.headers.get('x-magify-key');
  const agentId = request.headers.get('x-magify-agent');

  try {
    return NextResponse.json(await cancelAccess(apiUrl, apiKey, agentId, params.userId));
  } catch (err) {
    return NextResponse.json(err.data || { error: err.message }, { status: err.status || 502 });
  }
}
