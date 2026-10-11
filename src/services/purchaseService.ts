import { supabase } from '../lib/supabase';
import type {
  FuelPurchase,
  PurchaseCurrency,
  MarketType,
  PurchaseStatus,
  QuantityUnit,
  FourQuantitiesRow,
  FourQuantitiesSummary,
  EpraMonthlyReport,
  EpraProductLine,
} from '../types';

export type { FourQuantitiesRow, FourQuantitiesSummary };

const SELECT_FIELDS = `
  *,
  supplier:suppliers(id, name, code),
  product:products(id, name, code),
  allocation:fuel_allocations(id, allocation_reference, allocation_period)
`;

// ─── Query ────────────────────────────────────────────────────────────────────

export async function getFuelPurchases(filters?: {
  product_id?: string;
  supplier_id?: string;
  market_type?: MarketType;
  status?: PurchaseStatus;
  from_date?: string;
  to_date?: string;
}): Promise<FuelPurchase[]> {
  let query = supabase
    .from('fuel_purchases')
    .select(SELECT_FIELDS)
    .order('purchase_date', { ascending: false });

  if (filters?.product_id) query = query.eq('product_id', filters.product_id);
  if (filters?.supplier_id) query = query.eq('supplier_id', filters.supplier_id);
  if (filters?.market_type) query = query.eq('market_type', filters.market_type);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.from_date) query = query.gte('purchase_date', filters.from_date);
  if (filters?.to_date) query = query.lte('purchase_date', filters.to_date);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => ({
    ...row,
    unlifted_quantity_litres: Math.max(0, Number(row.quantity_litres) - Number(row.lifted_quantity_litres ?? 0)),
  }));
}

