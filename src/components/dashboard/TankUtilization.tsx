import { Link } from 'react-router-dom';
import { Database, ArrowRight, AlertTriangle } from 'lucide-react';
import type { Tank } from '../../types';
import {
  calcUtilization,
  formatLitres,
  utilizationBarColor,
  utilizationColor,
} from '../../utils/formatters';

interface TankUtilizationProps {
  tanks?: Tank[];
}

export function TankUtilization({ tanks }: TankUtilizationProps) {
  const tankList = tanks || [];

  const totalCurrent = tankList.reduce(
    (sum, t) => sum + Number(t.current_stock_litres || 0),
    0
  );
  const totalCapacity = tankList.reduce(
    (sum, t) => sum + Number(t.capacity_litres || 0),
    0
  );
  const totalPct = calcUtilization(totalCurrent, totalCapacity);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Tank Utilization</h3>
            <p className="text-xs text-gray-500 mt-0.5">Live depot capacity & fill levels</p>
          </div>
          <Link
            to="/tanks"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {tankList.length === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center text-center p-4 text-gray-400">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-2">
              <Database className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-gray-700">No bulk tanks configured</p>
            <p className="text-[11px] text-gray-400 mt-1 max-w-[200px]">
              Add and configure fuel storage tanks to view real-time capacity and ullage.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
            {tankList.map((tank) => {
              const current = Number(tank.current_stock_litres || 0);
              const capacity = Number(tank.capacity_litres || 0);
              const minLevel = Number(tank.minimum_level_litres || 0);
              const pct = calcUtilization(current, capacity);
              const isBelowMin = minLevel > 0 && current <= minLevel;
              const ullage = Math.max(0, capacity - current);

              const prodCode = tank.product?.code || '';
              const badgeBg =
                prodCode === 'AGO'
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : prodCode === 'PMS'
                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200';

              return (
                <div
                  key={tank.id}
                  className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all text-xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800 font-mono">{tank.code}</span>
                      <span className="text-gray-500 truncate max-w-[110px]" title={tank.name}>
                        {tank.name}
                      </span>
                      {prodCode && (
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badgeBg}`}
                        >
                          {prodCode}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isBelowMin && (
                        <span title="Below minimum safety stock level">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        </span>
                      )}
                      <span className={`font-bold font-mono ${utilizationColor(pct)}`}>
                        {pct}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${utilizationBarColor(
                        pct
                      )}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Volume specs */}
                  <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono">
                    <span>
                      <strong className="text-gray-700 font-semibold">{formatLitres(current)}</strong>{' '}
                      / {formatLitres(capacity)}
                    </span>
                    <span className="text-gray-400">
                      Ullage: {formatLitres(ullage)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {tankList.length > 0 && totalCapacity > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
          <div className="text-gray-500">
            <span>Depot Total Fill: </span>
            <span className="font-semibold text-gray-800 font-mono">
              {formatLitres(totalCurrent)} / {formatLitres(totalCapacity)}
            </span>
          </div>
          <span className={`font-bold font-mono ${utilizationColor(totalPct)}`}>
            {totalPct}% utilized
          </span>
        </div>
      )}
    </div>
  );
}
