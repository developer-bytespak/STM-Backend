import { Injectable, BadRequestException } from '@nestjs/common';
import fetch from 'node-fetch';

type Place = { city: string; state: string };

@Injectable()
export class ZipService {
  private cache = new Map<string, { places: Place[]; cachedAt: number }>();
  private ttlMs = 1000 * 60 * 60 * 24 * 30; // 30 days

  private normalize(zip: string): string {
    const five = String(zip || '').replace(/\D/g, '').slice(0, 5);
    return five;
  }

  private isValid(zip: string): boolean {
    return /^\d{5}$/.test(zip);
  }

  async resolve(zip: string): Promise<{ zipCode: string; places: Place[] }> {
    const normalized = this.normalize(zip);
    if (!this.isValid(normalized)) {
      throw new BadRequestException('ZIP must be exactly 5 digits');
    }

    const now = Date.now();
    const cached = this.cache.get(normalized);
    if (cached && now - cached.cachedAt < this.ttlMs) {
      return { zipCode: normalized, places: cached.places };
    }

    // Try free Zippopotam (fallback-friendly). You can switch to Smarty later.
    const url = `https://api.zippopotam.us/us/${normalized}`;
    const res = await fetch(url);
    if (!res.ok) {
      // On failure, cache empty to avoid thundering herd for invalid ZIPs
      this.cache.set(normalized, { places: [], cachedAt: now });
      return { zipCode: normalized, places: [] };
    }
    const data = await res.json();
    const places: Place[] = Array.isArray(data.places)
      ? data.places.map((p: any) => ({ city: p['place name'], state: p['state abbreviation'] }))
      : [];

    this.cache.set(normalized, { places, cachedAt: now });
    return { zipCode: normalized, places };
  }
}


