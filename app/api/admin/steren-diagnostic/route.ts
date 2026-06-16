import { NextRequest } from 'next/server';
import { z } from 'zod';
import { isAdminSessionRequest } from '@/lib/adminAuth';
import { rateLimit } from '@/lib/rateLimit';
import { clientIp, hashForRateLimit, isSameOriginRequest, readLimitedJson, safeCompare, secureJson } from '@/lib/security';
import { diagnoseSterenConnection } from '@/lib/sterenClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DiagnosticSchema = z.object({
  sale_identifier: z.string().trim().max(80).optional(),
  sale_type: z.enum(['ticket', 'factura']).optional(),
});

function isAuthorized(req: NextRequest) {
  if (isAdminSessionRequest(req)) return true;

  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;

  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const header = req.headers.get('x-admin-token')?.trim();
  const supplied = bearer || header || '';
  return supplied.length > 0 && safeCompare(supplied, token);
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return secureJson({ ok: false, message: 'Origen no permitido.' }, { status: 403 });
  }

  const ip = clientIp(req);
  const limit = rateLimit(`admin-steren-diagnostic:ip:${hashForRateLimit(ip)}`, {
    limit: 8,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return secureJson(
      { ok: false, message: 'Demasiados intentos. Intenta nuevamente en un minuto.' },
      { status: 429, retryAfterMs: limit.retryAfterMs }
    );
  }

  if (!isAuthorized(req)) {
    return secureJson({ ok: false, message: 'No autorizado.' }, { status: 401 });
  }

  const body = await readLimitedJson(req, 2_000);
  if (!body.ok) {
    return secureJson({ ok: false, message: body.message }, { status: body.status });
  }

  const parsed = DiagnosticSchema.safeParse(body.value);
  if (!parsed.success) {
    return secureJson({ ok: false, message: 'Datos inválidos.' }, { status: 400 });
  }

  const result = await diagnoseSterenConnection({
    saleIdentifier: parsed.data.sale_identifier,
    saleType: parsed.data.sale_type ?? 'ticket',
  });

  return secureJson({ ok: true, diagnostic: result });
}
