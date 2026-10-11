import { supabase } from '../lib/supabase';
import type { Dispatch, Order, Tank, Tanker, UUID } from '../types';

export interface DispatchPrerequisites {
  approvedOrders: Order[];
  availableTankers: Tanker[];
  tanks: Tank[];
}

export interface CreateDispatchInput {
  order_id: UUID;
  tank_id: UUID;
  tanker_id: UUID;
  quantity_ordered: number;
  product_id: UUID;
  customer_id: UUID;
  driver_name?: string;
  seal_number?: string;
  initial_meter_reading?: number;
  notes?: string;
}

export async function getDispatches(): Promise<Dispatch[]> {
  const { data, error } = await supabase
    .from('dispatches')
    .select('*, customer:customers(*), product:products(*), tank:tanks(*), tanker:tankers(*)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as Dispatch[]) || [];
}

export async function getDispatchPrerequisites(): Promise<DispatchPrerequisites> {
  const [ordersRes, tankersRes, tanksRes] = await Promise.all([
    supabase
      .from('orders')
      .select('*, customer:customers(*), product:products(*)')
      .in('status', ['APPROVED', 'ALLOCATED'])
      .order('created_at', { ascending: false }),
    supabase
      .from('tankers')
      .select('*')
      .in('status', ['AVAILABLE', 'LOADED'])
      .order('registration_number'),
    supabase
      .from('tanks')
      .select('*, product:products(*)')
      .eq('status', 'ACTIVE')
      .order('code'),
  ]);

  return {
    approvedOrders: (ordersRes.data as Order[]) || [],
    availableTankers: (tankersRes.data as Tanker[]) || [],
    tanks: ((tanksRes.data as Tank[]) || []).filter(t => ['AGO', 'PMS'].includes(t.product?.code || '')),
  };
}

export async function createDispatch(
  input: CreateDispatchInput,
  userId?: UUID
): Promise<Dispatch> {
  // Verify tank has enough stock
  const { data: tank } = await supabase
    .from('tanks')
    .select('current_stock_litres, code, name')
    .eq('id', input.tank_id)
    .single();

  if (!tank) throw new Error('Source tank not found.');

  const currentStock = Number(tank.current_stock_litres || 0);
  if (currentStock < input.quantity_ordered) {
    throw new Error(
      `Insufficient stock in ${tank.code}. Available: ${currentStock.toLocaleString()} L, Requested: ${input.quantity_ordered.toLocaleString()} L.`
    );
  }

  // Generate dispatch number
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const dispatchNumber = `DSP-2026-${randomSuffix}`;

  // Create dispatch record — build payload without optional fields that may be absent in schema
  const dispatchPayload: Record<string, any> = {
    dispatch_number: dispatchNumber,
    order_id: input.order_id,
    customer_id: input.customer_id,
    product_id: input.product_id,
    tank_id: input.tank_id,
    tanker_id: input.tanker_id,
    quantity_ordered: input.quantity_ordered,
    status: 'LOADING',
    created_by: userId,
  };
  if (input.notes?.trim()) dispatchPayload.notes = input.notes.trim();
  // Attempt to add optional columns — guarded so missing DB columns don't crash
  try { if (input.driver_name?.trim()) dispatchPayload.driver_name = input.driver_name.trim(); } catch {}
  try { if (input.seal_number?.trim()) dispatchPayload.seal_number = input.seal_number.trim(); } catch {}
  try { if (input.initial_meter_reading) dispatchPayload.initial_meter_reading = input.initial_meter_reading; } catch {}
  try { dispatchPayload.loading_start_time = new Date().toISOString(); } catch {}

  const { data: dispatch, error: dispatchError } = await supabase
    .from('dispatches')
    .insert(dispatchPayload)
    .select('*, customer:customers(*), product:products(*), tank:tanks(*), tanker:tankers(*)')
    .single();

  if (dispatchError) throw new Error(`Failed to create dispatch: ${dispatchError.message}`);

  // Update order status to LOADING
  await supabase
    .from('orders')
    .update({ status: 'LOADING', updated_at: new Date().toISOString() })
    .eq('id', input.order_id);

  // Update tanker status to LOADING
  await supabase
    .from('tankers')
    .update({ status: 'LOADING', updated_at: new Date().toISOString() })
    .eq('id', input.tanker_id);

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'DISPATCH_CREATED',
    entity_type: 'dispatches',
    entity_id: dispatch.id,
    new_values: { dispatch_number: dispatchNumber, quantity_ordered: input.quantity_ordered, tank: tank.code },
    description: `Initiated loading for dispatch ${dispatchNumber}: ${input.quantity_ordered.toLocaleString()} L allocated from ${tank.code}`,
  });

  return dispatch as Dispatch;
}

