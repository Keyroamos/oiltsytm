import { supabase, supabaseAdmin } from '../lib/supabase';
import type { Profile, UserRole, UUID } from '../types';

export interface CreateUserInput {
  full_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  is_active?: boolean;
}

export interface UpdateUserInput {
  full_name?: string;
  phone?: string;
  role?: UserRole;
  is_active?: boolean;
}

export const ROLE_PERMISSIONS: Record<
  UserRole,
  { label: string; description: string; permissions: string[] }
> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    description: 'Unrestricted system-wide control and configuration access',
    permissions: ['Full Access', 'User Management', 'System Config', 'Audit Trail', 'Financial Approvals'],
  },
  DEPOT_MANAGER: {
    label: 'Operations Manager',
    description: 'Operations oversight, stock authority, and order approval',
    permissions: ['Order Approvals', 'Tank Reconciliation', 'Dispatches', 'Receiving Oversight', 'Staff Management'],
  },
  STOCK_OFFICER: {
    label: 'Stock Officer',
    description: 'Tank dipping, volume measurements, and stock movement recording',
    permissions: ['Record Dip Readings', 'Stock Transactions', 'Receiving Inspection', 'Variance Reporting'],
  },
  LOADING_OFFICER: {
    label: 'Loading Officer',
    description: 'Loading bay operations, meter readings, and tanker dispatches',
    permissions: ['Manage Loading Bays', 'Record Meter Readings', 'Confirm Tanker Dispatches', 'Seal Verification'],
  },
  SALES_OFFICER: {
    label: 'Sales Officer',
    description: 'Customer relations, quotations, sales order entry',
    permissions: ['Create Orders', 'Customer Management', 'Credit Requests', 'Price Quotations'],
  },
  ACCOUNTANT: {
    label: 'Accountant',
    description: 'Billing, VAT tax invoices, payment recording, and financial reconciliation',
    permissions: ['Issue Invoices', 'Record Payments', 'Credit Limit Checks', 'Tax Filing Exports', 'Financial Ledgers'],
  },
  AUDITOR: {
    label: 'Auditor',
    description: 'Compliance verification, immutable ledger inspection, and reporting',
    permissions: ['View-Only All Records', 'Audit Trail Inspection', 'Variance Audit', 'Regulatory Reporting'],
  },
  DIRECTOR: {
    label: 'Director',
    description: 'Executive reporting, business intelligence, and high-level KPIs',
    permissions: ['Executive Dashboard', 'P&L Reports', 'Strategic Analytics', 'Read All Operations'],
  },
  DRIVER: {
    label: 'Driver',
    description: 'Road tanker operator assigned to loading tickets',
    permissions: ['View Assigned Dispatches', 'Waybill Sign-off'],
  },
};

export async function getUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as Profile[]) || [];
}

export async function updateUser(
  userId: UUID,
  input: UpdateUserInput,
  performedBy?: UUID
): Promise<Profile> {
  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabase.from('audit_logs').insert({
    user_id: performedBy,
    action: 'USER_UPDATED',
    entity_type: 'profiles',
    entity_id: userId,
    old_values: existing,
    new_values: input,
    description: `Updated profile for ${data.full_name || data.email} (Role: ${data.role}, Active: ${data.is_active})`,
  });

  return data as Profile;
}

export async function createStaffProfile(
  input: CreateUserInput,
  performedBy?: UUID
): Promise<Profile> {
  const email = input.email.trim().toLowerCase();

  // 1. Create an auth.users record first (required by profiles_id_fkey FK)
  //    Use a temporary secure password — the user can reset via email later.
  const tempPassword = `PetroD3p0t!${Math.random().toString(36).slice(-6)}`;
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: input.full_name.trim() },
  });

  if (authError) {
    // If user already exists in auth, try to find their existing profile
    if (authError.message?.includes('already been registered') || authError.status === 422) {
      throw new Error(`A user with email "${email}" already exists in the system.`);
    }
    throw new Error(`Failed to create auth user: ${authError.message}`);
  }

  const authUserId = authData.user.id;

  // 2. Upsert the profile row with the real auth user ID
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: authUserId,
      full_name: input.full_name.trim(),
      email,
      phone: input.phone?.trim() || null,
      role: input.role,
      is_active: input.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    // Roll back the auth user if profile insert fails
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
    throw new Error(`Failed to create profile: ${error.message}`);
  }

  await supabase.from('audit_logs').insert({
    user_id: performedBy,
    action: 'USER_CREATED',
    entity_type: 'profiles',
    entity_id: data.id,
    new_values: { ...input, email },
    description: `Created staff account for ${input.full_name} (${email}) with role ${input.role}`,
  });

  return data as Profile;
}
