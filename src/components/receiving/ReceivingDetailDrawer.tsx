import {
  X,
  Download,
  Printer,
  CheckCircle2,
  Building2,
  Fuel,
  Gauge,
  ShieldCheck,
  DollarSign,
  Ship,
  Receipt,
} from 'lucide-react';
import type { ReceivingRecord } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { formatLitres, formatDateTime, formatCurrency } from '../../utils/formatters';
import { generateGrnPdf } from '../../utils/generateGrnPdf';

interface ReceivingDetailDrawerProps {
  record: ReceivingRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (record: ReceivingRecord) => void;
}

export function ReceivingDetailDrawer({
  record,
  isOpen,
  onClose,
  onConfirm,
}: ReceivingDetailDrawerProps) {
  if (!isOpen || !record) return null;

  const isPending = record.status === 'PENDING';
  const qty = Number(record.quantity_received || record.quantity_ordered || 0);
  const purchasePrice = Number(record.purchase_price || 0);

  const isTransit = record.market_type === 'TRANSIT' || record.currency === 'USD';
  const currency = isTransit ? 'USD' : (record.currency || 'KES');
  const unitSymbol = currency === 'USD' ? '$' : 'KES ';

  const formatMoney = (amount: number) => {
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(amount);
    }
    return formatCurrency(amount);
  };

  const baseTotal = Number(record.purchase_total || (purchasePrice * qty));
  const deliveryExpenses = Number(record.total_delivery_cost || 0);
  const totalLandedCost = Number(record.total_cost || (baseTotal + deliveryExpenses));

  const handleDownloadGrn = () => {
    generateGrnPdf(record);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col h-full animate-slide-left">
          {/* Header */}
          <div className="p-6 border-b border-white/10 bg-[#0f1e35] text-white flex items-start justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Ship className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-extrabold text-white font-mono tracking-tight">
                    {record.reference_number}
                  </h2>
                  <StatusBadge status={record.status} />
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isTransit
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {isTransit ? 'TRANSIT (USD)' : 'LOCAL (KES)'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Vessel: <strong className="text-white font-semibold">{record.vessel_name || 'Marine Consignment'}</strong> · Supplier: {record.supplier?.name} ({record.supplier?.code || 'SUP'})
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadGrn}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#2d5282] transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Official GRN (PDF)</span>
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-white transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-gray-500" />
                <span>Print Manifest</span>
              </button>
            </div>

            {isPending && onConfirm && (
              <button
                onClick={() => onConfirm(record)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm Vessel Intake</span>
              </button>
            )}
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Highlights Card */}
            <div className="p-4 rounded-2xl border bg-gradient-to-br from-blue-50/60 to-indigo-50/40 border-blue-200/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-800 flex items-center justify-center font-bold">
                  <Fuel className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-blue-800 block">
                    Marine Vessel Consignment
                  </span>
                  <span className="font-bold text-gray-900 text-sm">
                    {record.product?.name || 'Petroleum Fuel'} ({record.product?.code || 'FUEL'})
                  </span>
                  <span className="text-[11px] text-gray-500 block">
                    Target Vessel: <strong className="text-blue-700 font-mono">{record.tank?.name || 'Storage Vessel'} ({record.tank?.code || '—'})</strong>
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Volume Discharged</span>
                <span className="font-mono text-xl font-black text-gray-900 block">
                  +{formatLitres(qty)}
                </span>
              </div>
            </div>

            {/* Target Depot Storage Vessel Card */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Target Storage Vessel
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                  {record.tank?.code || 'STORAGE VESSEL'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Storage Vessel</span>
                  <span className="font-bold text-gray-900 block mt-0.5 truncate">
                    {record.tank?.name || 'Storage Vessel'}
                  </span>
                </div>

                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Vessel Capacity</span>
                  <span className="font-mono font-bold text-gray-900 block mt-0.5">
                    {record.tank ? formatLitres(record.tank.capacity_litres) : '—'}
                  </span>
                </div>

                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Designated Fuel</span>
                  <span className="font-semibold text-gray-900 block mt-0.5">
                    {record.product?.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Financials & Landed Cost Card */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Financials &amp; Landed Cost ({currency})
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-mono">
                  Currency: {currency}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Purchase Price / Litre</span>
                  <span className="font-mono text-sm font-black text-gray-900 block mt-0.5">
                    {purchasePrice > 0 ? `${unitSymbol}${purchasePrice.toLocaleString()}/L` : '—'}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Base Consignment Value</span>
                  <span className="font-mono text-sm font-black text-gray-800 block mt-0.5">
                    {formatMoney(baseTotal)}
                  </span>
                </div>

                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 font-bold uppercase block">Total Landed Cost</span>
                  <span className="font-mono text-sm font-black text-emerald-900 block mt-0.5">
                    {formatMoney(totalLandedCost)}
                  </span>
                </div>
              </div>
            </div>

            {/* Consignment Intake Expenses Breakdown */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-amber-600" />
                  Vessel Intake &amp; Discharge Expenses
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  Auto-saved to Expenses
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Demurrage</span>
                  <span className="font-mono font-bold text-gray-800 block mt-0.5">
                    {formatMoney(Number(record.demurrage_cost || 0))}
                  </span>
                </div>

                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Port Charges</span>
                  <span className="font-mono font-bold text-gray-800 block mt-0.5">
                    {formatMoney(Number(record.port_charges || 0))}
                  </span>
                </div>

                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Inspection Fees</span>
                  <span className="font-mono font-bold text-gray-800 block mt-0.5">
                    {formatMoney(Number(record.inspection_fees || 0))}
                  </span>
                </div>

                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Pumping / Discharge</span>
                  <span className="font-mono font-bold text-gray-800 block mt-0.5">
                    {formatMoney(Number(record.pumping_charges || 0))}
                  </span>
                </div>

                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Customs Duty</span>
                  <span className="font-mono font-bold text-gray-800 block mt-0.5">
                    {formatMoney(Number(record.customs_duty || 0))}
                  </span>
                </div>

                <div className="p-2.5 bg-amber-50/50 rounded-xl border border-amber-200">
                  <span className="text-[10px] text-amber-700 font-bold uppercase block">Total Expenses</span>
                  <span className="font-mono font-extrabold text-amber-900 block mt-0.5">
                    {formatMoney(deliveryExpenses)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quality & Safety Inspection */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-3 shadow-2xs">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-purple-600" />
                Vessel Discharge &amp; Quality Metrics
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Meter Reading / Dip</span>
                  <span className="font-mono font-bold text-gray-900 block mt-0.5">
                    {record.meter_reading ? `${record.meter_reading.toLocaleString()} L` : 'Recorded via dip gauge'}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Quality Certification</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 text-xs mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {record.quality_status || 'PASSED'}
                  </span>
                </div>
              </div>

              {record.notes && (record.notes.replace(/<!--[\s\S]*?-->/g, '').trim()) ? (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">
                    Discharge &amp; Consignment Notes
                  </span>
                  <p className="text-gray-700 leading-relaxed">
                    {record.notes.replace(/<!--[\s\S]*?-->/g, '').trim()}
                  </p>
                </div>
              ) : null}

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-mono">
                <span>Intake Timestamp:</span>
                <span>{formatDateTime(record.arrival_time || record.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
