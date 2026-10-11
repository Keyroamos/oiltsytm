import { supabase } from '../lib/supabase';
import type { Invoice, InvoiceStatus, Payment, PaymentMethod, UUID } from '../types';

export interface CreateInvoiceInput {
  customer_id: UUID;
  order_id?: UUID;
  dispatch_id?: UUID;
  receiving_id?: UUID;
  subtotal: number;
  tax_rate?: number;
  due_date: string;
  notes?: string;
  amount_paid?: number;
  payment_method?: PaymentMethod;
  payment_reference?: string;
}

export interface BillableItem {
  id: string;
  type: 'ORDER' | 'DIRECT_RECEIVING';
  reference: string;
  date: string;
  productName: string;
  quantityLitres: number;
  unitPrice: number;
  totalAmount: number;
  status?: string;
  suggestedDueDate?: string;
  orderId?: UUID;
  receivingId?: UUID;
}

export interface RecordPaymentInput {
  invoice_id: UUID;
  customer_id: UUID;
  amount: number;
  payment_method: PaymentMethod;
  reference_number?: string;
  payment_date: string;
  notes?: string;
}

export async function getInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, customer:customers(*), order:orders!order_id(*, product:products(*))')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invoices:', error);
    throw new Error(error.message);
  }
  return (data as Invoice[]) || [];
}

export async function getInvoiceByOrderId(orderId: UUID): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, customer:customers(*)')
    .eq('order_id', orderId)
    .maybeSingle();

  if (error) {
    console.warn('Error fetching invoice for order:', error);
    return null;
  }
  return data as Invoice | null;
}

export async function getInvoicePayments(invoiceId: UUID): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as Payment[]) || [];
}

export async function createInvoice(
  input: CreateInvoiceInput,
  userId?: UUID
): Promise<Invoice> {
  // Standard VAT or passed tax rate (default 16% in Kenya)
  const normalizedTaxRate = input.tax_rate !== undefined
    ? (input.tax_rate > 1 ? input.tax_rate / 100 : input.tax_rate)
    : 0.16;
  const taxAmount = input.subtotal * normalizedTaxRate;
  const totalAmount = input.subtotal + taxAmount;
  const amountPaid = Math.min(Math.max(0, input.amount_paid || 0), totalAmount);
  const balanceDue = Math.max(0, totalAmount - amountPaid);

  let invoiceStatus: InvoiceStatus = 'ISSUED';
  if (balanceDue === 0 && amountPaid > 0) {
    invoiceStatus = 'PAID';
  } else if (amountPaid > 0) {
    invoiceStatus = 'PARTIALLY_PAID';
  }

  // Generate invoice number
  const invoiceNumber = `INV-2026-${Math.floor(100 + Math.random() * 900)}`;

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      customer_id: input.customer_id,
      order_id: input.order_id || null,
      subtotal: input.subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      amount_paid: amountPaid,
      balance_due: balanceDue,
      status: invoiceStatus,
      due_date: input.due_date,
      etims_status: 'PENDING',
    })
    .select('*, customer:customers(*)')
    .single();

  if (error) throw new Error(`Failed to create invoice: ${error.message}`);

  // Link receiving record if direct-to-client delivery
  if (input.receiving_id) {
    try {
      await supabase
        .from('receiving_records')
        .update({ generated_invoice_id: data.id })
        .eq('id', input.receiving_id);
    } catch (recvErr) {
      console.warn('Receiving record invoice link warning:', recvErr);
    }
  }

  // If a partial payment was received, record it into payments table
  if (amountPaid > 0) {
    try {
      await supabase.from('payments').insert({
        customer_id: input.customer_id,
        invoice_id: data.id,
        amount: amountPaid,
        payment_method: input.payment_method || 'BANK',
        reference_number: input.payment_reference || 'Advance / Partial Payment',
        payment_date: new Date().toISOString().split('T')[0],
        notes: `Initial payment recorded upon invoice issuance: KES ${amountPaid.toLocaleString()}`,
        created_by: userId,
      });
    } catch (payErr) {
      console.warn('Payment record creation warning:', payErr);
    }
  }

  // Update customer balance by the remaining balance_due
  const { data: customer } = await supabase
    .from('customers')
    .select('current_balance')
    .eq('id', input.customer_id)
    .single();

  if (customer) {
    await supabase
      .from('customers')
      .update({ current_balance: Number(customer.current_balance || 0) + balanceDue })
      .eq('id', input.customer_id);
  }

  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'INVOICE_CREATED',
    entity_type: 'invoices',
    entity_id: data.id,
    new_values: { invoice_number: invoiceNumber, total_amount: totalAmount, amount_paid: amountPaid, balance_due: balanceDue },
    description: `Generated invoice ${invoiceNumber} for ${data.customer?.name}: KES ${totalAmount.toLocaleString()} (Paid: KES ${amountPaid.toLocaleString()}, Due: KES ${balanceDue.toLocaleString()})`,
  });

  return data as Invoice;
}

/**
 * Fetch all un-invoiced APPROVED orders and direct-to-client deliveries for a customer
 */
