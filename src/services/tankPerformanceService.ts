import { supabase } from '../lib/supabase';
import type { UUID } from '../types';

// Types
export interface ClientDispatchRow {
  dispatch_id: UUID;
  date: string;
  customer_name: string;
  litres: number;
  sell_price_per_litre: number;
  cost_price_per_litre: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  margin_pct: number;
  invoice_number: string | null;
  tanker_reg: string | null;
  order_number: string | null;
}

export interface ReceivingRow {
  id: UUID;
  date: string;
  supplier_name: string;
  vessel_name?: string;
  market_type?: 'LOCAL' | 'TRANSIT';
  currency?: 'KES' | 'USD';
  quantity_litres: number;
  purchase_price: number;
  total_cost: number;
  reference_number: string;
  quality_status: string;
}

export interface TankPerformanceData {
  tank_id: UUID;
  tank_code: string;
  tank_name: string;
  product_name: string;
  product_code: string;
  currency: 'KES' | 'USD';
  total_litres_received: number;
  total_litres_dispatched: number;
  current_stock_litres: number;
  avg_cost_per_litre: number;
  total_purchase_cost: number;
  total_revenue: number;
  total_cogs: number;
  gross_profit: number;
  gross_margin_pct: number;
  clientDispatches: ClientDispatchRow[];
  receivingHistory: ReceivingRow[];
}

export interface TankSummaryRow {
  tank_id: UUID;
  tank_code: string;
  tank_name: string;
  product_code: string;
  currency?: 'KES' | 'USD';
  total_litres_dispatched: number;
  total_revenue: number;
  total_cogs: number;
  gross_profit: number;
  gross_margin_pct: number;
  avg_cost_per_litre: number;
  current_stock_litres: number;
}

