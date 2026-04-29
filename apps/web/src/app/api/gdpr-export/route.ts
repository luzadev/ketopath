// Proxy verso /me/export.json (GDPR art. 20).

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function GET(): Promise<Response> {
  const cookie = headers().get('cookie') ?? '';
  const upstream = await fetch(`${API_URL}/me/export.json`, {
    headers: { cookie },
    cache: 'no-store',
  });
  if (!upstream.ok) {
    return NextResponse.json(
      { error: `api_error_${upstream.status}` },
      { status: upstream.status },
    );
  }
  const body = await upstream.text();
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition':
        upstream.headers.get('content-disposition') ??
        'attachment; filename="ketopath-export.json"',
      'Cache-Control': 'no-store',
    },
  });
}
