const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://znntmpbvlryhlhcvaroj.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpubnRtcGJ2bHJ5aGxoY3Zhcm9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODM3MjkyMywiZXhwIjoyMTAzOTQ4OTIzfQ._AJt0TDOMytvbtO-oqn_-3-mSN5AK2XXXONvtr8sr5g';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function inspect() {
  const [
    { data: tanks },
    { data: products },
    { data: customers },
    { data: suppliers },
    { data: tankers },
    { data: orders },
    { data: dispatches },
    { data: invoices },
    { data: receiving },
  ] = await Promise.all([
    supabase.from('tanks').select('*'),
    supabase.from('products').select('*'),
    supabase.from('customers').select('*'),
    supabase.from('suppliers').select('*'),
    supabase.from('tankers').select('*'),
    supabase.from('orders').select('*'),
    supabase.from('dispatches').select('*'),
    supabase.from('invoices').select('*'),
    supabase.from('receiving_records').select('*'),
  ]);

  console.log('--- ACTUAL DB STATS ---');
  console.log('Tanks:', tanks?.map(t => ({ code: t.code, stock: t.current_stock_litres, cap: t.capacity_litres })));
  console.log('Total Stock Litres:', tanks?.reduce((s, t) => s + Number(t.current_stock_litres), 0));
  
  const customerReceivables = customers?.reduce((s, c) => s + Number(c.current_balance || 0), 0);
  console.log('Customers Total Balance (Receivables):', customerReceivables);

  const invoiceBalanceDue = invoices?.reduce((s, i) => s + Number(i.balance_due || 0), 0);
  const invoiceTotalInvoiced = invoices?.reduce((s, i) => s + Number(i.total_amount || 0), 0);
  console.log('Invoices Balance Due:', invoiceBalanceDue, 'Total Invoiced:', invoiceTotalInvoiced);

  const ordersTotal = orders?.reduce((s, o) => s + Number(o.total_amount || 0), 0);
  console.log('Orders Total Amount:', ordersTotal, 'Count:', orders?.length);

  console.log('Dispatches count:', dispatches?.length, 'Statuses:', dispatches?.map(d => ({ num: d.dispatch_number, status: d.status, qty: d.quantity_loaded || d.quantity_ordered })));
  console.log('Receiving records count:', receiving?.length, 'Statuses:', receiving?.map(r => ({ ref: r.reference_number, status: r.status, qty: r.quantity_received || r.quantity_ordered })));
  console.log('Tankers count:', tankers?.length, 'Statuses:', tankers?.map(t => ({ reg: t.registration_number, status: t.status })));
  console.log('Suppliers count:', suppliers?.length);
}

inspect();
