import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Fuel } from 'lucide-react';
import { formatLitres } from '../../utils/formatters';

const RADIAN = Math.PI / 180;

function CustomLabel({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: any) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

interface StockOverviewProps {
  data?: { name: string; value: number; color: string }[];
}

export function StockOverview({ data }: StockOverviewProps) {
  const chartData = (data || []).filter((d) => d.value > 0);
  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col justify-between">
      <div>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-800">Stock Overview</h3>
          <p className="text-xs text-gray-500 mt-0.5">Product distribution by volume</p>
        </div>

        {total === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center text-center p-4 text-gray-400">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-2">
              <Fuel className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-gray-700">No bulk stock recorded</p>
            <p className="text-[11px] text-gray-400 mt-1 max-w-[200px]">
              Inbound fuel receiving shipments will reflect inventory distribution here.
            </p>
          </div>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={CustomLabel}
                  outerRadius={85}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [formatLitres(Number(value)), 'Stock']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                />
                <Legend
                  formatter={(value) => <span style={{ fontSize: 12, color: '#374151' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <span className="text-gray-600 font-medium">{item.name}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-gray-800">{formatLitres(item.value)}</span>
                <span className="text-gray-400 ml-1">
                  ({((item.value / total) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100 font-semibold">
            <span className="text-gray-700">Total Stock</span>
            <span className="text-gray-900">{formatLitres(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
