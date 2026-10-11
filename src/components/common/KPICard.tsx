import { type LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: {
    value: string;
    positive: boolean;
  };
  alert?: boolean;
  className?: string;
}

function getResponsiveValueFontSize(val: string): string {
  const len = (val || '').length;
  if (len > 18) return 'text-xs sm:text-sm font-bold';
  if (len > 14) return 'text-sm sm:text-base font-bold';
  if (len > 11) return 'text-base sm:text-lg font-bold';
  if (len > 8) return 'text-lg sm:text-xl font-bold';
  return 'text-2xl font-bold';
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBg = 'bg-blue-50',
  trend,
  alert = false,
  className,
}: KPICardProps) {
  const sizeClass = getResponsiveValueFontSize(value);

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow duration-200',
        alert && 'border-red-200 bg-red-50/30',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 leading-tight">{title}</p>
          <p
            className={cn(
              'text-gray-900 tracking-tight leading-snug whitespace-nowrap overflow-visible',
              sizeClass,
              alert && 'text-red-700'
            )}
            title={value}
          >
            {value}
          </p>
          {subtitle && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={cn(
                  'text-xs font-semibold',
                  trend.positive ? 'text-emerald-600' : 'text-red-500'
                )}
              >
                {trend.positive ? '▲' : '▼'} {trend.value}
              </span>
              <span className="text-xs text-gray-400">vs yesterday</span>
            </div>
          )}
        </div>
        <div className={cn('rounded-xl p-2.5 sm:p-3 flex-shrink-0', alert ? 'bg-red-100' : iconBg)}>
          <Icon className={cn('w-4 h-4 sm:w-5 sm:h-5', alert ? 'text-red-600' : iconColor)} />
        </div>
      </div>
    </div>
  );
}
