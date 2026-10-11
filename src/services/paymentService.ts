import { supabase } from '../lib/supabase';
import type { Payment, UUID } from '../types';

export interface PaymentWithRelations extends Omit<Payment, 'customer' | 'invoice'> {
  customer?: {
    id: UUID;
    name: string;
    code: string;
  };
  invoice?: {
    id: UUID;
    invoice_number: string;
    total_amount: number;
    balance_due: number;
  };
}

export async function getAllPayments(): Promise<PaymentWithRelations[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, customer:customers(id, name, code), invoice:invoices(id, invoice_number, total_amount, balance_due)')
    .order('payment_date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as PaymentWithRelations[]) || [];
}
