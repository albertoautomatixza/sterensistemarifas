import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminCookieOptions, ADMIN_SESSION_COOKIE, createAdminSession, isAdminAuthConfigured, verifyAdminCredentials } from '@/lib/adminAuth';
import { rateLimit } from '@/lib/rateLimit';
import { clientIp, hashForRateLimit, isSameOriginRequest, readLimitedJson, secureJson } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LoginSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return secureJson({ ok: false, message: 'Origen no permitido.' }, { status: 403 });
  }

  const ip = clientIp(req);
  const limit = rateLimit(`admin-login:ip:${hashForRateLimit(ip)}`, { limit: 8, windowMs: 5 * 60_000 });
  if (!limit.ok) {
    return secureJson(
      { ok: false, message: 'Demasiados intentos. Intenta nuevamente más tarde.' },
      { status: 429, retryAfterMs: limit.retryAfterMs }
    );
  }

  if (!isAdminAuthConfigured()) {
    return secureJson({ ok: false, message: 'El acceso administrativo no está configurado.' }, { status: 503 });
  }

  const body = await readLimitedJson(req, 2_000);
  if (!body.ok) {
    return secureJson({ ok: false, message: body.message }, { status: body.status });
  }

  const parsed = LoginSchema.safeParse(body.value);
  if (!parsed.success || !verifyAdminCredentials(parsed.data.username, parsed.data.password)) {
    return secureJson({ ok: false, message: 'Usuario o contraseña inválidos.' }, { status: 401 });
  }

  const res = secureJson({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, createAdminSession(parsed.data.username), adminCookieOptions());
  return res;
}
