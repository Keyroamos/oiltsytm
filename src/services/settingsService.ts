import { supabase } from '../lib/supabase';
import type { Product, UUID } from '../types';

export interface DepotConfig {
  depot_name: string;
  epra_license: string;
  kra_pin: string;
  contact_phone: string;
  contact_email: string;
  physical_address: string;
  dip_tolerance_pct: number;
  safety_headroom_pct: number;
  compliance_alert_days: number;
  default_credit_days: number;
  bank_name: string;
  bank_branch: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_swift_code: string;
  mpesa_paybill: string;
}

const DEFAULT_CONFIG: DepotConfig = {
  depot_name: 'TARITA PETROLEUM',
  epra_license: 'EPRA/PET/DEP/2026-088',
  kra_pin: 'P052269374S',
  contact_phone: '[+254]721380380',
  contact_email: 'info@taritapetroleum.co.ke',
  physical_address: 'Kindaruma Road, Nairobi, Kenya',
  dip_tolerance_pct: 0.5,
  safety_headroom_pct: 5.0,
  compliance_alert_days: 14,
  default_credit_days: 30,
  bank_name: 'Standard Chartered Bank Kenya',
  bank_branch: 'Industrial Area Branch, Nairobi',
  bank_account_name: 'TARITA PETROLEUM LIMITED',
  bank_account_number: '0102045678900',
  bank_swift_code: 'SCBLKENX',
  mpesa_paybill: '889900',
};

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name');

  if (error) throw new Error(error.message);
  return ((data as Product[]) || []).filter(p => ['AGO', 'PMS'].includes(p.code));
}

export async function updateProductPrice(
  productId: UUID,
  newPrice: number,
  userId?: UUID
): Promise<Product> {
  const { data: existing } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  const { data, error } = await supabase
    .from('products')
    .update({
      current_price: newPrice,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'PRODUCT_PRICE_UPDATED',
    entity_type: 'products',
    entity_id: productId,
    old_values: { current_price: existing?.current_price },
    new_values: { current_price: newPrice },
    description: `Updated price for ${data.name} (${data.code}) from KES ${existing?.current_price} to KES ${newPrice}/L`,
  });

  return data as Product;
}

export function getDepotConfig(): DepotConfig {
  try {
    const stored = localStorage.getItem('petrodepot_config');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (!parsed.depot_name || parsed.depot_name.includes('MAFUTA') || parsed.depot_name.includes('ENERGYTECH')) {
        parsed.depot_name = DEFAULT_CONFIG.depot_name;
      }
      if (!parsed.bank_account_name || parsed.bank_account_name.includes('MAFUTA') || parsed.bank_account_name.includes('ENERGYTECH')) {
        parsed.bank_account_name = DEFAULT_CONFIG.bank_account_name;
      }
      if (!parsed.contact_email || parsed.contact_email.includes('mafuta') || parsed.contact_email.includes('energytech')) {
        parsed.contact_email = DEFAULT_CONFIG.contact_email;
      }
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (e) {
    console.error('Failed to parse depot config from localStorage', e);
  }
  return DEFAULT_CONFIG;
}

export function saveDepotConfig(config: DepotConfig, userId?: UUID): void {
  localStorage.setItem('petrodepot_config', JSON.stringify(config));
  // Audit log via supabase
  supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'DEPOT_CONFIG_UPDATED',
    entity_type: 'system_settings',
    new_values: config,
    description: `Updated system preferences & depot configuration for ${config.depot_name}`,
  }).then();
}
