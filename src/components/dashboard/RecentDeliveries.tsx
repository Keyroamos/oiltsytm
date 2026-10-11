import { StatusBadge } from '../common/StatusBadge';
import { formatLitres } from '../../utils/formatters';
import { Link } from 'react-router-dom';
import { Truck } from 'lucide-react';
import type { Dispatch } from '../../types';

interface RecentDeliveriesProps {
  deliveries?: Partial<Dispatch>[];
}

export function RecentDeliveries({ deliveries }: RecentDeliveriesProps) {
  const deliveryList = deliveries || [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Customer Outturns &amp; Deliveries</h3>
          <p className="text-xs text-gray-500 mt-0.5">Wholesale customer delivery &amp; outturn tracking</p>
        </div>
        <Link
          to="/outturns"
          className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          View all →
        </Link>
      </div>

      {deliveryList.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          <div className="w-10 h-10 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-2">
            <Truck className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-gray-700">No delivery operations recorded</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Outbound customer deliveries and outturns will be listed here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Vehicle / Ref</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Customer</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Product</th>
                <th className="text-right px-5 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Quantity</th>
                <th className="text-center px-5 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {deliveryList.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <span className="font-semibold text-gray-800 font-mono">
                      {d.tanker?.registration_number ?? '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-gray-700">{d.customer?.name ?? '—'}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          background:
                            d.product?.code === 'AGO'
                              ? '#f59e0b'
                              : d.product?.code === 'PMS'
                              ? '#3b82f6'
                              : '#8b5cf6',
                        }}
                      />
                      <span className="text-gray-700">{d.product?.name ?? '—'}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-800">
                    {d.quantity_loaded != null
                      ? formatLitres(d.quantity_loaded)
                      : d.quantity_ordered != null
                      ? formatLitres(d.quantity_ordered)
                      : '—'}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <StatusBadge status={d.status ?? 'PENDING'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
