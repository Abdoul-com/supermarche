import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const idx = line.indexOf('=');
  if (idx === -1) continue;
  const key = line.slice(0, idx).trim();
  const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
  env[key] = value;
}

process.env = { ...process.env, ...env };
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

for (const table of ['users', 'roles', 'activity_logs']) {
  const { data, error } = await supabase.from(table).select('*').limit(5);
  console.log(`\nTABLE ${table}`);
  if (error) {
    console.log('ERROR', error.message);
    continue;
  }
  console.log('COUNT', data ? data.length : 0);
  console.log(JSON.stringify(data, null, 2));
}
