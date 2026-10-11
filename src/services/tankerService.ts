import { supabase } from '../lib/supabase';
import type {
  Tanker,
  TankerStatus,
  Dispatch,
  Order,
  Invoice,
  Payment,
  ReceivingRecord,
  UUID,
} from '../types';

export interface TankerMetrics {
  totalTrips: number;
  totalVolumeLitres: number;
  totalOrdersValue: number;
  totalInvoicedAmount: number;
  totalPaidAmount: number;
  totalOutstandingBalance: number;
}

export interface TankerDetailData {
  tanker: Tanker;
  dispatches: Dispatch[];
  orders: Order[];
  invoices: Invoice[];
  payments: Payment[];
  receivingRecords: ReceivingRecord[];
  metrics: TankerMetrics;
}

export interface TankerInput {
  registration_number: string;
  capacity_litres: number;
  number_of_compartments: number;
  driver_name?: string;
  driver_phone?: string;
  transporter?: string;
  status: TankerStatus;
  insurance_expiry?: string;
  inspection_expiry?: string;
  /** ProTrack365 GPS tracker hardware & subscription */
  tracker_imei?: string;
  tracker_sim?: string;
  tracker_iccid?: string;
  tracker_model?: string;
  tracker_activated_at?: string;
  tracker_expires_at?: string;
}

export interface TankerTelematics {
  imei: string;
  sim?: string;
  iccid?: string;
  model?: string;
  activated_at?: string;
  expires_at?: string;
}

/** Known ProTrack365 fleet device details from live ProTrack telematics */
export const KNOWN_TANKER_TELEMATICS: Record<string, TankerTelematics> = {
  'KDT 991Q': {
    imei: '355139086515480',
    sim: '+254798845827',
    iccid: '89254021434289636592',
    model: 'VT05S',
    activated_at: '2026-09-10T13:47:05Z',
    expires_at: '2027-09-17T04:45:31Z',
  },
  'KDT 992Q': {
    imei: '355139086522742',
    sim: '+254799394359',
    iccid: '89254021434289637210',
    model: 'VT05S',
    activated_at: '2026-09-10T14:16:18Z',
    expires_at: '2027-09-17T05:15:00Z',
  },
  'KDT 993Q': {
    imei: '355139086516587',
    sim: '+254791543972',
    iccid: '89254021434289635834',
    model: 'VT05S',
    activated_at: '2026-09-11T11:50:06Z',
    expires_at: '2027-09-18T02:52:13Z',
  },
  'KDX 991B': {
    imei: '355139086520134',
    sim: '+254799395721',
    iccid: '89254021434289634563',
    model: 'VT05S',
    activated_at: '2026-09-10T15:30:58Z',
    expires_at: '2027-09-17T06:29:45Z',
  },
  'KDX 992B': {
    imei: '355139086522650',
    sim: '+254799467056',
    iccid: '89254021434289637863',
    model: 'VT05S',
    activated_at: '2026-09-10T16:23:12Z',
    expires_at: '2027-09-17T07:20:29Z',
  },
  'KDX 993B': {
    imei: '355139086523427',
    sim: '+254799466128',
    iccid: '89254021434289634720',
    model: 'VT05S',
    activated_at: '2026-09-10T15:34:13Z',
    expires_at: '2027-09-17T06:35:46Z',
  },
  'KDX 994B': {
    imei: '355139086522866',
    sim: '+254791641462',
    iccid: '89254021434289635842',
    model: 'VT05S',
    activated_at: '2026-09-10T15:59:19Z',
    expires_at: '2027-09-17T06:57:13Z',
  },
  'KDX 996B': {
    imei: '355139086518948',
    sim: '+254799466373',
    iccid: '89254021434289637830',
    model: 'VT05S',
    activated_at: '2026-09-11T09:04:38Z',
    expires_at: '2027-09-17T23:44:36Z',
  },
  'KDX 997B': {
    imei: '355139086520019',
    sim: '+254796256055',
    iccid: '89254021434289635347',
    model: 'VT05S',
    activated_at: '2026-09-10T14:51:39Z',
    expires_at: '2027-09-17T05:51:09Z',
  },
};

