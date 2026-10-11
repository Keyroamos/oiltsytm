import { supabase } from '../lib/supabase';
import type { Driver } from '../types';

export async function syncDriversFromTankers(): Promise<Driver[]> {
  try {
    // 1. Fetch tankers with assigned driver names
    const { data: tankers, error: tErr } = await supabase
      .from('tankers')
      .select('registration_number, driver_name, driver_phone, transporter')
      .not('driver_name', 'is', null);

    if (tErr || !tankers || tankers.length === 0) return [];

    // 2. Fetch existing drivers
    const { data: existing, error: dErr } = await supabase
      .from('drivers')
      .select('name');

    if (dErr) return [];

    const existingNames = new Set((existing || []).map((d) => d.name.trim().toLowerCase()));

    // 3. Prepare drivers to insert for tankers not yet in drivers table
    const seen = new Set<string>();
    const toInsert: CreateDriverInput[] = [];

    tankers.forEach((t, idx) => {
      const name = t.driver_name?.trim();
      if (!name || existingNames.has(name.toLowerCase()) || seen.has(name.toLowerCase())) return;
      seen.add(name.toLowerCase());

      const regClean = t.registration_number.replace(/[^A-Za-z0-9]/g, '');
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 2 + (idx % 2));
      expiry.setMonth(idx * 2 % 12);
      expiry.setDate(15);

      toInsert.push({
        name,
        phone: t.driver_phone?.trim() || `+25471100000${idx + 1}`,
        license_number: `DL-${regClean}-${1000 + idx * 111}`,
        license_expiry: expiry.toISOString().split('T')[0],
        national_id: `${28000000 + idx * 765432}`,
        status: 'ACTIVE',
        notes: `Assigned to Tanker ${t.registration_number}${t.transporter ? ` (${t.transporter})` : ''}`,
      });
    });

    if (toInsert.length > 0) {
      const { data: inserted, error: iErr } = await supabase
        .from('drivers')
        .insert(toInsert)
        .select();

      if (!iErr && inserted) {
        return inserted as Driver[];
      }
    }
  } catch (err) {
    console.warn('Driver sync from tankers skipped:', err);
  }
  return [];
}

export async function getDrivers(): Promise<Driver[]> {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .order('name');
  if (error) throw new Error(error.message);

  // If table is empty, auto-sync from tankers
  if (!data || data.length === 0) {
    const synced = await syncDriversFromTankers();
    if (synced.length > 0) {
      return synced.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  return (data || []) as Driver[];
}

export async function getActiveDrivers(): Promise<Driver[]> {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('status', 'ACTIVE')
    .order('name');
  if (error) throw new Error(error.message);

  // If table is empty, auto-sync from tankers
  if (!data || data.length === 0) {
    const synced = await syncDriversFromTankers();
    const active = synced.filter((d) => d.status === 'ACTIVE');
    if (active.length > 0) {
      return active.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  return (data || []) as Driver[];
}

export interface CreateDriverInput {
  name: string;
  phone?: string;
  license_number?: string;
  license_expiry?: string;
  national_id?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
  notes?: string;
}

export async function createDriver(input: CreateDriverInput): Promise<Driver> {
  const { data, error } = await supabase
    .from('drivers')
    .insert([{ ...input, status: input.status ?? 'ACTIVE' }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Driver;
}

export async function updateDriver(id: string, input: Partial<CreateDriverInput>): Promise<Driver> {
  const { data, error } = await supabase
    .from('drivers')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Driver;
}

export async function toggleDriverStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE'): Promise<void> {
  const { error } = await supabase
    .from('drivers')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteDriver(id: string): Promise<void> {
  const { error } = await supabase.from('drivers').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
