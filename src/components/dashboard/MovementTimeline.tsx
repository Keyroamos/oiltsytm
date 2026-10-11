import { cn } from '../../utils/cn';
import { type MovementEvent } from '../../types';
import { ArrowDownToLine, Truck, CheckCircle2, Clock, Package, Activity } from 'lucide-react';

const typeConfig: Record<MovementEvent['type'], { icon: React.ElementType; color: string; bg: string }> = {
  RECEIPT: { icon: ArrowDownToLine, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  LOADING: { icon: Package, color: 'text-blue-600', bg: 'bg-blue-100' },
  DISPATCH: { icon: Truck, color: 'text-purple-600', bg: 'bg-purple-100' },
  ADJUSTMENT: { icon: CheckCircle2, color: 'text-amber-600', bg: 'bg-amber-100' },
};

const statusConfig: Record<MovementEvent['status'], { label: string; classes: string; dot: string }> = {
  COMPLETED: { label: 'Completed', classes: 'text-emerald-600', dot: 'bg-emerald-500' },
  IN_PROGRESS: { label: 'In Progress', classes: 'text-blue-600', dot: 'bg-blue-500 animate-pulse' },
  PENDING: { label: 'Pending', classes: 'text-amber-600', dot: 'bg-amber-500' },
};

interface MovementTimelineProps {
  movements?: MovementEvent[];
}

export function MovementTimeline({ movements }: MovementTimelineProps) {
  const events = movements || [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Today's Movements</h3>
            <p className="text-xs text-gray-500 mt-0.5">Live operational timeline</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Live</span>
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse ml-0.5" />
          </div>
        </div>

        {events.length === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center text-center p-4 text-gray-400">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-2">
              <Activity className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-gray-700">No operational movements today</p>
            <p className="text-[11px] text-gray-400 mt-1 max-w-[220px]">
              Inbound fuel receiving, loading bay dispatches, and tank dip adjustments will stream here.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-100" />

            <div className="space-y-5">
              {events.map((event) => {
                const { icon: Icon, color, bg } = typeConfig[event.type] || typeConfig.DISPATCH;
                const { label, classes, dot } = statusConfig[event.status] || statusConfig.COMPLETED;

                return (
                  <div key={event.id} className="flex gap-4 relative">
                    {/* Icon bubble */}
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 z-10 border-2 border-white shadow-sm', bg)}>
                      <Icon className={cn('w-4 h-4', color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="text-xs text-gray-700 leading-relaxed">{event.description}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-gray-400">{event.time}</span>
                        <div className="flex items-center gap-1">
                          <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />
                          <span className={cn('text-[10px] font-medium', classes)}>{label}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
