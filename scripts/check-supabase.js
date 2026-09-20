const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = {};
for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i > -1) env[line.slice(0, i)] = line.slice(i + 1).trim();
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

const tables = ['products', 'customers', 'suppliers', 'sales', 'activity_logs', 'stock_movements', 'categories', 'users'];

(async () => {
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log('TABLE', table, 'ERROR', error.message);
      } else {
        console.log('TABLE', table, 'ROWS', data?.length ?? 0);
        if (data && data[0]) {
          console.log('SAMPLE', JSON.stringify(data[0]));
        }
      }
    } catch (e) {
      console.log('TABLE', table, 'EXCEPTION', e.message);
    }
  }
})();
