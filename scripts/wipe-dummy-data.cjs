const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://znntmpbvlryhlhcvaroj.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpubnRtcGJ2bHJ5aGxoY3Zhcm9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODM3MjkyMywiZXhwIjoyMTAzOTQ4OTIzfQ._AJt0TDOMytvbtO-oqn_-3-mSN5AK2XXXONvtr8sr5g';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function wipeDummyData() {
  console.log('--- Wiping All Dummy Data (Preserving Users & Product Catalog) ---');

  // 1. Delete Payments
  const { error: errPay, count: countPay } = await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Payments cleared:', errPay ? errPay.message : 'OK');

  // 2. Delete Invoices
  const { error: errInv } = await supabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Invoices cleared:', errInv ? errInv.message : 'OK');

  // 3. Delete Dispatches
  const { error: errDsp } = await supabase.from('dispatches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Dispatches cleared:', errDsp ? errDsp.message : 'OK');

  // 4. Delete Receiving Records
  const { error: errRcv } = await supabase.from('receiving_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Receiving records cleared:', errRcv ? errRcv.message : 'OK');

  // 5. Delete Stock Transactions
  const { error: errTx } = await supabase.from('stock_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Stock transactions cleared:', errTx ? errTx.message : 'OK');

  // 6. Delete Orders
  const { error: errOrd } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Orders cleared:', errOrd ? errOrd.message : 'OK');

  // 7. Delete Customers
  const { error: errCust } = await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Customers cleared:', errCust ? errCust.message : 'OK');

  // 8. Delete Suppliers
  const { error: errSupp } = await supabase.from('suppliers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Suppliers cleared:', errSupp ? errSupp.message : 'OK');

  // 9. Delete Tankers
  const { error: errTnk } = await supabase.from('tankers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Tankers cleared:', errTnk ? errTnk.message : 'OK');

  // 10. Delete Tanks
  const { error: errTanks } = await supabase.from('tanks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Tanks cleared:', errTanks ? errTanks.message : 'OK');

  // 11. Delete Audit Logs
  const { error: errAudit } = await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Audit logs cleared:', errAudit ? errAudit.message : 'OK');

  // 12. Verify Users Still Exist
  const { data: users } = await supabase.from('profiles').select('id, full_name, email, role');
  console.log('--- VERIFICATION: USERS KEPT INTACT ---');
  console.log(users);

  // 13. Verify Products Still Exist
  const { data: products } = await supabase.from('products').select('id, name, code, current_price');
  console.log('--- VERIFICATION: PRODUCT CATALOG KEPT ---');
  console.log(products);

  console.log('--- PRODUCTION RESET COMPLETED SUCCESSFULLY ---');
}

wipeDummyData();
