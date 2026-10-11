import { supabase } from '../lib/supabase';
import type { Customer, Order, Invoice, Payment, Dispatch, UUID } from '../types';

export interface CustomerDetailData {
  customer: Customer;
  orders: Order[];
  invoices: Invoice[];
  payments: Payment[];
  dispatches: Dispatch[];
}

export interface CustomerInput {
  name: string;
  code: string;
  phone?: string;
  email?: string;
  address?: string;
  credit_limit: number;
  payment_terms?: string;
  is_active?: boolean;
}

export async function getCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching customers:', error);
    throw new Error(error.message);
  }

  return (data as Customer[]) || [];
}

export async function getCustomerDetails(customerId: UUID): Promise<CustomerDetailData> {
  const [customerRes, ordersRes, invoicesRes, paymentsRes, dispatchesRes] = await Promise.all([
    supabase.from('customers').select('*').eq('id', customerId).single(),
    supabase.from('orders').select('*, product:products(*)').eq('customer_id', customerId).order('created_at', { ascending: false }),
    supabase.from('invoices').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
    supabase.from('payments').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
    supabase.from('dispatches').select('*, product:products(*), tanker:tankers(*)').eq('customer_id', customerId).order('created_at', { ascending: false }),
  ]);

  if (customerRes.error || !customerRes.data) {
    throw new Error(`Customer not found: ${customerRes.error?.message}`);
  }

  return {
    customer: customerRes.data as Customer,
    orders: (ordersRes.data as Order[]) || [],
    invoices: (invoicesRes.data as Invoice[]) || [],
    payments: (paymentsRes.data as Payment[]) || [],
    dispatches: (dispatchesRes.data as Dispatch[]) || [],
  };
}

export async function createCustomer(
  input: CustomerInput,
  userId?: UUID
): Promise<Customer> {
  if (!input.name.trim() || !input.code.trim()) {
    throw new Error('Customer name and unique code are required.');
  }

  if (input.credit_limit < 0) {
    throw new Error('Credit limit cannot be negative.');
  }

  const { data, error } = await supabase
    .from('customers')
    .insert({
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      address: input.address?.trim() || null,
      credit_limit: input.credit_limit,
      current_balance: 0,
      payment_terms: input.payment_terms?.trim() || '30 Days',
      is_active: input.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create customer: ${error.message}`);
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'CUSTOMER_CREATED',
    entity_type: 'customers',
    entity_id: data.id,
    new_values: { name: data.name, code: data.code, credit_limit: data.credit_limit },
    description: `Registered new customer account: ${data.name} (${data.code}) with credit limit of KES ${data.credit_limit.toLocaleString()}`,
  });

  return data as Customer;
}

export async function updateCustomer(
  id: UUID,
  input: Partial<CustomerInput>,
  userId?: UUID
): Promise<Customer> {
  // Get current state for audit comparison
  const { data: current } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.code !== undefined) updates.code = input.code.trim().toUpperCase();
  if (input.phone !== undefined) updates.phone = input.phone.trim();
  if (input.email !== undefined) updates.email = input.email.trim();
  if (input.address !== undefined) updates.address = input.address.trim();
  if (input.credit_limit !== undefined) {
    if (input.credit_limit < 0) throw new Error('Credit limit cannot be negative.');
    updates.credit_limit = input.credit_limit;
  }
  if (input.payment_terms !== undefined) updates.payment_terms = input.payment_terms.trim();
  if (input.is_active !== undefined) updates.is_active = input.is_active;

  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update customer: ${error.message}`);
  }

  // Audit log for credit limit alteration
  if (input.credit_limit !== undefined && current && input.credit_limit !== current.credit_limit) {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'CUSTOMER_CREDIT_CHANGE',
      entity_type: 'customers',
      entity_id: id,
      old_values: { credit_limit: current.credit_limit },
      new_values: { credit_limit: input.credit_limit },
      description: `Updated credit limit for ${data.name}: KES ${Number(current.credit_limit).toLocaleString()} → KES ${Number(input.credit_limit).toLocaleString()}`,
    });
  }

  return data as Customer;
}

export async function checkCreditAvailable(
  customerId: UUID,
  orderAmount: number
): Promise<{
  allowed: boolean;
  creditLimit: number;
  currentBalance: number;
  availableCredit: number;
  projectedBalance: number;
}> {
  const { data: customer, error } = await supabase
    .from('customers')
    .select('credit_limit, current_balance, name')
    .eq('id', customerId)
    .single();

  if (error || !customer) {
    throw new Error('Customer account not found.');
  }

  const creditLimit = Number(customer.credit_limit || 0);
  const currentBalance = Number(customer.current_balance || 0);
  const availableCredit = Math.max(0, creditLimit - currentBalance);
  const projectedBalance = currentBalance + orderAmount;
  const allowed = projectedBalance <= creditLimit;

  return {
    allowed,
    creditLimit,
    currentBalance,
    availableCredit,
    projectedBalance,
  };
}
