// Proxy verso l'API: scarica il PDF dell'export tracking. Necessario per
// avere i cookie di sessione su same-origin e fornire un Content-Disposition.

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function GET(): Promise<Response> {
  const cookie = headers().get('cookie') ?? '';
  const upstream = await fetch(`${API_URL}/me/tracking/export.pdf`, {
    headers: { cookie },
    cache: 'no-store',
  });
  if (!upstream.ok) {
    return NextResponse.json(
      { error: `api_error_${upstream.status}` },
      { status: upstream.status },
    );
  }
  const buffer = await upstream.arrayBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition':
        upstream.headers.get('content-disposition') ?? 'attachment; filename="ketopath-export.pdf"',
      'Cache-Control': 'no-store',
    },
  });
}
