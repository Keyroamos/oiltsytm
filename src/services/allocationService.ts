import { supabase } from '../lib/supabase';
import type { FuelAllocation, AllocationStatus } from '../types';

const SELECT_FIELDS = `
  *,
  supplier:suppliers(id, name, code),
  product:products(id, name, code)
`;

// ─── Query ────────────────────────────────────────────────────────────────────

export async function getFuelAllocations(filters?: {
  product_id?: string;
  supplier_id?: string;
  status?: AllocationStatus;
  period?: string;
}): Promise<FuelAllocation[]> {
  let query = supabase
    .from('fuel_allocations')
    .select(SELECT_FIELDS)
    .order('period_start_date', { ascending: false });

  if (filters?.product_id) query = query.eq('product_id', filters.product_id);
  if (filters?.supplier_id) query = query.eq('supplier_id', filters.supplier_id);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.period) query = query.eq('allocation_period', filters.period);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => ({
    ...row,
    lifted_pct:
      row.allocated_quantity_litres > 0
        ? Math.round((row.lifted_quantity_litres / row.allocated_quantity_litres) * 10000) / 100
        : 0,
  }));
}

export async function getFuelAllocationById(id: string): Promise<FuelAllocation | null> {
  const { data, error } = await supabase
    .from('fuel_allocations')
    .select(SELECT_FIELDS)
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateFuelAllocationInput {
  allocation_reference: string;
  allocation_period: string;
  supplier_id: string;
  product_id: string;
  allocated_quantity_litres: number;
  allocated_quantity_mt?: number;
  allocated_quantity_m3?: number;
  source_terminal?: string;
  period_start_date: string;
  period_end_date: string;
  notes?: string;
}

export async function createFuelAllocation(
  input: CreateFuelAllocationInput,
  userId?: string
): Promise<FuelAllocation> {
  const { data, error } = await supabase
    .from('fuel_allocations')
    .insert({
      ...input,
      remaining_quantity_litres: input.allocated_quantity_litres,
      lifted_quantity_litres: 0,
      status: 'ACTIVE',
      created_by: userId ?? null,
    })
    .select(SELECT_FIELDS)
    .single();

  if (error) throw error;
  return data;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export interface UpdateFuelAllocationInput {
  allocated_quantity_litres?: number;
  allocated_quantity_mt?: number;
  allocated_quantity_m3?: number;
  source_terminal?: string;
  period_end_date?: string;
  status?: AllocationStatus;
  notes?: string;
}

export async function updateFuelAllocation(
  id: string,
  input: UpdateFuelAllocationInput
): Promise<FuelAllocation> {
  // Recalculate remaining if allocated quantity changes
  let extraFields: Record<string, unknown> = {};
  if (input.allocated_quantity_litres !== undefined) {
    const { data: current } = await supabase
      .from('fuel_allocations')
      .select('lifted_quantity_litres')
      .eq('id', id)
      .single();
    if (current) {
      extraFields.remaining_quantity_litres =
        input.allocated_quantity_litres - (current.lifted_quantity_litres ?? 0);
    }
  }

  const { data, error } = await supabase
    .from('fuel_allocations')
    .update({ ...input, ...extraFields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(SELECT_FIELDS)
    .single();

  if (error) throw error;
  return data;
}

// ─── Summary helpers ──────────────────────────────────────────────────────────

export interface AllocationSummary {
  total_allocated_litres: number;
  total_lifted_litres: number;
  total_remaining_litres: number;
  active_count: number;
}

export async function getAllocationSummary(): Promise<AllocationSummary> {
  const { data, error } = await supabase
    .from('fuel_allocations')
    .select('allocated_quantity_litres, lifted_quantity_litres, remaining_quantity_litres, status');

  if (error) throw error;

  return (data ?? []).reduce(
    (acc, row) => ({
      total_allocated_litres: acc.total_allocated_litres + Number(row.allocated_quantity_litres ?? 0),
      total_lifted_litres: acc.total_lifted_litres + Number(row.lifted_quantity_litres ?? 0),
      total_remaining_litres: acc.total_remaining_litres + Number(row.remaining_quantity_litres ?? 0),
      active_count: acc.active_count + (row.status === 'ACTIVE' ? 1 : 0),
    }),
    { total_allocated_litres: 0, total_lifted_litres: 0, total_remaining_litres: 0, active_count: 0 }
  );
}
