import { supabase } from '../lib/supabase';
import type { Order, Customer, Product, OrderStatus, UUID } from '../types';
import { createInvoice } from './invoiceService';

export interface CreateOrderInput {
  customer_id: UUID;
  product_id: UUID;
  quantity_litres: number;
  unit_price: number;
  requested_date: string;
  notes?: string;
  market_type?: 'LOCAL' | 'TRANSIT';
  vat_amount?: number;
  submitForApproval: boolean;
  userId?: UUID;
}

export async function getOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, customer:customers(*), product:products(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders:', error);
    throw new Error(error.message);
  }

  return (data as Order[]) || [];
}

export async function getOrderById(orderId: UUID): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, customer:customers(*), product:products(*)')
    .eq('id', orderId)
    .single();

  if (error) {
    console.error(`Error fetching order ${orderId}:`, error);
    throw new Error(error.message);
  }

  return data as Order;
}

export async function getOrderPrerequisites(): Promise<{
  customers: Customer[];
  products: Product[];
}> {
  const [custRes, prodRes] = await Promise.all([
    supabase.from('customers').select('*').eq('is_active', true).order('name'),
    supabase.from('products').select('*').eq('is_active', true).order('name'),
  ]);

  const rawProducts = ((prodRes.data as Product[]) || []).filter((p) => ['AGO', 'PMS'].includes(p.code));
  rawProducts.sort((a, b) => a.name.localeCompare(b.name));

  return {
    customers: (custRes.data as Customer[]) || [],
    products: rawProducts,
  };
}

export async function createOrder(
  input: CreateOrderInput,
  userId?: UUID
): Promise<Order> {
  if (input.quantity_litres <= 0) {
    throw new Error('Order quantity must be greater than zero.');
  }

  if (input.unit_price <= 0) {
    throw new Error('Unit price must be greater than zero.');
  }

  const totalAmount = input.quantity_litres * input.unit_price;
  const status: OrderStatus = input.submitForApproval ? 'PENDING_APPROVAL' : 'DRAFT';

  // Generate order number
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const orderNumber = `ORD-2026-${randomSuffix}`;

  const basePayload = {
    order_number: orderNumber,
    customer_id: input.customer_id,
    product_id: input.product_id,
    quantity_litres: input.quantity_litres,
    unit_price: input.unit_price,
    total_amount: totalAmount,
    status,
    requested_date: input.requested_date,
    created_by: userId,
  };

  let res = await supabase
    .from('orders')
    .insert({
      ...basePayload,
      market_type: input.market_type || 'LOCAL',
      vat_amount: input.vat_amount || 0,
      notes: input.notes?.trim() || null,
    })
    .select('*, customer:customers(*), product:products(*)')
    .single();

  // If column market_type or vat_amount does not exist yet, fall back without them
  if (res.error && res.error.message.includes('column')) {
    const marketNote = `[${input.market_type || 'LOCAL'}${input.vat_amount ? ` | VAT: KES ${input.vat_amount}` : ''}]`;
    const combinedNotes = input.notes ? `${input.notes.trim()} ${marketNote}` : marketNote;
    res = await supabase
      .from('orders')
      .insert({
        ...basePayload,
        notes: combinedNotes,
      })
      .select('*, customer:customers(*), product:products(*)')
      .single();
  }

  const { data, error } = res;

  if (error) {
    throw new Error(`Failed to place fuel order: ${error.message}`);
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'ORDER_CREATED',
    entity_type: 'orders',
    entity_id: data.id,
    new_values: {
      order_number: data.order_number,
      quantity_litres: data.quantity_litres,
      total_amount: data.total_amount,
      status: data.status,
    },
    description: `Placed customer fuel order ${data.order_number} for ${data.customer?.name}: ${data.quantity_litres.toLocaleString()} L of ${data.product?.name} (KES ${totalAmount.toLocaleString()})`,
  });

  return data as Order;
}

export async function updateOrderStatus(
  orderId: UUID,
  nextStatus: OrderStatus,
  userId?: UUID,
  notes?: string
): Promise<Order> {
  const updates: Record<string, any> = {
    status: nextStatus,
    updated_at: new Date().toISOString(),
  };

  if (nextStatus === 'APPROVED') {
    updates.approved_by = userId;
    updates.approved_at = new Date().toISOString();
  }

  if (notes) {
    updates.notes = notes;
  }

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select('*, customer:customers(*), product:products(*)')
    .single();

  if (error) {
    throw new Error(`Failed to update order status: ${error.message}`);
  }

  // Auto-generate invoice when order is approved
  if (nextStatus === 'APPROVED') {
    try {
      const { data: existingInvoices } = await supabase
        .from('invoices')
        .select('id')
        .eq('order_id', orderId);

      if (!existingInvoices || existingInvoices.length === 0) {
        const defaultDueDate = data.requested_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
        await createInvoice({
          customer_id: data.customer_id,
          order_id: data.id,
          subtotal: Number(data.total_amount),
          tax_rate: 0.16, // 16% VAT standard rate for petroleum products
          due_date: defaultDueDate,
        }, userId);
      }
    } catch (invErr) {
      console.warn('Auto invoice creation warning on order approval:', invErr);
    }
  }

  return data as Order;
}
