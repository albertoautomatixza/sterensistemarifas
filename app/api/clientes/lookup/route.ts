import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { customerLookupSchema } from '@/lib/validators';
import { rateLimit } from '@/lib/rateLimit';
import { lookupLocalCustomerByPhone, shouldUseLocalRegistrationStore } from '@/lib/localRegistrationStore';
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

  if (!isSameOriginRequest(req)) {
    return secureJson({ ok: false, message: 'Solicitud no permitida.' }, { status: 403 });
  }

  const ipLimit = rateLimit(`customer-lookup:ip:${hashForRateLimit(ip)}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!ipLimit.ok) {
    return secureJson(
      { ok: false, message: 'Intenta nuevamente más tarde.' },
      { status: 429, retryAfterMs: ipLimit.retryAfterMs }
    );
  }

  const json = await readLimitedJson(req, 2_000);
  if (!json.ok) {
    return secureJson({ ok: false, message: json.message }, { status: json.status });
  }

  const parsed = customerLookupSchema.safeParse(json.value);
  if (!parsed.success) {
    return secureJson({ ok: false, message: 'Teléfono inválido.' }, { status: 400 });
  }

  const phoneLimit = rateLimit(`customer-lookup:phone:${hashForRateLimit(parsed.data.phone)}`, {
    limit: 8,
    windowMs: 60_000,
  });
  if (!phoneLimit.ok) {
    return secureJson(
      { ok: false, message: 'Intenta nuevamente más tarde.' },
      { status: 429, retryAfterMs: phoneLimit.retryAfterMs }
    );
  }

  if (shouldUseLocalRegistrationStore()) {
    return secureJson(await lookupLocalCustomerByPhone(parsed.data.phone));
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data, error } = await sb
    .from('users')
    .select('id')
    .eq('phone', parsed.data.phone)
    .maybeSingle();

  if (error) {
    return secureJson({ ok: false, message: 'No fue posible validar el teléfono.' }, { status: 503 });
  }

  return secureJson({ ok: true, exists: Boolean(data) });
}
