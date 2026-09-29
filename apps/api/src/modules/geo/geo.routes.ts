import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { parse } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';

/*
 * Server-side proxy for OpenStreetMap Nominatim. Proxying lets us send a proper
 * User-Agent (required by their usage policy), cache results, and keep the
 * browser talking to a single origin.
 */

const cache = new Map<string, { at: number; value: unknown }>();
const TTL = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 1000;

const cached = async <T>(key: string, load: () => Promise<T>): Promise<T> => {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value as T;
  const value = await load();
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  cache.set(key, { at: Date.now(), value });
  return value;
};

const nominatim = async (pathname: string, params: Record<string, string>) => {
  const url = new URL(pathname, env.NOMINATIM_URL);
  for (const [k, v] of Object.entries({ format: 'jsonv2', ...params })) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Civita/2.0 (civic issue tracker)', 'Accept-Language': 'en' },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`Nominatim responded ${res.status}`);
  return res.json() as Promise<unknown>;
};

const fallbackAddress = (lat: number, lng: number) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

export const geoRouter = Router();

geoRouter.get('/reverse', async (req, res) => {
  const { lat, lng } = parse(
    z.object({
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180),
    }),
    req.query,
  );
  const key = `r:${lat.toFixed(5)},${lng.toFixed(5)}`;
  try {
    const address = await cached(key, async () => {
      const data = (await nominatim('/reverse', {
        lat: String(lat),
        lon: String(lng),
        zoom: '18',
      })) as {
        display_name?: string;
      };
      return data.display_name ?? fallbackAddress(lat, lng);
    });
    res.json({ address });
  } catch (err) {
    logger.warn({ err }, 'Reverse geocoding failed');
    res.json({ address: fallbackAddress(lat, lng) });
  }
});

geoRouter.get('/search', async (req, res) => {
  const { q } = parse(z.object({ q: z.string().trim().min(3).max(200) }), req.query);
  try {
    const results = await cached(`s:${q.toLowerCase()}`, async () => {
      const data = (await nominatim('/search', { q, limit: '5' })) as {
        display_name: string;
        lat: string;
        lon: string;
      }[];
      return data.map((d) => ({ label: d.display_name, lat: Number(d.lat), lng: Number(d.lon) }));
    });
    res.json(results);
  } catch (err) {
    logger.warn({ err }, 'Place search failed');
    res.json([]);
  }
});