export const KNOWN_TANKER_IMEIS: Record<string, string> = Object.fromEntries(
  Object.entries(KNOWN_TANKER_TELEMATICS).map(([reg, tel]) => [reg, tel.imei])
);

const LOCAL_IMEI_STORAGE_KEY = 'oilsystem_tanker_imeis';

export function getLocalImeis(): Record<string, string> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(LOCAL_IMEI_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalImei(key: string, imei: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const map = getLocalImeis();
    map[key] = imei;
    localStorage.setItem(LOCAL_IMEI_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

export function resolveTankerImei(tanker: Partial<Tanker>): string | undefined {
  if (tanker.tracker_imei) return tanker.tracker_imei;
  const localMap = getLocalImeis();
  if (tanker.id && localMap[tanker.id]) return localMap[tanker.id];
  if (tanker.registration_number) {
    const reg = tanker.registration_number.replace(/\s+/g, ' ').trim().toUpperCase();
    if (localMap[reg]) return localMap[reg];
    if (KNOWN_TANKER_IMEIS[reg]) return KNOWN_TANKER_IMEIS[reg];
  }
  return undefined;
}

export function enrichTankerTelematics(tanker: Tanker): Tanker {
  const reg = tanker.registration_number ? tanker.registration_number.replace(/\s+/g, ' ').trim().toUpperCase() : '';
  const known = KNOWN_TANKER_TELEMATICS[reg];
  return {
    ...tanker,
    tracker_imei: tanker.tracker_imei || resolveTankerImei(tanker) || known?.imei,
    tracker_sim: tanker.tracker_sim || known?.sim,
    tracker_iccid: tanker.tracker_iccid || known?.iccid,
    tracker_model: tanker.tracker_model || known?.model || (tanker.tracker_imei ? 'VT05S' : undefined),
    tracker_activated_at: tanker.tracker_activated_at || known?.activated_at,
    tracker_expires_at: tanker.tracker_expires_at || known?.expires_at,
  };
}

export type ComplianceStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_CERT';

export interface TankerCompliance {
  insuranceStatus: ComplianceStatus;
  inspectionStatus: ComplianceStatus;
  daysToInsuranceExpiry: number | null;
  daysToInspectionExpiry: number | null;
  isFullyCompliant: boolean;
  hasExpired: boolean;
  hasExpiringSoon: boolean;
  hasMissingCerts: boolean;
  canDispatch: boolean;
}

export function evaluateCompliance(expiryDateStr?: string | null): {
  status: ComplianceStatus;
  daysRemaining: number | null;
} {
  // Missing cert date — warn but do not treat as expired/block dispatch
  if (!expiryDateStr) {
    return { status: 'NO_CERT', daysRemaining: null };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let expiry: Date;
  if (expiryDateStr.includes('-')) {
    const parts = expiryDateStr.split('T')[0].split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      expiry = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      expiry = new Date(expiryDateStr);
    }
  } else {
    expiry = new Date(expiryDateStr);
  }
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'EXPIRED', daysRemaining: diffDays };
  } else if (diffDays <= 30) {
    return { status: 'EXPIRING_SOON', daysRemaining: diffDays };
  }
  return { status: 'VALID', daysRemaining: diffDays };
}

export function getTankerCompliance(tanker: Tanker): TankerCompliance {
  const ins = evaluateCompliance(tanker.insurance_expiry);
  const insp = evaluateCompliance(tanker.inspection_expiry);

  // Only EXPIRED (past expiry date) blocks dispatch — NO_CERT and EXPIRING_SOON are warnings only
  const hasExpired = ins.status === 'EXPIRED' || insp.status === 'EXPIRED';
  const hasExpiringSoon = !hasExpired && (ins.status === 'EXPIRING_SOON' || insp.status === 'EXPIRING_SOON');
  const hasMissingCerts = ins.status === 'NO_CERT' || insp.status === 'NO_CERT';
  const isFullyCompliant = ins.status === 'VALID' && insp.status === 'VALID';
  const canDispatch = !hasExpired;

  return {
    insuranceStatus: ins.status,
    inspectionStatus: insp.status,
    daysToInsuranceExpiry: ins.daysRemaining,
    daysToInspectionExpiry: insp.daysRemaining,
    isFullyCompliant,
    hasExpired,
    hasExpiringSoon,
    hasMissingCerts,
    canDispatch,
  };
}

export async function getTankers(): Promise<Tanker[]> {
  const { data, error } = await supabase
    .from('tankers')
    .select('*')
    .order('registration_number');

  if (error) {
    console.error('Error fetching tankers:', error);
    throw new Error(error.message);
  }

  const list = ((data as Tanker[]) || []).map(enrichTankerTelematics);

  return list;
}

export async function getTankerDetails(tankerId: UUID): Promise<TankerDetailData> {
  const [tankerRes, dispatchesRes, receivingRes] = await Promise.all([
    supabase.from('tankers').select('*').eq('id', tankerId).single(),
    supabase
      .from('dispatches')
      .select('*, customer:customers(*), product:products(*), tank:tanks(*)')
      .eq('tanker_id', tankerId)
      .order('created_at', { ascending: false }),
    supabase
      .from('receiving_records')
      .select('*, supplier:suppliers(*), product:products(*), tank:tanks(*)')
      .eq('tanker_id', tankerId)
      .order('created_at', { ascending: false }),
  ]);

  if (tankerRes.error || !tankerRes.data) {
    throw new Error(`Tanker not found: ${tankerRes.error?.message}`);
  }

  const tanker = enrichTankerTelematics(tankerRes.data as Tanker);
  const dispatches = (dispatchesRes.data as Dispatch[]) || [];
  const receivingRecords = (receivingRes.data as ReceivingRecord[]) || [];

  // Extract order IDs from dispatches
  const orderIds = Array.from(
    new Set(dispatches.map((d) => d.order_id).filter(Boolean))
  ) as string[];

  let orders: Order[] = [];
  let invoices: Invoice[] = [];
  let payments: Payment[] = [];

  if (orderIds.length > 0) {
    const [ordersRes, invoicesRes] = await Promise.all([
      supabase
        .from('orders')
        .select('*, customer:customers(*), product:products(*)')
        .in('id', orderIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('invoices')
        .select('*, customer:customers(*)')
        .in('order_id', orderIds)
        .order('created_at', { ascending: false }),
    ]);

    orders = (ordersRes.data as Order[]) || [];
    invoices = (invoicesRes.data as Invoice[]) || [];

    const invoiceIds = invoices.map((inv) => inv.id).filter(Boolean);
    if (invoiceIds.length > 0) {
      const paymentsRes = await supabase
        .from('payments')
        .select('*, customer:customers(*)')
        .in('invoice_id', invoiceIds)
        .order('payment_date', { ascending: false });

      payments = (paymentsRes.data as Payment[]) || [];
    }
  }

  // Calculate Tanker Metrics
  const dispatchVol = dispatches.reduce(
    (acc, d) => acc + Number(d.quantity_loaded || d.quantity_ordered || 0),
    0
  );
  const receivingVol = receivingRecords.reduce(
    (acc, r) => acc + Number(r.quantity_received || r.quantity_ordered || 0),
    0
  );
  const totalVolumeLitres = dispatchVol + receivingVol;
  const totalTrips = dispatches.length + receivingRecords.length;
  const totalOrdersValue = orders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
  const totalInvoicedAmount = invoices.reduce((acc, inv) => acc + Number(inv.total_amount || 0), 0);
  const totalPaidAmount = invoices.reduce((acc, inv) => acc + Number(inv.amount_paid || 0), 0);
  const totalOutstandingBalance = invoices.reduce((acc, inv) => acc + Number(inv.balance_due || 0), 0);

  return {
    tanker,
    dispatches,
    orders,
    invoices,
    payments,
    receivingRecords,
    metrics: {
      totalTrips,
      totalVolumeLitres,
      totalOrdersValue,
      totalInvoicedAmount,
      totalPaidAmount,
      totalOutstandingBalance,
    },
  };
}

export async function createTanker(
  input: TankerInput,
  userId?: UUID
): Promise<Tanker> {
  if (!input.registration_number.trim()) {
    throw new Error('Registration number is required.');
  }

  if (input.capacity_litres <= 0) {
    throw new Error('Capacity must be greater than zero.');
  }

  const insertPayload: Record<string, any> = {
    registration_number: input.registration_number.trim().toUpperCase(),
    capacity_litres: input.capacity_litres,
    number_of_compartments: input.number_of_compartments || 1,
    driver_name: input.driver_name?.trim() || null,
    driver_phone: input.driver_phone?.trim() || null,
    transporter: input.transporter?.trim() || null,
    status: input.status || 'AVAILABLE',
    insurance_expiry: input.insurance_expiry || null,
    inspection_expiry: input.inspection_expiry || null,
  };
  if (input.tracker_imei?.trim()) {
    insertPayload.tracker_imei = input.tracker_imei.trim();
  }

  let { data, error } = await supabase
    .from('tankers')
    .insert(insertPayload)
    .select()
    .single();

  // If column doesn't exist in schema cache yet, retry without tracker_imei
  if (error && (error.message?.includes('tracker_imei') || error.code === 'PGRST204')) {
    delete insertPayload.tracker_imei;
    const retry = await supabase.from('tankers').insert(insertPayload).select().single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    throw new Error(`Failed to register tanker: ${error.message}`);
  }

  if (input.tracker_imei?.trim()) {
    saveLocalImei(data.id, input.tracker_imei.trim());
    saveLocalImei(data.registration_number, input.tracker_imei.trim());
  }

  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'TANKER_REGISTERED',
    entity_type: 'tankers',
    entity_id: data.id,
    new_values: {
      registration_number: data.registration_number,
      capacity_litres: data.capacity_litres,
      status: data.status,
    },
    description: `Registered new road tanker ${data.registration_number} (${data.capacity_litres.toLocaleString()} L) operated by ${data.transporter || 'Independent'}`,
  });

  return data as Tanker;
}