export async function getFuelPurchaseById(id: string): Promise<FuelPurchase | null> {
  const { data, error } = await supabase
    .from('fuel_purchases')
    .select(SELECT_FIELDS)
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateFuelPurchaseInput {
  supplier_id: string;
  product_id: string;
  allocation_id?: string;
  market_type: MarketType;
  quantity_unit: QuantityUnit;
  quantity_value: number;
  quantity_litres: number;
  quantity_mt?: number;
  currency: PurchaseCurrency;
  unit_cost_currency: number;
  invoice_value_currency: number;
  exchange_rate: number;
  exchange_rate_date: string;
  exchange_rate_source: string;
  invoice_value_kes: number;
  product_entry_tax_kes: number;
  import_declaration_fee_kes: number;
  railway_development_levy_kes: number;
  petroleum_development_levy_kes: number;
  demurrage_port_charges_kes: number;
  reference_document?: string;
  purchase_date: string;
  notes?: string;
}

function computeLandedCost(input: CreateFuelPurchaseInput): {
  total_landed_cost_kes: number;
  unit_landed_cost_kes_per_litre: number;
  purchase_number: string;
} {
  const total_landed_cost_kes =
    Number(input.invoice_value_kes) +
    Number(input.product_entry_tax_kes) +
    Number(input.import_declaration_fee_kes) +
    Number(input.railway_development_levy_kes) +
    Number(input.petroleum_development_levy_kes) +
    Number(input.demurrage_port_charges_kes);

  const unit_landed_cost_kes_per_litre =
    input.quantity_litres > 0
      ? Math.round((total_landed_cost_kes / input.quantity_litres) * 10000) / 10000
      : 0;

  // Generate purchase number using datestamp
  const date = new Date(input.purchase_date);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const purchase_number = `PO-TARITA-${year}${month}-${Date.now().toString().slice(-5)}`;

  return { total_landed_cost_kes, unit_landed_cost_kes_per_litre, purchase_number };
}

export async function createFuelPurchase(
  input: CreateFuelPurchaseInput,
  userId?: string
): Promise<FuelPurchase> {
  const { total_landed_cost_kes, unit_landed_cost_kes_per_litre, purchase_number } =
    computeLandedCost(input);

  const { data, error } = await supabase
    .from('fuel_purchases')
    .insert({
      ...input,
      purchase_number,
      total_landed_cost_kes,
      unit_landed_cost_kes_per_litre,
      lifted_quantity_litres: 0,
      status: 'ORDERED',
      created_by: userId ?? null,
    })
    .select(SELECT_FIELDS)
    .single();

  if (error) throw error;

  // Update linked allocation's lifted quantity
  if (input.allocation_id) {
    await supabase.rpc('increment_allocation_lifted', {
      p_allocation_id: input.allocation_id,
      p_quantity: 0,
    }).maybeSingle();
  }

  return { ...data, unlifted_quantity_litres: data.quantity_litres };
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateFuelPurchaseStatus(
  id: string,
  status: PurchaseStatus,
  lifted_quantity_litres?: number
): Promise<FuelPurchase> {
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (lifted_quantity_litres !== undefined) {
    updates.lifted_quantity_litres = lifted_quantity_litres;
  }
  const { data, error } = await supabase
    .from('fuel_purchases')
    .update(updates)
    .eq('id', id)
    .select(SELECT_FIELDS)
    .single();

  if (error) throw error;
  return {
    ...data,
    unlifted_quantity_litres: Math.max(0, Number(data.quantity_litres) - Number(data.lifted_quantity_litres ?? 0)),
  };
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export interface PurchaseSummary {
  total_purchases_kes: number;
  total_volume_litres: number;
  total_product_entry_tax_kes: number;
  avg_landed_cost_per_litre: number;
  count: number;
}

export async function getPurchaseSummary(): Promise<PurchaseSummary> {
  const { data, error } = await supabase
    .from('fuel_purchases')
    .select(
      'total_landed_cost_kes, quantity_litres, product_entry_tax_kes, import_declaration_fee_kes, railway_development_levy_kes, petroleum_development_levy_kes, demurrage_port_charges_kes'
    )
    .neq('status', 'CANCELLED');

  if (error) throw error;

  const rows = data ?? [];
  const total_volume_litres = rows.reduce((s, r) => s + Number(r.quantity_litres ?? 0), 0);
  const total_purchases_kes = rows.reduce((s, r) => s + Number(r.total_landed_cost_kes ?? 0), 0);
  const total_product_entry_tax_kes = rows.reduce(
    (s, r) =>
      s +
      Number(r.product_entry_tax_kes ?? 0) +
      Number(r.import_declaration_fee_kes ?? 0) +
      Number(r.railway_development_levy_kes ?? 0) +
      Number(r.petroleum_development_levy_kes ?? 0) +
      Number(r.demurrage_port_charges_kes ?? 0),
    0
  );

  return {
    total_purchases_kes,
    total_volume_litres,
    total_product_entry_tax_kes,
    avg_landed_cost_per_litre: total_volume_litres > 0 ? total_purchases_kes / total_volume_litres : 0,
    count: rows.length,
  };
}

// ─── Four Quantities Engine ────────────────────────────────────────────────────

export async function getFourQuantitiesSummary(period?: string): Promise<FourQuantitiesSummary> {
  const currentPeriod = period || `${['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][new Date().getMonth()]}-${new Date().getFullYear()}`;
  // Resolve period to date range
  const [monthStr, yearStr] = currentPeriod.split('-');
  const months: Record<string, number> = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
  };
  const monthIdx = months[monthStr?.toUpperCase()] ?? new Date().getMonth();
  const year = parseInt(yearStr) || new Date().getFullYear();
  const fromDate = new Date(year, monthIdx, 1).toISOString().split('T')[0];
  const toDate = new Date(year, monthIdx + 1, 0).toISOString().split('T')[0];

  const [allocRes, purchRes, receivRes, dispRes] = await Promise.all([
    supabase
      .from('fuel_allocations')
      .select('product:products(code, name), allocated_quantity_litres')
      .gte('period_start_date', fromDate)
      .lte('period_end_date', toDate),
    supabase
      .from('fuel_purchases')
      .select('product:products(code, name), quantity_litres, market_type')
      .gte('purchase_date', fromDate)
      .lte('purchase_date', toDate)
      .neq('status', 'CANCELLED'),
    supabase
      .from('receiving_records')
      .select('product:products(code, name), quantity_received, market_type')
      .gte('receiving_date', fromDate)
      .lte('receiving_date', toDate)
      .eq('status', 'RECEIVED'),
    supabase
      .from('dispatches')
      .select('product:products(code, name), quantity_loaded, market_type')
      .gte('created_at', fromDate + 'T00:00:00')
      .lte('created_at', toDate + 'T23:59:59')
      .in('status', ['DELIVERED', 'COMPLETED']),
  ]);

  // Aggregate by product + market_type
  type Key = string;
  const map: Record<Key, FourQuantitiesRow> = {};

  const getKey = (code: string, mt: string) => `${code}__${mt}`;
  const ensure = (code: string, name: string, mt: string) => {
    const key = getKey(code, mt);
    if (!map[key]) {
      map[key] = {
        product_code: code,
        product_name: name,
        market_type: mt as MarketType,
        period: currentPeriod,
        allocated_litres: 0,
        purchased_litres: 0,
        received_lifted_litres: 0,
        sold_dispatched_litres: 0,
        allocation_vs_purchase_variance: 0,
        purchase_vs_lifting_variance: 0,
        lifting_vs_sale_variance: 0,
        total_outturn_variance_litres: 0,
      };
    }
    return map[key];
  };

  (allocRes.data ?? []).forEach((r: any) => {
    const row = ensure(r.product?.code ?? '?', r.product?.name ?? '?', 'LOCAL');
    row.allocated_litres += Number(r.allocated_quantity_litres ?? 0);
  });

  (purchRes.data ?? []).forEach((r: any) => {
    const mt = r.market_type ?? 'LOCAL';
    const row = ensure(r.product?.code ?? '?', r.product?.name ?? '?', mt);
    row.purchased_litres += Number(r.quantity_litres ?? 0);
  });

  (receivRes.data ?? []).forEach((r: any) => {
    const mt = r.market_type ?? 'LOCAL';
    const row = ensure(r.product?.code ?? '?', r.product?.name ?? '?', mt);
    row.received_lifted_litres += Number(r.quantity_received ?? 0);
  });

  (dispRes.data ?? []).forEach((r: any) => {
    const mt = r.market_type ?? 'LOCAL';
    const row = ensure(r.product?.code ?? '?', r.product?.name ?? '?', mt);
    row.sold_dispatched_litres += Number(r.quantity_loaded ?? 0);
  });

  // Compute variances
  Object.values(map).forEach((row) => {
    row.allocation_vs_purchase_variance = row.allocated_litres - row.purchased_litres;
    row.purchase_vs_lifting_variance = row.purchased_litres - row.received_lifted_litres;
    row.lifting_vs_sale_variance = row.received_lifted_litres - row.sold_dispatched_litres;
  });

  return {
    period: currentPeriod,
    rows: Object.values(map),
    generated_at: new Date().toISOString(),
  };
}

// ─── EPRA Monthly Report ──────────────────────────────────────────────────────

export async function getEpraMonthlyReport(period: string): Promise<EpraMonthlyReport> {
  const summary = await getFourQuantitiesSummary(period);

  const lines: EpraProductLine[] = summary.rows.map((row) => ({
    product: row.product_name,
    market_type: row.market_type,
    opening_stock_litres: 0, // Would need prior period closing stock
    received_litres: row.received_lifted_litres,
    total_available_litres: row.received_lifted_litres,
    sold_dispatched_litres: row.sold_dispatched_litres,
    closing_stock_litres: row.received_lifted_litres - row.sold_dispatched_litres,
    variance_litres: row.lifting_vs_sale_variance,
  }));

  return {
    company_name: 'Tarita Petroleum Limited',
    epra_license: 'EPRA/PET/DEP/2026-088',
    period,
    generated_at: new Date().toISOString(),
    lines,
  };
}
