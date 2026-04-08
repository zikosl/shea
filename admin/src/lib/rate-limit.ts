// Extremely simple in-memory limiter (use Upstash/Redis in production)
const buckets = new Map<string, { count: number; ts: number }>();

export async function limitByIp(ip: string, max: number, windowMs: number) {
    const now = Date.now();
    const b = buckets.get(ip);
    if (!b || now - b.ts > windowMs) {
        buckets.set(ip, { count: 1, ts: now });
        return { ok: true } as const;
    }
    if (b.count >= max) return { ok: false } as const;
    b.count += 1;
    return { ok: true } as const;
}