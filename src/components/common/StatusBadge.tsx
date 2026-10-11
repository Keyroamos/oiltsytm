import { cn } from '../../utils/cn';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  className?: string;
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  // Generic
  ACTIVE: { label: 'Active', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  INACTIVE: { label: 'Inactive', classes: 'bg-gray-100 text-gray-600 border-gray-200' },
  MAINTENANCE: { label: 'Maintenance', classes: 'bg-amber-100 text-amber-700 border-amber-200' },

  // Orders
  DRAFT: { label: 'Draft', classes: 'bg-gray-100 text-gray-600 border-gray-200' },
  PENDING_APPROVAL: { label: 'Pending Approval', classes: 'bg-amber-100 text-amber-700 border-amber-200' },
  APPROVED: { label: 'Approved', classes: 'bg-blue-100 text-blue-700 border-blue-200' },
  ALLOCATED: { label: 'Allocated', classes: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  LOADING: { label: 'Loading', classes: 'bg-orange-100 text-orange-700 border-orange-200' },
  DISPATCHED: { label: 'Dispatched', classes: 'bg-purple-100 text-purple-700 border-purple-200' },
  COMPLETED: { label: 'Completed', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: 'Cancelled', classes: 'bg-red-100 text-red-600 border-red-200' },

  // Tankers
  AVAILABLE: { label: 'Available', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  LOADED: { label: 'Loaded', classes: 'bg-blue-100 text-blue-700 border-blue-200' },
  IN_TRANSIT: { label: 'In Transit', classes: 'bg-purple-100 text-purple-700 border-purple-200' },
  DELIVERED: { label: 'Delivered', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },

  // Receiving
  PENDING: { label: 'Pending', classes: 'bg-amber-100 text-amber-700 border-amber-200' },
  RECEIVED: { label: 'Received', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  REJECTED: { label: 'Rejected', classes: 'bg-red-100 text-red-600 border-red-200' },

  // Invoices
  ISSUED: { label: 'Issued', classes: 'bg-blue-100 text-blue-700 border-blue-200' },
  PARTIALLY_PAID: { label: 'Partially Paid', classes: 'bg-amber-100 text-amber-700 border-amber-200' },
  PAID: { label: 'Paid', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  OVERDUE: { label: 'Overdue', classes: 'bg-red-100 text-red-600 border-red-200' },

  // Dispatch
  ASSIGNED: { label: 'Assigned', classes: 'bg-blue-100 text-blue-700 border-blue-200' },

  // Stock
  NORMAL: { label: 'Normal', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  WARNING: { label: 'Warning', classes: 'bg-amber-100 text-amber-700 border-amber-200' },
  CRITICAL: { label: 'Critical', classes: 'bg-red-100 text-red-600 border-red-200' },
};

export function StatusBadge({ status, size = 'sm', className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, classes: 'bg-gray-100 text-gray-600 border-gray-200' };

  return (
    <span
      className={cn(
        'inline-flex items-center border font-medium rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        config.classes,
        className
      )}
    >
      {config.label}
    </span>
  );
}
