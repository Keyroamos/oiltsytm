/**
 * protrackService.ts
 * ProTrack365 Open API integration — https://api.protrack365.com
 *
 * Handles:
 *   - Auth token lifecycle (2-hour TTL, auto-refresh)
 *   - Fetching live GPS track for one or more IMEI devices
 *   - Syncing GPS fixes into the existing locationService (Supabase + localStorage)
 *   - Background fleet-wide polling
 */

import { recordTankerLocation } from './locationService';
import type { Tanker } from '../types';

// ─── Config ──────────────────────────────────────────────────────────────────

const PROTRACK_ACCOUNT  = import.meta.env.VITE_PROTRACK_ACCOUNT  as string | undefined;
const PROTRACK_PASSWORD = import.meta.env.VITE_PROTRACK_PASSWORD as string | undefined;
const BASE_URL          = 'https://api.protrack365.com';

// ─── MD5 (pure JS – no external dependency, runs in browser) ─────────────────

function md5(str: string): string {
  function safeAdd(x: number, y: number) {
    const lsw = (x & 0xffff) + (y & 0xffff);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  }
  function bitRotateLeft(num: number, cnt: number) {
    return (num << cnt) | (num >>> (32 - cnt));
  }
  function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }
  function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn(c ^ (b | ~d), a, b, x, s, t);
  }
  function md5blks(str: string): number[] {
    const nblk = ((str.length + 8) >> 6) + 1;
    const blks: number[] = new Array(nblk * 16).fill(0);
    for (let i = 0; i < str.length; i++) blks[i >> 2] |= str.charCodeAt(i) << ((i % 4) * 8);
    blks[str.length >> 2] |= 0x80 << ((str.length % 4) * 8);
    blks[nblk * 16 - 2] = str.length * 8;
    return blks;
  }
  const x = md5blks(str);
  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  for (let i = 0; i < x.length; i += 16) {
    const [oa, ob, oc, od] = [a, b, c, d];
    a = md5ff(a, b, c, d, x[i], 7, -680876936);
    d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
    c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
    b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
    a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
    d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
    c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
    b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
    a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
    d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
    c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
    b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
    a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
    d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
    c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
    b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);
    a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
    d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
    c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
    b = md5gg(b, c, d, a, x[i], 20, -373897302);
    a = md5gg(a, b, c, d, x[i + 5], 5, -701558691);
    d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
    c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
    b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
    a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
    d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
    c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
    b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
    a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
    d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
    c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473);
    b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);
    a = md5hh(a, b, c, d, x[i + 5], 4, -378558);
    d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
    c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
    b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
    a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060);
    d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
    c = md5hh(c, d, a, b, x[i + 7], 16, -155497632);
    b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
    a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
    d = md5hh(d, a, b, c, x[i], 11, -358537222);
    c = md5hh(c, d, a, b, x[i + 3], 16, -722521979);
    b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
    a = md5hh(a, b, c, d, x[i + 9], 4, -640364487);
    d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
    c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
    b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);
    a = md5ii(a, b, c, d, x[i], 6, -198630844);
    d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
    c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
    b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
    a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571);
    d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
    c = md5ii(c, d, a, b, x[i + 10], 15, -1051523);
    b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
    a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359);
    d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
    c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380);
    b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
    a = md5ii(a, b, c, d, x[i + 4], 6, -145523070);
    d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
    c = md5ii(c, d, a, b, x[i + 2], 15, 718787259);
    b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);
    a = safeAdd(a, oa); b = safeAdd(b, ob); c = safeAdd(c, oc); d = safeAdd(d, od);
  }
  const hex = (n: number) => ('00000000' + (n >>> 0).toString(16)).slice(-8).match(/../g)!
    .map(h => h.split('').reverse().join('')).join('');
  return [a, b, c, d].map(hex).join('');
}

// ─── Token Cache ──────────────────────────────────────────────────────────────

interface TokenCache {
  token: string;
  expiresAt: number; // ms timestamp
}

let tokenCache: TokenCache | null = null;
const TOKEN_REFRESH_BUFFER_MS = 10 * 60 * 1000; // Refresh 10 min before expiry

