import { NextRequest } from 'next/server';
import { z } from 'zod';
import { isAdminSessionRequest } from '@/lib/adminAuth';
import { sendRaffleConfirmationEmail } from '@/lib/emailService';
import { rateLimit } from '@/lib/rateLimit';
import { clientIp, hashForRateLimit, isSameOriginRequest, readLimitedJson, safeCompare, secureJson } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TestEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(180),
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
  const limit = rateLimit(`admin-test-email:ip:${hashForRateLimit(ip)}`, { limit: 6, windowMs: 60_000 });
  if (!limit.ok) {
    return secureJson(
      { ok: false, message: 'Intenta nuevamente más tarde.' },
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

  const parsed = TestEmailSchema.safeParse(body.value);
  if (!parsed.success) {
    return secureJson({ ok: false, message: 'Correo inválido.' }, { status: 400 });
  }

  const delivery = await sendRaffleConfirmationEmail({
    email: parsed.data.email,
    full_name: 'Prueba Admin',
    entry_number: '09602',
    internal_folio: 'Q2-2026-09602-50EBCA2E',
    raffle_name: 'Rifa Trimestral Q2 2026 - Aguascalientes',
    created_at: new Date().toISOString(),
  });

  return secureJson({
    ok: delivery.status === 'sent',
    status: delivery.status,
    message:
      delivery.status === 'sent'
        ? 'Correo enviado.'
        : delivery.status === 'pending'
        ? 'Correo pendiente: falta configuración de envío.'
        : 'Correo fallido.',
    provider_response: delivery.providerResponse,
  }, { status: delivery.status === 'sent' ? 200 : 502 });
}
