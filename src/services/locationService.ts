import { supabase } from '../lib/supabase';
import type { TankerLocation, UUID } from '../types';

export interface UpdateLocationInput {
  latitude: number;
  longitude: number;
  address?: string;
  speed_kmh?: number;
  heading_degrees?: number;
  accuracy_m?: number;
  source?: 'GPS' | 'MANUAL' | 'DRIVER_APP';
  notes?: string;
}

export interface PresetLocation {
  name: string;
  description: string;
  latitude: number;
  longitude: number;
}

export const DEPOT_PRESETS: PresetLocation[] = [
  {
    name: 'Nairobi Terminal (Industrial Area)',
    description: 'KPC Nairobi Terminal, Nanyuki Rd',
    latitude: -1.3142,
    longitude: 36.8525,
  },
  {
    name: 'Mombasa Kipevu Oil Terminal (KOT)',
    description: 'Port of Mombasa, Kipevu Jetty',
    latitude: -4.0354,
    longitude: 39.6382,
  },
  {
    name: 'Nakuru Pipeline Terminal',
    description: 'KPC Nakuru Terminal, Lanet',
    latitude: -0.2831,
    longitude: 36.0665,
  },
  {
    name: 'Eldoret Pipeline Terminal',
    description: 'KPC Eldoret Terminal, Kapsoya',
    latitude: 0.5142,
    longitude: 35.2694,
  },
  {
    name: 'Kisumu Oil Jetty & Terminal',
    description: 'Lake Victoria KPC Terminal',
    latitude: -0.1022,
    longitude: 34.7617,
  },
];

const LOCAL_STORAGE_KEY_PREFIX = 'petrodepot_tanker_locs_';

/** Local event bus for instant in-tab updates */
const LOCAL_BUS_EVENT = 'petrodepot_tanker_loc_update';

function getLocalKey(tankerId: string): string {
  return `${LOCAL_STORAGE_KEY_PREFIX}${tankerId}`;
}

function getStoredLocalLocations(tankerId: string): TankerLocation[] {
  try {
    const raw = localStorage.getItem(getLocalKey(tankerId));
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore storage parse errors
  }
  return [];
}

function saveStoredLocalLocations(tankerId: string, list: TankerLocation[]) {
  try {
    localStorage.setItem(getLocalKey(tankerId), JSON.stringify(list.slice(0, 100)));
  } catch {
    // Storage quota exceeded or blocked
  }
}

/** Deterministic initial depot location if none exists */
export function getDefaultTankerLocation(tankerId: string, regNumber?: string): TankerLocation {
  const hash = (regNumber || tankerId)
    .split('')
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const preset = DEPOT_PRESETS[hash % DEPOT_PRESETS.length];

  return {
    id: `default-${tankerId}`,
    tanker_id: tankerId,
    latitude: preset.latitude,
    longitude: preset.longitude,
    address: preset.name,
    speed_kmh: 0,
    heading_degrees: 0,
    source: 'MANUAL',
    recorded_at: new Date().toISOString(),
    notes: 'Standard Terminal Position',
  };
}

/** Fetch the last N location breadcrumbs for a tanker (newest first) */
export async function getTankerLocationHistory(
  tankerId: UUID,
  limit = 50,
  regNumber?: string
): Promise<TankerLocation[]> {
  try {
    const { data, error } = await supabase
      .from('tanker_locations')
      .select('*')
      .eq('tanker_id', tankerId)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Table doesn't exist yet or connection issue -> fall back to local storage
      const local = getStoredLocalLocations(tankerId);
      if (local.length > 0) return local.slice(0, limit);
      // If nothing saved locally either, provide default terminal position
      return [getDefaultTankerLocation(tankerId, regNumber)];
    }

    if (data && data.length > 0) {
      return data as TankerLocation[];
    }

    // Check local fallback
    const local = getStoredLocalLocations(tankerId);
    if (local.length > 0) return local.slice(0, limit);

    // Default position
    return [getDefaultTankerLocation(tankerId, regNumber)];
  } catch {
    const local = getStoredLocalLocations(tankerId);
    if (local.length > 0) return local.slice(0, limit);
    return [getDefaultTankerLocation(tankerId, regNumber)];
  }
}

/** Record a new GPS fix for a tanker */
export async function recordTankerLocation(
  tankerId: UUID,
  input: UpdateLocationInput,
  userId?: UUID
): Promise<TankerLocation> {
  const newRecord: TankerLocation = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `loc-${Date.now()}`,
    tanker_id: tankerId,
    latitude: input.latitude,
    longitude: input.longitude,
    address: input.address ?? undefined,
    speed_kmh: input.speed_kmh ?? undefined,
    heading_degrees: input.heading_degrees ?? undefined,
    accuracy_m: input.accuracy_m ?? undefined,
    source: input.source ?? 'MANUAL',
    recorded_by: userId ?? undefined,
    notes: input.notes ?? undefined,
    recorded_at: new Date().toISOString(),
  };

  // 1. Try persisting to Supabase
  try {
    const { data, error } = await supabase
      .from('tanker_locations')
      .insert({
        tanker_id: tankerId,
        latitude: input.latitude,
        longitude: input.longitude,
        address: input.address ?? null,
        speed_kmh: input.speed_kmh ?? null,
        heading_degrees: input.heading_degrees ?? null,
        accuracy_m: input.accuracy_m ?? null,
        source: input.source ?? 'MANUAL',
        recorded_by: userId ?? null,
        notes: input.notes ?? null,
      })
      .select()
      .single();

    if (!error && data) {
      newRecord.id = data.id;
      newRecord.recorded_at = data.recorded_at;
    }
  } catch {
    // Graceful fallback to local persistence
  }

  // 2. Also save to local storage as fallback/cache
  const currentList = getStoredLocalLocations(tankerId);
  saveStoredLocalLocations(tankerId, [newRecord, ...currentList]);

  // 3. Dispatch local event for instant UI reactivity
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(LOCAL_BUS_EVENT, { detail: { tankerId, location: newRecord } })
    );
  }

  return newRecord;
}

/** Subscribe to real-time location updates for a specific tanker */
export function subscribeTankerLocations(
  tankerId: UUID,
  onUpdate: (location: TankerLocation) => void
) {
  // 1. Local event listener for instant responsiveness
  const handleLocalEvent = (e: Event) => {
    const customEvent = e as CustomEvent<{ tankerId: string; location: TankerLocation }>;
    if (customEvent.detail && customEvent.detail.tankerId === tankerId) {
      onUpdate(customEvent.detail.location);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(LOCAL_BUS_EVENT, handleLocalEvent);
  }

  // 2. Supabase Realtime channel
  let channel: any = null;
  try {
    channel = supabase
      .channel(`tanker_locations:${tankerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tanker_locations',
          filter: `tanker_id=eq.${tankerId}`,
        },
        (payload) => {
          if (payload.new) {
            onUpdate(payload.new as TankerLocation);
          }
        }
      )
      .subscribe();
  } catch {
    // Realtime channel creation error handled gracefully
  }

  return {
    unsubscribe: () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(LOCAL_BUS_EVENT, handleLocalEvent);
      }
      if (channel) {
        try {
          channel.unsubscribe();
        } catch {
          // Ignore unsubscribe errors
        }
      }
    },
  };
}

/** Reverse-geocode coordinates using Nominatim (OpenStreetMap, free, no key) */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'TaritaPetroleum/1.0' } }
    );
    if (!res.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const json = await res.json();
    return json.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}
