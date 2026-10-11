const https = require('https');

const PROJECT_REF = 'znntmpbvlryhlhcvaroj';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpubnRtcGJ2bHJ5aGxoY3Zhcm9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODM3MjkyMywiZXhwIjoyMTAzOTQ4OTIzfQ._AJt0TDOMytvbtO-oqn_-3-mSN5AK2XXXONvtr8sr5g';

const SQL = `
ALTER TABLE dispatches
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS driver_name TEXT,
  ADD COLUMN IF NOT EXISTS driver_phone TEXT,
  ADD COLUMN IF NOT EXISTS seal_number TEXT;
`;

function runSQL(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const options = {
      hostname: `${PROJECT_REF}.supabase.co`,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Alternative: Use Supabase DB REST endpoint with pg_catalog approach
// Since exec_sql RPC doesn't exist, we'll verify by querying information_schema
// and show the user what columns exist vs what's needed.
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(`https://${PROJECT_REF}.supabase.co`, SERVICE_KEY);

async function checkAndReport() {
  console.log('Checking dispatches table columns...');

  // Try to insert a test value to see if column exists
  const { data, error } = await supabase
    .from('dispatches')
    .select('id, status, updated_at')
    .limit(1);

  if (error) {
    console.error('Cannot read dispatches:', error);
    return;
  }

  console.log('Sample dispatch:', data);

  // Check if delivered_at exists by trying to select it
  const { error: colError } = await supabase
    .from('dispatches')
    .select('delivered_at')
    .limit(1);

  if (colError && colError.message.includes('delivered_at')) {
    console.log('\ndelivered_at column MISSING. Need to add it via Supabase SQL Editor.');
    console.log('\nPlease run this SQL in the Supabase Dashboard SQL Editor:');
    console.log('---');
    console.log(SQL);
    console.log('---');
  } else {
    console.log('\ndelivered_at column EXISTS - no migration needed.');
  }
}

checkAndReport();
