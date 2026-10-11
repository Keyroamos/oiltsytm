import { supabase } from '../lib/supabase';
import type { ReceivingRecord, Supplier, Product, Tank, UUID, VesselMarketType, VesselCurrency } from '../types';
import { formatLitres } from '../utils/formatters';
import { createExpense } from './expenseService';

export interface CreateReceivingInput {
  supplier_id: UUID;
  product_id: UUID;
  tank_id: UUID; // The target depot storage vessel
  quantity: number;
  purchase_price: number;
  reference_number: string;
  receiving_date: string;
  vessel_name?: string;
  market_type?: VesselMarketType;
  currency?: VesselCurrency;
  meter_reading?: number;
  quality_status?: string;
  notes?: string;
  // Intake Expenses
  demurrage_cost?: number;
  port_charges?: number;
  inspection_fees?: number;
  pumping_charges?: number;
  customs_duty?: number;
  other_expenses?: number;
  other_expenses_note?: string;
  userId?: UUID;
}

export async function getReceivingPrerequisites(): Promise<{
  suppliers: Supplier[];
  products: Product[];
  tanks: Tank[];
}> {
  const [suppliersRes, productsRes, tanksRes] = await Promise.all([
    supabase.from('suppliers').select('*').order('name'),
    supabase.from('products').select('*').order('name'),
    supabase.from('tanks').select('*, product:products(*)').eq('status', 'ACTIVE').order('code'),
  ]);

  return {
    suppliers: (suppliersRes.data as Supplier[]) || [],
    products: ((productsRes.data as Product[]) || []).filter((p) => ['AGO', 'PMS'].includes(p.code)),
    tanks: ((tanksRes.data as Tank[]) || []).filter(
      (t) =>
        ['AGO', 'PMS'].includes(t.product?.code || '') &&
        !t.code.toUpperCase().includes('FLEET') &&
        !t.name.toLowerCase().includes('virtual')
    ),
  };
}

function enrichRecordWithVesselMeta(r: ReceivingRecord): ReceivingRecord {
  if (r.notes && r.notes.includes('<!--VESSEL_META:')) {
    try {
      const match = r.notes.match(/<!--VESSEL_META:([\s\S]*?)-->/);
      if (match && match[1]) {
        const meta = JSON.parse(match[1]);
        if (meta.vessel_name) r.vessel_name = meta.vessel_name;
        if (meta.market_type) r.market_type = meta.market_type;
        if (meta.currency) r.currency = meta.currency;
        if (meta.demurrage_cost != null && (!r.demurrage_cost || r.demurrage_cost === 0)) r.demurrage_cost = Number(meta.demurrage_cost);
        if (meta.port_charges != null && (!r.port_charges || r.port_charges === 0)) r.port_charges = Number(meta.port_charges);
        if (meta.inspection_fees != null && (!r.inspection_fees || r.inspection_fees === 0)) r.inspection_fees = Number(meta.inspection_fees);
        if (meta.pumping_charges != null && (!r.pumping_charges || r.pumping_charges === 0)) r.pumping_charges = Number(meta.pumping_charges);
        if (meta.customs_duty != null && (!r.customs_duty || r.customs_duty === 0)) r.customs_duty = Number(meta.customs_duty);
        if (meta.other_expenses != null && (!r.other_expenses || r.other_expenses === 0)) r.other_expenses = Number(meta.other_expenses);
        if (meta.other_expenses_note) r.other_expenses_note = meta.other_expenses_note;
      }
    } catch (err) {
      console.warn('Failed to parse VESSEL_META in receiving record:', err);
    }
  }

  // Sensible defaults: TRANSIT is ALWAYS USD, LOCAL is KES
  if (r.market_type === 'TRANSIT' || r.currency === 'USD') {
    r.market_type = 'TRANSIT';
    r.currency = 'USD';
  } else {
    r.market_type = 'LOCAL';
    r.currency = 'KES';
  }
  return r;
}

