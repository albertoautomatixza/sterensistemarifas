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

type TokenCache = {
  token: string;
  expiresAt: number;
};

type StoreGroupsRange = {
  startDate: string;
  endDate: string;
};

type SaleMatch = {
  matchedBy: 'pedido' | 'factura';
  store: string | null;
  pedido: string | null;
  factura: string | null;
  tipoDocumento: string | null;
  fecha: string | null;
  totalAmount: number | null;
  itemCount: number;
  paymentCount: number;
};

const STEREN_API_URL = process.env.STEREN_API_URL;
const STEREN_API_KEY = process.env.STEREN_API_KEY;
const STEREN_API_USERNAME = process.env.STEREN_API_USERNAME ?? process.env.STEREN_API_USER;
const STEREN_API_PASSWORD = process.env.STEREN_API_PASSWORD;
const STEREN_LOGIN_PATH = process.env.STEREN_LOGIN_PATH ?? '/api/Login';
const STEREN_STORE_GROUPS_PATH = process.env.STEREN_STORE_GROUPS_PATH ?? '/api/storegroups';
const STEREN_TIMEOUT_MS = toSafeNumber(process.env.STEREN_TIMEOUT_MS, 30_000, 3_000, 60_000);
const STEREN_SALES_LOOKBACK_DAYS = toSafeNumber(process.env.STEREN_SALES_LOOKBACK_DAYS, 31, 1, 31);
const STEREN_SALES_PAGE_SIZE = toSafeNumber(process.env.STEREN_SALES_PAGE_SIZE, 500, 1, 1000);
const STEREN_SALES_MAX_PAGES = toSafeNumber(process.env.STEREN_SALES_MAX_PAGES, 20, 1, 100);

let tokenCache: TokenCache | null = null;

function shouldSimulateSterenValidation() {
  if (process.env.STEREN_SIMULATE === 'true') return true;
  return process.env.NODE_ENV !== 'production' && process.env.LOCAL_REGISTRATION_STORE === 'true';
}

function resolveSterenBaseUrl(): string | SterenError {
  if (!STEREN_API_URL || !STEREN_API_KEY || !STEREN_API_USERNAME || !STEREN_API_PASSWORD) {
    return shouldSimulateSterenValidation() ? '' : { kind: 'missing_config' };
  }

  try {
    const base = new URL(STEREN_API_URL);
    const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(base.hostname);
    if (process.env.NODE_ENV === 'production' && base.protocol !== 'https:' && !isLocalHost) {
      return { kind: 'unsafe_config' };
    }
    return base.toString().replace(/\/+$/, '');
  } catch {
    return { kind: 'unsafe_config' };
  }
}

function endpoint(baseUrl: string, pathname: string) {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;

  try {
    const base = new URL(normalizedBase);
    const basePath = base.pathname.replace(/\/+$/, '').toLowerCase();
    if (basePath.endsWith('/api') && normalizedPath.toLowerCase().startsWith('/api/')) {
      return `${normalizedBase}${normalizedPath.slice(4)}`;
    }
  } catch {
    // resolveSterenBaseUrl already validates URLs; keep the join defensive.
  }

  return `${normalizedBase}${normalizedPath}`;
}

async function callWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(id);
  }
}

async function readJson(res: Response) {
  return res.json().catch(() => ({}));
}

function decodeJwtExpiration(token: string) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return Date.now() + 10 * 60_000;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'));
    return typeof json.exp === 'number' ? json.exp * 1000 : Date.now() + 10 * 60_000;
  } catch {
    return Date.now() + 10 * 60_000;
  }
}

async function getSterenToken(baseUrl: string, forceRefresh = false): Promise<string | SterenError> {
  if (!forceRefresh && tokenCache && tokenCache.expiresAt - Date.now() > 60_000) {
    return tokenCache.token;
  }

  try {
    const res = await callWithTimeout(
      endpoint(baseUrl, STEREN_LOGIN_PATH),
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
        body: JSON.stringify({
          user: STEREN_API_USERNAME,
          password: STEREN_API_PASSWORD,
        }),
      },
      STEREN_TIMEOUT_MS
    );

    const body = await readJson(res);
    if (!res.ok || body?.success === false || typeof body?.token !== 'string') {
      return { kind: 'upstream_error', status: res.status };
    }

    tokenCache = {
      token: body.token,
      expiresAt: decodeJwtExpiration(body.token),
    };

    return tokenCache.token;
  } catch (err: any) {
    return err?.name === 'AbortError' ? { kind: 'timeout' } : { kind: 'network' };
  }
}

