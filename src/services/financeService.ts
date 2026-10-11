import { supabase } from '../lib/supabase';
import type {
  Invoice,
  TruckProfitSummary,
  OrderProfitRecord,
  CompanyProfitSummary,
  Tanker,
} from '../types';

export interface AgingBucket {
  label: string;
  amount: number;
  count: number;
  color: string;
}

export interface CustomerExposure {
  customer_name: string;
  customer_code: string;
  balance_due: number;
  credit_limit: number;
  utilization_pct: number;
}

export interface FinanceSummary {
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  totalOverdue: number;
  agingBuckets: AgingBucket[];
  topExposures: CustomerExposure[];
}

export interface ProfitabilityDashboardData {
  companySummary: CompanyProfitSummary;
  truckSummaries: TruckProfitSummary[];
  orderProfitLedger: OrderProfitRecord[];
  monthlyProfitTrend: {
    month: string;
    revenue: number;
    cost: number;
    profit: number;
  }[];
}

export async function getFinanceSummary(): Promise<FinanceSummary> {
  const [invoicesRes, customersRes, paymentsRes] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, customer:customers(name, code, credit_limit)')
      .neq('status', 'CANCELLED'),
    supabase
      .from('customers')
      .select('name, code, current_balance, credit_limit')
      .gt('current_balance', 0)
      .order('current_balance', { ascending: false })
      .limit(5),
    supabase
      .from('payments')
      .select('amount'),
  ]);

  const invoices = (invoicesRes.data as Invoice[]) || [];
  const customers = customersRes.data || [];
  const payments = paymentsRes.data || [];

  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const totalCollected = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalOutstanding = invoices.reduce((s, i) => s + Number(i.balance_due || 0), 0);

  const today = new Date();

  let currentAmt = 0;
  let currentCount = 0;
  let overdue1To30 = 0;
  let overdue1To30Count = 0;
  let overdue31To60 = 0;
  let overdue31To60Count = 0;
  let overdue60Plus = 0;
  let overdue60PlusCount = 0;
  let totalOverdue = 0;

  for (const inv of invoices) {
    const balance = Number(inv.balance_due || 0);
    if (balance <= 0) continue;

    const due = new Date(inv.due_date);
    const diffDays = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      currentAmt += balance;
      currentCount++;
    } else {
      totalOverdue += balance;
      if (diffDays <= 30) {
        overdue1To30 += balance;
        overdue1To30Count++;
      } else if (diffDays <= 60) {
        overdue31To60 += balance;
        overdue31To60Count++;
      } else {
        overdue60Plus += balance;
        overdue60PlusCount++;
      }
    }
  }

  const agingBuckets: AgingBucket[] = [
    { label: 'Current (Not Due)', amount: currentAmt, count: currentCount, color: '#10b981' },
    { label: '1 - 30 Days Overdue', amount: overdue1To30, count: overdue1To30Count, color: '#f59e0b' },
    { label: '31 - 60 Days Overdue', amount: overdue31To60, count: overdue31To60Count, color: '#f97316' },
    { label: '60+ Days (Critical)', amount: overdue60Plus, count: overdue60PlusCount, color: '#ef4444' },
  ];

  const topExposures: CustomerExposure[] = customers.map((c: any) => {
    const limit = Number(c.credit_limit || 0);
    const bal = Number(c.current_balance || 0);
    return {
      customer_name: c.name,
      customer_code: c.code,
      balance_due: bal,
      credit_limit: limit,
      utilization_pct: limit > 0 ? Math.round((bal / limit) * 100) : 100,
    };
  });

  return {
    totalInvoiced,
    totalCollected,
    totalOutstanding,
    totalOverdue,
    agingBuckets,
    topExposures,
  };
}

// ─── Profitability, Truck Sales & Order Ledger Engine ─────────────────────────

function parseCostMeta(notes?: string) {
  if (!notes) return {};
  try {
    const match = notes.match(/<!--COST_META:({.*?})-->/);
    if (match && match[1]) {
      return JSON.parse(match[1]);
    }
  } catch (e) {
    // ignore
  }
  return {};
}

import { getExpenses } from './expenseService';

