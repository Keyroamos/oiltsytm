import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  Clock,
  RefreshCw,
  Plus,
  Crosshair,
  Play,
  Pause,
  Gauge,
  Building,
  Radio,
} from 'lucide-react';
import type { Tanker, TankerLocation } from '../../types';
import {
  getTankerLocationHistory,
  recordTankerLocation,
  subscribeTankerLocations,
  reverseGeocode,
  DEPOT_PRESETS,
} from '../../services/locationService';
import { syncTankerFromProtrack } from '../../services/protrackService';
import type { ProtrackDeviceData } from '../../services/protrackService';
import { useAuth } from '../../context/AuthContext';

/* ─── Types ─────────────────────────────────────────────────────────── */
interface TankerLiveMapProps {
  tanker: Tanker;
}

/* ─── Helpers ───────────────────────────────────────────────────────── */
function formatAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 5) return 'Just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function headingToCompass(deg?: number): string {
  if (deg == null) return '—';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

/* ─── Map tile layer (OpenStreetMap – free, reliable, no API key) ───── */
const OSM_TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/* ─── Simulation Waypoints (Nairobi Industrial Area to Mombasa Rd) ──── */
const SIMULATION_WAYPOINTS = [
  { lat: -1.3142, lng: 36.8525, name: 'KPC Nairobi Terminal (Loading Bay)' },
  { lat: -1.3256, lng: 36.8681, name: 'Mombasa Road / Enterprise Rd Junction' },
  { lat: -1.3412, lng: 36.8892, name: 'Mombasa Road (Near City Cabanas)' },
  { lat: -1.3589, lng: 36.9124, name: 'Mombasa Road (Syokimau Gateway)' },
  { lat: -1.3854, lng: 36.9388, name: 'Athi River Interchange' },
  { lat: -1.4258, lng: 36.9782, name: 'Machakos Junction Transit Highway' },
  { lat: -1.4891, lng: 37.0345, name: 'Kyumvi Weighbridge Station' },
  { lat: -1.5452, lng: 37.1124, name: 'Konza Technopolis Bypass' },
];

