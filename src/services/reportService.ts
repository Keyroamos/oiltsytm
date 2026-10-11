import { supabase } from '../lib/supabase';

export interface StockMovementRow {
  id: string;
  tank_code: string;
  tank_name: string;
  product_name: string;
  transaction_type: string;
  quantity_litres: number;
  previous_stock_litres: number;
  new_stock_litres: number;
  notes?: string;
  created_at: string;
}

export interface SalesRevenueByProduct {
  product_name: string;
  product_code: string;
  total_invoiced: number;
  total_collected: number;
  outstanding: number;
  order_count: number;
}

export interface SalesRevenueByCustomer {
  customer_name: string;
  customer_code: string;
  total_invoiced: number;
  total_paid: number;
  balance_due: number;
}

export interface DispatchHistoryRow {
  id: string;
  dispatch_number: string;
  customer_name: string;
  customer_code: string;
  product_name: string;
  quantity_ordered: number;
  quantity_loaded: number;
  tanker_reg: string;
  driver_name: string;
  status: string;
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  action: string;
  entity_type: string;
  description: string;
  user_id?: string;
  created_at: string;
}

export interface DashboardStockSummary {
  tank_code: string;
  tank_name: string;
  product_name: string;
  product_code: string;
  capacity_litres: number;
  current_stock_litres: number;
  utilization_pct: number;
  value_kes: number;
}

export async function getStockSummary(): Promise<DashboardStockSummary[]> {
  const { data, error } = await supabase
    .from('tanks')
    .select('code, name, capacity_litres, current_stock_litres, product:products(name, code, current_price)')
    .eq('status', 'ACTIVE')
    .order('code');

  if (error) throw new Error(error.message);

  return (data || []).filter((t: any) => ['AGO', 'PMS'].includes(t.product?.code || '')).map((t: any) => ({
    tank_code: t.code,
    tank_name: t.name,
    product_name: t.product?.name || 'Unknown',
    product_code: t.product?.code || '??',
    capacity_litres: Number(t.capacity_litres || 0),
    current_stock_litres: Number(t.current_stock_litres || 0),
    utilization_pct:
      t.capacity_litres > 0
        ? Math.round((Number(t.current_stock_litres) / Number(t.capacity_litres)) * 100)
        : 0,
    value_kes: Number(t.current_stock_litres || 0) * Number(t.product?.current_price || 0),
  }));
}

export async function getStockMovements(
  from: string,
  to: string
): Promise<StockMovementRow[]> {
  const { data, error } = await supabase
    .from('stock_transactions')
    .select('id, transaction_type, quantity_litres, previous_balance, new_balance, notes, created_at, tank:tanks(code, name), product:products(name)')
    .gte('created_at', `${from}T00:00:00`)
    .lte('created_at', `${to}T23:59:59`)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map((row: any) => ({
    id: row.id,
    tank_code: row.tank?.code || '—',
    tank_name: row.tank?.name || '—',
    product_name: row.product?.name || '—',
    transaction_type: row.transaction_type,
    quantity_litres: Number(row.quantity_litres || 0),
    previous_stock_litres: Number(row.previous_balance || 0),
    new_stock_litres: Number(row.new_balance || 0),
    notes: row.notes,
    created_at: row.created_at,
  }));
}

export async function getSalesRevenueByProduct(): Promise<SalesRevenueByProduct[]> {
  const { data: invoices, error } = await supabase
    .from('orders')
    .select('product:products(name, code), total_amount, status');

  if (error) throw new Error(error.message);

  const { data: payments } = await supabase
    .from('payments')
    .select('amount, invoice:invoices(order:orders!order_id(product:products(code)))');

  const productMap: Record<string, SalesRevenueByProduct> = {};

  for (const inv of (invoices || [])) {
    const pName = (inv as any).product?.name || 'Unknown';
    const pCode = (inv as any).product?.code || '??';
    const key = pCode;
    if (!productMap[key]) {
      productMap[key] = {
        product_name: pName,
        product_code: pCode,
        total_invoiced: 0,
        total_collected: 0,
        outstanding: 0,
        order_count: 0,
      };
    }
    productMap[key].total_invoiced += Number((inv as any).total_amount || 0);
    productMap[key].order_count += 1;
  }

  // Payments by product via invoice → order join
  for (const p of payments || []) {
    const pCode = (p as any).invoice?.order?.product?.code;
    if (pCode && productMap[pCode]) {
      productMap[pCode].total_collected += Number((p as any).amount || 0);
    }
  }

  return Object.values(productMap).map((r) => ({
    ...r,
    outstanding: r.total_invoiced - r.total_collected,
  }));
}

export async function getSalesRevenueByCustomer(): Promise<SalesRevenueByCustomer[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('customer:customers(name, code), total_amount, amount_paid, balance_due');

  if (error) throw new Error(error.message);

  const custMap: Record<string, SalesRevenueByCustomer> = {};

  for (const inv of data || []) {
    const name = (inv as any).customer?.name || 'Unknown';
    const code = (inv as any).customer?.code || '??';
    if (!custMap[code]) {
      custMap[code] = { customer_name: name, customer_code: code, total_invoiced: 0, total_paid: 0, balance_due: 0 };
    }
    custMap[code].total_invoiced += Number((inv as any).total_amount || 0);
    custMap[code].total_paid += Number((inv as any).amount_paid || 0);
    custMap[code].balance_due += Number((inv as any).balance_due || 0);
  }

  return Object.values(custMap).sort((a, b) => b.total_invoiced - a.total_invoiced);
}

export async function getDispatchHistory(): Promise<DispatchHistoryRow[]> {
  const { data, error } = await supabase
    .from('dispatches')
    .select('id, dispatch_number, quantity_ordered, quantity_loaded, driver_name, status, created_at, customer:customers(name, code), product:products(name), tanker:tankers(registration_number)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map((d: any) => ({
    id: d.id,
    dispatch_number: d.dispatch_number,
    customer_name: d.customer?.name || '—',
    customer_code: d.customer?.code || '—',
    product_name: d.product?.name || '—',
    quantity_ordered: Number(d.quantity_ordered || 0),
    quantity_loaded: Number(d.quantity_loaded || 0),
    tanker_reg: d.tanker?.registration_number || '—',
    driver_name: d.driver_name || '—',
    status: d.status,
    created_at: d.created_at,
  }));
}

export async function getAuditLogs(limit = 100): Promise<AuditLogRow[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, action, entity_type, description, user_id, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data || []).map((r: any) => ({
    id: r.id,
    action: r.action,
    entity_type: r.entity_type,
    description: r.description || r.action,
    user_id: r.user_id,
    created_at: r.created_at,
  }));
}

export function exportToCSV(rows: Record<string, any>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? '';
          const str = String(val).replace(/"/g, '""');
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str}"`
            : str;
        })
        .join(',')
    ),
  ];
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
