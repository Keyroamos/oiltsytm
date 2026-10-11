const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://znntmpbvlryhlhcvaroj.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpubnRtcGJ2bHJ5aGxoY3Zhcm9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODM3MjkyMywiZXhwIjoyMTAzOTQ4OTIzfQ._AJt0TDOMytvbtO-oqn_-3-mSN5AK2XXXONvtr8sr5g';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function seed() {
  console.log('--- Starting Operational Seeding ---');

  // 1. Create or ensure Admin User in auth.users
  const email = 'admin@petrodepot.co.ke';
  const password = 'admin123';

  const { data: userList } = await supabase.auth.admin.listUsers();
  let adminUser = userList?.users?.find(u => u.email === email);

  if (!adminUser) {
    console.log(`Creating auth user: ${email}...`);
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Depot Manager' },
    });
    if (createError) {
      console.error('Error creating admin user:', createError);
      return;
    }
    adminUser = newUser.user;
    console.log(`Admin user created with ID: ${adminUser.id}`);
  } else {
    console.log(`Admin user already exists with ID: ${adminUser.id}`);
  }

  // 2. Ensure Profile exists and is SUPER_ADMIN
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: adminUser.id,
    full_name: 'Depot Manager',
    email,
    role: 'SUPER_ADMIN',
    is_active: true,
  });
  if (profileError) {
    console.error('Error upserting profile:', profileError);
  } else {
    console.log('Profile configured as SUPER_ADMIN');
  }

  // 3. Fetch existing master data
  const { data: products } = await supabase.from('products').select('*');
  const { data: tanks } = await supabase.from('tanks').select('*');
  const { data: customers } = await supabase.from('customers').select('*');
  const { data: tankers } = await supabase.from('tankers').select('*');
  const { data: suppliers } = await supabase.from('suppliers').select('*');

  if (!products?.length || !tanks?.length || !customers?.length || !tankers?.length || !suppliers?.length) {
    console.error('Missing prerequisite master data. Please verify seed.sql ran.');
    return;
  }

  const diesel = products.find(p => p.code === 'AGO') || products[0];
  const petrol = products.find(p => p.code === 'PMS') || products[1];

  const tankD01 = tanks.find(t => t.code === 'D-01') || tanks[0];
  const tankD02 = tanks.find(t => t.code === 'D-02') || tanks[1];
  const tankP01 = tanks.find(t => t.code === 'P-01') || tanks[2];

  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  // 4. Seed Receiving Records (Today & Recent)
  console.log('Seeding Receiving Records...');
  const receivingRecords = [
    {
      id: 'a1a1a1a1-253c-4e8c-8f19-a1a1a1a1a1a1',
      supplier_id: suppliers[0].id,
      product_id: diesel.id,
      tank_id: tankD01.id,
      tanker_id: tankers[0].id,
      quantity_ordered: 80000,
      quantity_received: 80000,
      reference_number: 'RCV-2026-001',
      receiving_date: todayStr,
      arrival_time: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      driver_name: tankers[0].driver_name,
      meter_reading: 1450200,
      quality_status: 'PASSED',
      status: 'RECEIVED',
      created_by: adminUser.id,
    }
  ];

  for (const r of receivingRecords) {
    await supabase.from('receiving_records').upsert(r, { onConflict: 'id' });
  }

  // 5. Seed Customer Orders
  console.log('Seeding Orders...');
  const orders = [
    {
      id: 'b1b1b1b1-253c-4e8c-8f19-b1b1b1b1b1b1',
      order_number: 'ORD-2026-001',
      customer_id: customers[0].id,
      product_id: diesel.id,
      quantity_litres: 40000,
      unit_price: diesel.current_price,
      total_amount: 40000 * diesel.current_price,
      status: 'COMPLETED',
      requested_date: todayStr,
      created_by: adminUser.id,
      approved_by: adminUser.id,
      approved_at: now,
    },
    {
      id: 'b2b2b2b2-253c-4e8c-8f19-b2b2b2b2b2b2',
      order_number: 'ORD-2026-002',
      customer_id: customers[1].id,
      product_id: petrol.id,
      quantity_litres: 35000,
      unit_price: petrol.current_price,
      total_amount: 35000 * petrol.current_price,
      status: 'COMPLETED',
      requested_date: todayStr,
      created_by: adminUser.id,
      approved_by: adminUser.id,
      approved_at: now,
    },
    {
      id: 'b3b3b3b3-253c-4e8c-8f19-b3b3b3b3b3b3',
      order_number: 'ORD-2026-003',
      customer_id: customers[2].id,
      product_id: diesel.id,
      quantity_litres: 45000,
      unit_price: diesel.current_price,
      total_amount: 45000 * diesel.current_price,
      status: 'LOADING',
      requested_date: todayStr,
      created_by: adminUser.id,
      approved_by: adminUser.id,
      approved_at: now,
    },
    {
      id: 'b5b5b5b5-253c-4e8c-8f19-b5b5b5b5b5b5',
      order_number: 'ORD-2026-005',
      customer_id: customers[4].id,
      product_id: diesel.id,
      quantity_litres: 40000,
      unit_price: diesel.current_price,
      total_amount: 40000 * diesel.current_price,
      status: 'DISPATCHED',
      requested_date: todayStr,
      created_by: adminUser.id,
      approved_by: adminUser.id,
      approved_at: now,
    }
  ];

  for (const o of orders) {
    await supabase.from('orders').upsert(o, { onConflict: 'id' });
  }

  // 6. Seed Dispatches
  console.log('Seeding Dispatches...');
  const dispatches = [
    {
      id: 'c1c1c1c1-253c-4e8c-8f19-d1d1d1d10001',
      dispatch_number: 'DSP-2026-001',
      order_id: orders[0].id,
      customer_id: customers[0].id,
      product_id: diesel.id,
      tank_id: tankD01.id,
      tanker_id: tankers[0].id,
      quantity_ordered: 40000,
      quantity_loaded: 40000,
      loading_bay: 'Bay 1',
      loading_started_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      loading_completed_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      dispatch_time: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      status: 'DELIVERED',
      created_by: adminUser.id,
    },
    {
      id: 'c2c2c2c2-253c-4e8c-8f19-d1d1d1d10002',
      dispatch_number: 'DSP-2026-002',
      order_id: orders[1].id,
      customer_id: customers[1].id,
      product_id: petrol.id,
      tank_id: tankP01.id,
      tanker_id: tankers[1].id,
      quantity_ordered: 35000,
      quantity_loaded: 35000,
      loading_bay: 'Bay 2',
      loading_started_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      loading_completed_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      dispatch_time: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
      status: 'DELIVERED',
      created_by: adminUser.id,
    },
    {
      id: 'c3c3c3c3-253c-4e8c-8f19-d1d1d1d10003',
      dispatch_number: 'DSP-2026-003',
      order_id: orders[2].id,
      customer_id: customers[2].id,
      product_id: diesel.id,
      tank_id: tankD01.id,
      tanker_id: tankers[2].id,
      quantity_ordered: 45000,
      quantity_loaded: 45000,
      loading_bay: 'Bay 1',
      loading_started_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
      status: 'LOADING',
      created_by: adminUser.id,
    },

    {
      id: 'c5c5c5c5-253c-4e8c-8f19-d1d1d1d10005',
      dispatch_number: 'DSP-2026-005',
      order_id: orders[4].id,
      customer_id: customers[4].id,
      product_id: diesel.id,
      tank_id: tankD02.id,
      tanker_id: tankers[4].id,
      quantity_ordered: 40000,
      quantity_loaded: 40000,
      loading_bay: 'Bay 2',
      loading_started_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      loading_completed_at: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
      dispatch_time: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      status: 'DISPATCHED',
      created_by: adminUser.id,
    }
  ];

  for (const d of dispatches) {
    await supabase.from('dispatches').upsert(d, { onConflict: 'id' });
  }

  // 7. Seed Invoices
  console.log('Seeding Invoices...');
  const invoices = [
    {
      id: 'e1e1e1e1-253c-4e8c-8f19-inv000000001',
      invoice_number: 'INV-2026-001',
      customer_id: customers[0].id,
      order_id: orders[0].id,
      subtotal: orders[0].total_amount,
      tax_amount: orders[0].total_amount * 0.16,
      total_amount: orders[0].total_amount * 1.16,
      amount_paid: 2000000,
      balance_due: (orders[0].total_amount * 1.16) - 2000000,
      status: 'PARTIALLY_PAID',
      due_date: new Date(Date.now() + 14 * 86400 * 1000).toISOString().split('T')[0],
    },
    {
      id: 'e2e2e2e2-253c-4e8c-8f19-inv000000002',
      invoice_number: 'INV-2026-002',
      customer_id: customers[1].id,
      order_id: orders[1].id,
      subtotal: orders[1].total_amount,
      tax_amount: orders[1].total_amount * 0.16,
      total_amount: orders[1].total_amount * 1.16,
      amount_paid: orders[1].total_amount * 1.16,
      balance_due: 0,
      status: 'PAID',
      due_date: new Date(Date.now() + 7 * 86400 * 1000).toISOString().split('T')[0],
    }
  ];

  for (const inv of invoices) {
    await supabase.from('invoices').upsert(inv, { onConflict: 'id' });
  }

  // 8. Seed Stock Transactions (Reflecting movements)
  console.log('Seeding Stock Transactions...');
  const transactions = [
    {
      tank_id: tankD01.id,
      product_id: diesel.id,
      transaction_type: 'RECEIVING',
      quantity_litres: 80000,
      reference_type: 'RECEIVING',
      reference_id: receivingRecords[0].id,
      previous_balance: 310000,
      new_balance: 390000,
      notes: 'Inbound fuel delivery from Kenya Petroleum Ltd',
      created_by: adminUser.id,
    },
    {
      tank_id: tankD01.id,
      product_id: diesel.id,
      transaction_type: 'DISPATCH',
      quantity_litres: 40000,
      reference_type: 'DISPATCH',
      reference_id: dispatches[0].id,
      previous_balance: 390000,
      new_balance: 350000,
      notes: 'Dispatched to XYZ Fuel Ltd via KDG 123A',
      created_by: adminUser.id,
    },
    {
      tank_id: tankP01.id,
      product_id: petrol.id,
      transaction_type: 'DISPATCH',
      quantity_litres: 35000,
      reference_type: 'DISPATCH',
      reference_id: dispatches[1].id,
      previous_balance: 455000,
      new_balance: 420000,
      notes: 'Dispatched to Metro Stations via KBX 567B',
      created_by: adminUser.id,
    }
  ];

  for (const tx of transactions) {
    await supabase.from('stock_transactions').insert(tx);
  }

  console.log('Operational seed completed successfully!');
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
