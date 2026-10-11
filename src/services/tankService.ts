import { supabase } from '../lib/supabase';
import type { Tank, Product, StockTransaction, UUID } from '../types';

export interface StockAdjustmentInput {
  tankId: UUID;
  physicalStock: number;
  reason: string;
  userId?: UUID;
}

export async function getTanks(): Promise<Tank[]> {
  const { data, error } = await supabase
    .from('tanks')
    .select('*, product:products(*)')
    .order('code');

  if (error) {
    console.error('Error fetching tanks:', error);
    throw new Error(error.message);
  }

  return ((data as Tank[]) || []).filter(
    (t) =>
      ['AGO', 'PMS'].includes(t.product?.code || '') &&
      !t.code.toUpperCase().includes('FLEET') &&
      !t.name.toLowerCase().includes('virtual')
  );
}

export async function getTankById(id: UUID): Promise<Tank | null> {
  const { data, error } = await supabase
    .from('tanks')
    .select('*, product:products(*)')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching tank ${id}:`, error);
    throw new Error(error.message);
  }

  return data as Tank;
}

export async function getTankTransactions(tankId: UUID): Promise<StockTransaction[]> {
  const { data, error } = await supabase
    .from('stock_transactions')
    .select('*, product:products(*)')
    .eq('tank_id', tankId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`Error fetching transactions for tank ${tankId}:`, error);
    throw new Error(error.message);
  }

  return (data as StockTransaction[]) || [];
}

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching products:', error);
    throw new Error(error.message);
  }

  return ((data as Product[]) || []).filter(p => ['AGO', 'PMS'].includes(p.code));
}

export async function updateProductPrice(
  productId: UUID,
  newPrice: number,
  userId?: UUID
): Promise<void> {
  if (newPrice <= 0) {
    throw new Error('Product price must be greater than zero.');
  }

  // Get current price for audit log
  const { data: currentProd } = await supabase
    .from('products')
    .select('current_price, name, code')
    .eq('id', productId)
    .single();

  const { error } = await supabase
    .from('products')
    .update({ current_price: newPrice, updated_at: new Date().toISOString() })
    .eq('id', productId);

  if (error) {
    throw new Error(error.message);
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'PRICE_CHANGE',
    entity_type: 'products',
    entity_id: productId,
    old_values: { price: currentProd?.current_price },
    new_values: { price: newPrice },
    description: `Updated price for ${currentProd?.name || 'product'} from KES ${currentProd?.current_price} to KES ${newPrice}/L`,
  });
}

export async function recordStockAdjustment({
  tankId,
  physicalStock,
  reason,
  userId,
}: StockAdjustmentInput): Promise<{ variance: number; newStock: number }> {
  if (physicalStock < 0) {
    throw new Error('Tank stock cannot become negative.');
  }

  if (!reason || reason.trim().length < 5) {
    throw new Error('A detailed reason is required for stock adjustments.');
  }

  // Fetch current tank state
  const tank = await getTankById(tankId);
  if (!tank) {
    throw new Error('Tank not found.');
  }

  if (physicalStock > tank.capacity_litres) {
    throw new Error(
      `Receiving or adjustment cannot exceed tank capacity of ${tank.capacity_litres.toLocaleString()} L. (Attempted: ${physicalStock.toLocaleString()} L)`
    );
  }

  const previousStock = Number(tank.current_stock_litres);
  const variance = physicalStock - previousStock;

  // 1. Update Tank stock
  const { error: tankUpdateError } = await supabase
    .from('tanks')
    .update({
      current_stock_litres: physicalStock,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tankId);

  if (tankUpdateError) {
    throw new Error(`Failed to update tank stock: ${tankUpdateError.message}`);
  }

  // 2. Create Stock Transaction
  const { error: txError } = await supabase.from('stock_transactions').insert({
    tank_id: tankId,
    product_id: tank.product_id,
    transaction_type: 'ADJUSTMENT',
    quantity_litres: variance,
    previous_balance: previousStock,
    new_balance: physicalStock,
    notes: `Physical Stock Dip Reconciliation: ${reason.trim()}`,
    created_by: userId,
  });

  if (txError) {
    console.error('Failed to create stock transaction:', txError);
  }

  // 3. Create Audit Log
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'STOCK_ADJUSTMENT',
    entity_type: 'tanks',
    entity_id: tankId,
    old_values: { current_stock_litres: previousStock },
    new_values: { current_stock_litres: physicalStock, variance_litres: variance },
    description: `Physical dip adjustment on ${tank.code} (${tank.name}): Adjusted from ${previousStock.toLocaleString()} L to ${physicalStock.toLocaleString()} L (Variance: ${variance >= 0 ? '+' : ''}${variance.toLocaleString()} L). Reason: ${reason}`,
  });

  return { variance, newStock: physicalStock };
}

export async function createTank(tankData: {
  name: string;
  code: string;
  product_id: UUID;
  capacity_litres: number;
  minimum_level_litres: number;
  maximum_level_litres: number;
  initial_stock_litres?: number;
  userId?: UUID;
}): Promise<Tank> {
  if (tankData.capacity_litres <= 0) {
    throw new Error('Capacity must be greater than zero.');
  }

  const initialStock = tankData.initial_stock_litres || 0;
  if (initialStock > tankData.capacity_litres) {
    throw new Error('Initial stock cannot exceed tank capacity.');
  }

  const { data, error } = await supabase
    .from('tanks')
    .insert({
      name: tankData.name,
      code: tankData.code.toUpperCase(),
      product_id: tankData.product_id,
      capacity_litres: tankData.capacity_litres,
      current_stock_litres: initialStock,
      minimum_level_litres: tankData.minimum_level_litres || 50000,
      maximum_level_litres: tankData.maximum_level_litres || tankData.capacity_litres,
      status: 'ACTIVE',
    })
    .select('*, product:products(*)')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // If initial stock > 0, log transaction
  if (initialStock > 0) {
    await supabase.from('stock_transactions').insert({
      tank_id: data.id,
      product_id: tankData.product_id,
      transaction_type: 'ADJUSTMENT',
      quantity_litres: initialStock,
      previous_balance: 0,
      new_balance: initialStock,
      notes: 'Initial tank commissioning stock',
      created_by: tankData.userId,
    });
  }

  return data as Tank;
}

export async function updateTankStatus(
  tankId: UUID,
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE',
  userId?: UUID
): Promise<void> {
  const { error } = await supabase
    .from('tanks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', tankId);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'TANK_STATUS_CHANGE',
    entity_type: 'tanks',
    entity_id: tankId,
    new_values: { status },
    description: `Tank status changed to ${status}`,
  });
}
