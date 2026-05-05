type Bucket = { count: number; reset: number };

const store = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || now > bucket.reset) {
    store.set(key, { count: 1, reset: now + opts.windowMs });
    return { ok: true, retryAfterMs: 0 };
  }

  if (bucket.count >= opts.limit) {
    return { ok: false, retryAfterMs: bucket.reset - now };
  }

  bucket.count += 1;
  return { ok: true, retryAfterMs: 0 };
}

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    Array.from(store.entries()).forEach(([k, v]) => {
      if (now > v.reset) store.delete(k);
    });
  }, 60_000).unref?.();
}
