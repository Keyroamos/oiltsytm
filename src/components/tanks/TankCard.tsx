import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Sliders } from 'lucide-react';
import type { Tank } from '../../types';
import { calcUtilization, formatLitres, utilizationBarColor, utilizationColor } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';

interface TankCardProps {
  tank: Tank;
  onAdjustStock: (tank: Tank) => void;
}

export function TankCard({ tank, onAdjustStock }: TankCardProps) {
  const current = Number(tank.current_stock_litres);
  const capacity = Number(tank.capacity_litres);
  const minLevel = Number(tank.minimum_level_litres);
  const pct = calcUtilization(current, capacity);
  const isBelowMin = current <= minLevel;
  const ullage = Math.max(0, capacity - current);

  const productBadgeColor =
    tank.product?.code === 'AGO'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : tank.product?.code === 'PMS'
      ? 'bg-blue-100 text-blue-800 border-blue-200'
      : 'bg-purple-100 text-purple-800 border-purple-200';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
      {/* Top row */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900 font-mono">{tank.code}</span>
              <StatusBadge status={tank.status} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{tank.name}</p>
          </div>

          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${productBadgeColor}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {tank.product?.name || 'Fuel'}
          </span>
        </div>

        {/* Low stock warning banner */}
        {isBelowMin && (
          <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl mb-3 text-amber-800 text-[11px]">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
            <span>Low Stock Warning: Below min level of {formatLitres(minLevel)}</span>
          </div>
        )}

        {/* Level and Capacity */}
        <div className="mt-2">
          <div className="flex items-baseline justify-between mb-1.5">
            <div className="flex items-baseline flex-wrap gap-1">
              <span className={`font-extrabold text-gray-900 font-mono tracking-tight whitespace-nowrap ${formatLitres(current).length > 10 ? 'text-xl' : 'text-2xl'}`}>
                {formatLitres(current)}
              </span>
              <span className="text-xs text-gray-400 whitespace-nowrap">/ {formatLitres(capacity)}</span>
            </div>
            <span className={`text-sm font-bold ${utilizationColor(pct)}`}>{pct}%</span>
          </div>

          {/* Progress bar */}
          <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-500 ${utilizationBarColor(pct)}`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Extra Specs */}
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-gray-100 text-gray-500">
            <div>
              <span className="text-gray-400 block">Available Ullage:</span>
              <span className="font-semibold text-gray-700">{formatLitres(ullage)}</span>
            </div>
            <div>
              <span className="text-gray-400 block">Current Price:</span>
              <span className="font-semibold text-gray-700">
                KES {tank.product?.current_price || 0}/L
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center gap-2 pt-4 mt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => onAdjustStock(tank)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold transition-colors"
        >
          <Sliders className="w-3.5 h-3.5 text-gray-500" />
          <span>Adjust Stock</span>
        </button>

        <Link
          to={`/tanks/${tank.id}`}
          className="inline-flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-[#1e3a5f] text-white hover:bg-[#2d5282] text-xs font-semibold transition-colors shadow-sm"
        >
          <span>Details</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
