import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const envText = fs.readFileSync('./.env', 'utf8');
for (const line of envText.split(/\r?\n/)) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2];
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const { data: customers, error: customersError } = await supabase.from('customers').select('*').limit(3);
console.log('customers error:', customersError?.message ?? 'none');
console.log('customers sample:', JSON.stringify(customers, null, 2));

const { data: sales, error: salesError } = await supabase.from('sales').select('*').limit(3);
console.log('sales error:', salesError?.message ?? 'none');
console.log('sales sample:', JSON.stringify(sales, null, 2));

const { data: info, error: infoError } = await supabase
  .from('customers')
  .select('id, nom, prenom, email, telephone, adresse, active, created_at')
  .limit(1);
console.log('sample fields:', JSON.stringify(info, null, 2));
console.log('info error:', infoError?.message ?? 'none');
