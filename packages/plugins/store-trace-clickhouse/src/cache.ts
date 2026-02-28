/**
 * Simple in-memory cache with TTL support
 */
export class QueryCache {
  private cache = new Map<string, { value: unknown; expires: number }>();
  private defaultTTL: number;

  constructor(defaultTTLSeconds: number = 300) {
    this.defaultTTL = defaultTTLSeconds * 1000; // Convert to milliseconds

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get cached value
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set cached value with optional TTL
   */
  set<T>(key: string, value: T, ttlSeconds?: number): void {
    const ttl = (ttlSeconds || this.defaultTTL / 1000) * 1000;
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl,
    });
  }

  /**
   * Generate cache key from query parameters
   */
  static generateKey(prefix: string, params: object): string {
    const obj = params as Record<string, unknown>;
    const sorted = Object.keys(obj)
      .sort()
      .map(k => `${k}=${JSON.stringify(obj[k])}`)
      .join('&');
    return `${prefix}:${sorted}`;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }
}