export async function getProfitabilityDashboardData(dateRange?: {
  from?: string;
  to?: string;
}): Promise<ProfitabilityDashboardData> {
  const [receivingRes, dispatchesRes, tankersRes, loggedExpenses] = await Promise.all([
    supabase
      .from('receiving_records')
      .select('*, supplier:suppliers(*), product:products(*), tanker:tankers(*), destination_customer:customers(*), generated_invoice:invoices(*)')
      .order('created_at', { ascending: false }),
    supabase
      .from('dispatches')
      .select('*, order:orders(*, customer:customers(*), product:products(*)), customer:customers(*), tanker:tankers(*), product:products(*)')
      .order('created_at', { ascending: false }),
    supabase
      .from('tankers')
      .select('*')
      .order('registration_number', { ascending: true }),
    getExpenses(),
  ]);

  const rawReceiving = (receivingRes.data as any[]) || [];
  const rawDispatches = (dispatchesRes.data as any[]) || [];
  const tankers = (tankersRes.data as Tanker[]) || [];

  const allReceiving = rawReceiving;
  const allDispatches = rawDispatches;

  // Compute average landed cost per litre from inbound consignments
  let totalInboundCost = 0;
  let totalInboundLitres = 0;
  for (const r of allReceiving) {
    const meta = parseCostMeta(r.notes);
    const qty = Number(r.quantity_received || r.quantity_ordered || 0);
    const cost = Number(r.total_cost || meta.total_cost || r.purchase_total || meta.purchase_total || 0);
    if (qty > 0 && cost > 0) {
      totalInboundCost += cost;
      totalInboundLitres += qty;
    }
  }
  const avgLandedCostPerLitre = totalInboundLitres > 0
    ? totalInboundCost / totalInboundLitres
    : 110.0; // Standard fallback: KES 110/L

  const orderProfitLedger: OrderProfitRecord[] = [];

  // 1. Process Direct-to-Client Inbound Consignments (Instant Drop-ship Sales)
  for (const r of allReceiving) {
    const meta = parseCostMeta(r.notes);
    const destinationType = r.destination_type || meta.destination_type || 'COMPANY_DEPOT';
    const clientPrice = Number(r.client_selling_price || meta.client_selling_price || 0);

    // Only direct client deliveries represent direct sales
    if (destinationType === 'DIRECT_CLIENT' || clientPrice > 0) {
      const qty = Number(r.quantity_received || r.quantity_ordered || 0);
      const revenue = Number(r.client_total_amount || meta.client_total_amount || (clientPrice > 0 ? clientPrice * qty : 0));
      const cost = Number(r.total_cost || meta.total_cost || r.purchase_total || meta.purchase_total || (avgLandedCostPerLitre * qty));
      const profit = revenue - cost;
      const marginPct = revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0;
      const unitCost = qty > 0 ? cost / qty : 0;

      orderProfitLedger.push({
        id: `DIRECT-${r.id}`,
        transaction_type: 'DIRECT_DELIVERY',
        reference_number: r.reference_number,
        date: r.receiving_date || r.arrival_time?.slice(0, 10) || r.created_at?.slice(0, 10),
        customer_name: r.destination_customer?.name || 'Direct Client',
        customer_code: r.destination_customer?.code,
        tanker_registration: r.tanker?.registration_number || 'Mobile Vessel',
        tanker_id: r.tanker_id,
        volume_litres: qty,
        unit_selling_price: clientPrice > 0 ? clientPrice : (qty > 0 ? revenue / qty : 0),
        revenue,
        unit_cost: unitCost,
        total_cost: cost,
        net_profit: profit,
        margin_pct: marginPct,
        status: r.status,
        driver_name: r.driver_name || r.tanker?.driver_name,
      });
    }
  }

  // 2. Process Order Dispatches from Depot Stock
  for (const d of allDispatches) {
    const qty = Number(d.quantity_loaded || d.quantity_ordered || 0);
    if (qty <= 0) continue;

    const unitSelling = Number(d.order?.unit_price || 125.0);
    const revenue = Number(d.order?.total_amount || (qty * unitSelling));
    const cost = qty * avgLandedCostPerLitre;
    const profit = revenue - cost;
    const marginPct = revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0;

    orderProfitLedger.push({
      id: `DISPATCH-${d.id}`,
      transaction_type: 'ORDER_DISPATCH',
      reference_number: d.dispatch_number || d.order?.order_number || 'DISP',
      date: d.dispatch_time?.slice(0, 10) || d.delivered_at?.slice(0, 10) || d.created_at?.slice(0, 10),
      customer_name: d.customer?.name || d.order?.customer?.name || 'Customer',
      customer_code: d.customer?.code || d.order?.customer?.code,
      tanker_registration: d.tanker?.registration_number || 'Fleet Tanker',
      tanker_id: d.tanker_id,
      volume_litres: qty,
      unit_selling_price: unitSelling,
      revenue,
      unit_cost: avgLandedCostPerLitre,
      total_cost: cost,
      net_profit: profit,
      margin_pct: marginPct,
      status: d.status,
      driver_name: d.driver_name || d.tanker?.driver_name,
    });
  }

  // Filter ledger by date if provided
  let filteredLedger = orderProfitLedger;
  if (dateRange?.from) {
    filteredLedger = filteredLedger.filter((rec) => rec.date >= dateRange.from!);
  }
  if (dateRange?.to) {
    filteredLedger = filteredLedger.filter((rec) => rec.date <= dateRange.to!);
  }

  // Sort by date descending
  filteredLedger.sort((a, b) => (b.date > a.date ? 1 : -1));

  // 3. Aggregate Per-Truck Profitability Matrix (including logged truck expenses)
  const truckSummaries: TruckProfitSummary[] = tankers.map((tanker) => {
    // Match all ledger items assigned to this tanker
    const items = filteredLedger.filter(
      (item) => item.tanker_id === tanker.id || item.tanker_registration === tanker.registration_number
    );

    // Sum all logged operational expenses explicitly assigned to this truck (maintenance, repairs, driver, fuel)
    const truckSpecificLoggedExpenses = loggedExpenses
      .filter((e) => e.tanker_id === tanker.id || (e.vehicle_registration && e.vehicle_registration.toUpperCase() === tanker.registration_number.toUpperCase()))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const total_trips = items.length;
    const total_volume_litres = items.reduce((sum, i) => sum + i.volume_litres, 0);
    const total_revenue = items.reduce((sum, i) => sum + i.revenue, 0);
    const consignmentCosts = items.reduce((sum, i) => sum + i.total_cost, 0);

    const total_product_cost = total_volume_litres * avgLandedCostPerLitre;
    const consignmentLogistics = Math.max(0, consignmentCosts - total_product_cost);
    const total_logistics_cost = consignmentLogistics + truckSpecificLoggedExpenses;
    const total_cost = total_product_cost + total_logistics_cost;
    const net_profit = total_revenue - total_cost;
    const profit_margin_pct = total_revenue > 0 ? Math.round((net_profit / total_revenue) * 1000) / 10 : 0;

    return {
      tanker_id: tanker.id,
      registration_number: tanker.registration_number,
      transporter: tanker.transporter,
      driver_name: tanker.driver_name,
      capacity_litres: Number(tanker.capacity_litres || 0),
      total_trips,
      total_volume_litres,
      total_revenue,
      total_product_cost,
      total_logistics_cost,
      total_cost,
      net_profit,
      profit_margin_pct,
    };
  });

  // Sort trucks by net profit generated descending
  truckSummaries.sort((a, b) => b.net_profit - a.net_profit);

  // 4. Overall Company Totals (incorporating all logged operational expenses)
  const allLoggedExpensesTotal = loggedExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const total_revenue = filteredLedger.reduce((s, i) => s + i.revenue, 0);
  const total_volume_litres = filteredLedger.reduce((s, i) => s + i.volume_litres, 0);
  const total_cogs = total_volume_litres * avgLandedCostPerLitre;
  const consignmentExpenses = filteredLedger.reduce((s, i) => s + i.total_cost, 0) - total_cogs;
  const total_logistics_expenses = Math.max(0, consignmentExpenses) + allLoggedExpensesTotal;
  const total_cost = total_cogs + total_logistics_expenses;
  const net_profit = total_revenue - total_cost;
  const profit_margin_pct = total_revenue > 0 ? Math.round((net_profit / total_revenue) * 1000) / 10 : 0;

  const bestTruck = truckSummaries.find((t) => t.net_profit > 0);

  const companySummary: CompanyProfitSummary = {
    total_revenue,
    total_cogs,
    total_logistics_expenses,
    total_cost,
    net_profit,
    profit_margin_pct,
    total_volume_litres,
    total_orders_count: filteredLedger.length,
    top_performing_truck: bestTruck
      ? {
          registration_number: bestTruck.registration_number,
          net_profit: bestTruck.net_profit,
          total_volume_litres: bestTruck.total_volume_litres,
        }
      : undefined,
  };

  // 5. Monthly Profit Trend for Charting
  const monthlyMap = new Map<string, { revenue: number; cost: number; profit: number }>();
  for (const item of filteredLedger) {
    const monthKey = item.date ? item.date.slice(0, 7) : 'Recent';
    const curr = monthlyMap.get(monthKey) || { revenue: 0, cost: 0, profit: 0 };
    curr.revenue += item.revenue;
    curr.cost += item.total_cost;
    curr.profit += item.net_profit;
    monthlyMap.set(monthKey, curr);
  }

  const monthlyProfitTrend = Array.from(monthlyMap.entries())
    .map(([month, vals]) => ({
      month,
      revenue: Math.round(vals.revenue),
      cost: Math.round(vals.cost),
      profit: Math.round(vals.profit),
    }))
    .sort((a, b) => (a.month > b.month ? 1 : -1));

  return {
    companySummary,
    truckSummaries,
    orderProfitLedger: filteredLedger,
    monthlyProfitTrend,
  };
}
