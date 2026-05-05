import { NextRequest, NextResponse } from 'next/server';
import { registrationSchema } from '@/lib/validators';
import { registerParticipation } from '@/lib/registrationService';
import { rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clientIp(req: NextRequest): string | null {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    null
  );
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const ua = req.headers.get('user-agent');

  const ipLimit = rateLimit(`reg:ip:${ip ?? 'unknown'}`, { limit: 10, windowMs: 60_000 });
  if (!ipLimit.ok) {
    return NextResponse.json(
      { ok: false, error_code: 'RATE_LIMITED', message: 'Intenta nuevamente más tarde.' },
      { status: 429 }
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error_code: 'VALIDATION_ERROR', message: 'Solicitud inválida.' },
      { status: 400 }
    );
  }

  const parsed = registrationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error_code: 'VALIDATION_ERROR',
        message: 'Datos inválidos.',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const phoneLimit = rateLimit(`reg:phone:${parsed.data.phone}`, {
    limit: 5,
    windowMs: 60_000,
  });
  if (!phoneLimit.ok) {
    return NextResponse.json(
      { ok: false, error_code: 'RATE_LIMITED', message: 'Intenta nuevamente más tarde.' },
      { status: 429 }
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
    return NextResponse.json(result, { status });
  } catch {
    return NextResponse.json(
      { ok: false, error_code: 'INTERNAL_ERROR', message: 'No fue posible completar el registro.' },
      { status: 500 }
    );
  }
}
