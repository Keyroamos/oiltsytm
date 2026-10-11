// Fix RLS policies: allow authenticated users to read suppliers, products
// and create the fuel_allocations table structure via PostgREST RPC trick

const { createClient } = require('./node_modules/@supabase/supabase-js');

const url = 'https://wamcotcjwffawgzmqgpl.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhbWNvdGNqd2ZmYXdnem1xZ3BsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODg1Mzk5NCwiZXhwIjoyMTA0NDI5OTk0fQ.KBcoN3jnjmQQoWK5zBsbPwfUOmk-AxCFiolIfuBmCOQ';

const sb = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  // Step 1: Create a SQL-execution function using service role (if it doesn't exist)
  // We do this by inserting into a special table that triggers the creation
  // 
  // Actually: Let's try creating fuel_allocations by inserting a row via service role
  // If the table doesn't exist, we get the error. If it does, we get success.
  
  const testAlloc = await sb.from('fuel_allocations').select('id').limit(1);
  
  if (testAlloc.error && testAlloc.error.message.includes('schema cache')) {
    console.log('fuel_allocations table does NOT exist. Need to create via SQL.');
    console.log('');
    console.log('==== ACTION REQUIRED ====');
    console.log('Please paste this SQL in your Supabase Dashboard SQL Editor:');
    console.log('https://supabase.com/dashboard/project/wamcotcjwffawgzmqgpl/sql/new');
    console.log('');
    console.log(`
-- 1. Create fuel_allocations table
CREATE TABLE IF NOT EXISTS public.fuel_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_reference TEXT NOT NULL,
  allocation_period TEXT NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
  allocated_quantity_litres NUMERIC(15,2) NOT NULL DEFAULT 0,
  allocated_quantity_mt NUMERIC(15,4),
  allocated_quantity_m3 NUMERIC(15,4),
  lifted_quantity_litres NUMERIC(15,2) NOT NULL DEFAULT 0,
  remaining_quantity_litres NUMERIC(15,2) NOT NULL DEFAULT 0,
  source_terminal TEXT,
  period_start_date DATE NOT NULL,
  period_end_date DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','COMPLETED','EXPIRED')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.fuel_allocations ENABLE ROW LEVEL SECURITY;

-- 3. Allow authenticated users full access to fuel_allocations
CREATE POLICY IF NOT EXISTS allow_authenticated ON public.fuel_allocations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Fix suppliers RLS - allow authenticated reads
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='suppliers' AND policyname='allow_auth_read'
  ) THEN
    CREATE POLICY allow_auth_read ON public.suppliers FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- 5. Fix products RLS - allow authenticated reads  
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='products' AND policyname='allow_auth_read'
  ) THEN
    CREATE POLICY allow_auth_read ON public.products FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

SELECT 'Done!' as result;
    `);
  } else {
    console.log('fuel_allocations table EXISTS:', JSON.stringify(testAlloc.data));
  }
  
  // Check existing RLS policies on suppliers and products
  // We can read pg_policies via service role
  const policiesQ = await sb
    .from('pg_policies')
    .select('tablename, policyname, cmd, roles, qual')
    .in('tablename', ['suppliers', 'products', 'fuel_allocations'])
    .limit(30);
  
  if (policiesQ.error) {
    console.log('Cannot query pg_policies:', policiesQ.error.message);
  } else {
    console.log('\nCurrent RLS policies:', JSON.stringify(policiesQ.data, null, 2));
  }
}

main().catch(console.error);
