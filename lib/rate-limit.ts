// In-memory rate limiter. Works within a warm serverless instance.
// For production shared across instances, replace with Redis (e.g. Upstash).
const store = new Map<string, { count: number; reset: number }>();

export function checkRateLimit(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.reset) {
    // Prune expired entries on every reset to prevent unbounded Map growth
    for (const [k, v] of store) {
      if (now > v.reset) store.delete(k);
    }
    store.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}
