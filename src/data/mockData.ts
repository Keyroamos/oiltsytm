import type {
  DashboardKPIs,
  Tank,
  StockSummaryRow,
  MovementEvent,
  Dispatch,
} from '../types';

export const mockKPIs: DashboardKPIs = {
  totalStock: 0,
  todayReceived: 0,
  todayDispatched: 0,
  todaySales: 0,
  outstandingReceivables: 0,
  outstandingPayables: 0,
  activeTankers: 0,
  alertCount: 0,
};

export const mockTanks: Tank[] = [];
export const mockStockOverview: { name: string; value: number; color: string }[] = [];
export const mockStockSummary: StockSummaryRow[] = [];
export const mockMovements: MovementEvent[] = [];
export const mockRecentDeliveries: Partial<Dispatch>[] = [];
