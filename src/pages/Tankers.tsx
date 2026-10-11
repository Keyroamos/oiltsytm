import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Truck,
  Plus,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Edit2,
  ExternalLink,
  Radio,
} from 'lucide-react';
import type { Tanker, UUID } from '../types';
import {
  getTankers,
  getTankerCompliance,
} from '../services/tankerService';
import { startProtrackPolling } from '../services/protrackService';
import type { ProtrackDeviceData } from '../services/protrackService';
import { AddEditTankerModal } from '../components/tankers/AddEditTankerModal';
import { TankerDetailDrawer } from '../components/tankers/TankerDetailDrawer';
import { KPICard } from '../components/common/KPICard';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatLitres } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

export function Tankers() {
  const { user } = useAuth();
  const [tankers, setTankers] = useState<Tanker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedCompliance, setSelectedCompliance] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Fleet live tracker map state
  const [showFleetMap, setShowFleetMap] = useState(false);
  const [trackedDevices, setTrackedDevices] = useState<Map<string, ProtrackDeviceData>>(new Map());
  const fleetMapContainerRef = useRef<HTMLDivElement>(null);
  const fleetMapRef = useRef<any>(null);
  const fleetMarkersRef = useRef<Map<string, any>>(new Map());
  const fleetPolyStopRef = useRef<(() => void) | null>(null);

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingTanker, setEditingTanker] = useState<Tanker | null>(null);
  const [selectedTankerId, setSelectedTankerId] = useState<UUID | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getTankers();
      setTankers(list);
    } catch (err) {
      console.error('Failed to load tankers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ─── Fleet-Wide ProTrack365 Polling ─────────────────────────── */
  useEffect(() => {
    if (!showFleetMap) return;
    const trackedTankers = tankers.filter((t) => !!t.tracker_imei);
    if (trackedTankers.length === 0) return;

    // Start background polling — updates map markers via onUpdate callback
    const poller = startProtrackPolling(
      () => tankers,
      30_000,
      user?.id,
      (tanker, device) => {
        setTrackedDevices((prev) => {
          const next = new Map(prev);
          next.set(tanker.id, device);
          return next;
        });
        // Move fleet marker if map is ready
        const marker = fleetMarkersRef.current.get(tanker.id);
        if (marker && fleetMapRef.current) {
          marker.setLatLng([device.latitude, device.longitude]);
          marker.setPopupContent(
            `<div style="font-family:sans-serif;font-size:12px;padding:4px;min-width:140px">
               <strong style="color:#1e3a5f;font-size:13px">${tanker.registration_number}</strong>
               <span style="margin-left:6px;font-size:9px;font-weight:bold;padding:2px 6px;border-radius:999px;background:${device.datastatus === 2 ? '#dcfce7;color:#15803d' : '#f1f5f9;color:#475569'}">
                 ${device.datastatus === 2 ? 'ONLINE' : 'PARKED'}
               </span><br/>
               <span style="color:#64748b;font-size:11px;display:block;margin-top:2px">
                 Speed: ${Math.round(device.speed)} km/h &bull; Batt: ${device.battery}%
               </span>
               <span style="font-family:monospace;font-size:10px;color:#059669;display:block;margin-top:2px">
                 ${device.latitude.toFixed(5)}, ${device.longitude.toFixed(5)}
               </span>
             </div>`
          );
        }
      }
    );
    fleetPolyStopRef.current = poller.stop;

    return () => {
      poller.stop();
      fleetPolyStopRef.current = null;
    };
  }, [showFleetMap, tankers.length, user?.id]);

  /* ─── Init Fleet Leaflet Map ──────────────────────────────────── */
  useEffect(() => {
    if (!showFleetMap || !fleetMapContainerRef.current) return;
    let mounted = true;

    import('leaflet').then((L) => {
      if (!mounted || !fleetMapContainerRef.current) return;
      const Lx = L.default || L;

      if (fleetMapRef.current) {
        fleetMapRef.current.invalidateSize();
        return;
      }

      const map = Lx.map(fleetMapContainerRef.current, {
        center: [-1.40, 36.98],
        zoom: 9,
        zoomControl: true,
      });

      Lx.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      fleetMapRef.current = map;

      // Place markers for all IMEI-equipped tankers
      const imeiTankers = tankers.filter((t) => !!t.tracker_imei);
      const validPoints: [number, number][] = [];

      imeiTankers.forEach((t) => {
        const lat = t.current_latitude ?? -1.40;
        const lng = t.current_longitude ?? 36.98;
        if (t.current_latitude && t.current_longitude) {
          validPoints.push([t.current_latitude, t.current_longitude]);
        }

        const icon = Lx.divIcon({
          className: '',
          html: `<div style="background:#1e3a5f;color:#fff;padding:3px 7px;border-radius:10px;font-size:10px;font-weight:900;font-family:monospace;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.4);border:2px solid #10b981;cursor:pointer">${t.registration_number}</div>`,
          iconAnchor: [30, 12],
        });
        const m = Lx.marker([lat, lng], { icon })
          .addTo(map)
          .bindPopup(
            `<div style="font-family:sans-serif;font-size:12px;padding:4px;min-width:140px">
               <strong style="color:#1e3a5f;font-size:13px">${t.registration_number}</strong><br/>
               <span style="color:#64748b;font-size:11px">${t.location_address || 'GPS Positioned'}</span><br/>
               <span style="font-family:monospace;font-size:10px;color:#059669">${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
             </div>`
          );
        m.on('click', () => setSelectedTankerId(t.id));
        fleetMarkersRef.current.set(t.id, m);
      });

      if (validPoints.length > 0) {
        try {
          map.fitBounds(Lx.latLngBounds(validPoints).pad(0.25));
        } catch {
          // ignore
        }
      }

      setTimeout(() => map.invalidateSize(), 250);
    });

    return () => { mounted = false; };
  }, [showFleetMap, tankers]);

  // Aggregate KPIs
  const availableCount = tankers.filter((t) => t.status === 'AVAILABLE').length;
  const activeCount = tankers.filter((t) =>
    ['LOADING', 'LOADED', 'IN_TRANSIT'].includes(t.status)
  ).length;

  const expiredCount = tankers.filter((t) => getTankerCompliance(t).hasExpired).length;
  const expiringCount = tankers.filter((t) => getTankerCompliance(t).hasExpiringSoon).length;
  const warningCount = expiredCount + expiringCount;

  // Filter tankers
  const filteredTankers = tankers.filter((t) => {
    const comp = getTankerCompliance(t);

    let matchesStatus = true;
    if (selectedStatus === 'AVAILABLE') matchesStatus = t.status === 'AVAILABLE';
    else if (selectedStatus === 'ACTIVE') matchesStatus = ['LOADING', 'LOADED', 'IN_TRANSIT'].includes(t.status);
    else if (selectedStatus === 'MAINTENANCE') matchesStatus = t.status === 'MAINTENANCE';
    else if (selectedStatus === 'INACTIVE') matchesStatus = t.status === 'INACTIVE';

    let matchesCompliance = true;
    if (selectedCompliance === 'COMPLIANT') matchesCompliance = comp.isFullyCompliant;
    else if (selectedCompliance === 'EXPIRING') {
      matchesCompliance = comp.hasExpiringSoon;
    } else if (selectedCompliance === 'EXPIRED') {
      matchesCompliance = comp.hasExpired;
    }

    const matchesSearch =
      searchQuery === '' ||
      t.registration_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.driver_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.transporter?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesCompliance && matchesSearch;
  });

  const handleOpenAdd = () => {
    setEditingTanker(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (tanker: Tanker) => {
    setEditingTanker(tanker);
    setIsAddEditOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            Road Tanker Fleet Management
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Logistics registry, compartment capacities, and statutory safety inspection tracking
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowFleetMap((prev) => !prev)}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all border shadow-sm ${
              showFleetMap
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/20'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Radio className={`w-4 h-4 ${showFleetMap ? 'text-white animate-pulse' : 'text-emerald-600'}`} />
            <span>{showFleetMap ? 'Hide Fleet Radar' : 'Live Fleet Radar'}</span>
            {tankers.filter((t) => !!t.tracker_imei).length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  showFleetMap ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {tankers.filter((t) => !!t.tracker_imei).length} GPS
              </span>
            )}
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#2d5282] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Register Tanker</span>
          </button>
        </div>
      </div>

      {/* Fleet Overview KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Registered Fleet"
          value={`${tankers.length} Vehicles`}
          subtitle="Total fleet haulers"
          icon={Truck}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <KPICard
          title="Available for Loading"
          value={String(availableCount)}
          subtitle="Ready at dispatch bay"
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <KPICard
          title="In Transit / Loading"
          value={String(activeCount)}
          subtitle="Active delivery runs"
          icon={Activity}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <KPICard
          title="Compliance Warnings"
          value={String(warningCount)}
          subtitle={
            expiredCount > 0 && expiringCount > 0
              ? `${expiredCount} expired, ${expiringCount} near expiry`
              : expiredCount > 0
              ? `${expiredCount} expired / missing certs`
              : expiringCount > 0
              ? `${expiringCount} expiring within 30d`
              : 'All vehicles fully compliant'
          }
          icon={AlertTriangle}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          alert={expiredCount > 0}
        />
      </div>

      {/* Fleet Live GPS Radar Map Panel */}
      {showFleetMap && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Fleet Live GPS Radar (ProTrack365)</h3>
                <p className="text-[11px] text-gray-500">
                  Real-time GPS coordinates polling every 30 seconds • {trackedDevices.size} tanker(s) actively transmitting
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full w-fit">
              ● PROTRACK AUTO-SYNC ACTIVE
            </span>
          </div>

          <div
            ref={fleetMapContainerRef}
            className="w-full h-80 rounded-xl overflow-hidden border border-gray-200 shadow-inner z-0"
          />

          <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
            <span>Click any tanker badge on the map to open vehicle details and location telemetry.</span>
            <span className="font-mono text-xs text-gray-400">
              {tankers.filter((t) => !!t.tracker_imei).length} tracked vehicle(s) configured
            </span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Fleet' },
            { id: 'AVAILABLE', label: `Available (${availableCount})` },
            { id: 'ACTIVE', label: `Active (${activeCount})` },
            { id: 'MAINTENANCE', label: 'Maintenance' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                selectedStatus === tab.id
                  ? 'bg-[#1e3a5f] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Compliance Filter & Search */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-52">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plate, driver..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
            />
          </div>

          <select
            value={selectedCompliance}
            onChange={(e) => setSelectedCompliance(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
          >
            <option value="ALL">All Compliance</option>
            <option value="COMPLIANT">Fully Compliant</option>
            <option value="EXPIRING">Expiring Soon (≤30d)</option>
            <option value="EXPIRED">Expired / Missing</option>
          </select>

          <button
            onClick={loadData}
            title="Reload tankers"
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Fleet Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-600" />
            Fleet Registration & Inspection Registry
          </h3>
          <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-semibold">
            {filteredTankers.length} vehicle{filteredTankers.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading && tankers.length === 0 ? (
          <div className="p-6">
            <LoadingSkeleton count={4} type="row" />
          </div>
        ) : filteredTankers.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={Truck}
              title="No tankers found"
              description="No vehicles match your selected search or compliance filters."
              action={{
                label: 'Register Tanker',
                onClick: handleOpenAdd,
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Registration Plate</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Capacity & Layout</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Assigned Driver</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Insurance Expiry</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Safety Inspection</th>
                  <th className="px-5 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Status</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredTankers.map((t) => {
                  const comp = getTankerCompliance(t);

                  return (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td
                        className="px-5 py-3.5 cursor-pointer group"
                        onClick={() => setSelectedTankerId(t.id)}
                      >
                        <span className="font-extrabold text-gray-900 font-mono block text-sm group-hover:text-blue-600 transition-colors">
                          {t.registration_number}
                        </span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">
                          {t.transporter || 'Independent Transporter'}
                        </span>
                        {t.tracker_imei && (
                          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200/60">
                            <Radio className="w-2.5 h-2.5 text-emerald-600 animate-pulse" />
                            GPS: {t.location_address ? t.location_address.split(',')[0] : 'ProTrack Tracked'}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-bold text-gray-900 font-mono block">
                          {formatLitres(t.capacity_litres)}
                        </span>
                        <span className="text-[10px] text-gray-500 block">
                          {t.number_of_compartments} Compartment{t.number_of_compartments === 1 ? '' : 's'}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-gray-800 block">
                          {t.driver_name || 'Unassigned'}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono block">
                          {t.driver_phone || '—'}
                        </span>
                      </td>

                      {/* Insurance Expiry */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              comp.insuranceStatus === 'VALID'
                                ? 'bg-emerald-500'
                                : comp.insuranceStatus === 'EXPIRING_SOON'
                                ? 'bg-amber-500 animate-pulse'
                                : comp.insuranceStatus === 'NO_CERT'
                                ? 'bg-gray-400'
                                : 'bg-red-500'
                            }`}
                          />
                          <span className="text-gray-700 font-mono text-[11px]">
                            {t.insurance_expiry ? new Date(t.insurance_expiry).toLocaleDateString('en-KE') : 'No cert'}
                          </span>
                        </div>
                        {comp.daysToInsuranceExpiry !== null && comp.daysToInsuranceExpiry <= 30 && (
                          <span className={`text-[9px] font-bold block mt-0.5 ${
                            comp.daysToInsuranceExpiry < 0 ? 'text-red-600' : 'text-amber-600'
                          }`}>
                            {comp.daysToInsuranceExpiry < 0
                              ? `Expired (${Math.abs(comp.daysToInsuranceExpiry)}d ago)`
                              : `${comp.daysToInsuranceExpiry}d left`}
                          </span>
                        )}
                      </td>

                      {/* Inspection Expiry */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              comp.inspectionStatus === 'VALID'
                                ? 'bg-emerald-500'
                                : comp.inspectionStatus === 'EXPIRING_SOON'
                                ? 'bg-amber-500 animate-pulse'
                                : comp.inspectionStatus === 'NO_CERT'
                                ? 'bg-gray-400'
                                : 'bg-red-500'
                            }`}
                          />
                          <span className="text-gray-700 font-mono text-[11px]">
                            {t.inspection_expiry ? new Date(t.inspection_expiry).toLocaleDateString('en-KE') : 'No cert'}
                          </span>
                        </div>
                        {comp.daysToInspectionExpiry !== null && comp.daysToInspectionExpiry <= 30 && (
                          <span className={`text-[9px] font-bold block mt-0.5 ${
                            comp.daysToInspectionExpiry < 0 ? 'text-red-600' : 'text-amber-600'
                          }`}>
                            {comp.daysToInspectionExpiry < 0
                              ? `Expired (${Math.abs(comp.daysToInspectionExpiry)}d ago)`
                              : `${comp.daysToInspectionExpiry}d left`}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <StatusBadge status={t.status} />
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(t)}
                            title="Edit Vehicle Specs"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSelectedTankerId(t.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1e3a5f] text-white text-[11px] font-semibold hover:bg-[#2d5282] transition-colors shadow-sm"
                          >
                            <span>Details</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals & Drawer */}
      <AddEditTankerModal
        tanker={editingTanker}
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        onSuccess={loadData}
      />

      <TankerDetailDrawer
        tankerId={selectedTankerId}
        isOpen={selectedTankerId !== null}
        onClose={() => setSelectedTankerId(null)}
        onEdit={(tanker) => {
          setSelectedTankerId(null);
          handleOpenEdit(tanker);
        }}
      />
    </div>
  );
}
