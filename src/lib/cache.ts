/**
 * Sistem Cache Cerdas (Smart Caching System)
 * Menghemat penggunaan data latar belakang pengemudi dengan:
 * 1. Menghindari request Nominatim berulang untuk area/radius yang sama.
 * 2. Menyimpan reverse-geocoding dengan presisi hemat data (grid 4 desimal).
 * 3. Menghitung data tersimpan dan rasio penghematan kuota.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
}

const CACHE_STORAGE_KEY = 'ojol_smart_geo_cache_v2';
const MAX_CACHE_ENTRIES = 300;
const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 hari

class SmartCacheManager {
  private memCache: Map<string, CacheEntry<any>> = new Map();
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(CACHE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        for (const [k, v] of Object.entries(parsed)) {
          this.memCache.set(k, v as CacheEntry<any>);
        }
      }
    } catch {
      // fallback silent
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      const obj: Record<string, CacheEntry<any>> = {};
      let count = 0;
      // simpan maksimal MAX_CACHE_ENTRIES paling sering diakses
      const sorted = Array.from(this.memCache.entries()).sort(
        (a, b) => b[1].hits - a[1].hits || b[1].timestamp - a[1].timestamp
      );
      for (const [k, v] of sorted) {
        if (count >= MAX_CACHE_ENTRIES) break;
        obj[k] = v;
        count++;
      }
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn('Gagal menyimpan cache:', e);
    }
  }

  /**
   * Menormalisasi koordinat menjadi grid ~50-80 meter untuk reuse cache lokasi
   */
  public makeGeoKey(lat: number, lng: number): string {
    const roundedLat = lat.toFixed(3);
    const roundedLng = lng.toFixed(3);
    return `geo_${roundedLat}_${roundedLng}`;
  }

  public get<T>(key: string): T | null {
    const entry = this.memCache.get(key);
    if (!entry) {
      this.cacheMisses++;
      return null;
    }
    // Cek kedaluwarsa
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.memCache.delete(key);
      this.cacheMisses++;
      return null;
    }
    entry.hits++;
    this.cacheHits++;
    return entry.data as T;
  }

  public set<T>(key: string, data: T): void {
    this.memCache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 1,
    });
    this.saveToStorage();
  }

  public getStats(): {
    entries: number;
    hits: number;
    misses: number;
    hitRatePct: number;
    estimatedSavedDataKB: number;
  } {
    const total = this.cacheHits + this.cacheMisses;
    const hitRatePct = total > 0 ? Math.round((this.cacheHits / total) * 100) : 0;
    // Rata-rata 1 nominatim payload json adalah ~1.8 KB
    const estimatedSavedDataKB = Math.round(this.cacheHits * 1.8);
    return {
      entries: this.memCache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRatePct,
      estimatedSavedDataKB,
    };
  }

  public clear(): void {
    this.memCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CACHE_STORAGE_KEY);
    }
  }
}

export const smartCache = new SmartCacheManager();
