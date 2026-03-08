interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

export class TTLCache<T> {
    private store = new Map<string, CacheEntry<T>>();

    constructor(private defaultTtlMs: number = 5 * 60 * 1000) { }

    get(key: string): T | null {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.value;
    }

    set(key: string, value: T, ttlMs?: number): void {
        this.store.set(key, {
            value,
            expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
        });
    }

    invalidate(prefix: string): void {
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) this.store.delete(key);
        }
    }
}

export const trialsCache = new TTLCache(10 * 60 * 1000);   // 10 min
export const patentCache = new TTLCache(60 * 60 * 1000);   // 1 hour
export const fdaCache = new TTLCache(30 * 60 * 1000);      // 30 min
export const litCache = new TTLCache(15 * 60 * 1000);      // 15 min
export const marketCache = new TTLCache(2 * 60 * 1000);    // 2 min
