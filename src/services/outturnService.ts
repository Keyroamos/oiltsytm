import { supabase } from '../lib/supabase';
import type { CustomerOutturn, OutturnStatus } from '../types';

const SELECT_FIELDS = `
  *,
  dispatch:dispatches(id, dispatch_number, quantity_loaded),
  customer:customers(id, name, code),
  product:products(id, name, code),
  tanker:tankers(id, registration_number)
`;

// ─── Query ────────────────────────────────────────────────────────────────────

export async function getCustomerOutturns(filters?: {
  customer_id?: string;
  dispatch_id?: string;
  status?: OutturnStatus;
  from_date?: string;
  to_date?: string;
}): Promise<CustomerOutturn[]> {
  let query = supabase
    .from('customer_outturns')
    .select(SELECT_FIELDS)
    .order('outturn_date', { ascending: false });

  if (filters?.customer_id) query = query.eq('customer_id', filters.customer_id);
  if (filters?.dispatch_id) query = query.eq('dispatch_id', filters.dispatch_id);
  if (filters?.status) query = query.eq('outturn_status', filters.status);
  if (filters?.from_date) query = query.gte('outturn_date', filters.from_date);
  if (filters?.to_date) query = query.lte('outturn_date', filters.to_date);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => ({
    ...row,
    is_within_tolerance:
      Math.abs(Number(row.variance_pct ?? 0)) <= Number(row.allowable_tolerance_pct ?? 0.5),
  }));
}

export async function getOutturnByDispatchId(dispatchId: string): Promise<CustomerOutturn | null> {
  const { data, error } = await supabase
    .from('customer_outturns')
    .select(SELECT_FIELDS)
    .eq('dispatch_id', dispatchId)
    .maybeSingle();

  if (error) return null;
  if (!data) return null;
  return {
    ...data,
    is_within_tolerance:
      Math.abs(Number(data.variance_pct ?? 0)) <= Number(data.allowable_tolerance_pct ?? 0.5),
  };
}

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateOutturnInput {
  dispatch_id: string;
  customer_id: string;
  product_id: string;
  tanker_id?: string;
  loaded_quantity_litres: number;
  offloaded_quantity_litres: number;
  allowable_tolerance_pct?: number;
  delivery_destination?: string;
  customer_rep_name?: string;
  driver_name?: string;
  meter_reading_before?: number;
  meter_reading_after?: number;
  outturn_date?: string;
  notes?: string;
}

export async function createCustomerOutturn(
  input: CreateOutturnInput,
  userId?: string
): Promise<CustomerOutturn> {
  const variance_litres = input.offloaded_quantity_litres - input.loaded_quantity_litres;
  const variance_pct =
    input.loaded_quantity_litres > 0
      ? Math.round((variance_litres / input.loaded_quantity_litres) * 100000) / 1000
      : 0;

  const tolerance = input.allowable_tolerance_pct ?? 0.5;
  const is_within = Math.abs(variance_pct) <= tolerance;

  // Generate outturn number
  const outturn_number = `OUT-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

  const { data, error } = await supabase
    .from('customer_outturns')
    .insert({
      outturn_number,
      dispatch_id: input.dispatch_id,
      customer_id: input.customer_id,
      product_id: input.product_id,
      tanker_id: input.tanker_id ?? null,
      loaded_quantity_litres: input.loaded_quantity_litres,
      offloaded_quantity_litres: input.offloaded_quantity_litres,
      variance_litres,
      variance_pct,
      allowable_tolerance_pct: tolerance,
      outturn_status: is_within ? 'CONFIRMED' : 'DISPUTED',
      delivery_destination: input.delivery_destination ?? null,
      customer_rep_name: input.customer_rep_name ?? null,
      driver_name: input.driver_name ?? null,
      meter_reading_before: input.meter_reading_before ?? null,
      meter_reading_after: input.meter_reading_after ?? null,
      outturn_date: input.outturn_date ?? new Date().toISOString(),
      notes: input.notes ?? null,
      created_by: userId ?? null,
    })
    .select(SELECT_FIELDS)
    .single();

  if (error) throw error;

  // Update dispatch outturn_status
  await supabase
    .from('dispatches')
    .update({
      outturn_id: data.id,
      outturn_status: is_within ? 'CONFIRMED' : 'DISPUTED',
    })
    .eq('id', input.dispatch_id);

  return { ...data, is_within_tolerance: is_within };
}

// ─── Update status ─────────────────────────────────────────────────────────────

export async function updateOutturnStatus(
  id: string,
  outturn_status: OutturnStatus,
  notes?: string
): Promise<CustomerOutturn> {
  const { data, error } = await supabase
    .from('customer_outturns')
    .update({
      outturn_status,
      notes: notes ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(SELECT_FIELDS)
    .single();

  if (error) throw error;
  return {
    ...data,
    is_within_tolerance:
      Math.abs(Number(data.variance_pct ?? 0)) <= Number(data.allowable_tolerance_pct ?? 0.5),
  };
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export interface OutturnSummary {
  total_loaded_litres: number;
  total_offloaded_litres: number;
  total_variance_litres: number;
  confirmed_count: number;
  disputed_count: number;
  avg_variance_pct: number;
}

export async function getOutturnSummary(): Promise<OutturnSummary> {
  const { data, error } = await supabase
    .from('customer_outturns')
    .select('loaded_quantity_litres, offloaded_quantity_litres, variance_litres, variance_pct, outturn_status');

  if (error) throw error;

  const rows = data ?? [];
  const total_loaded_litres = rows.reduce((s, r) => s + Number(r.loaded_quantity_litres ?? 0), 0);
  const total_offloaded_litres = rows.reduce((s, r) => s + Number(r.offloaded_quantity_litres ?? 0), 0);
  const total_variance_litres = rows.reduce((s, r) => s + Number(r.variance_litres ?? 0), 0);
  const avg_variance_pct = rows.length > 0
    ? rows.reduce((s, r) => s + Math.abs(Number(r.variance_pct ?? 0)), 0) / rows.length
    : 0;

  return {
    total_loaded_litres,
    total_offloaded_litres,
    total_variance_litres,
    confirmed_count: rows.filter((r) => r.outturn_status === 'CONFIRMED').length,
    disputed_count: rows.filter((r) => r.outturn_status === 'DISPUTED').length,
    avg_variance_pct: Math.round(avg_variance_pct * 1000) / 1000,
  };
}
