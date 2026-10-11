import { cn } from '../../utils/cn';

interface LoadingSkeletonProps {
  className?: string;
  count?: number;
  type?: 'card' | 'row' | 'text';
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse bg-gray-200 rounded-lg', className)} />
  );
}

export function LoadingSkeleton({ className, count = 1, type = 'card' }: LoadingSkeletonProps) {
  const items = Array.from({ length: count });

  if (type === 'row') {
    return (
      <div className={cn('space-y-3', className)}>
        {items.map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-lg">
            <SkeletonBlock className="w-10 h-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-4 w-2/3" />
              <SkeletonBlock className="h-3 w-1/2" />
            </div>
            <SkeletonBlock className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'text') {
    return (
      <div className={cn('space-y-2', className)}>
        {items.map((_, i) => (
          <SkeletonBlock key={i} className="h-4 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {items.map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-3">
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="h-7 w-32" />
              <SkeletonBlock className="h-3 w-20" />
            </div>
            <SkeletonBlock className="w-12 h-12 rounded-xl flex-shrink-0 ml-3" />
          </div>
        </div>
      ))}
    </div>
  );
}
