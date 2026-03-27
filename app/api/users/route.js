import { NextResponse } from 'next/server';
import { listUsers, provisionAccess } from '@/lib/magify-api';

function getConfig(req) {
  return {
    apiUrl: req.headers.get('x-magify-url'),
    apiKey: req.headers.get('x-magify-key'),
    agentId: req.headers.get('x-magify-agent'),
  };
}

/** GET /api/users — list all provisioned users */
export async function GET(request) {
  const { apiUrl, apiKey, agentId } = getConfig(request);
  try {
    return NextResponse.json(await listUsers(apiUrl, apiKey, agentId));
  } catch (err) {
    return NextResponse.json(err.data || { error: err.message }, { status: err.status || 502 });
  }
}

/** POST /api/users — provision access for a user */
export async function POST(request) {
  const { apiUrl, apiKey, agentId } = getConfig(request);
  const body = await request.json();
  try {
    return NextResponse.json(await provisionAccess(apiUrl, apiKey, agentId, body));
  } catch (err) {
    return NextResponse.json(err.data || { error: err.message }, { status: err.status || 502 });
  }
}
