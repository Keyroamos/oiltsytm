/**
 * Format a number as Kenyan Shillings
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format litres with commas
 */
export function formatLitres(litres: number): string {
  return new Intl.NumberFormat('en-KE').format(Math.round(litres)) + ' L';
}

/**
 * Format a number with commas (no unit)
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-KE').format(value);
}

/**
 * Calculate utilization percentage
 */
export function calcUtilization(current: number, capacity: number): number {
  if (capacity === 0) return 0;
  return Math.min(100, Math.round((current / capacity) * 100));
}

/**
 * Format a date string to a human-readable format
 */
export function formatDate(dateStr: string, opts?: Intl.DateTimeFormatOptions): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-KE', opts ?? { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Format a datetime string to date + time
 */
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Return today's date as YYYY-MM-DD
 */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Determine colour class based on utilization %
 */
export function utilizationColor(pct: number): string {
  if (pct >= 90) return 'text-red-500';
  if (pct >= 75) return 'text-amber-500';
  return 'text-emerald-500';
}

/**
 * Determine progress bar color based on utilization %
 */
export function utilizationBarColor(pct: number): string {
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 75) return 'bg-amber-500';
  return 'bg-emerald-500';
}
