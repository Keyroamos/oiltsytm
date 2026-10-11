import { calcUtilization, formatLitres, utilizationBarColor, utilizationColor } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import { AlertTriangle, Layers, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Tank } from '../../types';

interface TankUtilizationProps {
  tanks?: Tank[];
}

export function TankUtilization({ tanks }: TankUtilizationProps) {
  const tankList = tanks || [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Tank Utilization</h3>
            <p className="text-xs text-gray-500 mt-0.5">Real-time tank levels</p>
          </div>
          <Link
            to="/tanks"
            className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            View all →
          </Link>
        </div>

        {tankList.length === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center text-center p-4 text-gray-400">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-2">
              <Layers className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-gray-700">No tanks commissioned</p>
            <p className="text-[11px] text-gray-400 mt-1 max-w-[200px]">
              Set up calibrated bulk storage tanks to monitor live ullage and fill levels.
            </p>
            <Link
              to="/tanks"
              className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#2d5282] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Commission Tank</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {tankList.map((tank) => {
              const pct = calcUtilization(tank.current_stock_litres, tank.capacity_litres);
              const isLow = pct < 20 && Number(tank.capacity_litres) > 0;
              const barColor = utilizationBarColor(pct);
              const textColor = utilizationColor(pct);

              return (
                <div key={tank.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-700">{tank.code}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500">{tank.product?.name}</span>
                      {isLow && (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      )}
                    </div>
                    <span className={cn('text-xs font-bold', textColor)}>{pct}%</span>
                  </div>

                  <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', barColor)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-gray-400">
                      {formatLitres(tank.current_stock_litres)}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Cap: {formatLitres(tank.capacity_litres)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
