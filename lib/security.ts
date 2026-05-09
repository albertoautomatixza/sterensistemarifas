import { createHash, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const MAX_JSON_BYTES = 12_000;

export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = req.headers.get('x-real-ip')?.trim();
  return forwarded || realIp || 'unknown';
}

export function hashForRateLimit(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 24);
}

export function safeCompare(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function secureJson(
  body: unknown,
  init?: ResponseInit & { retryAfterMs?: number }
) {
  const res = NextResponse.json(body, init);
  res.headers.set('Cache-Control', 'no-store, max-age=0');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  if (init?.retryAfterMs) {
    res.headers.set('Retry-After', String(Math.ceil(init.retryAfterMs / 1000)));
  }
  return res;
}

export function isSameOriginRequest(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin) return true;

  const host = req.headers.get('host');
  if (!host) return false;

  const allowedOrigins = new Set(
    (process.env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  );

  const expectedProtocol = process.env.NODE_ENV === 'production' ? 'https' : req.nextUrl.protocol.replace(':', '');
  const currentOrigin = `${expectedProtocol}://${host}`;
  const nextOrigin = req.nextUrl.origin;

  return origin === currentOrigin || origin === nextOrigin || allowedOrigins.has(origin);
}

export async function readLimitedJson(req: NextRequest, maxBytes = MAX_JSON_BYTES) {
  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return { ok: false as const, status: 415, message: 'Formato de solicitud no permitido.' };
  }

  const length = Number(req.headers.get('content-length') ?? 0);
  if (Number.isFinite(length) && length > maxBytes) {
    return { ok: false as const, status: 413, message: 'Solicitud demasiado grande.' };
  }

  const raw = await req.text();
  if (Buffer.byteLength(raw, 'utf8') > maxBytes) {
    return { ok: false as const, status: 413, message: 'Solicitud demasiado grande.' };
  }

  try {
    return { ok: true as const, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false as const, status: 400, message: 'Solicitud inválida.' };
  }
}
