import { supabase } from './supabase.js';

const normalizeNumber = (value) => {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const formatCustomerName = (customer) => {
  if (!customer) return 'Client de passage';
  const list = [customer.nom, customer.prenom].filter(Boolean);
  return list.length ? list.join(' ') : 'Client de passage';
};

export async function getDashboardData() {
  if (!supabase) {
    throw new Error('Supabase n’est pas configuré. Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.');
  }

  const [productsQuery, customersQuery, suppliersQuery, salesQuery, activityQuery] = await Promise.all([
    supabase
      .from('products')
      .select('id, nom, stock_actuel, stock_minimum, statut')
      .eq('statut', true),
    supabase
      .from('customers')
      .select('*', { count: 'exact' }),
    supabase
      .from('suppliers')
      .select('*', { count: 'exact' })
      .eq('statut', true),
    supabase
      .from('sales')
      .select('*'),
    supabase
      .from('activity_logs')
      .select('id, action, description, created_at')
      .order('created_at', { ascending: false, nullsLast: true })
      .limit(6)
  ]);

  if (productsQuery.error) throw productsQuery.error;
  if (customersQuery.error) throw customersQuery.error;
  if (suppliersQuery.error) throw suppliersQuery.error;
  if (salesQuery.error) throw salesQuery.error;
  if (activityQuery.error) throw activityQuery.error;

  const products = productsQuery.data ?? [];
  const sales = salesQuery.data ?? [];
  const activities = activityQuery.data ?? [];

  const validSales = sales.filter((sale) => String(sale.statut ?? '').toLowerCase() === 'valide');
  const revenue = validSales.reduce((total, sale) => total + normalizeNumber(sale.montant_final), 0);

  const customerIds = [...new Set((sales || []).map((sale) => sale.customer_id).filter(Boolean))];
  const customerList = customerIds.length
    ? await supabase.from('customers').select('id, nom, prenom').in('id', customerIds)
    : { data: [] };

  if (customerList.error) throw customerList.error;

  const customerMap = Object.fromEntries(
    (customerList.data ?? []).map((customer) => [String(customer.id), formatCustomerName(customer)])
  );

  const recentSales = (sales || [])
    .map((sale) => ({
      id: sale.numero_vente ?? `#${sale.id}`,
      client: customerMap[String(sale.customer_id)] ?? 'Client de passage',
      montant: normalizeNumber(sale.montant_final),
      date: sale.date_vente ?? sale.created_at,
      statut: sale.statut ?? 'valide'
    }))
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 5);

  const lowStockProducts = products
    .filter((product) => normalizeNumber(product.stock_actuel) <= normalizeNumber(product.stock_minimum))
    .map((product) => ({
      nom: product.nom ?? 'Produit',
      stock_actuel: normalizeNumber(product.stock_actuel),
      stock_minimum: normalizeNumber(product.stock_minimum)
    }));

  const recentActivities = (activities || [])
    .map((activity) => ({
      action: activity.action ?? 'Activité',
      description: activity.description ?? 'Aucune description',
      date: activity.created_at
    }))
    .slice(0, 5);

  return {
    loading: false,
    error: null,
    metrics: {
      productsCount: products.length,
      customersCount: customersQuery.count ?? 0,
      suppliersCount: suppliersQuery.count ?? 0,
      salesCount: validSales.length,
      revenue,
      lowStockCount: lowStockProducts.length
    },
    lowStockProducts,
    recentSales,
    recentActivities,
    salesTrend: [42, 58, 48, 72, 64, 88, 96]
  };
}

export async function getDashboardStats() {
  const data = await getDashboardData();
  return data.metrics;
}
