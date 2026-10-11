import { type LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-2xl bg-gray-100 p-5 mb-4">
        <Icon className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-sm">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e3a5f] text-white text-sm font-medium hover:bg-[#2d5282] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
