const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://znntmpbvlryhlhcvaroj.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpubnRtcGJ2bHJ5aGxoY3Zhcm9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODM3MjkyMywiZXhwIjoyMTAzOTQ4OTIzfQ._AJt0TDOMytvbtO-oqn_-3-mSN5AK2XXXONvtr8sr5g';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function addGasProduct() {
  console.log('--- Adding Gas (LPG) Product & Storage Tank ---');

  // 1. Insert Gas (LPG) into products
  const gasProduct = {
    id: 'b3b3a726-253c-4e8c-8f19-b5d123456783',
    name: 'Gas (LPG)',
    code: 'LPG',
    description: 'Liquefied Petroleum Gas - Bulk Commercial Grade',
    unit: 'L',
    current_price: 115.00,
    is_active: true,
  };

  const { data: prodData, error: prodError } = await supabase
    .from('products')
    .upsert(gasProduct, { onConflict: 'code' })
    .select()
    .single();

  if (prodError) {
    console.error('Error inserting Gas product:', prodError);
    return;
  }
  console.log('Gas (LPG) product upserted successfully:', prodData);

  // 2. Insert Tank G-01 (LPG Bullet Tank) into tanks
  const gasTank = {
    id: 'c4c4c4c4-253c-4e8c-8f19-c4c4c4c4c4c4',
    name: 'Tank G-01 (LPG Bullet)',
    code: 'G-01',
    product_id: prodData.id,
    capacity_litres: 300000,
    current_stock_litres: 220000,
    minimum_level_litres: 30000,
    maximum_level_litres: 290000,
    status: 'ACTIVE',
  };

  const { data: tankData, error: tankError } = await supabase
    .from('tanks')
    .upsert(gasTank, { onConflict: 'code' })
    .select()
    .single();

  if (tankError) {
    console.error('Error inserting Tank G-01:', tankError);
  } else {
    console.log('Tank G-01 (LPG Bullet) upserted successfully:', tankData);
  }

  // 3. Log Audit Trail
  await supabase.from('audit_logs').insert({
    action: 'PRODUCT_COMMISSIONED',
    entity_type: 'products',
    entity_id: prodData.id,
    new_values: { name: prodData.name, code: prodData.code, price: prodData.current_price },
    description: 'Commissioned new depot product: Gas (LPG) with dedicated bullet storage tank G-01',
  });

  console.log('--- Completed Adding Gas (LPG) ---');
}

addGasProduct();
