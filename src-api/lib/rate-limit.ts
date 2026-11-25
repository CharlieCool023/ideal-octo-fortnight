import { createHash } from "node:crypto";

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type Bucket = { count: number; expiresAt: number };

const buckets = new Map<string, Bucket>();

function pruneExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.expiresAt <= now) buckets.delete(key);
  }
}

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  if (buckets.size >= 10_000) {
    pruneExpired(now);
    if (buckets.size >= 10_000) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey) buckets.delete(oldestKey);
    }
  }

  let bucket = buckets.get(key);
  if (!bucket || bucket.expiresAt <= now) {
    bucket = { count: 0, expiresAt: now + windowMs };
    buckets.set(key, bucket);
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.expiresAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function getClientAddress(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const addresses = forwardedFor.split(",").map((address) => address.trim()).filter(Boolean);
    if (addresses.length > 0) return addresses[addresses.length - 1];
  }

  return headers.get("x-real-ip") ?? headers.get("cf-connecting-ip") ?? "unknown";
}

export function loginRateLimitKeys(address: string, username: string) {
  const usernameHash = createHash("sha256")
    .update(username.trim().toLowerCase())
    .digest("hex");

  return {
    ip: `login:ip:${address}`,
    account: `login:account:${address}:${usernameHash}`,
  };
}
