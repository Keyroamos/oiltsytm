import { useState, useEffect, type FormEvent } from 'react';
import { X, Truck, Loader2, ShieldCheck, Radio } from 'lucide-react';
import type { Tanker, TankerStatus } from '../../types';
import { createTanker, updateTanker } from '../../services/tankerService';
import { useAuth } from '../../context/AuthContext';
import { DriverCombobox } from '../common/DriverCombobox';

interface AddEditTankerModalProps {
  tanker: Tanker | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddEditTankerModal({
  tanker,
  isOpen,
  onClose,
  onSuccess,
}: AddEditTankerModalProps) {
  const { user } = useAuth();
  const isEdit = !!tanker;

  const [regNumber, setRegNumber] = useState('');
  const [capacity, setCapacity] = useState('45000');
  const [compartments, setCompartments] = useState('3');
  const [transporter, setTransporter] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [status, setStatus] = useState<TankerStatus>('AVAILABLE');
  const [insuranceExpiry, setInsuranceExpiry] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [inspectionExpiry, setInspectionExpiry] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split('T')[0];
  });
  const [trackerImei, setTrackerImei] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (tanker) {
        setRegNumber(tanker.registration_number);
        setCapacity(String(tanker.capacity_litres));
        setCompartments(String(tanker.number_of_compartments));
        setTransporter(tanker.transporter || '');
        setDriverName(tanker.driver_name || '');
        setDriverPhone(tanker.driver_phone || '');
        setStatus(tanker.status);
        setInsuranceExpiry(tanker.insurance_expiry || '');
        setInspectionExpiry(tanker.inspection_expiry || '');
        setTrackerImei(tanker.tracker_imei || '');
      } else {
        setRegNumber('');
        setCapacity('45000');
        setCompartments('3');
        setTransporter('');
        setDriverName('');
        setDriverPhone('+254');
        setStatus('AVAILABLE');
        setTrackerImei('');
      }
      setError(null);
    }
  }, [isOpen, tanker]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const capNum = parseFloat(capacity);
    const compNum = parseInt(compartments, 10);

    if (!regNumber.trim()) {
      setError('Registration plate number is required.');
      return;
    }

    if (isNaN(capNum) || capNum <= 0) {
      setError('Please provide a valid tanker capacity in litres.');
      return;
    }

    setLoading(true);
    try {
      if (isEdit && tanker) {
        await updateTanker(
          tanker.id,
          {
            registration_number: regNumber.trim().toUpperCase(),
            capacity_litres: capNum,
            number_of_compartments: compNum || 1,
            transporter: transporter.trim() || undefined,
            driver_name: driverName.trim() || undefined,
            driver_phone: driverPhone.trim() || undefined,
            status,
            insurance_expiry: insuranceExpiry || undefined,
            inspection_expiry: inspectionExpiry || undefined,
            tracker_imei: trackerImei.trim() || undefined,
          },
          user?.id
        );
      } else {
        await createTanker(
          {
            registration_number: regNumber.trim().toUpperCase(),
            capacity_litres: capNum,
            number_of_compartments: compNum || 1,
            transporter: transporter.trim() || undefined,
            driver_name: driverName.trim() || undefined,
            driver_phone: driverPhone.trim() || undefined,
            status,
            insurance_expiry: insuranceExpiry || undefined,
            inspection_expiry: inspectionExpiry || undefined,
            tracker_imei: trackerImei.trim() || undefined,
          },
          user?.id
        );
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save road tanker profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {isEdit ? 'Edit Tanker Profile' : 'Register Road Tanker'}
              </h3>
              <p className="text-xs text-gray-500">Fleet vehicle specs and statutory safety certificates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Registration Plate & Transporter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Registration Plate *</label>
              <input
                type="text"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                placeholder="e.g. KDG 123A"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Transporter Company</label>
              <input
                type="text"
                value={transporter}
                onChange={(e) => setTransporter(e.target.value)}
                placeholder="e.g. XYZ Logistics Ltd"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              />
            </div>
          </div>

          {/* Capacity & Compartments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Total Capacity (Litres) *</label>
              <input
                type="number"
                step="any"
                min="0"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Number of Compartments</label>
              <input
                type="number"
                min="1"
                max="8"
                value={compartments}
                onChange={(e) => setCompartments(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              />
            </div>
          </div>

          {/* Driver Info with Searchable Combobox */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            <DriverCombobox
              value={driverName}
              onChange={(name, phone) => {
                setDriverName(name);
                if (phone) {
                  setDriverPhone(phone);
                }
              }}
              label="Assigned Driver"
              placeholder="Select or search driver..."
            />

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Driver Phone</label>
              <input
                type="tel"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="+254 711 000 000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              />
            </div>
          </div>

          {/* Statutory Compliance Dates */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
            <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Statutory Certification & Compliance
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Insurance Expiry Date</label>
                <input
                  type="date"
                  value={insuranceExpiry}
                  onChange={(e) => setInsuranceExpiry(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">EPRA / Safety Inspection Expiry</label>
                <input
                  type="date"
                  value={inspectionExpiry}
                  onChange={(e) => setInspectionExpiry(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                />
              </div>
            </div>
            <p className="text-[10px] text-gray-400">
              Tankers with expired insurance or inspection certificates cannot be allocated for loading.
            </p>
          </div>

          {/* ProTrack365 GPS Tracker IMEI */}
          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-2">
            <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-indigo-600" />
              ProTrack365 GPS Tracker
            </span>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                Device IMEI (15-digit)
              </label>
              <input
                type="text"
                value={trackerImei}
                onChange={(e) => setTrackerImei(e.target.value.replace(/\D/g, '').slice(0, 15))}
                placeholder="e.g. 358899123456789"
                maxLength={15}
                className="w-full px-3 py-2 rounded-xl border border-indigo-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400"
              />
            </div>
            <p className="text-[10px] text-gray-500">
              Enter the 15-digit IMEI from your ProTrack365 GPS device installed on this vehicle. Once set, the system will automatically pull live GPS coordinates every 30 seconds.
            </p>
            {trackerImei.length > 0 && trackerImei.length < 15 && (
              <p className="text-[10px] text-amber-600 font-semibold">
                ⚠ IMEI should be exactly 15 digits ({15 - trackerImei.length} more needed)
              </p>
            )}
            {trackerImei.length === 15 && (
              <p className="text-[10px] text-emerald-600 font-semibold">
                ✓ Valid IMEI format — tracker will be linked on save
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Operational Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TankerStatus)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
            >
              <option value="AVAILABLE">Available for Loading</option>
              <option value="LOADING">Currently Loading</option>
              <option value="LOADED">Loaded & Staged</option>
              <option value="IN_TRANSIT">In Transit to Customer</option>
              <option value="DELIVERED">Delivered</option>
              <option value="MAINTENANCE">Maintenance / Workshop</option>
              <option value="INACTIVE">Decommissioned / Inactive</option>
            </select>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#2d5282] transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Truck className="w-3.5 h-3.5" />
                  {isEdit ? 'Update Tanker' : 'Register Vehicle'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
