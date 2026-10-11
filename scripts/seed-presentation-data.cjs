const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wamcotcjwffawgzmqgpl.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhbWNvdGNqd2ZmYXdnem1xZ3BsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODg1Mzk5NCwiZXhwIjoyMTA0NDI5OTk0fQ.KBcoN3jnjmQQoWK5zBsbPwfUOmk-AxCFiolIfuBmCOQ';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function seedPresentationData() {
  console.log('=== SEEDING PRESENTATION DATA FOR OYLSYSTEM ===');

  const adminUserId = '3ea0767e-9c37-423f-8802-7caf7947f243';
  const todayStr = new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();

  // 1. Fetch Products
  const { data: products, error: pErr } = await supabase.from('products').select('*');
  if (pErr || !products?.length) {
    throw new Error('Failed to fetch products: ' + JSON.stringify(pErr));
  }
  const lpg = products.find(p => p.code === 'LPG') || products[0];
  const diesel = products.find(p => p.code === 'AGO') || products[1];
  const petrol = products.find(p => p.code === 'PMS') || products[2];

  console.log(`Products: LPG (${lpg.id}), Diesel (${diesel.id}), Petrol (${petrol.id})`);

  // 2. Fetch Storage Tanks
  const { data: tanks, error: tErr } = await supabase.from('tanks').select('*');
  if (tErr || !tanks?.length) {
    throw new Error('Failed to fetch tanks: ' + JSON.stringify(tErr));
  }
  const tankD01 = tanks.find(t => t.code === 'D-01');
  const tankD02 = tanks.find(t => t.code === 'D-02');
  const tankP01 = tanks.find(t => t.code === 'P-01');
  const tankG01 = tanks.find(t => t.code === 'G-01');
  const tankFleet = tanks.find(t => t.code.includes('FLEET'));

  // Update Tank Stock Levels for realistic visuals
  if (tankD01) {
    await supabase.from('tanks').update({ current_stock_litres: 320000 }).eq('id', tankD01.id);
  }
  if (tankD02) {
    await supabase.from('tanks').update({ current_stock_litres: 180000 }).eq('id', tankD02.id);
  }
  if (tankP01) {
    await supabase.from('tanks').update({ current_stock_litres: 285000 }).eq('id', tankP01.id);
  }
  if (tankG01) {
    await supabase.from('tanks').update({ current_stock_litres: 195000 }).eq('id', tankG01.id);
  }
  if (tankFleet) {
    await supabase.from('tanks').update({ current_stock_litres: 26200 }).eq('id', tankFleet.id);
  }
  console.log('✓ Storage Tanks updated with realistic stock levels.');

  // 3. Upsert Suppliers
  console.log('Seeding Suppliers...');
  const suppliersData = [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      name: 'AGOL (African Gas & Oil Ltd)',
      code: 'SUP-AGOL',
      phone: '+254 746 922 201',
      email: 'operations@agol.co.ke',
      address: 'Mbaraki Terminal, Mombasa',
      credit_terms: 'Net 30',
      is_active: true
    },
    {
      id: 'a0000000-0000-0000-0000-000000000002',
      name: 'Lake Gas Limited',
      code: 'SUP-LAKEGAS',
      phone: '+254 722 554 433',
      email: 'dispatch@lakegas.co.ke',
      address: 'Shimanzi Terminal, Mombasa',
      credit_terms: 'Net 30',
      is_active: true
    },
    {
      id: 'a0000000-0000-0000-0000-000000000003',
      name: 'Kenya Petroleum Refineries Ltd',
      code: 'SUP-KPC',
      phone: '+254 720 112 233',
      email: 'inbound@kpc.co.ke',
      address: 'KOSF Terminal, Kipevu',
      credit_terms: 'Net 15',
      is_active: true
    }
  ];

  for (const s of suppliersData) {
    const { error } = await supabase.from('suppliers').upsert(s, { onConflict: 'code' });
    if (error) console.error('Supplier error:', error.message);
  }
  console.log('✓ Suppliers seeded.');

  // 4. Upsert Customers
  console.log('Seeding Customers...');
  const customersData = [
    {
      id: 'b0000000-0000-0000-0000-000000000001',
      name: 'KENTO-GITARU',
      code: 'CUST-001',
      phone: '+254 726 667 788',
      email: 'billing@kento-gitaru.co.ke',
      address: 'Gitaru Sub-Depot, Nairobi Corridor',
      credit_limit: 5000000,
      current_balance: 2999900,
      payment_terms: '5 Days Credit',
      is_active: true
    },
    {
      id: 'b0000000-0000-0000-0000-000000000002',
      name: 'MOGAS-SAGANA',
      code: 'CUST-002',
      phone: '+254 722 223 344',
      email: 'accounts@mogas-sagana.co.ke',
      address: 'Nyeri-Nairobi Highway Station, Sagana',
      credit_limit: 5000000,
      current_balance: 0,
      payment_terms: '5 Days Credit',
      is_active: true
    },
    {
      id: 'b0000000-0000-0000-0000-000000000003',
      name: 'KENTO-KAKAMEGA',
      code: 'CUST-003',
      phone: '+254 721 112 233',
      email: 'depot@kento-kakamega.co.ke',
      address: 'Kakamega Highway Depot',
      credit_limit: 6000000,
      current_balance: 0,
      payment_terms: 'Net 15',
      is_active: true
    },
    {
      id: 'b0000000-0000-0000-0000-000000000004',
      name: 'MOGAS-KABUKU',
      code: 'CUST-004',
      phone: '+254 724 445 566',
      email: 'manager@mogas-kabuku.co.ke',
      address: 'Kabuku Junction Terminal',
      credit_limit: 4000000,
      current_balance: 0,
      payment_terms: 'Net 7',
      is_active: true
    },
    {
      id: 'b0000000-0000-0000-0000-000000000005',
      name: 'GICHOMU ENERGY',
      code: 'CUST-005',
      phone: '+254 725 556 677',
      email: 'info@gichomuenergy.com',
      address: 'Embu-Meru Highway Terminal',
      credit_limit: 5000000,
      current_balance: 0,
      payment_terms: '5 Days Credit',
      is_active: true
    }
  ];

  for (const c of customersData) {
    const { error } = await supabase.from('customers').upsert(c, { onConflict: 'code' });
    if (error) console.error('Customer error:', error.message);
  }
  console.log('✓ Customers seeded.');

  // 5. Update Tankers (focusing on two active trucks: KDT 991Q and KDT 992Q)
  console.log('Configuring Tankers...');
  const { data: allTankers } = await supabase.from('tankers').select('*');
  const truck1 = allTankers.find(t => t.registration_number === 'KDT 991Q');
  const truck2 = allTankers.find(t => t.registration_number === 'KDT 992Q');
  const truck3 = allTankers.find(t => t.registration_number === 'KDX 991B');

  if (truck1) {
    await supabase.from('tankers').update({
      driver_name: 'David Kiprono',
      driver_phone: '+254 712 345 678',
      status: 'IN_TRANSIT',
      current_stock_litres: 26200,
      current_latitude: -1.502064,
      current_longitude: 37.086905,
      location_address: 'Machakos Junction — In Transit to Gitaru',
      speed_kmh: 58,
      heading_degrees: 315,
      location_updated_at: nowIso,
    }).eq('id', truck1.id);
  }

  if (truck2) {
    await supabase.from('tankers').update({
      driver_name: 'Erick Mureithi',
      driver_phone: '+254 726 697 534',
      status: 'DELIVERED',
      current_stock_litres: 0,
      current_latitude: -0.665412,
      current_longitude: 37.201452,
      location_address: 'Sagana Depot Area — Offloaded',
      speed_kmh: 0,
      heading_degrees: 0,
      location_updated_at: nowIso,
    }).eq('id', truck2.id);
  }

  if (truck3) {
    await supabase.from('tankers').update({
      driver_name: 'Peter Otieno',
      driver_phone: '+254 799 395 721',
      status: 'AVAILABLE',
      current_stock_litres: 0,
      current_latitude: -1.307059,
      current_longitude: 36.884890,
      location_address: 'Nairobi Central Terminal Area',
      speed_kmh: 0,
      heading_degrees: 0,
      location_updated_at: nowIso,
    }).eq('id', truck3.id);
  }
  console.log('✓ Tankers configured (KDT 991Q & KDT 992Q active).');

  // 6. Seed Inbound Receiving Records
  console.log('Seeding Receiving Records...');
  const receivingRecords = [
    {
      id: 'c0000000-0000-0000-0000-000000000001',
      supplier_id: suppliersData[0].id, // AGOL
      product_id: lpg.id,
      tank_id: tankG01 ? tankG01.id : tankFleet.id,
      tanker_id: truck1 ? truck1.id : null,
      quantity_ordered: 26200,
      quantity_received: 26200,
      reference_number: 'RCV-2026-001',
      receiving_date: todayStr,
      arrival_time: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      driver_name: 'David Kiprono',
      meter_reading: 245000,
      quality_status: 'PASSED',
      status: 'RECEIVED',
      purchase_price: 100.0,
      purchase_total: 2620000.0,
      total_cost: 2757000.0,
      transport_cost: 120000.0,
      driver_allowance: 12000.0,
      toll_fees: 5000.0,
      loading_charges: 20000.0,
      total_delivery_cost: 137000.0,
      destination_type: 'DIRECT_CLIENT',
      destination_customer_id: customersData[0].id, // KENTO-GITARU
      client_selling_price: 114.50,
      client_total_amount: 2999900.0,
      notes: 'LPG Consignment — Truck: KDT 991Q | Client: KENTO-GITARU | Landed cost KES 105.2/kg<!--COST_META:{"purchase_price":100,"purchase_total":2620000,"transport_cost":120000,"total_delivery_cost":137000,"total_cost":2757000,"destination_type":"DIRECT_CLIENT","destination_customer_id":"' + customersData[0].id + '","client_selling_price":114.5,"client_total_amount":2999900}-->',
      created_by: adminUserId
    },
    {
      id: 'c0000000-0000-0000-0000-000000000002',
      supplier_id: suppliersData[1].id, // Lake Gas
      product_id: lpg.id,
      tank_id: tankG01 ? tankG01.id : tankFleet.id,
      tanker_id: truck2 ? truck2.id : null,
      quantity_ordered: 26000,
      quantity_received: 26000,
      reference_number: 'RCV-2026-002',
      receiving_date: todayStr,
      arrival_time: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      driver_name: 'Erick Mureithi',
      meter_reading: 219000,
      quality_status: 'PASSED',
      status: 'RECEIVED',
      purchase_price: 100.0,
      purchase_total: 2600000.0,
      total_cost: 2703000.0,
      transport_cost: 89000.0,
      driver_allowance: 14000.0,
      toll_fees: 0.0,
      loading_charges: 0.0,
      total_delivery_cost: 103000.0,
      destination_type: 'DIRECT_CLIENT',
      destination_customer_id: customersData[1].id, // MOGAS-SAGANA
      client_selling_price: 114.00,
      client_total_amount: 2964000.0,
      notes: 'LPG Consignment — Truck: KDT 992Q | Client: MOGAS-SAGANA | Landed cost KES 104.0/kg<!--COST_META:{"purchase_price":100,"purchase_total":2600000,"transport_cost":89000,"total_delivery_cost":103000,"total_cost":2703000,"destination_type":"DIRECT_CLIENT","destination_customer_id":"' + customersData[1].id + '","client_selling_price":114.0,"client_total_amount":2964000}-->',
      created_by: adminUserId
    },
    {
      id: 'c0000000-0000-0000-0000-000000000003',
      supplier_id: suppliersData[2].id, // KPC
      product_id: diesel.id,
      tank_id: tankD01 ? tankD01.id : null,
      tanker_id: null,
      quantity_ordered: 80000,
      quantity_received: 80000,
      reference_number: 'RCV-2026-003',
      receiving_date: todayStr,
      arrival_time: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
      driver_name: 'Depot Pipeline Direct',
      meter_reading: 1540000,
      quality_status: 'PASSED',
      status: 'RECEIVED',
      purchase_price: 142.0,
      purchase_total: 11360000.0,
      total_cost: 11360000.0,
      destination_type: 'COMPANY_DEPOT',
      notes: 'Bulk Diesel Replenishment into Tank D-01 from Pipeline Main',
      created_by: adminUserId
    }
  ];

  for (const r of receivingRecords) {
    const { error } = await supabase.from('receiving_records').upsert(r, { onConflict: 'id' });
    if (error) console.error('Receiving error:', error.message);
  }
  console.log('✓ Receiving records seeded.');

  // 7. Seed Customer Orders
  console.log('Seeding Customer Orders...');
  const ordersData = [
    {
      id: 'd0000000-0000-0000-0000-000000000001',
      order_number: 'ORD-2026-001',
      customer_id: customersData[0].id, // KENTO-GITARU
      product_id: lpg.id,
      quantity_litres: 26200,
      unit_price: 114.50,
      total_amount: 2999900.0,
      status: 'DISPATCHED',
      requested_date: todayStr,
      notes: 'Trip TRIP-2026-001 | Truck: KDT 991Q | Driver: David Kiprono',
      created_by: adminUserId,
      approved_by: adminUserId,
      approved_at: nowIso,
    },
    {
      id: 'd0000000-0000-0000-0000-000000000002',
      order_number: 'ORD-2026-002',
      customer_id: customersData[1].id, // MOGAS-SAGANA
      product_id: lpg.id,
      quantity_litres: 26000,
      unit_price: 114.00,
      total_amount: 2964000.0,
      status: 'COMPLETED',
      requested_date: todayStr,
      notes: 'Trip TRIP-2026-002 | Truck: KDT 992Q | Driver: Erick Mureithi',
      created_by: adminUserId,
      approved_by: adminUserId,
      approved_at: nowIso,
    },
    {
      id: 'd0000000-0000-0000-0000-000000000003',
      order_number: 'ORD-2026-003',
      customer_id: customersData[2].id, // KENTO-KAKAMEGA
      product_id: diesel.id,
      quantity_litres: 35000,
      unit_price: 162.00,
      total_amount: 5670000.0,
      status: 'COMPLETED',
      requested_date: todayStr,
      notes: 'Trip TRIP-2026-003 | Bulk Diesel Delivery',
      created_by: adminUserId,
      approved_by: adminUserId,
      approved_at: nowIso,
    }
  ];

  for (const o of ordersData) {
    const { error } = await supabase.from('orders').upsert(o, { onConflict: 'id' });
    if (error) console.error('Order error:', error.message);
  }
  console.log('✓ Customer Orders seeded.');

  // 8. Seed Dispatches
  console.log('Seeding Dispatches...');
  const dispatchesData = [
    {
      id: 'e0000000-0000-0000-0000-000000000001',
      dispatch_number: 'DSP-2026-001',
      order_id: ordersData[0].id,
      customer_id: customersData[0].id,
      product_id: lpg.id,
      tank_id: tankG01 ? tankG01.id : tankFleet.id,
      tanker_id: truck1.id,
      quantity_ordered: 26200,
      quantity_loaded: 26200,
      loading_bay: 'Bay 1 - LPG Gantry',
      loading_started_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      loading_completed_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      dispatch_time: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
      driver_name: 'David Kiprono',
      driver_phone: '+254 712 345 678',
      seal_number: 'NWE-991Q-1, NWE-991Q-2, NWE-991Q-3',
      status: 'DISPATCHED',
      notes: 'Consignment in transit to Gitaru. Pre-trip safety inspection complete.',
      created_by: adminUserId,
    },
    {
      id: 'e0000000-0000-0000-0000-000000000002',
      dispatch_number: 'DSP-2026-002',
      order_id: ordersData[1].id,
      customer_id: customersData[1].id,
      product_id: lpg.id,
      tank_id: tankG01 ? tankG01.id : tankFleet.id,
      tanker_id: truck2.id,
      quantity_ordered: 26000,
      quantity_loaded: 26000,
      loading_bay: 'Bay 2 - LPG Gantry',
      loading_started_at: new Date(Date.now() - 7 * 3600 * 1000).toISOString(),
      loading_completed_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      dispatch_time: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      delivered_at: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
      driver_name: 'Erick Mureithi',
      driver_phone: '+254 726 697 534',
      seal_number: 'NWE-992Q-1, NWE-992Q-2, NWE-992Q-3',
      status: 'DELIVERED',
      notes: 'Successfully offloaded at Mogas Sagana station tanks. Delivery receipt signed.',
      created_by: adminUserId,
    },
    {
      id: 'e0000000-0000-0000-0000-000000000003',
      dispatch_number: 'DSP-2026-003',
      order_id: ordersData[2].id,
      customer_id: customersData[2].id,
      product_id: diesel.id,
      tank_id: tankD01 ? tankD01.id : null,
      tanker_id: truck3 ? truck3.id : truck1.id,
      quantity_ordered: 35000,
      quantity_loaded: 35000,
      loading_bay: 'Bay 3 - Fuel Gantry',
      loading_started_at: new Date(Date.now() - 9 * 3600 * 1000).toISOString(),
      loading_completed_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      dispatch_time: new Date(Date.now() - 7 * 3600 * 1000).toISOString(),
      delivered_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      driver_name: 'Peter Otieno',
      driver_phone: '+254 799 395 721',
      seal_number: 'NWE-991B-1, NWE-991B-2, NWE-991B-3, NWE-991B-4',
      status: 'DELIVERED',
      notes: 'Delivered to Kento Kakamega. Meter reading verified.',
      created_by: adminUserId,
    }
  ];

  for (const d of dispatchesData) {
    const { error } = await supabase.from('dispatches').upsert(d, { onConflict: 'id' });
    if (error) console.error('Dispatch error:', error.message);
  }
  console.log('✓ Dispatches seeded.');

  // 9. Seed Invoices & eTIMS Compliance
  console.log('Seeding Invoices...');
  const invoicesData = [
    {
      id: 'f0000000-0000-0000-0000-000000000001',
      invoice_number: 'INV-2026-001',
      customer_id: customersData[0].id, // KENTO-GITARU
      order_id: ordersData[0].id,
      subtotal: 2999900.0,
      tax_amount: 0.0,
      total_amount: 2999900.0,
      amount_paid: 0.0,
      balance_due: 2999900.0,
      status: 'ISSUED',
      due_date: new Date(Date.now() + 5 * 86400 * 1000).toISOString().split('T')[0],
      etims_status: 'VERIFIED',
      etims_cu_number: 'KRAOSCU0198166821',
      etims_scu_id: 'KRA-OSCU-DEPOT-01',
      etims_signing_code: '7514-8921-2AAB-2026',
      etims_qr_code: 'https://itax.kra.go.ke/KRA-Portal/invoiceConfirmation.htm?itn=INV-2026-001&cu=KRAOSCU0198166821&sign=7514-8921-2AAB-2026',
      etims_transmitted_at: nowIso,
    },
    {
      id: 'f0000000-0000-0000-0000-000000000002',
      invoice_number: 'INV-2026-002',
      customer_id: customersData[1].id, // MOGAS-SAGANA
      order_id: ordersData[1].id,
      subtotal: 2964000.0,
      tax_amount: 0.0,
      total_amount: 2964000.0,
      amount_paid: 2964000.0,
      balance_due: 0.0,
      status: 'PAID',
      due_date: new Date(Date.now() + 5 * 86400 * 1000).toISOString().split('T')[0],
      etims_status: 'VERIFIED',
      etims_cu_number: 'KRAOSCU0198166822',
      etims_scu_id: 'KRA-OSCU-DEPOT-01',
      etims_signing_code: '8123-4412-9FCD-2026',
      etims_qr_code: 'https://itax.kra.go.ke/KRA-Portal/invoiceConfirmation.htm?itn=INV-2026-002&cu=KRAOSCU0198166822&sign=8123-4412-9FCD-2026',
      etims_transmitted_at: nowIso,
    },
    {
      id: 'f0000000-0000-0000-0000-000000000003',
      invoice_number: 'INV-2026-003',
      customer_id: customersData[2].id, // KENTO-KAKAMEGA
      order_id: ordersData[2].id,
      subtotal: 5670000.0,
      tax_amount: 0.0,
      total_amount: 5670000.0,
      amount_paid: 5670000.0,
      balance_due: 0.0,
      status: 'PAID',
      due_date: new Date(Date.now() + 15 * 86400 * 1000).toISOString().split('T')[0],
      etims_status: 'VERIFIED',
      etims_cu_number: 'KRAOSCU0198166823',
      etims_scu_id: 'KRA-OSCU-DEPOT-01',
      etims_signing_code: '9041-3312-5BCE-2026',
      etims_qr_code: 'https://itax.kra.go.ke/KRA-Portal/invoiceConfirmation.htm?itn=INV-2026-003&cu=KRAOSCU0198166823&sign=9041-3312-5BCE-2026',
      etims_transmitted_at: nowIso,
    }
  ];

  for (const inv of invoicesData) {
    const { error } = await supabase.from('invoices').upsert(inv, { onConflict: 'id' });
    if (error) console.error('Invoice error:', error.message);
  }
  console.log('✓ Invoices seeded.');

  // Link invoices back to receiving records
  await supabase.from('receiving_records').update({ generated_invoice_id: invoicesData[0].id }).eq('id', receivingRecords[0].id);
  await supabase.from('receiving_records').update({ generated_invoice_id: invoicesData[1].id }).eq('id', receivingRecords[1].id);

  // 10. Seed Payments
  console.log('Seeding Payments...');
  const paymentsData = [
    {
      id: '11000000-0000-0000-0000-000000000001',
      customer_id: customersData[1].id,
      invoice_id: invoicesData[1].id,
      amount: 2964000.0,
      payment_method: 'BANK',
      reference_number: 'EFT-KCB-994120',
      payment_date: todayStr,
      notes: 'Direct RTGS Bank Settlement for INV-2026-002 (KDT 992Q consignment)',
      created_by: adminUserId,
    },
    {
      id: '11000000-0000-0000-0000-000000000002',
      customer_id: customersData[2].id,
      invoice_id: invoicesData[2].id,
      amount: 5670000.0,
      payment_method: 'BANK',
      reference_number: 'RTGS-NCBA-33189',
      payment_date: todayStr,
      notes: 'Full payment for Diesel Delivery INV-2026-003',
      created_by: adminUserId,
    }
  ];

  for (const pay of paymentsData) {
    const { error } = await supabase.from('payments').upsert(pay, { onConflict: 'id' });
    if (error) console.error('Payment error:', error.message);
  }
  console.log('✓ Payments seeded.');

  // 11. Seed Operational Expenses (Linked to Trucks)
  console.log('Seeding Operational Expenses for Trucks...');
  const expensesData = [
    {
      id: '22000000-0000-0000-0000-000000000001',
      expense_number: 'EXP-2026-001',
      category: 'TRUCK_FUEL',
      title: 'Fuel Dispensing - KDT 992Q Sagana Route',
      amount: 89000.0,
      expense_date: todayStr,
      allocation_type: 'TRUCK',
      tanker_id: truck2 ? truck2.id : null,
      vehicle_registration: 'KDT 992Q',
      payee_vendor: 'LUQMAN PETROLEUM',
      payment_method: 'MPESA',
      reference_number: 'MP-LUQ-99201',
      status: 'PAID',
      notes: 'Standard diesel fuel refill for road trip to Sagana',
      created_by: adminUserId,
    },
    {
      id: '22000000-0000-0000-0000-000000000002',
      expense_number: 'EXP-2026-002',
      category: 'DRIVER_ALLOWANCE',
      title: 'Driver Mileage Allowance - Erick Mureithi',
      amount: 14000.0,
      expense_date: todayStr,
      allocation_type: 'TRUCK',
      tanker_id: truck2 ? truck2.id : null,
      vehicle_registration: 'KDT 992Q',
      payee_vendor: 'Erick Mureithi',
      payment_method: 'MPESA',
      reference_number: 'MP-DRV-99202',
      status: 'PAID',
      notes: 'Trip per diem and offloading allowance',
      created_by: adminUserId,
    },
    {
      id: '22000000-0000-0000-0000-000000000003',
      expense_number: 'EXP-2026-003',
      category: 'TRUCK_FUEL',
      title: 'Fuel Dispensing - KDT 991Q Gitaru Route',
      amount: 92000.0,
      expense_date: todayStr,
      allocation_type: 'TRUCK',
      tanker_id: truck1 ? truck1.id : null,
      vehicle_registration: 'KDT 991Q',
      payee_vendor: 'LUQMAN PETROLEUM',
      payment_method: 'MPESA',
      reference_number: 'MP-LUQ-99103',
      status: 'PAID',
      notes: 'Full tank transit fuel refill',
      created_by: adminUserId,
    },
    {
      id: '22000000-0000-0000-0000-000000000004',
      expense_number: 'EXP-2026-004',
      category: 'TOLLS_WEIGHBRIDGE',
      title: 'KeNHA Transit Tolls & Axle Weight Permits',
      amount: 8500.0,
      expense_date: todayStr,
      allocation_type: 'TRUCK',
      tanker_id: truck1 ? truck1.id : null,
      vehicle_registration: 'KDT 991Q',
      payee_vendor: 'KeNHA',
      payment_method: 'MPESA',
      reference_number: 'WB-MOM-99104',
      status: 'PAID',
      notes: 'Weighbridge compliance clearance on corridor',
      created_by: adminUserId,
    },
    {
      id: '22000000-0000-0000-0000-000000000005',
      expense_number: 'EXP-2026-005',
      category: 'DRIVER_ALLOWANCE',
      title: 'Driver Mileage Allowance - David Kiprono',
      amount: 12000.0,
      expense_date: todayStr,
      allocation_type: 'TRUCK',
      tanker_id: truck1 ? truck1.id : null,
      vehicle_registration: 'KDT 991Q',
      payee_vendor: 'David Kiprono',
      payment_method: 'MPESA',
      reference_number: 'MP-DRV-99105',
      status: 'PAID',
      notes: 'Nairobi-Gitaru transit driver allowance',
      created_by: adminUserId,
    }
  ];

  for (const exp of expensesData) {
    const { error } = await supabase.from('expenses').upsert(exp, { onConflict: 'id' });
    if (error) console.error('Expense error:', error.message);
  }
  console.log('✓ Operational Expenses seeded.');

  // 12. Seed Stock Transactions (Auditable Ledger)
  console.log('Seeding Stock Transactions...');
  const txData = [
    {
      tank_id: tankD01 ? tankD01.id : null,
      product_id: diesel.id,
      transaction_type: 'RECEIVING',
      quantity_litres: 80000,
      reference_type: 'RECEIVING',
      reference_id: receivingRecords[2].id,
      previous_balance: 275000,
      new_balance: 355000,
      notes: 'Inbound Diesel pipeline delivery from Kenya Petroleum Ltd',
      created_by: adminUserId,
    },
    {
      tank_id: tankD01 ? tankD01.id : null,
      product_id: diesel.id,
      transaction_type: 'DISPATCH',
      quantity_litres: 35000,
      reference_type: 'DISPATCH',
      reference_id: dispatchesData[2].id,
      previous_balance: 355000,
      new_balance: 320000,
      notes: 'Dispatched to Kento Kakamega via KDX 991B',
      created_by: adminUserId,
    },
    {
      tank_id: tankG01 ? tankG01.id : null,
      product_id: lpg.id,
      transaction_type: 'RECEIVING',
      quantity_litres: 50000,
      reference_type: 'RECEIVING',
      reference_id: receivingRecords[0].id,
      previous_balance: 145000,
      new_balance: 195000,
      notes: 'Bulk LPG Intake into Depot Bullet G-01',
      created_by: adminUserId,
    },
    {
      tank_id: tankP01 ? tankP01.id : null,
      product_id: petrol.id,
      transaction_type: 'RECEIVING',
      quantity_litres: 60000,
      reference_type: 'RECEIVING',
      reference_id: null,
      previous_balance: 225000,
      new_balance: 285000,
      notes: 'Petrol batch intake into Tank P-01',
      created_by: adminUserId,
    }
  ].filter(t => t.tank_id != null);

  for (const tx of txData) {
    const { error } = await supabase.from('stock_transactions').insert(tx);
    if (error) console.error('Transaction error:', error.message);
  }
  console.log('✓ Stock Transactions seeded.');

  console.log('=== PRESENTATION SEED COMPLETED SUCCESSFULLY ===');
}

seedPresentationData().catch(err => {
  console.error('Fatal error during seeding:', err);
  process.exit(1);
});
