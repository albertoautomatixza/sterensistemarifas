import { NextRequest } from 'next/server';
import { registrationSchema } from '@/lib/validators';
import { registerParticipation } from '@/lib/registrationService';
import { rateLimit } from '@/lib/rateLimit';
import {
  clientIp,
  hashForRateLimit,
  isSameOriginRequest,
  readLimitedJson,
  secureJson,
} from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const ua = req.headers.get('user-agent');

  if (!isSameOriginRequest(req)) {
    return secureJson(
      { ok: false, error_code: 'VALIDATION_ERROR', message: 'Solicitud no permitida.' },
      { status: 403 }
    );
  }

  const ipLimit = rateLimit(`reg:ip:${hashForRateLimit(ip)}`, { limit: 8, windowMs: 60_000 });
  if (!ipLimit.ok) {
    return secureJson(
      { ok: false, error_code: 'RATE_LIMITED', message: 'Intenta nuevamente más tarde.' },
      { status: 429, retryAfterMs: ipLimit.retryAfterMs }
    );
  }

  const json = await readLimitedJson(req);
  if (!json.ok) {
    return secureJson(
      { ok: false, error_code: 'VALIDATION_ERROR', message: json.message },
      { status: json.status }
    );
  }

  const parsed = registrationSchema.safeParse(json.value);
  if (!parsed.success) {
    return secureJson(
      { ok: false, error_code: 'VALIDATION_ERROR', message: 'Datos inválidos.' },
      { status: 400 }
    );
  }

  const phoneLimit = rateLimit(`reg:phone:${hashForRateLimit(parsed.data.phone)}`, {
    limit: 4,
    windowMs: 60_000,
  });
  if (!phoneLimit.ok) {
    return secureJson(
      { ok: false, error_code: 'RATE_LIMITED', message: 'Intenta nuevamente más tarde.' },
      { status: 429, retryAfterMs: phoneLimit.retryAfterMs }
    );
  }

  const saleLimit = rateLimit(`reg:sale:${hashForRateLimit(parsed.data.sale_identifier.toUpperCase())}`, {
    limit: 3,
    windowMs: 60_000,
  });
  if (!saleLimit.ok) {
    return secureJson(
      { ok: false, error_code: 'RATE_LIMITED', message: 'Intenta nuevamente más tarde.' },
      { status: 429, retryAfterMs: saleLimit.retryAfterMs }
    );
  }

  try {
    const result = await registerParticipation(parsed.data, { ip, user_agent: ua });
    const status = result.ok
      ? 200
      : result.error_code === 'DUPLICATE_SALE'
      ? 409
      : result.error_code === 'INVALID_SALE'
      ? 422
      : result.error_code === 'SERVICE_UNAVAILABLE'
      ? 503
      : result.error_code === 'NO_ACTIVE_RAFFLE'
      ? 404
      : 500;
    return secureJson(result, { status });
  } catch (err) {
    console.error('registration_failed', { reason: err instanceof Error ? err.message : 'unknown' });
    return secureJson(
      { ok: false, error_code: 'INTERNAL_ERROR', message: 'No fue posible completar el registro.' },
      { status: 500 }
    );
  }
}