export async function updateTanker(
  id: UUID,
  input: Partial<TankerInput>,
  userId?: UUID
): Promise<Tanker> {
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.registration_number !== undefined) updates.registration_number = input.registration_number.trim().toUpperCase();
  if (input.capacity_litres !== undefined) updates.capacity_litres = input.capacity_litres;
  if (input.number_of_compartments !== undefined) updates.number_of_compartments = input.number_of_compartments;
  if (input.driver_name !== undefined) updates.driver_name = input.driver_name.trim();
  if (input.driver_phone !== undefined) updates.driver_phone = input.driver_phone.trim();
  if (input.transporter !== undefined) updates.transporter = input.transporter.trim();
  if (input.status !== undefined) updates.status = input.status;
  if (input.insurance_expiry !== undefined) updates.insurance_expiry = input.insurance_expiry;
  if (input.inspection_expiry !== undefined) updates.inspection_expiry = input.inspection_expiry;
  if (input.tracker_imei !== undefined) {
    updates.tracker_imei = input.tracker_imei?.trim() || null;
  }

  let { data, error } = await supabase
    .from('tankers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  // Fallback if tracker_imei column doesn't exist in schema cache
  if (error && (error.message?.includes('tracker_imei') || error.code === 'PGRST204')) {
    delete updates.tracker_imei;
    const retry = await supabase.from('tankers').update(updates).eq('id', id).select().single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    throw new Error(`Failed to update tanker: ${error.message}`);
  }

  if (input.tracker_imei?.trim()) {
    saveLocalImei(id, input.tracker_imei.trim());
    if (data?.registration_number) {
      saveLocalImei(data.registration_number, input.tracker_imei.trim());
    }
  }

  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'TANKER_UPDATED',
    entity_type: 'tankers',
    entity_id: id,
    new_values: updates,
    description: `Updated profile for tanker ${data.registration_number}`,
  });

  return data as Tanker;
}
