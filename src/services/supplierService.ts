import { supabase } from '../lib/supabase';
import type { Supplier, UUID } from '../types';

export interface CreateSupplierInput {
  name: string;
  code: string;
  phone?: string;
  email?: string;
  address?: string;
  credit_terms?: string;
  is_active?: boolean;
}

export interface UpdateSupplierInput {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  credit_terms?: string;
  is_active?: boolean;
}

export async function getSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name');

  if (error) throw new Error(error.message);
  return (data as Supplier[]) || [];
}

export async function createSupplier(
  input: CreateSupplierInput,
  userId?: UUID
): Promise<Supplier> {
  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      phone: input.phone?.trim() || null,
      email: input.email?.trim().toLowerCase() || null,
      address: input.address?.trim() || null,
      credit_terms: input.credit_terms?.trim() || 'Net 30',
      is_active: input.is_active ?? true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'SUPPLIER_CREATED',
    entity_type: 'suppliers',
    entity_id: data.id,
    new_values: input,
    description: `Registered new supplier ${input.name} (${input.code})`,
  });

  return data as Supplier;
}

export async function updateSupplier(
  supplierId: UUID,
  input: UpdateSupplierInput,
  userId?: UUID
): Promise<Supplier> {
  const { data, error } = await supabase
    .from('suppliers')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', supplierId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'SUPPLIER_UPDATED',
    entity_type: 'suppliers',
    entity_id: supplierId,
    new_values: input,
    description: `Updated supplier details for ${data.name} (${data.code})`,
  });

  return data as Supplier;
}