async function getStoreGroupsPage(
  baseUrl: string,
  token: string,
  range: StoreGroupsRange,
  pageNumber: number
): Promise<unknown | SterenError | { retryWithFreshToken: true }> {
  const params = new URLSearchParams({
    ApiKey: STEREN_API_KEY!,
    startDate: range.startDate,
    endDate: range.endDate,
    pageSize: String(STEREN_SALES_PAGE_SIZE),
    pageNumber: String(pageNumber),
  });

  try {
    const res = await callWithTimeout(
      `${endpoint(baseUrl, STEREN_STORE_GROUPS_PATH)}?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-store',
        },
      },
      STEREN_TIMEOUT_MS
    );

    if (res.status === 401) return { retryWithFreshToken: true };
    if (!res.ok) return { kind: 'upstream_error', status: res.status };

    const body = await readJson(res);
    if (body?.success === false && body?.message) {
      return { kind: 'upstream_error', status: res.status };
    }

    return body;
  } catch (err: any) {
    return err?.name === 'AbortError' ? { kind: 'timeout' } : { kind: 'network' };
  }
}

export async function validateSaleWithSteren(
  saleIdentifier: string,
  saleType: 'ticket' | 'factura'
): Promise<SterenValidationResult | SterenError> {
  const baseUrl = resolveSterenBaseUrl();
  if (baseUrl === '') return simulateValidation(saleIdentifier, saleType);
  if (typeof baseUrl !== 'string') return baseUrl;

  const token = await getSterenToken(baseUrl);
  if (typeof token !== 'string') return token;

  const ranges = getSalesRanges();
  const normalizedIdentifier = normalizeIdentifier(saleIdentifier);

  let activeToken = token;
  for (const range of ranges) {
    for (let page = 1; page <= STEREN_SALES_MAX_PAGES; page++) {
      let body = await getStoreGroupsPage(baseUrl, activeToken, range, page);

      if (isRetryTokenSignal(body)) {
        const freshToken = await getSterenToken(baseUrl, true);
        if (typeof freshToken !== 'string') return freshToken;
        activeToken = freshToken;
        body = await getStoreGroupsPage(baseUrl, activeToken, range, page);
      }

      if (isSterenError(body)) return body;

      const match = findSaleMatch(body, normalizedIdentifier, saleType);
      if (match) {
        return {
          valid: true,
          steren_internal_identifier: match.pedido ?? match.factura ?? saleIdentifier,
          branch: match.store,
          sale_date: toDateOnly(match.fecha),
          total_amount: match.totalAmount,
          raw: {
            source: 'steren_store_groups',
            matched_by: match.matchedBy,
            sale_type: saleType,
            branch: match.store,
            sale_date: toDateOnly(match.fecha),
            total_amount: match.totalAmount,
            item_count: match.itemCount,
            payment_count: match.paymentCount,
            query_window: range,
          },
        };
      }

      if (isProbablyLastPage(body)) break;
    }
  }

  return {
    valid: false,
    reason: 'not_found',
    raw: {
      source: 'steren_store_groups',
      found: false,
      sale_type: saleType,
      query_windows: ranges,
      max_pages_checked: STEREN_SALES_MAX_PAGES,
    },
  };
}

function findSaleMatch(body: unknown, normalizedIdentifier: string, saleType: 'ticket' | 'factura'): SaleMatch | null {
  const dateGroups = getDateGroups(body);
  const preferredFields: Array<'pedido' | 'factura'> =
    saleType === 'factura' ? ['factura', 'pedido'] : ['pedido', 'factura'];

  for (const dateGroup of dateGroups) {
    for (const store of getArray(dateGroup?.store)) {
      for (const pedido of getArray(store?.pedido)) {
        for (const field of preferredFields) {
          const candidate = normalizeIdentifier(pedido?.[field]);
          if (candidate && candidate === normalizedIdentifier) {
            const detalle = getArray(pedido?.detalle);
            const formasPago = getArray(pedido?.formasPago);
            return {
              matchedBy: field,
              store: stringifyOrNull(store?.mandt),
              pedido: stringifyOrNull(pedido?.pedido),
              factura: stringifyOrNull(pedido?.factura),
              tipoDocumento: stringifyOrNull(pedido?.tipoDocumento),
              fecha: stringifyOrNull(pedido?.fecha),
              totalAmount: calculateTotal(detalle, formasPago),
              itemCount: detalle.length,
              paymentCount: formasPago.length,
            };
          }
        }
      }
    }
  }

  return null;
}

function isProbablyLastPage(body: unknown) {
  const dateGroups = getDateGroups(body);
  if (dateGroups.length === 0) return true;

  const orderCount = dateGroups.reduce((count, dateGroup) => {
    return (
      count +
      getArray(dateGroup?.store).reduce((storeCount, store) => {
        return storeCount + getArray(store?.pedido).length;
      }, 0)
    );
  }, 0);

  return orderCount < STEREN_SALES_PAGE_SIZE;
}

function getSalesRanges(): StoreGroupsRange[] {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const explicitStart = parseApiDate(process.env.STEREN_SALES_START_DATE);
  const explicitEnd = parseApiDate(process.env.STEREN_SALES_END_DATE);

  let end = explicitEnd ?? yesterday;
  if (end > yesterday) end = yesterday;

  let start = explicitStart;
  if (!start) {
    start = new Date(end);
    start.setDate(start.getDate() - (STEREN_SALES_LOOKBACK_DAYS - 1));
  }

  if (start > end) {
    start = new Date(end);
  }

  const ranges: StoreGroupsRange[] = [];
  let cursor = startOfDay(start);
  const lastDay = startOfDay(end);

  while (cursor <= lastDay) {
    const chunkEnd = new Date(cursor);
    chunkEnd.setDate(chunkEnd.getDate() + 30);
    if (chunkEnd > lastDay) chunkEnd.setTime(lastDay.getTime());

    ranges.push({
      startDate: formatApiDate(cursor),
      endDate: formatApiDate(chunkEnd),
    });

    cursor = new Date(chunkEnd);
    cursor.setDate(cursor.getDate() + 1);
  }

  return ranges.reverse();
}

function formatApiDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function isApiDate(value: string | undefined) {
  return !!value && /^\d{8}$/.test(value);
}

function parseApiDate(value: string | undefined) {
  if (!isApiDate(value)) return null;
  const year = Number(value!.slice(0, 4));
  const month = Number(value!.slice(4, 6));
  const day = Number(value!.slice(6, 8));
  const parsed = new Date(year, month - 1, day);
  return formatApiDate(parsed) === value ? parsed : null;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function normalizeIdentifier(value: unknown) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function stringifyOrNull(value: unknown) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function toDateOnly(value: string | null) {
  if (!value) return null;
  return value.slice(0, 10);
}

function getArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  return value && typeof value === 'object' ? [value] : [];
}

function getDateGroups(body: unknown): any[] {
  const root = body as any;
  if (Array.isArray(root?.datee)) return root.datee;
  if (Array.isArray(root?.data?.datee)) return root.data.datee;
  if (Array.isArray(root?.data)) {
    return root.data.flatMap((item: any) => {
      if (Array.isArray(item?.datee)) return item.datee;
      return item && typeof item === 'object' ? [item] : [];
    });
  }
  return [];
}

function calculateTotal(detalle: any[], formasPago: any[]) {
  const fromPayments = formasPago.reduce(
    (total, item) => total + toNumber(item?.subTotalFormaPago) + toNumber(item?.ivaFormaPago),
    0
  );
  if (fromPayments > 0) return roundMoney(fromPayments);

  const fromDetails = detalle.reduce(
    (total, item) => total + toNumber(item?.subtotal) + toNumber(item?.iva),
    0
  );
  return fromDetails > 0 ? roundMoney(fromDetails) : null;
}

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function toSafeNumber(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function isSterenError(value: unknown): value is SterenError {
  return (
    !!value &&
    typeof value === 'object' &&
    'kind' in value &&
    ['timeout', 'network', 'missing_config', 'unsafe_config', 'upstream_error'].includes(
      String((value as any).kind)
    )
  );
}

function isRetryTokenSignal(value: unknown): value is { retryWithFreshToken: true } {
  return !!value && typeof value === 'object' && (value as any).retryWithFreshToken === true;
}

// Dev-only fallback when Steren credentials are absent and the app is in local preview mode.
// Rejects identifiers starting with "INVALID" so validation errors can still be tested.
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