export async function confirmDispatch(
  dispatchId: UUID,
  params: {
    quantity_loaded: number;
    final_meter_reading?: number;
    seal_number?: string;
  },
  userId?: UUID
): Promise<Dispatch> {
  // Get current dispatch with tank info
  const { data: existing } = await supabase
    .from('dispatches')
    .select('*, tank:tanks(*), tanker:tankers(*), customer:customers(*), product:products(*)')
    .eq('id', dispatchId)
    .single();

  if (!existing) throw new Error('Dispatch record not found.');

  const quantityLoaded = params.quantity_loaded;
  const tankId = existing.tank_id;
  const tankerId = existing.tanker_id;

  // Get current tank stock
  const { data: tank } = await supabase
    .from('tanks')
    .select('current_stock_litres, code')
    .eq('id', tankId)
    .single();

  if (!tank) throw new Error('Source tank not found.');

  const currentStock = Number(tank.current_stock_litres || 0);
  if (currentStock < quantityLoaded) {
    throw new Error(
      `Cannot dispatch. Only ${currentStock.toLocaleString()} L available in ${tank.code}.`
    );
  }

  const previousStock = currentStock;
  const newStock = currentStock - quantityLoaded;

  // Deduct tank stock
  await supabase
    .from('tanks')
    .update({
      current_stock_litres: newStock,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tankId);

  // Record stock transaction (DISPATCH type)
  await supabase.from('stock_transactions').insert({
    tank_id: tankId,
    product_id: existing.product_id,
    transaction_type: 'DISPATCH',
    quantity_litres: -quantityLoaded, // negative = stock reduction
    previous_balance: previousStock,
    new_balance: newStock,
    reference_id: dispatchId,
    reference_type: 'dispatch',
    notes: `Dispatched ${quantityLoaded.toLocaleString()} L for ${existing.customer?.name} via ${existing.tanker?.registration_number || 'tanker'}`,
    created_by: userId,
  });

  // Update dispatch to DISPATCHED
  const { data: updatedDispatch, error: updateError } = await supabase
    .from('dispatches')
    .update({
      status: 'DISPATCHED',
      quantity_loaded: quantityLoaded,
      final_meter_reading: params.final_meter_reading || null,
      seal_number: params.seal_number || existing.seal_number,
      loading_end_time: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', dispatchId)
    .select('*, customer:customers(*), product:products(*), tank:tanks(*), tanker:tankers(*)')
    .single();

  if (updateError) throw new Error(`Failed to confirm dispatch: ${updateError.message}`);

  // Update order to DISPATCHED
  await supabase
    .from('orders')
    .update({ status: 'DISPATCHED', updated_at: new Date().toISOString() })
    .eq('id', existing.order_id);

  // Update tanker to IN_TRANSIT
  await supabase
    .from('tankers')
    .update({ status: 'IN_TRANSIT', updated_at: new Date().toISOString() })
    .eq('id', tankerId);

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'DISPATCH_CONFIRMED',
    entity_type: 'dispatches',
    entity_id: dispatchId,
    old_values: { stock_before: previousStock },
    new_values: { stock_after: newStock, quantity_dispatched: quantityLoaded },
    description: `Confirmed dispatch ${existing.dispatch_number}: ${quantityLoaded.toLocaleString()} L deducted from ${tank.code} (${previousStock.toLocaleString()} → ${newStock.toLocaleString()} L)`,
  });

  return updatedDispatch as Dispatch;
}

export async function markDelivered(
  dispatchId: UUID,
  userId?: UUID
): Promise<Dispatch> {
  const { data: existing } = await supabase
    .from('dispatches')
    .select('*, customer:customers(*), tanker:tankers(*)')
    .eq('id', dispatchId)
    .single();

  if (!existing) throw new Error('Dispatch record not found.');

  const { data: updated, error } = await supabase
    .from('dispatches')
    .update({
      status: 'COMPLETED',
      updated_at: new Date().toISOString(),
    })
    .eq('id', dispatchId)
    .select('*, customer:customers(*), product:products(*), tank:tanks(*), tanker:tankers(*)')
    .single();

  if (error) throw new Error(`Failed to mark as delivered: ${error.message}`);

  // Update order to COMPLETED
  await supabase
    .from('orders')
    .update({ status: 'COMPLETED', updated_at: new Date().toISOString() })
    .eq('id', existing.order_id);

  // Return tanker to AVAILABLE
  await supabase
    .from('tankers')
    .update({ status: 'AVAILABLE', updated_at: new Date().toISOString() })
    .eq('id', existing.tanker_id);

  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'DISPATCH_DELIVERED',
    entity_type: 'dispatches',
    entity_id: dispatchId,
    new_values: { status: 'COMPLETED' },
    description: `Delivery confirmed for ${existing.dispatch_number} to ${existing.customer?.name}. Tanker ${existing.tanker?.registration_number} returned to AVAILABLE.`,
  });

  return updated as Dispatch;
}
