import { NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/adminAuth';
import { isSameOriginRequest, secureJson } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return secureJson({ ok: false, message: 'Origen no permitido.' }, { status: 403 });
  }

  const res = secureJson({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return res;
}