export function TankerLiveMap({ tanker }: TankerLiveMapProps) {
  const { user } = useAuth();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);

  const [history, setHistory] = useState<TankerLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLivePing, setIsLivePing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // ProTrack365 live tracker state
  const [protrackData, setProtrackData] = useState<ProtrackDeviceData | null>(null);
  const protrackTimerRef = useRef<any>(null);

  // Simulation state
  const [simulating, setSimulating] = useState(false);
  const simIndexRef = useRef(0);
  const simTimerRef = useRef<any>(null);

  // Manual pin modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinLat, setPinLat] = useState('');
  const [pinLng, setPinLng] = useState('');
  const [pinAddress, setPinAddress] = useState('');
  const [pinSpeed, setPinSpeed] = useState('');
  const [pinNotes, setPinNotes] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  // Active coordinates (either latest historical ping or default)
  const latestLoc = history[0] ?? null;
  const currentLat = latestLoc ? latestLoc.latitude : -1.3142;
  const currentLng = latestLoc ? latestLoc.longitude : 36.8525;

  /* ─── Load Location History ────────────────────────────────────────── */
  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTankerLocationHistory(tanker.id, 50, tanker.registration_number);
      setHistory(data);
      if (data.length > 0) {
        setLastUpdate(data[0].recorded_at);
      }
    } catch {
      // Handled inside locationService
    } finally {
      setLoading(false);
    }
  }, [tanker.id, tanker.registration_number]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  /* ─── ProTrack365 Auto-Poll ──────────────────────────────────────── */
  useEffect(() => {
    if (!tanker.tracker_imei) return;

    const doSync = async () => {
      try {
        const device = await syncTankerFromProtrack(tanker, user?.id);
        if (device) {
          setProtrackData(device);
          await loadHistory();
          setLastUpdate(new Date().toISOString());
          setIsLivePing(true);
          setTimeout(() => setIsLivePing(false), 3000);
        }
      } catch {
        // Silently ignore — device may be offline
      }
    };

    doSync(); // Immediate first sync
    protrackTimerRef.current = setInterval(doSync, 30_000);

    return () => {
      if (protrackTimerRef.current) clearInterval(protrackTimerRef.current);
    };
  }, [tanker.id, tanker.tracker_imei, user?.id]);

  /* ─── Real-Time Subscription ──────────────────────────────────────── */
  useEffect(() => {
    const channel = subscribeTankerLocations(tanker.id, (newLoc) => {
      setHistory((prev) => {
        const filtered = prev.filter((p) => p.id !== newLoc.id);
        return [newLoc, ...filtered].slice(0, 50);
      });
      setLastUpdate(newLoc.recorded_at);
      setIsLivePing(true);
      setTimeout(() => setIsLivePing(false), 3000);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [tanker.id]);

  /* ─── Marker & Polyline Creation ──────────────────────────────────── */
  const createTruckMarker = (Lx: any, pos: [number, number], loc: TankerLocation | null) => {
    const speed = loc?.speed_kmh ?? 0;
    const isMoving = speed > 3;

    const icon = Lx.divIcon({
      className: '',
      html: `
        <div style="position:relative;width:52px;height:52px;display:flex;align-items:center;justify-content:center;">
          <div style="
            position:absolute;inset:0;border-radius:50%;
            background:${isMoving ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'};
            animation:pulse-ring 2s ease-out infinite;
          "></div>
          <div style="
            width:42px;height:42px;border-radius:50%;
            background:linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
            border:2.5px solid ${isMoving ? '#10b981' : '#f59e0b'};
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 6px 16px rgba(0,0,0,0.4);
            z-index:2;
          ">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="${isMoving ? '#34d399' : '#fbbf24'}" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z"/>
              <circle cx="6.5" cy="17.5" r="1.5" fill="#0f172a"/>
              <circle cx="17.5" cy="17.5" r="1.5" fill="#0f172a"/>
            </svg>
          </div>
          ${isMoving ? `
            <div style="
              position:absolute;bottom:-4px;right:-4px;
              background:#10b981;color:#fff;font-size:9px;font-weight:900;
              padding:1px 4px;border-radius:6px;border:1.5px solid #fff;
              font-family:monospace;z-index:3;
            ">
              ${Math.round(speed)}k
            </div>
          ` : ''}
        </div>
        <style>
          @keyframes pulse-ring{
            0%{transform:scale(0.8);opacity:0.8}
            70%{transform:scale(1.5);opacity:0}
            100%{transform:scale(0.8);opacity:0}
          }
        </style>
      `,
      iconSize: [52, 52],
      iconAnchor: [26, 26],
      popupAnchor: [0, -28],
    });

    return Lx.marker(pos, { icon }).bindPopup(buildPopupHtml(tanker, loc), {
      maxWidth: 280,
    });
  };

  const buildPopupHtml = (t: Tanker, loc: TankerLocation | null) => {
    return `
      <div style="font-family:Inter,system-ui,sans-serif;min-width:230px;padding:4px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <span style="font-weight:900;font-size:14px;color:#0f2438;font-family:monospace">${t.registration_number}</span>
          <span style="font-size:10px;font-weight:bold;background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:999px">
            ${loc?.speed_kmh && loc.speed_kmh > 3 ? 'IN TRANSIT' : 'STATIONARY'}
          </span>
        </div>
        <div style="font-size:11px;color:#64748b;margin-bottom:6px">
          Transporter: <strong>${t.transporter || 'Tarita Fleet'}</strong>
        </div>
        <div style="font-size:11px;color:#475569;background:#f8fafc;padding:8px;border-radius:8px;border:1px solid #e2e8f0">
          <div style="font-weight:600;color:#1e293b;margin-bottom:4px">
            📍 ${loc?.address || `${loc?.latitude.toFixed(5)}, ${loc?.longitude.toFixed(5)}`}
          </div>
          <div style="display:flex;gap:12px;font-family:monospace;font-size:11px;color:#0284c7">
            <span>⚡ ${loc?.speed_kmh != null ? `${Math.round(loc.speed_kmh)} km/h` : '0 km/h'}</span>
            <span>🧭 ${headingToCompass(loc?.heading_degrees)}</span>
          </div>
          <div style="margin-top:6px;color:#94a3b8;font-size:10px">
            Timestamp: ${loc?.recorded_at ? new Date(loc.recorded_at).toLocaleTimeString() : 'Recent'}
          </div>
        </div>
      </div>
    `;
  };

  const updatePolyline = (Lx: any, locs: TankerLocation[]) => {
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
    if (locs.length < 2) return;
    const coords: [number, number][] = [...locs]
      .reverse()
      .map((l) => [l.latitude, l.longitude]);

    polylineRef.current = Lx.polyline(coords, {
      color: '#f59e0b',
      weight: 4,
      opacity: 0.85,
      dashArray: '8 6',
      lineCap: 'round',
    }).addTo(leafletMapRef.current);
  };

  /* ─── Initialize Map ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!mapContainerRef.current || loading) return;

    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;
      const Lx = L.default || L;

      // Fix icon URL resolver
      delete (Lx.Icon.Default.prototype as any)._getIconUrl;
      Lx.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (leafletMapRef.current) {
        // Map is already initialized; trigger layout check
        leafletMapRef.current.invalidateSize();
        return;
      }

      const initialCenter: [number, number] = [currentLat, currentLng];

      const map = Lx.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 13,
        zoomControl: true,
        attributionControl: true,
      });

      Lx.tileLayer(OSM_TILE, {
        attribution: OSM_ATTR,
        maxZoom: 19,
      }).addTo(map);

      leafletMapRef.current = map;
      setMapReady(true);

      // Create initial marker
      markerRef.current = createTruckMarker(Lx, initialCenter, latestLoc).addTo(map);
      updatePolyline(Lx, history);

      // Listen for map clicks to drop pin
      map.on('click', (e: any) => {
        setPinLat(e.latlng.lat.toFixed(6));
        setPinLng(e.latlng.lng.toFixed(6));
        setShowPinModal(true);
        setPinAddress('');
        setPinSpeed('0');
        setPinNotes('');
        setPinError(null);
      });

      // Force size recalculation after animation / layout completes
      setTimeout(() => map.invalidateSize(), 150);
      setTimeout(() => map.invalidateSize(), 400);
      setTimeout(() => map.invalidateSize(), 800);
    });

    return () => {
      isMounted = false;
    };
  }, [loading, mapReady]);

  /* ─── Handle Map Resize Observer ──────────────────────────────────── */
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (leafletMapRef.current) {
        leafletMapRef.current.invalidateSize();
      }
    });
    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, []);

  /* ─── Sync Marker & Route with Latest Locations ───────────────────── */
  useEffect(() => {
    if (!leafletMapRef.current || !mapReady) return;

    import('leaflet').then((L) => {
      const Lx = L.default || L;
      const pos: [number, number] = [currentLat, currentLng];

      if (markerRef.current) {
        markerRef.current.setLatLng(pos);
        markerRef.current.setPopupContent(buildPopupHtml(tanker, latestLoc));
        if (simulating) {
          leafletMapRef.current.panTo(pos, { animate: true });
        }
      } else {
        markerRef.current = createTruckMarker(Lx, pos, latestLoc).addTo(leafletMapRef.current);
      }
      updatePolyline(Lx, history);
    });
  }, [history, currentLat, currentLng, mapReady, simulating]);

  /* ─── Center Map on Truck ─────────────────────────────────────────── */
  const centerOnTruck = () => {
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([currentLat, currentLng], 14, { animate: true });
    }
  };

  /* ─── Interactive Live Trip Simulator ─────────────────────────────── */
  const startSimulation = () => {
    setSimulating(true);
    simIndexRef.current = 0;

    if (simTimerRef.current) clearInterval(simTimerRef.current);

    simTimerRef.current = setInterval(async () => {
      const step = simIndexRef.current;
      const wp = SIMULATION_WAYPOINTS[step % SIMULATION_WAYPOINTS.length];
      const nextWp = SIMULATION_WAYPOINTS[(step + 1) % SIMULATION_WAYPOINTS.length];

      // Calculate heading angle
      const dLng = nextWp.lng - wp.lng;
      const dLat = nextWp.lat - wp.lat;
      const heading = Math.round((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360;
      const speed = Math.round(55 + Math.random() * 20); // 55-75 km/h

      try {
        await recordTankerLocation(
          tanker.id,
          {
            latitude: wp.lat,
            longitude: wp.lng,
            address: wp.name,
            speed_kmh: speed,
            heading_degrees: heading,
            source: 'GPS',
            notes: 'Active Route Transit',
          },
          user?.id
        );
      } catch {
        // Handled silently
      }

      simIndexRef.current += 1;
    }, 2800);
  };

  const stopSimulation = () => {
    setSimulating(false);
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, []);

  /* ─── Save Manual Pin ─────────────────────────────────────────────── */
  const handleSavePin = async () => {
    setPinError(null);
    const lat = parseFloat(pinLat);
    const lng = parseFloat(pinLng);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setPinError('Please enter valid coordinates (Latitude: −90 to 90, Longitude: −180 to 180).');
      return;
    }

    setPinSaving(true);
    try {
      await recordTankerLocation(
        tanker.id,
        {
          latitude: lat,
          longitude: lng,
          address: pinAddress || undefined,
          speed_kmh: pinSpeed ? parseFloat(pinSpeed) : 0,
          source: 'MANUAL',
          notes: pinNotes || undefined,
        },
        user?.id
      );

      setShowPinModal(false);
      await loadHistory();
      if (leafletMapRef.current) {
        leafletMapRef.current.setView([lat, lng], 14, { animate: true });
      }
    } catch {
      setPinError('Failed to record location.');
    } finally {
      setPinSaving(false);
    }
  };

  /* ─── Quick Depot Preset Selection ────────────────────────────────── */
  const handleSelectPreset = (preset: typeof DEPOT_PRESETS[0]) => {
    setPinLat(preset.latitude.toString());
    setPinLng(preset.longitude.toString());
    setPinAddress(preset.name);
    setPinSpeed('0');
  };

  /* ─── Reverse Geocode ─────────────────────────────────────────────── */
  const handleLookupAddress = async () => {
    const lat = parseFloat(pinLat);
    const lng = parseFloat(pinLng);
    if (isNaN(lat) || isNaN(lng)) return;
    setGeocoding(true);
    const addr = await reverseGeocode(lat, lng);
    setPinAddress(addr);
    setGeocoding(false);
  };

  /* ─── Device GPS ─────────────────────────────────────────────────── */
  const handleUseMyGPS = () => {
    if (!navigator.geolocation) {
      setPinError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPinLat(pos.coords.latitude.toFixed(6));
        setPinLng(pos.coords.longitude.toFixed(6));
        setPinError(null);
      },
      () => setPinError('Could not acquire your GPS position.')
    );
  };

  return (
    <div className="space-y-4 font-sans">
      {/* ── Top Bar Controls ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-gradient-to-r from-slate-900 to-[#1e3a5f] p-3 rounded-2xl text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
            <Radio className={`w-5 h-5 ${isLivePing || simulating ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider uppercase">Live GPS Radar</span>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  tanker.tracker_imei && protrackData?.datastatus === 2
                    ? 'bg-emerald-500 text-white animate-pulse'
                    : tanker.tracker_imei && protrackData?.datastatus === 4
                    ? 'bg-blue-600 text-white'
                    : simulating
                    ? 'bg-amber-500 text-slate-950 animate-pulse'
                    : isLivePing
                    ? 'bg-blue-500 text-white'
                    : tanker.tracker_imei
                    ? 'bg-orange-500 text-white'
                    : 'bg-white/20 text-slate-200'
                }`}
              >
                {tanker.tracker_imei && protrackData?.datastatus === 2
                  ? 'ProTrack Online ✓'
                  : tanker.tracker_imei && protrackData?.datastatus === 4
                  ? 'ProTrack Parked ✓'
                  : simulating
                  ? 'Simulator Running'
                  : isLivePing
                  ? 'Signal Received'
                  : tanker.tracker_imei
                  ? 'Connecting…'
                  : 'Satellite Active'}
              </span>
            </div>
            <p className="text-[10px] text-slate-300 font-mono flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3 h-3 text-slate-400" />
              {lastUpdate ? `Last ping: ${formatAgo(lastUpdate)}` : 'Connected to fleet network'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Live Simulation Button */}
          {simulating ? (
            <button
              onClick={stopSimulation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-all shadow-sm"
              title="Pause route transit simulation"
            >
              <Pause className="w-3.5 h-3.5" /> Pause Trip
            </button>
          ) : (
            <button
              onClick={startSimulation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm"
              title="Start simulated trip with real-time speed & heading updates"
            >
              <Play className="w-3.5 h-3.5" /> Simulate Trip
            </button>
          )}

          <button
            onClick={centerOnTruck}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-all"
            title="Recenter map on tanker"
          >
            <Crosshair className="w-3.5 h-3.5" /> Recenter
          </button>

          <button
            onClick={loadHistory}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-all"
            title="Refresh location telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>

          <button
            onClick={() => {
              setPinLat(currentLat.toFixed(6));
              setPinLng(currentLng.toFixed(6));
              setPinAddress(latestLoc?.address || '');
              setPinSpeed('0');
              setPinNotes('');
              setPinError(null);
              setShowPinModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Set Pin
          </button>
        </div>
      </div>

      {/* ── Active Telemetry Card ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Current Waypoint</span>
          <span className="font-semibold text-gray-900 block truncate mt-0.5" title={latestLoc?.address || 'Terminal'}>
            {latestLoc?.address || 'KPC Main Terminal'}
          </span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">GPS Coordinates</span>
          <span className="font-mono font-bold text-blue-900 block mt-0.5">
            {currentLat.toFixed(4)}, {currentLng.toFixed(4)}
          </span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Current Speed</span>
          <span className="font-mono font-bold text-emerald-600 block mt-0.5 flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5 text-emerald-500" />
            {latestLoc?.speed_kmh ? `${Math.round(latestLoc.speed_kmh)} km/h` : '0 km/h (Idle)'}
          </span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Heading / Bearing</span>
          <span className="font-mono font-bold text-purple-900 block mt-0.5 flex items-center gap-1">
            <Navigation
              className="w-3.5 h-3.5 text-purple-600"
              style={{ transform: `rotate(${latestLoc?.heading_degrees ?? 0}deg)` }}
            />
            {headingToCompass(latestLoc?.heading_degrees)} ({latestLoc?.heading_degrees ?? 0}°)
          </span>
        </div>
      </div>

      {/* ── ProTrack365 Live Telemetry Panel ─────────────────────── */}
      {tanker.tracker_imei && (
        <div className={`rounded-2xl border p-3 text-xs ${
          protrackData?.datastatus === 2
            ? 'bg-emerald-50 border-emerald-200'
            : protrackData?.datastatus === 4
            ? 'bg-blue-50 border-blue-200'
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-gray-900 flex items-center gap-1.5">
              <Radio className={`w-3.5 h-3.5 ${protrackData?.datastatus === 2 ? 'text-emerald-600 animate-pulse' : 'text-blue-600'}`} />
              ProTrack365 Live Telemetry
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                protrackData?.datastatus === 2
                  ? 'bg-emerald-200 text-emerald-800'
                  : protrackData?.datastatus === 4
                  ? 'bg-blue-200 text-blue-800'
                  : 'bg-orange-200 text-orange-800'
              }`}>
                {protrackData?.datastatus === 2 ? 'ONLINE (MOVING)' : protrackData?.datastatus === 4 ? 'PARKED / IGNITION OFF' : 'SYNCING…'}
              </span>
            </span>
            <span className="text-[10px] text-gray-500 font-mono">IMEI: {tanker.tracker_imei}</span>
          </div>
          {protrackData ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-white rounded-xl p-2 border border-gray-100">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">ACC Status</span>
                <span className={`font-bold block mt-0.5 ${
                  protrackData.accstatus === 1 ? 'text-emerald-600' :
                  protrackData.accstatus === 0 ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  {protrackData.accstatus === 1 ? '🟢 Engine ON' : protrackData.accstatus === 0 ? '🔴 Engine OFF' : '—'}
                </span>
              </div>
              <div className="bg-white rounded-xl p-2 border border-gray-100">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Battery</span>
                <span className={`font-bold font-mono block mt-0.5 ${
                  protrackData.battery > 50 ? 'text-emerald-600' :
                  protrackData.battery > 20 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {protrackData.battery >= 0 ? `${protrackData.battery}%` : '—'}
                </span>
              </div>
              <div className="bg-white rounded-xl p-2 border border-gray-100">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Ext. Voltage</span>
                <span className="font-bold font-mono text-blue-700 block mt-0.5">
                  {protrackData.externalpower ? `${protrackData.externalpower} V` : '—'}
                </span>
              </div>
              <div className="bg-white rounded-xl p-2 border border-gray-100">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Fuel Signal</span>
                <span className={`font-bold block mt-0.5 ${
                  protrackData.oilpowerstatus === 1 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {protrackData.oilpowerstatus === 1 ? '✓ OK' : protrackData.oilpowerstatus === 0 ? '✗ Cut' : '—'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-[11px] flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              Fetching live data from ProTrack365 API…
            </div>
          )}
        </div>
      )}

      {/* ── Interactive Leaflet Map Container ─────────────────────── */}
      <div
        className="w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative bg-slate-100"
        style={{ height: '390px' }}
      >
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-2xs">
            <div className="flex flex-col items-center gap-2 text-slate-600">
              <div className="w-8 h-8 border-3 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold">Calibrating map tiles…</span>
            </div>
          </div>
        )}

        <div
          ref={mapContainerRef}
          id={`tanker-live-map-${tanker.id}`}
          className="w-full h-full z-10"
        />

        {/* Map Overlay Badge */}
        <div className="absolute top-3 right-3 z-[400] bg-white/90 backdrop-blur-xs border border-gray-200 px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-2 text-[11px] font-bold text-slate-800">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{tanker.registration_number}</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-500 font-mono font-normal">OSM Live Tiles</span>
        </div>

        {/* Bottom Helper Hint */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[400] pointer-events-none">
          <span className="bg-slate-900/80 text-white text-[10px] font-medium px-3 py-1 rounded-full backdrop-blur-xs border border-white/10 shadow-sm">
            💡 Click anywhere on map to reposition or log new GPS fix
          </span>
        </div>
      </div>

      {/* ── Breadcrumb Route History ──────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Telemetry Breadcrumbs &amp; Route Pings ({history.length})
          </h5>
          <span className="text-[11px] text-gray-400 font-mono">Real-time GPS log</span>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {history.map((loc, idx) => (
            <div
              key={loc.id || idx}
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-[11px] transition-all ${
                idx === 0
                  ? 'bg-amber-50/70 border-amber-200 shadow-2xs'
                  : 'bg-gray-50/70 border-gray-100 hover:bg-gray-100/60'
              }`}
            >
              <div className="flex flex-col items-center gap-1 pt-0.5">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    idx === 0 ? 'bg-amber-500 ring-4 ring-amber-100' : 'bg-gray-300'
                  }`}
                />
                {idx < history.length - 1 && <div className="w-px h-3 bg-gray-200" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-gray-900 font-semibold truncate">
                  {loc.address || `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-gray-500 font-mono text-[10px]">
                  <span>{formatAgo(loc.recorded_at)}</span>
                  {loc.speed_kmh != null && (
                    <span className="text-emerald-700 font-bold">· {Math.round(loc.speed_kmh)} km/h</span>
                  )}
                  {loc.heading_degrees != null && <span>· {headingToCompass(loc.heading_degrees)}</span>}
                  <span className="px-1.5 py-0.2 rounded bg-gray-200 text-gray-700 uppercase font-sans text-[9px] font-bold">
                    {loc.source}
                  </span>
                </div>
              </div>

              <div className="text-[10px] font-mono text-gray-400 text-right flex-shrink-0">
                <div>{loc.latitude.toFixed(4)}° N</div>
                <div>{loc.longitude.toFixed(4)}° E</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Update Location Modal ──────────────────────────────────── */}
      {showPinModal && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-2xs"
            onClick={() => setShowPinModal(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Record GPS Telemetry</h4>
                  <p className="text-[11px] text-gray-500 font-mono">{tanker.registration_number} · Live Fleet</p>
                </div>
              </div>
              <button
                onClick={() => setShowPinModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {pinError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                {pinError}
              </div>
            )}

            {/* Quick Depot Presets */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-gray-400" />
                Quick Terminal Presets
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {DEPOT_PRESETS.slice(0, 4).map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className="text-left p-2 rounded-xl border border-gray-200 hover:border-amber-400 hover:bg-amber-50/50 transition-all text-[11px]"
                  >
                    <span className="font-bold text-gray-900 block truncate">{p.name.split('(')[0]}</span>
                    <span className="text-[10px] text-gray-400 block truncate font-mono">
                      {p.latitude}, {p.longitude}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Lat / Lng inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Latitude *
                </label>
                <input
                  type="number"
                  step="any"
                  value={pinLat}
                  onChange={(e) => setPinLat(e.target.value)}
                  placeholder="-1.3142"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Longitude *
                </label>
                <input
                  type="number"
                  step="any"
                  value={pinLng}
                  onChange={(e) => setPinLng(e.target.value)}
                  placeholder="36.8525"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                />
              </div>
            </div>

            {/* Geocode & GPS Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleUseMyGPS}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Crosshair className="w-3.5 h-3.5 text-blue-600" /> Device GPS
              </button>
              <button
                type="button"
                onClick={handleLookupAddress}
                disabled={geocoding || !pinLat || !pinLng}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                {geocoding ? 'Locating…' : 'Lookup Street Name'}
              </button>
            </div>

            {/* Location Label */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Location Name / Address
              </label>
              <input
                type="text"
                value={pinAddress}
                onChange={(e) => setPinAddress(e.target.value)}
                placeholder="e.g. KPC Industrial Terminal, Loading Bay 4"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Speed (km/h)
                </label>
                <input
                  type="number"
                  min="0"
                  value={pinSpeed}
                  onChange={(e) => setPinSpeed(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Notes / Dispatch Status
                </label>
                <input
                  type="text"
                  value={pinNotes}
                  onChange={(e) => setPinNotes(e.target.value)}
                  placeholder="e.g. Loading PMS fuel"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePin}
                disabled={pinSaving || !pinLat || !pinLng}
                className="flex-1 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-xs font-bold hover:bg-[#2d5282] transition-colors shadow-sm disabled:opacity-50"
              >
                {pinSaving ? 'Saving Fix…' : 'Record Location'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