async function getAccessToken(): Promise<string> {
  const now = Date.now();

  // Return cached token if still valid
  if (tokenCache && tokenCache.expiresAt - now > TOKEN_REFRESH_BUFFER_MS) {
    return tokenCache.token;
  }

  if (!PROTRACK_ACCOUNT || !PROTRACK_PASSWORD) {
    throw new Error('ProTrack365 credentials not configured (VITE_PROTRACK_ACCOUNT / VITE_PROTRACK_PASSWORD).');
  }

  const time = Math.floor(now / 1000);
  const signature = md5(md5(PROTRACK_PASSWORD) + time);

  const url = `${BASE_URL}/api/authorization?time=${time}&account=${encodeURIComponent(PROTRACK_ACCOUNT)}&signature=${signature}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`ProTrack auth failed: HTTP ${res.status}`);

  const json = await res.json();
  if (json.code !== 0) throw new Error(`ProTrack auth error code ${json.code}: ${json.message || ''}`);

  const { access_token, expires_in } = json.record as { access_token: string; expires_in: number };

  tokenCache = {
    token: access_token,
    expiresAt: now + expires_in * 1000,
  };

  return access_token;
}

// ─── ProTrack Track API Response ──────────────────────────────────────────────

export interface ProtrackDeviceData {
  imei: string;
  longitude: number;
  latitude: number;
  speed: number;        // km/h
  course: number;       // heading degrees
  gpstime: number;      // UNIX timestamp
  servertime: number;
  hearttime: number;
  accstatus: number;    // 1=ON, 0=OFF, -1=unknown
  oilpowerstatus: number;
  battery: number;      // -1 = unknown
  datastatus: number;   // 2=OK, 4=offline
  externalpower: string;
  fuel: string;
  mileage: number;      // meters, -1=unknown
}

/** Fetch live GPS position(s) for one or more IMEIs */
export async function fetchProtrackTrack(imeis: string[]): Promise<ProtrackDeviceData[]> {
  if (imeis.length === 0) return [];

  const token = await getAccessToken();
  const url = `${BASE_URL}/api/track?access_token=${token}&imeis=${imeis.join(',')}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`ProTrack /api/track failed: HTTP ${res.status}`);

  const json = await res.json();
  if (json.code !== 0) {
    // Token may have been invalidated externally — clear cache and retry once
    if (json.code === 3 || json.code === 10) {
      tokenCache = null;
      return fetchProtrackTrack(imeis);
    }
    throw new Error(`ProTrack track error ${json.code}: ${json.message || ''}`);
  }

  return (json.record as ProtrackDeviceData[]) || [];
}

/** Sync one tanker's GPS from ProTrack into locationService */
export async function syncTankerFromProtrack(
  tanker: Tanker,
  userId?: string
): Promise<ProtrackDeviceData | null> {
  if (!tanker.tracker_imei) return null;

  try {
    const results = await fetchProtrackTrack([tanker.tracker_imei]);
    const device  = results.find((r) => r.imei === tanker.tracker_imei);
    if (!device) return null;

    // Only save if we have valid non-zero coordinates
    if (!device.latitude || !device.longitude || (device.latitude === 0 && device.longitude === 0)) return device;

    await recordTankerLocation(
      tanker.id,
      {
        latitude:        device.latitude,
        longitude:       device.longitude,
        speed_kmh:       device.speed,
        heading_degrees: device.course,
        source:          'GPS',
        notes:           `ProTrack365 GPS | ${device.datastatus === 2 ? 'ONLINE' : 'PARKED'} | Engine:${device.accstatus === 1 ? 'ON' : 'OFF'} | Batt:${device.battery}%`,
      },
      userId
    );

    return device;
  } catch (err) {
    console.warn(`[ProTrack] Sync failed for ${tanker.registration_number}:`, err);
    return null;
  }
}

// ─── Background Fleet Poller ──────────────────────────────────────────────────

/**
 * Start polling all IMEI-equipped tankers on a given interval.
 * Returns a stop() function — call it on component unmount.
 */
export function startProtrackPolling(
  getTankers: () => Tanker[],
  intervalMs = 30_000,
  userId?: string,
  onUpdate?: (tanker: Tanker, device: ProtrackDeviceData) => void
): { stop: () => void } {
  let running = true;

  const poll = async () => {
    if (!running) return;

    const tankers = getTankers().filter((t) => !!t.tracker_imei);
    if (tankers.length === 0) return;

    // Batch fetch all IMEIs at once (max 100 per API call)
    const imeis = tankers.map((t) => t.tracker_imei!);
    try {
      const token = await getAccessToken();
      const url = `${BASE_URL}/api/track?access_token=${token}&imeis=${imeis.join(',')}`;
      const res  = await fetch(url);
      if (!res.ok) return;

      const json = await res.json();
      if (json.code !== 0) {
        if (json.code === 3 || json.code === 10) tokenCache = null;
        return;
      }

      const records: ProtrackDeviceData[] = json.record || [];

      for (const device of records) {
        if (!device.latitude || !device.longitude || (device.latitude === 0 && device.longitude === 0)) continue;

        const tanker = tankers.find((t) => t.tracker_imei === device.imei);
        if (!tanker) continue;

        await recordTankerLocation(
          tanker.id,
          {
            latitude:        device.latitude,
            longitude:       device.longitude,
            speed_kmh:       device.speed,
            heading_degrees: device.course,
            source:          'GPS',
            notes:           `ProTrack365 fleet-poll | ${device.datastatus === 2 ? 'ONLINE' : 'PARKED'} | Engine:${device.accstatus === 1 ? 'ON' : 'OFF'}`,
          },
          userId
        );

        onUpdate?.(tanker, device);
      }
    } catch {
      // Silently swallow network errors during background polling
    }
  };

  // First poll immediately, then on interval
  poll();
  const timer = setInterval(poll, intervalMs);

  return {
    stop: () => {
      running = false;
      clearInterval(timer);
    },
  };
}