export async function getCustomerPendingBillableItems(customerId: UUID): Promise<BillableItem[]> {
  const items: BillableItem[] = [];

  // Order MUST be approved to appear for invoicing
  const APPROVED_STATUSES = ['APPROVED', 'ALLOCATED', 'LOADING', 'DISPATCHED', 'COMPLETED'];

  // 1. Fetch Orders for this customer
  const { data: orders } = await supabase
    .from('orders')
    .select('*, product:products(*)')
    .eq('customer_id', customerId)
    .in('status', APPROVED_STATUSES)
    .order('created_at', { ascending: false });

  // Invoiced order IDs
  const { data: existingInvoices } = await supabase
    .from('invoices')
    .select('order_id')
    .eq('customer_id', customerId)
    .not('order_id', 'is', null);

  const invoicedOrderIds = new Set((existingInvoices || []).map((i: any) => i.order_id));

  if (orders) {
    for (const ord of orders) {
      if (!invoicedOrderIds.has(ord.id) && APPROVED_STATUSES.includes(ord.status)) {
        const qty = Number(ord.quantity_litres || 0);
        const price = Number(ord.unit_price || 0);
        const total = Number(ord.total_amount || (qty * price));
        items.push({
          id: `order-${ord.id}`,
          type: 'ORDER',
          reference: ord.order_number,
          date: ord.created_at,
          productName: ord.product?.name || 'Petroleum Fuel',
          quantityLitres: qty,
          unitPrice: price,
          totalAmount: total,
          status: ord.status,
          suggestedDueDate: ord.requested_date,
          orderId: ord.id,
        });
      }
    }
  }

  // 2. Fetch Direct-to-Client Receivings that do not have an invoice generated yet
  try {
    const { data: directRecs } = await supabase
      .from('receiving_records')
      .select('*, product:products(*)')
      .eq('destination_type', 'DIRECT_CLIENT')
      .eq('destination_customer_id', customerId)
      .is('generated_invoice_id', null)
      .order('created_at', { ascending: false });

    if (directRecs) {
      for (const rec of directRecs) {
        const qty = Number(rec.quantity_litres || 0);
        const price = Number(rec.client_selling_price || 0);
        const total = Number(rec.client_total_amount || (qty * price));
        items.push({
          id: `rec-${rec.id}`,
          type: 'DIRECT_RECEIVING',
          reference: rec.reference_number || 'DIRECT-DELIVERY',
          date: rec.arrival_date || rec.created_at,
          productName: rec.product?.name || 'Petroleum Fuel',
          quantityLitres: qty,
          unitPrice: price,
          totalAmount: total,
          status: 'DIRECT_CLIENT',
          receivingId: rec.id,
        });
      }
    }
  } catch (err) {
    console.warn('Direct client receivings fetch error:', err);
  }

  return items;
}

export async function recordPayment(
  input: RecordPaymentInput,
  userId?: UUID
): Promise<Payment> {
  // Fetch current invoice state
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, customer:customers(*)')
    .eq('id', input.invoice_id)
    .single();

  if (!invoice) throw new Error('Invoice not found.');

  const currentBalance = Number(invoice.balance_due || 0);
  if (input.amount <= 0) throw new Error('Payment amount must be greater than zero.');
  if (input.amount > currentBalance) {
    throw new Error(`Payment of KES ${input.amount.toLocaleString()} exceeds outstanding balance of KES ${currentBalance.toLocaleString()}.`);
  }

  const newAmountPaid = Number(invoice.amount_paid || 0) + input.amount;
  const newBalanceDue = currentBalance - input.amount;
  const newStatus: InvoiceStatus = newBalanceDue <= 0 ? 'PAID' : newAmountPaid > 0 ? 'PARTIALLY_PAID' : 'ISSUED';

  // Record the payment
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      invoice_id: input.invoice_id,
      customer_id: input.customer_id,
      amount: input.amount,
      payment_method: input.payment_method,
      reference_number: input.reference_number?.trim() || null,
      payment_date: input.payment_date,
      notes: input.notes?.trim() || null,
      created_by: userId,
    })
    .select()
    .single();

  if (paymentError) throw new Error(`Failed to record payment: ${paymentError.message}`);

  // Update invoice
  await supabase
    .from('invoices')
    .update({
      amount_paid: newAmountPaid,
      balance_due: newBalanceDue,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.invoice_id);

  // Reduce customer outstanding balance
  const { data: cust } = await supabase
    .from('customers')
    .select('current_balance')
    .eq('id', input.customer_id)
    .single();

  if (cust) {
    const updatedBalance = Math.max(0, Number(cust.current_balance || 0) - input.amount);
    await supabase
      .from('customers')
      .update({ current_balance: updatedBalance })
      .eq('id', input.customer_id);
  }

  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'PAYMENT_RECORDED',
    entity_type: 'payments',
    entity_id: payment.id,
    new_values: { amount: input.amount, method: input.payment_method, invoice_balance: newBalanceDue },
    description: `Recorded ${input.payment_method} payment of KES ${input.amount.toLocaleString()} for invoice ${invoice.invoice_number} (Balance: KES ${newBalanceDue.toLocaleString()})`,
  });

  return payment as Payment;
}
