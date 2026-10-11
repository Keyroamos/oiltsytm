import { StatusBadge } from '../common/StatusBadge';
import { formatLitres, formatNumber } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import type { StockSummaryRow } from '../../types';

interface StockSummaryTableProps {
  summary?: StockSummaryRow[];
}

export function StockSummaryTable({ summary }: StockSummaryTableProps) {
  const rows = summary || [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Stock Summary by Product</h3>
          <p className="text-xs text-gray-500 mt-0.5">Today's reconciliation snapshot</p>
        </div>
        <span className="text-[10px] bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-medium border border-blue-100">
          {new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="p-8 text-center text-xs text-gray-400">
          No inventory reconciliation rows available.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {[
                  'Product',
                  'Opening Stock',
                  'Received',
                  'Total In',
                  'Dispatched',
                  'Closing Stock',
                  'Variance',
                  'Var %',
                  'Status',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px] whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row) => {
                const isNegative = row.variance < 0;
                return (
                  <tr key={row.productCode} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{
                            background:
                              row.productCode === 'AGO'
                                ? '#f59e0b'
                                : row.productCode === 'PMS'
                                ? '#3b82f6'
                                : '#8b5cf6',
                          }}
                        />
                        <div>
                          <p className="font-semibold text-gray-800">{row.product}</p>
                          <p className="text-[10px] text-gray-400">{row.productCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-700 font-medium">
                      {formatLitres(row.openingStock)}
                    </td>
                    <td className="px-4 py-3.5 text-emerald-700 font-medium">
                      +{formatLitres(row.received)}
                    </td>
                    <td className="px-4 py-3.5 text-gray-700 font-semibold">
                      {formatLitres(row.totalIn)}
                    </td>
                    <td className="px-4 py-3.5 text-red-600 font-medium">
                      -{formatLitres(row.dispatched)}
                    </td>
                    <td className="px-4 py-3.5 text-gray-800 font-bold">
                      {formatLitres(row.closingStock)}
                    </td>
                    <td className={cn('px-4 py-3.5 font-semibold', isNegative ? 'text-red-600' : 'text-emerald-600')}>
                      {isNegative ? '' : '+'}{formatNumber(row.variance)} L
                    </td>
                    <td className={cn('px-4 py-3.5 font-semibold', isNegative ? 'text-red-600' : 'text-emerald-600')}>
                      {row.variancePct.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
