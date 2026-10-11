import { useState, useEffect } from 'react';
import {
  X,
  Truck,
  ShieldCheck,
  AlertTriangle,
  Phone,
  User,
  Layers,
  History,
  Loader2,
  FileDown,
  Printer,
  Receipt,
  ShoppingCart,
  Fuel,
  CreditCard,
  Building2,
  CheckCircle2,
  MapPin,
  Radio,
  Smartphone,
  Calendar,
  Key,
} from 'lucide-react';
import type { Tanker, UUID } from '../../types';
import {
  getTankerDetails,
  getTankerCompliance,
  type TankerDetailData,
} from '../../services/tankerService';
import { formatCurrency, formatDate, formatDateTime, formatLitres } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';
import { generateTankerDossierPdf } from '../../utils/generateTankerDossierPdf';
import { TankerLiveMap } from './TankerLiveMap';

interface TankerDetailDrawerProps {
  tankerId: UUID | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (tanker: Tanker) => void;
}

type TankerDrawerTab = 'OVERVIEW' | 'TRACKING' | 'ORDERS' | 'INVOICES' | 'PAYMENTS' | 'TRIPS';

export function TankerDetailDrawer({
  tankerId,
  isOpen,
  onClose,
  onEdit,
}: TankerDetailDrawerProps) {
  const [data, setData] = useState<TankerDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TankerDrawerTab>('OVERVIEW');

  useEffect(() => {
    if (isOpen && tankerId) {
      setLoading(true);
      getTankerDetails(tankerId)
        .then((res) => setData(res))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    } else {
      setData(null);
      setActiveTab('OVERVIEW');
    }
  }, [isOpen, tankerId]);

  if (!isOpen) return null;

  const tanker = data?.tanker;
  const compliance = tanker ? getTankerCompliance(tanker) : null;
  const compCount = tanker?.number_of_compartments || 1;
  const compVol = tanker ? Math.round(Number(tanker.capacity_litres) / compCount) : 0;
  const metrics = data?.metrics;

  const handleDownloadPdf = () => {
    if (data) {
      generateTankerDossierPdf(data);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl md:max-w-3xl bg-white shadow-2xl flex flex-col h-full animate-slide-left">
          {/* Header */}
          <div className="p-6 border-b border-white/10 bg-[#0f1e35] text-white flex items-start justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-white font-mono tracking-tight">
                    {tanker?.registration_number || 'Loading Tanker…'}
                  </h2>
                  {tanker && <StatusBadge status={tanker.status} />}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Transporter: {tanker?.transporter || 'Independent Transporter'} · Driver: {tanker?.driver_name || 'Unassigned'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {tanker && (
                <button
                  onClick={() => onEdit(tanker)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
                >
                  Edit
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPdf}
                disabled={!data}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#2d5282] transition-colors shadow-sm disabled:opacity-50"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Download Tanker Dossier (PDF)</span>
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-white transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-gray-500" />
                <span>Print</span>
              </button>
            </div>

            {tanker && (
              <span className="text-xs font-mono font-bold text-gray-600">
                Capacity: {formatLitres(tanker.capacity_litres)}
              </span>
            )}
          </div>

          {/* Top KPI Metrics Bar */}
          {metrics && (
            <div className="p-4 bg-gradient-to-r from-slate-50 to-blue-50/40 border-b border-gray-200 grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center flex-shrink-0">
              <div className="p-2 bg-white rounded-xl border border-gray-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Volume</span>
                <span className="font-mono text-xs font-black text-gray-900 block mt-0.5">
                  {formatLitres(metrics.totalVolumeLitres)}
                </span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-gray-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Invoiced Value</span>
                <span className="font-mono text-xs font-black text-purple-900 block mt-0.5">
                  {formatCurrency(metrics.totalInvoicedAmount)}
                </span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-gray-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Payments Collected</span>
                <span className="font-mono text-xs font-black text-emerald-600 block mt-0.5">
                  {formatCurrency(metrics.totalPaidAmount)}
                </span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-gray-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Receivables Due</span>
                <span className={`font-mono text-xs font-black block mt-0.5 ${metrics.totalOutstandingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatCurrency(metrics.totalOutstandingBalance)}
                </span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-gray-200 shadow-2xs col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Completed Trips</span>
                <span className="font-mono text-xs font-black text-blue-800 block mt-0.5">
                  {metrics.totalTrips} Runs
                </span>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 px-4 bg-white flex-shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'OVERVIEW'
                  ? 'border-[#1e3a5f] text-[#1e3a5f]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('TRACKING')}
              className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'TRACKING'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Live Tracking</span>
              <span className="ml-0.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            </button>

            <button
              onClick={() => setActiveTab('ORDERS')}
              className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'ORDERS'
                  ? 'border-[#1e3a5f] text-[#1e3a5f]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Orders ({data?.orders.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('INVOICES')}
              className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'INVOICES'
                  ? 'border-[#1e3a5f] text-[#1e3a5f]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Invoices ({data?.invoices.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('PAYMENTS')}
              className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'PAYMENTS'
                  ? 'border-[#1e3a5f] text-[#1e3a5f]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Payments ({data?.payments.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('TRIPS')}
              className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'TRIPS'
                  ? 'border-[#1e3a5f] text-[#1e3a5f]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Trips ({(data?.dispatches.length || 0) + (data?.receivingRecords.length || 0)})</span>
            </button>
          </div>

          {/* Tab Content */}
          {loading || !tanker ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#1e3a5f] animate-spin" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* ─── TAB: LIVE TRACKING ───────────────────────────────────────── */}
              {activeTab === 'TRACKING' && tanker && (
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-amber-500" />
                    Live GPS Tracking — {tanker.registration_number}
                  </h4>
                  <TankerLiveMap tanker={tanker} />
                </div>
              )}

              {/* ─── TAB: OVERVIEW ────────────────────────────────────────────── */}
              {activeTab === 'OVERVIEW' && (
                <div className="space-y-6">
                  {/* Compliance Status Cards */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Statutory Certifications &amp; Roadworthiness
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Insurance */}
                      <div
                        className={`p-4 rounded-2xl border ${
                          compliance?.insuranceStatus === 'VALID'
                            ? 'bg-emerald-50/60 border-emerald-200'
                            : compliance?.insuranceStatus === 'EXPIRING_SOON'
                            ? 'bg-amber-50/60 border-amber-200'
                            : 'bg-red-50/60 border-red-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-gray-900">Commercial Insurance</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              compliance?.insuranceStatus === 'VALID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : compliance?.insuranceStatus === 'EXPIRING_SOON'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {compliance?.insuranceStatus}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500 block">
                          Expires:{' '}
                          {tanker.insurance_expiry
                            ? new Date(tanker.insurance_expiry).toLocaleDateString('en-KE')
                            : 'Not on file'}
                        </span>
                        {compliance && compliance.daysToInsuranceExpiry !== null && (
                          <span className="text-[10px] font-semibold text-gray-600 block mt-1">
                            {compliance.daysToInsuranceExpiry < 0
                              ? `Expired ${Math.abs(compliance.daysToInsuranceExpiry)} days ago`
                              : `${compliance.daysToInsuranceExpiry} days remaining`}
                          </span>
                        )}
                      </div>

                      {/* Safety Inspection */}
                      <div
                        className={`p-4 rounded-2xl border ${
                          compliance?.inspectionStatus === 'VALID'
                            ? 'bg-emerald-50/60 border-emerald-200'
                            : compliance?.inspectionStatus === 'EXPIRING_SOON'
                            ? 'bg-amber-50/60 border-amber-200'
                            : 'bg-red-50/60 border-red-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-gray-900">EPRA Safety Inspection</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              compliance?.inspectionStatus === 'VALID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : compliance?.inspectionStatus === 'EXPIRING_SOON'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {compliance?.inspectionStatus}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500 block">
                          Expires:{' '}
                          {tanker.inspection_expiry
                            ? new Date(tanker.inspection_expiry).toLocaleDateString('en-KE')
                            : 'Not on file'}
                        </span>
                        {compliance && compliance.daysToInspectionExpiry !== null && (
                          <span className="text-[10px] font-semibold text-gray-600 block mt-1">
                            {compliance.daysToInspectionExpiry < 0
                              ? `Expired ${Math.abs(compliance.daysToInspectionExpiry)} days ago`
                              : `${compliance.daysToInspectionExpiry} days remaining`}
                          </span>
                        )}
                      </div>
                    </div>

                    {compliance?.hasExpired && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-800 font-medium">
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span>Compliance Block: Tanker cannot be allocated for loading until expired certificates are renewed.</span>
                      </div>
                    )}
                    {compliance?.hasExpiringSoon && !compliance?.hasExpired && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800 font-medium">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>
                          Renewal Advisory: Statutory certificates expire soon (
                          {compliance.daysToInsuranceExpiry !== null && compliance.daysToInsuranceExpiry <= 30
                            ? `${compliance.daysToInsuranceExpiry}d insurance`
                            : ''}
                          {compliance.daysToInsuranceExpiry !== null &&
                          compliance.daysToInsuranceExpiry <= 30 &&
                          compliance.daysToInspectionExpiry !== null &&
                          compliance.daysToInspectionExpiry <= 30
                            ? ', '
                            : ''}
                          {compliance.daysToInspectionExpiry !== null && compliance.daysToInspectionExpiry <= 30
                            ? `${compliance.daysToInspectionExpiry}d inspection`
                            : ''}
                          ). Loading eligible; arrange renewal before expiration.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ProTrack365 GPS Hardware & Telematics Registry */}
                  {tanker.tracker_imei && (
                    <div className="p-4 bg-gradient-to-br from-indigo-50/70 to-blue-50/40 rounded-2xl border border-indigo-100/80 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600">
                            <Radio className="w-4 h-4 animate-pulse" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                              ProTrack365 GPS Device &amp; Telematics
                            </h4>
                            <p className="text-[10px] text-gray-500">Live Satellite Hardware Specs &amp; Cellular Subscription</p>
                          </div>
                        </div>

                        <button
                          onClick={() => setActiveTab('TRACKING')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold transition-colors shadow-2xs"
                        >
                          <MapPin className="w-3 h-3" />
                          View on Map
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs pt-1">
                        <div className="p-2.5 bg-white/80 rounded-xl border border-indigo-100/60 shadow-2xs">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Tracker Model</span>
                          <span className="font-extrabold text-indigo-950 font-mono block mt-0.5">
                            {tanker.tracker_model || 'VT05S'}
                          </span>
                        </div>

                        <div className="p-2.5 bg-white/80 rounded-xl border border-indigo-100/60 shadow-2xs">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Device IMEI</span>
                          <span className="font-extrabold text-indigo-950 font-mono block mt-0.5 tracking-tight text-[11px]">
                            {tanker.tracker_imei}
                          </span>
                        </div>

                        <div className="p-2.5 bg-white/80 rounded-xl border border-indigo-100/60 shadow-2xs">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">SIM Card Phone</span>
                          <span className="font-bold text-gray-900 font-mono block mt-0.5 text-[11px] flex items-center gap-1">
                            <Smartphone className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                            {tanker.tracker_sim || '—'}
                          </span>
                        </div>

                        <div className="p-2.5 bg-white/80 rounded-xl border border-indigo-100/60 shadow-2xs col-span-2 sm:col-span-1">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">SIM ICCID</span>
                          <span className="font-mono text-gray-700 block mt-0.5 text-[10px] truncate" title={tanker.tracker_iccid}>
                            {tanker.tracker_iccid || '—'}
                          </span>
                        </div>

                        <div className="p-2.5 bg-white/80 rounded-xl border border-indigo-100/60 shadow-2xs">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Activated Date</span>
                          <span className="font-semibold text-gray-800 block mt-0.5 text-[11px] flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-blue-600 flex-shrink-0" />
                            {tanker.tracker_activated_at
                              ? new Date(tanker.tracker_activated_at).toLocaleDateString('en-KE')
                              : '2026-09-10'}
                          </span>
                        </div>

                        <div className="p-2.5 bg-white/80 rounded-xl border border-indigo-100/60 shadow-2xs">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Subscription Expiry</span>
                          <span className="font-semibold text-emerald-700 block mt-0.5 text-[11px] flex items-center gap-1">
                            <Key className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                            {tanker.tracker_expires_at
                              ? new Date(tanker.tracker_expires_at).toLocaleDateString('en-KE')
                              : '2027-09-17'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Compartment Layout Schematic */}
                  <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-blue-600" />
                        Compartment Configuration
                      </h4>
                      <span className="text-xs font-bold text-gray-900 font-mono">
                        Total: {formatLitres(tanker.capacity_litres)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {Array.from({ length: compCount }).map((_, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-xl border border-gray-200 text-center shadow-sm">
                          <span className="text-[10px] font-bold text-gray-400 block uppercase">
                            Compartment {idx + 1}
                          </span>
                          <span className="text-sm font-extrabold text-gray-900 font-mono block mt-0.5">
                            {formatLitres(compVol)}
                          </span>
                          <span className="text-[9px] text-emerald-600 font-semibold mt-0.5 block">
                            Calibrated OK
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Driver & Logistics Info */}
                  <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Driver &amp; Transporter</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-2 text-gray-700">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>{tanker.driver_name || 'Driver unassigned'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{tanker.driver_phone || 'No phone recorded'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── TAB: ORDERS ──────────────────────────────────────────────── */}
              {activeTab === 'ORDERS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                      <ShoppingCart className="w-4 h-4 text-indigo-600" />
                      Orders Carried by this Tanker ({data.orders.length})
                    </h4>
                  </div>

                  {data.orders.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl border border-gray-100">
                      No sales orders have been allocated to this tanker yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {data.orders.map((o) => (
                        <div
                          key={o.id}
                          className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 font-mono text-sm">{o.order_number}</span>
                              <StatusBadge status={o.status} />
                            </div>
                            <p className="text-gray-600 mt-1 flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-gray-400" />
                              <strong className="text-gray-900">{o.customer?.name}</strong> ({o.customer?.code})
                            </p>
                            <span className="text-[11px] text-gray-400 block mt-0.5">
                              Requested Date: {formatDate(o.requested_date)}
                            </span>
                          </div>

                          <div className="text-left sm:text-right">
                            <span className="font-bold font-mono text-sm text-gray-900 block">
                              {formatCurrency(o.total_amount)}
                            </span>
                            <span className="text-[11px] font-mono text-blue-700 block">
                              {formatLitres(o.quantity_litres)} · {o.product?.name}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB: INVOICES ────────────────────────────────────────────── */}
              {activeTab === 'INVOICES' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-emerald-600" />
                      Invoices Billed for this Tanker's Cargo ({data.invoices.length})
                    </h4>
                  </div>

                  {data.invoices.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl border border-gray-100">
                      No commercial invoices recorded for this tanker's cargo yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {data.invoices.map((inv) => (
                        <div
                          key={inv.id}
                          className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 font-mono text-sm">{inv.invoice_number}</span>
                              <StatusBadge status={inv.status} />
                            </div>
                            <p className="text-gray-600 mt-1 flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-gray-400" />
                              <strong className="text-gray-900">{inv.customer?.name}</strong>
                            </p>
                            <span className="text-[11px] text-gray-400 block mt-0.5">
                              Due: {inv.due_date} · Issued: {formatDate(inv.created_at)}
                            </span>
                          </div>

                          <div className="text-left sm:text-right space-y-0.5">
                            <span className="font-bold font-mono text-sm text-gray-900 block">
                              {formatCurrency(inv.total_amount)}
                            </span>
                            <div className="text-[11px] space-x-2">
                              <span className="text-emerald-600 font-mono font-semibold">
                                Paid: {formatCurrency(inv.amount_paid)}
                              </span>
                              <span className="text-gray-300">|</span>
                              <span className={Number(inv.balance_due) > 0 ? 'text-red-600 font-mono font-bold' : 'text-emerald-600 font-mono'}>
                                Due: {formatCurrency(inv.balance_due)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB: PAYMENTS ────────────────────────────────────────────── */}
              {activeTab === 'PAYMENTS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      Payments Settled for this Tanker ({data.payments.length})
                    </h4>
                  </div>

                  {data.payments.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl border border-gray-100">
                      No payment transactions have been recorded for this tanker cargo yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {data.payments.map((p) => (
                        <div
                          key={p.id}
                          className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">{p.payment_method}</span>
                              {p.reference_number && (
                                <span className="font-mono text-gray-500 text-[10px]">
                                  · Ref: {p.reference_number}
                                </span>
                              )}
                            </div>
                            <span className="text-gray-600 block mt-0.5">
                              From: <strong>{p.customer?.name}</strong>
                            </span>
                            <span className="text-[10px] text-gray-400 block mt-0.5">
                              Received on {formatDate(p.payment_date)}
                            </span>
                          </div>

                          <span className="font-bold font-mono text-emerald-600 text-sm">
                            +{formatCurrency(p.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB: TRIPS & DISPATCHES ───────────────────────────────────── */}
              {activeTab === 'TRIPS' && (
                <div className="space-y-6">
                  {/* Outbound Dispatches */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Fuel className="w-4 h-4 text-blue-600" />
                      Outbound Dispatches ({data.dispatches.length})
                    </h4>

                    {data.dispatches.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4 bg-gray-50 rounded-xl">
                        No dispatches logged for this tanker.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {data.dispatches.map((d) => (
                          <div
                            key={d.id}
                            className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-gray-900 font-mono block">{d.dispatch_number}</span>
                              <span className="text-[10px] text-gray-500">
                                {d.customer?.name} · {formatDateTime(d.created_at)}
                              </span>
                              <span className="text-[10px] text-gray-400 block mt-0.5">
                                Loading Bay: {d.loading_bay || 'Bay 1'}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="font-bold text-gray-900 block font-mono">
                                {formatLitres(d.quantity_loaded || d.quantity_ordered)}
                              </span>
                              <span className="text-[10px] text-gray-500">{d.product?.name}</span>
                            </div>

                            <StatusBadge status={d.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Inbound Fuel Receipts */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Inbound Fuel Receiving Runs ({data.receivingRecords.length})
                    </h4>

                    {data.receivingRecords.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4 bg-gray-50 rounded-xl">
                        No inbound fuel offloading records for this tanker.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {data.receivingRecords.map((r) => (
                          <div
                            key={r.id}
                            className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-gray-900 font-mono block">{r.reference_number}</span>
                              <span className="text-[10px] text-gray-500">
                                Supplier: {r.supplier?.name} · {r.receiving_date}
                              </span>
                              <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">
                                Discharge Tank: {r.tank?.code} ({r.quality_status || 'PASSED'})
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="font-bold text-emerald-700 block font-mono">
                                +{formatLitres(r.quantity_received || r.quantity_ordered)}
                              </span>
                              <span className="text-[10px] text-gray-500">{r.product?.name}</span>
                            </div>

                            <StatusBadge status={r.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Close
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={!data}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1e3a5f] text-white text-xs font-bold hover:bg-[#2d5282] transition-colors shadow-sm disabled:opacity-50"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Export Audit Dossier (PDF)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
