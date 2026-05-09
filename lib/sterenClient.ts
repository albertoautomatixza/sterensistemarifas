export type SterenValidationResult =
  | {
      valid: true;
      steren_internal_identifier: string;
      branch: string | null;
      sale_date: string | null;
      total_amount: number | null;
      raw: unknown;
    }
  | {
      valid: false;
      reason: 'not_found' | 'ineligible' | 'expired';
      raw: unknown;
    };

export type SterenError =
  | { kind: 'timeout' }
  | { kind: 'network' }
  | { kind: 'missing_config' }
  | { kind: 'unsafe_config' }
  | { kind: 'upstream_error'; status: number };

const STEREN_API_URL = process.env.STEREN_API_URL;
const STEREN_API_KEY = process.env.STEREN_API_KEY;
const STEREN_TIMEOUT_MS = Number(process.env.STEREN_TIMEOUT_MS ?? 5000);

function isLocalPreviewMode() {
  return process.env.LOCAL_REGISTRATION_STORE === 'true' || !process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function resolveSterenValidateUrl(): string | SterenError {
  if (!STEREN_API_URL || !STEREN_API_KEY) {
    return isLocalPreviewMode() ? '' : { kind: 'missing_config' };
  }

  try {
    const base = new URL(STEREN_API_URL);
    const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(base.hostname);
    if (process.env.NODE_ENV === 'production' && base.protocol !== 'https:' && !isLocalHost) {
      return { kind: 'unsafe_config' };
    }
    return `${base.toString().replace(/\/+$/, '')}/validate`;
  } catch {
    return { kind: 'unsafe_config' };
  }
}

async function callWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export async function validateSaleWithSteren(
  saleIdentifier: string,
  saleType: 'ticket' | 'factura'
): Promise<SterenValidationResult | SterenError> {
  const validateUrl = resolveSterenValidateUrl();
  if (validateUrl === '') {
    return simulateValidation(saleIdentifier, saleType);
  }
  if (typeof validateUrl !== 'string') return validateUrl;

  const maxAttempts = 2;
  let lastError: SterenError = { kind: 'network' };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await callWithTimeout(
        validateUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Cache-Control': 'no-store',
            Authorization: `Bearer ${STEREN_API_KEY}`,
          },
          body: JSON.stringify({
            sale_identifier: saleIdentifier,
            sale_type: saleType,
          }),
        },
        Number.isFinite(STEREN_TIMEOUT_MS) ? STEREN_TIMEOUT_MS : 5000
      );

      if (res.status >= 500) {
        lastError = { kind: 'upstream_error', status: res.status };
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        continue;
      }

      const body = await res.json().catch(() => ({}));

      if (!res.ok || body?.valid === false) {
        return {
          valid: false,
          reason: body?.reason === 'expired' ? 'expired' : 'not_found',
          raw: redactSensitive(body),
        };
      }

      return {
        valid: true,
        steren_internal_identifier: String(body.id ?? saleIdentifier),
        branch: body.branch ?? null,
        sale_date: body.sale_date ?? null,
        total_amount: body.total_amount != null ? Number(body.total_amount) : null,
        raw: redactSensitive(body),
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        lastError = { kind: 'timeout' };
      } else {
        lastError = { kind: 'network' };
      }
      await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
    }
  }

  return lastError;
}

function redactSensitive(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(redactSensitive);

  const blocked = new Set([
    'token',
    'access_token',
    'refresh_token',
    'authorization',
    'api_key',
    'apikey',
    'password',
    'secret',
    'phone',
    'telefono',
    'email',
    'correo',
    'rfc',
    'address',
    'direccion',
  ]);

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      blocked.has(key.toLowerCase()) ? '[redacted]' : redactSensitive(item),
    ])
  );
}

// Dev-only fallback when STEREN credentials absent.
// Deterministic based on identifier to allow testing.
// Rejects identifiers starting with "INVALID".
function simulateValidation(
  saleIdentifier: string,
  saleType: 'ticket' | 'factura'
): SterenValidationResult {
  if (/^INVALID/i.test(saleIdentifier)) {
    return { valid: false, reason: 'not_found', raw: { simulated: true } };
  }
  return {
    valid: true,
    steren_internal_identifier: `SIM-${saleIdentifier}`,
    branch: 'Aguascalientes Centro',
    sale_date: new Date().toISOString().slice(0, 10),
    total_amount: 499.0,
    raw: { simulated: true, type: saleType, id: saleIdentifier },
  };
}