export async function getTankPerformance(tankId: UUID): Promise<TankPerformanceData> {
  const [tankRes, dispatchesRes, receivingRes, invoicesRes] = await Promise.all([
    supabase
      .from('tanks')
      .select('id, code, name, current_stock_litres, product:products(name, code, current_price)')
      .eq('id', tankId)
      .single(),
    supabase
      .from('dispatches')
      .select('id, created_at, quantity_loaded, quantity_ordered, customer:customers(id, name), product:products(current_price), tanker:tankers(registration_number), order:orders(id, order_number, unit_price, total_amount)')
      .eq('tank_id', tankId)
      .in('status', ['DISPATCHED', 'DELIVERED', 'COMPLETED', 'LOADING', 'LOADED'])
      .order('created_at', { ascending: false }),
    supabase
      .from('receiving_records')
      .select('id, receiving_date, created_at, quantity_received, quantity_ordered, purchase_price, purchase_total, total_cost, reference_number, quality_status, notes, supplier:suppliers(name)')
      .eq('tank_id', tankId)
      .eq('status', 'RECEIVED')
      .order('created_at', { ascending: true }),
    supabase
      .from('invoices')
      .select('id, invoice_number, order_id')
      .not('order_id', 'is', null),
  ]);

  const tank = tankRes.data as any;
  const dispatches: any[] = dispatchesRes.data || [];
  const receiving: any[] = receivingRes.data || [];
  const invoices: any[] = invoicesRes.data || [];

  if (!tank) throw new Error('Tank not found.');

  const invoiceByOrderId = new Map<string, string>();
  invoices.forEach((inv: any) => {
    if (inv.order_id) invoiceByOrderId.set(inv.order_id, inv.invoice_number);
  });

  const totalLitresReceived = receiving.reduce((sum, r) => sum + Number(r.quantity_received || r.quantity_ordered || 0), 0);
  const totalPurchaseCost = receiving.reduce((sum, r) => {
    const qty = Number(r.quantity_received || r.quantity_ordered || 0);
    const price = Number(r.purchase_price || 0);
    return sum + qty * price;
  }, 0);

  const avgCostPerLitre = totalLitresReceived > 0
    ? totalPurchaseCost / totalLitresReceived
    : Number(tank.product?.current_price || 0) * 0.85;

  const clientDispatches: ClientDispatchRow[] = dispatches.map((d: any) => {
    const litres = Number(d.quantity_loaded || d.quantity_ordered || 0);
    const sellPrice = Number(d.order?.unit_price || d.product?.current_price || 0);
    const revenue = litres * sellPrice;
    const cogs = litres * avgCostPerLitre;
    const gross_profit = revenue - cogs;
    const margin_pct = revenue > 0 ? (gross_profit / revenue) * 100 : 0;
    return {
      dispatch_id: d.id,
      date: d.created_at,
      customer_name: d.customer?.name || 'Unknown Customer',
      litres,
      sell_price_per_litre: sellPrice,
      cost_price_per_litre: avgCostPerLitre,
      revenue,
      cogs,
      gross_profit,
      margin_pct,
      invoice_number: d.order?.id ? (invoiceByOrderId.get(d.order.id) || null) : null,
      tanker_reg: d.tanker?.registration_number || null,
      order_number: d.order?.order_number || null,
    };
  });

  const receivingHistory: ReceivingRow[] = receiving.map((r: any) => {
    let vesselName = r.vessel_name || null;
    let marketType: 'LOCAL' | 'TRANSIT' = r.market_type || 'LOCAL';
    let currency: 'KES' | 'USD' = r.currency || 'KES';

    if (r.notes && r.notes.includes('<!--VESSEL_META:')) {
      try {
        const match = r.notes.match(/<!--VESSEL_META:([\s\S]*?)-->/);
        if (match && match[1]) {
          const meta = JSON.parse(match[1]);
          if (!vesselName && meta.vessel_name) vesselName = meta.vessel_name;
          if (meta.market_type) marketType = meta.market_type;
          if (meta.currency) currency = meta.currency;
        }
      } catch (e) {
        console.warn('Error parsing meta:', e);
      }
    }

    if (marketType === 'TRANSIT') {
      currency = 'USD';
    }

    return {
      id: r.id,
      date: r.receiving_date || r.created_at,
      supplier_name: r.supplier?.name || 'Unknown Supplier',
      vessel_name: vesselName,
      market_type: marketType,
      currency: currency,
      quantity_litres: Number(r.quantity_received || r.quantity_ordered || 0),
      purchase_price: Number(r.purchase_price || 0),
      total_cost: Number(r.total_cost || r.purchase_total || 0),
      reference_number: r.reference_number || '—',
      quality_status: r.quality_status || 'PASSED',
    };
  });

  const totalLitresDispatched = clientDispatches.reduce((s, d) => s + d.litres, 0);
  const totalRevenue = clientDispatches.reduce((s, d) => s + d.revenue, 0);
  const totalCogs = clientDispatches.reduce((s, d) => s + d.cogs, 0);
  const grossProfit = totalRevenue - totalCogs;
  const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // Detect primary currency for this storage vessel
  const hasTransit = receivingHistory.some((r) => r.currency === 'USD');
  const primaryCurrency: 'KES' | 'USD' = hasTransit ? 'USD' : 'KES';

  return {
    tank_id: tank.id,
    tank_code: tank.code,
    tank_name: tank.name,
    product_name: tank.product?.name || 'Unknown',
    product_code: tank.product?.code || '',
    currency: primaryCurrency,
    total_litres_received: totalLitresReceived,
    total_litres_dispatched: totalLitresDispatched,
    current_stock_litres: Number(tank.current_stock_litres || 0),
    avg_cost_per_litre: avgCostPerLitre,
    total_purchase_cost: totalPurchaseCost,
    total_revenue: totalRevenue,
    total_cogs: totalCogs,
    gross_profit: grossProfit,
    gross_margin_pct: grossMarginPct,
    clientDispatches,
    receivingHistory,
  };
}

export async function getAllTanksSummary(): Promise<TankSummaryRow[]> {
  const { data: tanks } = await supabase
    .from('tanks')
    .select('id, code, name, current_stock_litres, product:products(name, code)')
    .order('code');

  if (!tanks) return [];

  const results = await Promise.all(
    (tanks as any[])
      .filter((t) => ['AGO', 'PMS'].includes(t.product?.code || '') && !t.code.toUpperCase().includes('FLEET') && !t.name.toLowerCase().includes('virtual'))
      .map(async (t) => {
        try {
          const perf = await getTankPerformance(t.id);
          return {
            tank_id: t.id,
            tank_code: perf.tank_code,
            tank_name: perf.tank_name,
            product_code: perf.product_code,
            currency: perf.currency,
            total_litres_dispatched: perf.total_litres_dispatched,
            total_revenue: perf.total_revenue,
            total_cogs: perf.total_cogs,
            gross_profit: perf.gross_profit,
            gross_margin_pct: perf.gross_margin_pct,
            avg_cost_per_litre: perf.avg_cost_per_litre,
            current_stock_litres: perf.current_stock_litres,
          } as TankSummaryRow;
        } catch {
          return null;
        }
      })
  );

  return results.filter(Boolean) as TankSummaryRow[];
}