export async function getReceivingRecords(): Promise<ReceivingRecord[]> {
  const { data, error } = await supabase
    .from('receiving_records')
    .select('*, supplier:suppliers(*), product:products(*), tank:tanks(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching receiving records:', error);
    throw new Error(error.message);
  }

  const list = (data as ReceivingRecord[]) || [];
  return list.map(enrichRecordWithVesselMeta);
}

export async function createFuelReceipt(input: CreateReceivingInput): Promise<ReceivingRecord> {
  if (input.quantity <= 0) {
    throw new Error('Quantity received must be greater than zero.');
  }

  if (input.purchase_price <= 0) {
    throw new Error('Purchase price per litre must be greater than zero.');
  }

  if (!input.reference_number || input.reference_number.trim().length < 3) {
    throw new Error('A valid pipeline batch or consignment reference number is required.');
  }

  if (!input.tank_id) {
    throw new Error('Please select the target storage vessel.');
  }

  // 1. Fetch and validate the target storage tank
  const { data: tank, error: tankErr } = await supabase
    .from('tanks')
    .select('*, product:products(*)')
    .eq('id', input.tank_id)
    .single();

  if (tankErr || !tank) {
    throw new Error('Target storage tank not found.');
  }

  // 2. Validate product compatibility
  if (tank.product_id && tank.product_id !== input.product_id) {
    throw new Error(
      `Product mismatch: Tank ${tank.name} (${tank.code}) is designated for ${tank.product?.name || 'another fuel type'}.`
    );
  }

  // 3. Check tank capacity & ullage
  const currentStock = Number(tank.current_stock_litres || 0);
  const maxCapacity = Number(tank.maximum_level_litres || tank.capacity_litres);
  const newStock = currentStock + input.quantity;

  if (newStock > maxCapacity) {
    const ullage = Math.max(0, maxCapacity - currentStock);
    throw new Error(
      `Receiving volume exceeds tank safe capacity. Tank ${tank.name} available ullage space: ${formatLitres(ullage)}.`
    );
  }

  const currency = input.currency || (input.market_type === 'TRANSIT' ? 'USD' : 'KES');
  const marketType = input.market_type || (currency === 'USD' ? 'TRANSIT' : 'LOCAL');
  const vesselName = input.vessel_name?.trim() || undefined;
  const purchaseTotal = Math.round(input.quantity * input.purchase_price * 100) / 100;
  const userNotes = input.notes?.trim() || null;

  const demurrage = Number(input.demurrage_cost || 0);
  const portCharges = Number(input.port_charges || 0);
  const inspection = Number(input.inspection_fees || 0);
  const pumping = Number(input.pumping_charges || 0);
  const customs = Number(input.customs_duty || 0);
  const otherExp = Number(input.other_expenses || 0);

  const totalDeliveryCost = demurrage + portCharges + inspection + pumping + customs + otherExp;
  const totalCost = purchaseTotal + totalDeliveryCost;

  const vesselMeta = {
    vessel_name: vesselName,
    market_type: marketType,
    currency: currency,
    demurrage_cost: demurrage,
    port_charges: portCharges,
    inspection_fees: inspection,
    pumping_charges: pumping,
    customs_duty: customs,
    other_expenses: otherExp,
    other_expenses_note: input.other_expenses_note?.trim() || null,
  };
  const metaComment = `<!--VESSEL_META:${JSON.stringify(vesselMeta)}-->`;
  const combinedNotes = userNotes ? `${metaComment}\n${userNotes}` : metaComment;

  // 4. Insert receiving record (with resilient schema fallback)
  let record: ReceivingRecord | null = null;

  // Attempt 1: Full insert with all migration-010 columns
  const fullInsertPayload = {
    supplier_id: input.supplier_id,
    product_id: input.product_id,
    tank_id: input.tank_id,
    tanker_id: null,
    driver_name: null,
    quantity_ordered: input.quantity,
    quantity_received: input.quantity,
    purchase_price: input.purchase_price,
    purchase_total: purchaseTotal,
    total_cost: totalCost,
    total_delivery_cost: totalDeliveryCost,
    port_charges: portCharges,
    demurrage_cost: demurrage,
    inspection_fees: inspection,
    pumping_charges: pumping,
    customs_duty: customs,
    other_expenses: otherExp,
    other_expenses_note: input.other_expenses_note?.trim() || null,
    vessel_name: vesselName,
    market_type: marketType,
    currency: currency,
    reference_number: input.reference_number.trim().toUpperCase(),
    receiving_date: input.receiving_date,
    arrival_time: new Date().toISOString(),
    meter_reading: input.meter_reading ?? null,
    quality_status: input.quality_status || 'PASSED',
    notes: combinedNotes,
    status: 'RECEIVED' as const,
    created_by: input.userId,
  };

  const { data: fullRecord, error: fullError } = await supabase
    .from('receiving_records')
    .insert(fullInsertPayload)
    .select('*, supplier:suppliers(*), product:products(*), tank:tanks(*)')
    .single();

  if (!fullError && fullRecord) {
    record = enrichRecordWithVesselMeta(fullRecord as ReceivingRecord);
  } else {
    // If error is schema cache / column not found, fallback to core existing columns
    const isSchemaError =
      fullError?.message?.includes('schema cache') ||
      fullError?.code === 'PGRST204' ||
      fullError?.message?.includes('does not exist');

    if (isSchemaError) {
      console.warn('Vessel/expense columns not yet in DB schema cache. Falling back to core schema with notes metadata...', fullError?.message);

      const corePayload = {
        supplier_id: input.supplier_id,
        product_id: input.product_id,
        tank_id: input.tank_id,
        tanker_id: null,
        driver_name: null,
        quantity_ordered: input.quantity,
        quantity_received: input.quantity,
        purchase_price: input.purchase_price,
        purchase_total: purchaseTotal,
        total_cost: totalCost,
        total_delivery_cost: totalDeliveryCost,
        other_expenses: otherExp,
        other_expenses_note: input.other_expenses_note?.trim() || null,
        reference_number: input.reference_number.trim().toUpperCase(),
        receiving_date: input.receiving_date,
        arrival_time: new Date().toISOString(),
        meter_reading: input.meter_reading ?? null,
        quality_status: input.quality_status || 'PASSED',
        notes: combinedNotes,
        status: 'RECEIVED' as const,
        created_by: input.userId,
      };

      const { data: fallbackRecord, error: fallbackError } = await supabase
        .from('receiving_records')
        .insert(corePayload)
        .select('*, supplier:suppliers(*), product:products(*), tank:tanks(*)')
        .single();

      if (fallbackError) {
        console.error('Fallback insert failed:', fallbackError);
        throw new Error(`Failed to log vessel receiving: ${fallbackError.message}`);
      }

      record = enrichRecordWithVesselMeta({
        ...(fallbackRecord as ReceivingRecord),
        vessel_name: vesselName,
        market_type: marketType,
        currency: currency,
        demurrage_cost: demurrage,
        port_charges: portCharges,
        inspection_fees: inspection,
        pumping_charges: pumping,
        customs_duty: customs,
      });
    } else {
      console.error('Error inserting receiving record:', fullError);
      throw new Error(`Failed to log vessel receiving: ${fullError?.message || 'Unknown database error'}`);
    }
  }

  // 5. Update Storage Vessel stock level
  const { error: updateTankError } = await supabase
    .from('tanks')
    .update({
      current_stock_litres: newStock,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.tank_id);

  if (updateTankError) {
    console.error('Failed to update vessel stock:', updateTankError);
  }

  // 6. Log stock transaction into immutable ledger
  try {
    await supabase.from('stock_transactions').insert({
      tank_id: input.tank_id,
      product_id: input.product_id,
      transaction_type: 'RECEIVING',
      quantity_litres: input.quantity,
      previous_balance: currentStock,
      new_balance: newStock,
      reference_type: 'RECEIVING',
      reference_id: record.id,
      notes: `Vessel intake batch ${record.reference_number}${vesselName ? ' (' + vesselName + ')' : ''}: ${formatLitres(input.quantity)} @ ${currency} ${input.purchase_price}/L (${marketType}) discharged into ${tank.name}`,
      created_by: input.userId,
    });
  } catch (txErr) {
    console.warn('Stock transaction log warning:', txErr);
  }

  // 7. Auto-sync intake expenses into central company Expenses ledger
  const expenseItems = [
    { label: 'Demurrage / Berth Fees', amount: demurrage },
    { label: 'Port / Jetty Charges', amount: portCharges },
    { label: 'Surveyor & Quality Inspection', amount: inspection },
    { label: 'Pumping & Pipeline Discharge', amount: pumping },
    { label: 'Customs & Port Levies', amount: customs },
    { label: input.other_expenses_note?.trim() || 'Other Vessel Intake Expenses', amount: otherExp },
  ].filter((e) => e.amount > 0);

  for (const item of expenseItems) {
    try {
      await createExpense({
        category: 'DEPOT_OPERATIONS',
        title: `${vesselName ? vesselName + ' - ' : ''}${item.label} (${record.reference_number})`,
        amount: item.amount,
        expense_date: input.receiving_date || new Date().toISOString().split('T')[0],
        allocation_type: 'DEPOT_GENERAL',
        reference_number: record.reference_number,
        payee_vendor: record.supplier?.name || 'Port / Vessel Handling Authority',
        notes: `Automated vessel intake expense for consignment ${record.reference_number} (${marketType} - ${currency}) into ${tank.name}.`,
        userId: input.userId,
      });
    } catch (expErr) {
      console.warn(`Failed to auto-sync expense "${item.label}" to expenses table:`, expErr);
    }
  }

  // 7. Audit log
  try {
    await supabase.from('audit_logs').insert({
      user_id: input.userId,
      action: 'PIPELINE_RECEIPT_CONFIRMED',
      entity_type: 'receiving_records',
      entity_id: record.id,
      old_values: { tank_stock: currentStock },
      new_values: { tank_stock: newStock, quantity: input.quantity, purchase_total: purchaseTotal },
      description: `Pipeline fuel receipt confirmed: ${formatLitres(input.quantity)} @ KES ${input.purchase_price}/L received from ${record.supplier?.name} into Storage Tank ${tank.name} (${tank.code}). [Batch: ${record.reference_number}]`,
    });
  } catch (auditErr) {
    console.warn('Audit log warning:', auditErr);
  }

  return record as ReceivingRecord;
}

export async function confirmPendingReceipt(
  recordId: UUID,
  userId?: UUID
): Promise<void> {
  const { data: record, error } = await supabase
    .from('receiving_records')
    .select('*, tank:tanks(*), supplier:suppliers(*), product:products(*)')
    .eq('id', recordId)
    .single();

  if (error || !record) {
    throw new Error('Receiving record not found.');
  }

  if (record.status === 'RECEIVED') {
    throw new Error('This consignment has already been confirmed into stock.');
  }

  const qty = Number(record.quantity_ordered || record.quantity_received || 0);

  // If assigned to a storage tank, update the tank inventory
  if (record.tank_id) {
    const { data: tank } = await supabase
      .from('tanks')
      .select('*')
      .eq('id', record.tank_id)
      .single();

    if (tank) {
      const currentStock = Number(tank.current_stock_litres || 0);
      const newStock = currentStock + qty;

      await supabase
        .from('tanks')
        .update({
          current_stock_litres: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', record.tank_id);

      await supabase.from('stock_transactions').insert({
        tank_id: record.tank_id,
        product_id: record.product_id,
        transaction_type: 'RECEIVING',
        quantity_litres: qty,
        previous_balance: currentStock,
        new_balance: newStock,
        reference_type: 'RECEIVING',
        reference_id: record.id,
        notes: `Pipeline intake confirmed for batch ${record.reference_number}`,
        created_by: userId,
      });
    }
  }

  await supabase
    .from('receiving_records')
    .update({
      status: 'RECEIVED',
      quantity_received: qty,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recordId);

  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'RECEIVING_CONFIRMED',
    entity_type: 'receiving_records',
    entity_id: recordId,
    description: `Consignment ${record.reference_number} confirmed into storage stock (${formatLitres(qty)})`,
  });
}
