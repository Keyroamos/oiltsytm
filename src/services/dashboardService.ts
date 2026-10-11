import { supabase } from '../lib/supabase';
import { getTankerCompliance } from './tankerService';
import type {
  Tank,
  Product,
  Dispatch,
  DashboardKPIs,
  StockSummaryRow,
  MovementEvent,
} from '../types';

export interface DashboardData {
  kpis: DashboardKPIs;
  tanks: Tank[];
  products: Product[];
  stockOverview: { name: string; value: number; color: string }[];
  recentDeliveries: Partial<Dispatch>[];
  movements: MovementEvent[];
  stockSummary: StockSummaryRow[];
}

const PRODUCT_COLORS: Record<string, string> = {
  AGO: '#f59e0b', // Diesel - Amber
  PMS: '#3b82f6', // Petrol - Blue
  LPG: '#10b981', // LPG Gas - Emerald Green
};

export async function fetchDashboardData(): Promise<DashboardData> {
  const todayStr = new Date().toISOString().split('T')[0];

  // Parallel fetch of all core operational tables from Supabase
  const [
    tanksRes,
    productsRes,
    tankersRes,
    customersRes,
    dispatchesRes,
    receivingRes,
    ordersRes,
    invoicesRes,
    txRes,
  ] = await Promise.all([
    supabase.from('tanks').select('*, product:products(*)').order('code'),
    supabase.from('products').select('*').eq('is_active', true).order('name'),
    supabase.from('tankers').select('*'),
    supabase.from('customers').select('*'),
    supabase
      .from('dispatches')
      .select('*, customer:customers(*), product:products(*), tanker:tankers(*), tank:tanks(*)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('receiving_records')
      .select('*, supplier:suppliers(*), product:products(*), tanker:tankers(*), tank:tanks(*)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('orders').select('*'),
    supabase.from('invoices').select('*'),
    supabase
      .from('stock_transactions')
      .select('*, product:products(*), tank:tanks(*)')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  if (tanksRes.error) console.error('Error loading tanks:', tanksRes.error);
  if (productsRes.error) console.error('Error loading products:', productsRes.error);

  // Real physical depot storage tanks (AGO, PMS, and LPG Bullet); exclude virtual/fleet tanks
  const tanks: Tank[] = ((tanksRes.data as Tank[]) || []).filter(
    (t) =>
      ['AGO', 'PMS', 'LPG'].includes(t.product?.code || '') &&
      !t.code.toUpperCase().includes('FLEET') &&
      !t.name.toLowerCase().includes('virtual')
  );
  const products: Product[] = ((productsRes.data as Product[]) || []).filter(p => ['AGO', 'PMS', 'LPG'].includes(p.code));
  const tankers = tankersRes.data || [];
  const customers = customersRes.data || [];
  const dispatches: Partial<Dispatch>[] = (dispatchesRes.data as Partial<Dispatch>[]) || [];
  const receiving = receivingRes.data || [];
  const orders = ordersRes.data || [];
  const invoices = invoicesRes.data || [];
  const transactions = txRes.data || [];

  // 1. Total Physical Stock & Product Distribution
  const totalStock = tanks.reduce((sum, t) => sum + Number(t.current_stock_litres || 0), 0);

  // Group real stock by product code
  const productStockMap = new Map<string, number>();
  tanks.forEach((t) => {
    const pCode = t.product?.code || 'OTHER';
    const current = productStockMap.get(pCode) || 0;
    productStockMap.set(pCode, current + Number(t.current_stock_litres || 0));
  });

  const stockOverview = products
    .map((p) => ({
      name: p.name,
      value: productStockMap.get(p.code) || 0,
      color: PRODUCT_COLORS[p.code] || '#10b981',
    }))
    .filter((p) => p.value > 0);

  // 2. Real Operational KPIs from Database
  // Received volume from real goods received records
  const todayReceived = receiving
    .filter((r) => r.status === 'RECEIVED')
    .reduce((sum, r) => sum + Number(r.quantity_received || r.quantity_ordered || 0), 0);

  // Dispatched volume from real dispatch tickets
  const todayDispatched = dispatches
    .filter((d) => ['DISPATCHED', 'DELIVERED', 'COMPLETED', 'LOADING', 'LOADED'].includes(d.status || ''))
    .reduce((sum, d) => sum + Number(d.quantity_loaded || d.quantity_ordered || 0), 0);

  // Total sales from real customer sales orders
  const todaySales = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  // Outstanding receivables directly from customer balances
  const outstandingReceivables = customers.reduce(
    (sum, c) => sum + Number(c.current_balance || 0),
    0
  );

  // Outstanding payables to fuel suppliers based on actual received fuel batches at gate price
  const outstandingPayables = receiving
    .filter((r) => r.status === 'RECEIVED')
    .reduce((sum, r) => {
      const price = Number(r.product?.current_price || 127.50);
      const qty = Number(r.quantity_received || r.quantity_ordered || 0);
      return sum + qty * price;
    }, 0);

  // Active tankers currently loading or in transit
  const activeTankers = tankers.filter((t) =>
    ['LOADING', 'LOADED', 'IN_TRANSIT'].includes(t.status)
  ).length;

  // Real operational alerts:
  // - Tanks at or below minimum operating reserve
  // - Tankers with expired or expiring compliance certs (within 14 days)
  // - Overdue unpaid invoices
  const lowTanksCount = tanks.filter(
    (t) => Number(t.current_stock_litres) <= Number(t.minimum_level_litres)
  ).length;

  const expiringTankersCount = tankers.filter((t) => {
    const comp = getTankerCompliance(t);
    return comp.hasExpired;
  }).length;

  const overdueInvoicesCount = invoices.filter(
    (i) => i.status === 'OVERDUE' || (i.due_date && i.due_date < todayStr && Number(i.balance_due) > 0)
  ).length;

  const alertCount = lowTanksCount + expiringTankersCount + overdueInvoicesCount;

  const kpis: DashboardKPIs = {
    totalStock,
    todayReceived,
    todayDispatched,
    todaySales,
    outstandingReceivables,
    outstandingPayables,
    activeTankers,
    alertCount,
  };

  // 3. Movement Timeline Events from Real Database Records
  const movements: MovementEvent[] = [];

  // Add real receiving events
  receiving.forEach((r) => {
    const timeStr = r.arrival_time || r.created_at || r.receiving_date;
    movements.push({
      id: `rcv-${r.id}`,
      time: timeStr
        ? new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '08:00',
      type: 'RECEIPT',
      description: `Receipt — ${Number(r.quantity_received || r.quantity_ordered).toLocaleString()} L ${r.product?.name || 'Fuel'} from ${r.supplier?.name || 'Supplier'}`,
      status: r.status === 'RECEIVED' ? 'COMPLETED' : 'PENDING',
      quantity: Number(r.quantity_received || r.quantity_ordered),
      product: r.product?.name,
    });
  });

  // Add real dispatch/loading events
  dispatches.forEach((d) => {
    const isCompleted = ['DISPATCHED', 'DELIVERED', 'COMPLETED'].includes(d.status || '');
    const isProgress = d.status === 'LOADING';
    const timeStr = d.loading_started_at || d.dispatch_time || d.created_at;
    movements.push({
      id: `dsp-${d.id}`,
      time: timeStr
        ? new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '10:00',
      type: isProgress ? 'LOADING' : 'DISPATCH',
      description: `${isProgress ? 'Loading' : 'Dispatch'} — ${d.tanker?.registration_number || 'Tanker'} for ${d.customer?.name || 'Customer'} (${Number(d.quantity_loaded || d.quantity_ordered).toLocaleString()} L ${d.product?.name || 'Fuel'})`,
      status: isCompleted ? 'COMPLETED' : isProgress ? 'IN_PROGRESS' : 'PENDING',
      quantity: Number(d.quantity_loaded || d.quantity_ordered),
      product: d.product?.name,
    });
  });

  // Add real stock ledger adjustments if any
  transactions.forEach((tx) => {
    if (tx.transaction_type === 'ADJUSTMENT') {
      movements.push({
        id: `tx-${tx.id}`,
        time: tx.created_at
          ? new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '12:00',
        type: 'ADJUSTMENT',
        description: `Dip Adjustment — ${tx.tank?.code || 'Tank'} (${tx.notes || 'Calibration adjustment'})`,
        status: 'COMPLETED',
        quantity: Math.abs(Number(tx.quantity_litres || 0)),
        product: tx.product?.name,
      });
    }
  });

  // Sort movements newest first
  movements.sort((a, b) => b.time.localeCompare(a.time));

  // 4. Stock Summary by Product from Actual Depot Stock & Receipts
  const stockSummary: StockSummaryRow[] = products.map((p) => {
    const currentStock = productStockMap.get(p.code) || 0;
    const prodReceived = receiving
      .filter((r) => r.product_id === p.id && r.status === 'RECEIVED')
      .reduce((sum, r) => sum + Number(r.quantity_received || 0), 0);
    const prodDispatched = dispatches
      .filter((d) => d.product_id === p.id && ['DISPATCHED', 'DELIVERED', 'COMPLETED', 'LOADING', 'LOADED'].includes(d.status || ''))
      .reduce((sum, d) => sum + Number(d.quantity_loaded || d.quantity_ordered || 0), 0);

    const openingStock = Math.max(0, currentStock + prodDispatched - prodReceived);
    const totalIn = openingStock + prodReceived;
    const expectedClosing = totalIn - prodDispatched;
    const variance = currentStock - expectedClosing;
    const variancePct = totalIn > 0 ? (variance / totalIn) * 100 : 0;

    return {
      product: p.name,
      productCode: p.code,
      openingStock,
      received: prodReceived,
      totalIn,
      dispatched: prodDispatched,
      closingStock: currentStock,
      variance: Math.round(variance),
      variancePct: Number(variancePct.toFixed(2)),
      status: Math.abs(variancePct) > 1.5 ? 'WARNING' : 'NORMAL',
    };
  });

  return {
    kpis,
    tanks,
    products,
    stockOverview,
    recentDeliveries: dispatches,
    movements: movements.slice(0, 8),
    stockSummary,
  };
}
