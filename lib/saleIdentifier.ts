const saleIdRegex = /^[A-Za-z0-9\-]{4,40}$/;

const preferredKeys = [
  'sale_identifier',
  'ticket',
  'factura',
  'folio',
  'codigo',
  'code',
  'pedido',
  'order',
  'id',
];

const ignoredTokens = new Set([
  'HTTP',
  'HTTPS',
  'WWW',
  'FACTURACION',
  'STEREN',
  'COM',
  'MX',
  'API',
  'QR',
  'TICKET',
  'FACTURA',
  'FOLIO',
  'CODIGO',
  'CODE',
  'PEDIDO',
  'HTML',
  'PHP',
]);

type Candidate = {
  value: string;
  score: number;
};

export function normalizeSaleIdentifier(value: unknown) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9-]/g, '');
}

export function extractSaleIdentifier(rawValue: unknown) {
  const trimmed = String(rawValue ?? '').trim();
  if (!trimmed) return '';
  const urlLike = looksLikeUrl(trimmed);

  const jsonValue = extractFromJson(trimmed);
  if (jsonValue) return jsonValue;

  const urlValue = extractFromUrl(trimmed);
  if (urlValue) return urlValue;

  const normalized = normalizeSaleIdentifier(trimmed);
  if (!urlLike && saleIdRegex.test(normalized)) return normalized;

  const textValue = pickBestCandidate(trimmed, 20);
  if (textValue) return textValue;
  if (urlLike) return '';

  return normalized;
}

function extractFromJson(value: string) {
  try {
    const parsed = JSON.parse(value);
    return extractFromObject(parsed);
  } catch {
    return null;
  }
}

function extractFromObject(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;

  for (const key of preferredKeys) {
    const candidate = pickBestCandidate(obj[key], 100);
    if (candidate) return candidate;
  }

  for (const item of Object.values(obj)) {
    const candidate = Array.isArray(item)
      ? item.map(extractFromObject).find(Boolean)
      : typeof item === 'object'
      ? extractFromObject(item)
      : pickBestCandidate(item, 60);
    if (candidate) return candidate;
  }

  return null;
}

function extractFromUrl(value: string) {
  try {
    const url = new URL(value);
    const candidates: Candidate[] = [];

    for (const key of preferredKeys) {
      addCandidate(candidates, url.searchParams.get(key), 120);
    }

    url.searchParams.forEach((paramValue) => {
      addCandidate(candidates, paramValue, 90);
    });

    addCandidate(candidates, url.hostname, 80);
    addCandidate(candidates, url.pathname, 70);
    addCandidate(candidates, url.hash, 60);

    return bestCandidate(candidates);
  } catch {
    return null;
  }
}

function pickBestCandidate(value: unknown, baseScore: number) {
  const decoded = safeDecode(String(value ?? ''));
  const candidates: Candidate[] = [];
  addCandidate(candidates, decoded, baseScore);
  return bestCandidate(candidates);
}

function addCandidate(candidates: Candidate[], value: unknown, baseScore: number) {
  const raw = safeDecode(String(value ?? '').trim());
  if (!raw) return;

  const numericParts = raw.match(/[0-9]{5,40}/g) ?? [];
  for (const part of numericParts) {
    candidates.push(scoreCandidate(part, baseScore + 40));
  }

  const alphaNumericParts = raw.toUpperCase().match(/[A-Z0-9][A-Z0-9-]{3,39}/g) ?? [];
  for (const part of alphaNumericParts) {
    candidates.push(scoreCandidate(part, baseScore));
  }
}

function scoreCandidate(value: string, baseScore: number): Candidate {
  const normalized = normalizeSaleIdentifier(value);
  let score = baseScore;

  if (!saleIdRegex.test(normalized)) score -= 100;
  if (/^\d+$/.test(normalized)) score += 35;
  if (/[0-9]/.test(normalized)) score += 15;
  if (/^[A-Z]+$/.test(normalized)) score -= 35;
  if (normalized.length >= 8 && normalized.length <= 18) score += 10;
  if (ignoredTokens.has(normalized)) score -= 100;

  return { value: normalized, score };
}

function bestCandidate(candidates: Candidate[]) {
  const valid = candidates
    .filter((candidate) => candidate.score > 0 && saleIdRegex.test(candidate.value))
    .sort((a, b) => b.score - a.score || b.value.length - a.value.length);

  return valid[0]?.value ?? null;
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function looksLikeUrl(value: string) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
}
