import { supabase } from './supabase.js';

const SAFE_NUMBER = (value) => {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

export function normalizeStatus(status, fallback = '') {
  const raw = String(status ?? '').trim().toLowerCase();
  if (!raw) {
    return fallback;
  }

  if (['valide', 'validé', 'valid', 'confirmed', 'complete', 'completed', 'paid', 'reçu', 'receptionne'].includes(raw)) {
    return 'valide';
  }

  if (['annule', 'annulé', 'cancelled', 'canceled', 'cancel', 'rejected'].includes(raw)) {
    return 'annule';
  }

  if (['en attente', 'en_attente', 'pending', 'attente'].includes(raw)) {
    return 'pending';
  }

  return raw;
}

export function getDateWindowForPeriod(period = 'month', referenceDate = new Date(), customStart = null, customEnd = null) {
  const currentDate = referenceDate instanceof Date ? new Date(referenceDate) : new Date(referenceDate);
  const start = new Date(currentDate);
  const end = new Date(currentDate);

  const setBounds = (startDate, endDate) => {
    const nextStart = new Date(startDate);
    const nextEnd = new Date(endDate);
    nextStart.setHours(0, 0, 0, 0);
    nextEnd.setHours(23, 59, 59, 999);
    return { start: nextStart, end: nextEnd };
  };

  if (period === 'custom') {
    const customFrom = customStart ? new Date(customStart) : new Date(currentDate);
    const customTo = customEnd ? new Date(customEnd) : new Date(currentDate);
    return setBounds(customFrom, customTo);
  }

  if (period === 'today') {
    return setBounds(currentDate, currentDate);
  }

  if (period === 'week') {
    const day = currentDate.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(currentDate.getDate() + diff);
    end.setDate(start.getDate() + 6);
    return setBounds(start, end);
  }

  if (period === 'year') {
    start.setMonth(0, 1);
    end.setMonth(11, 31);
    return setBounds(start, end);
  }

  start.setDate(1);
  return setBounds(start, currentDate);
}

export function summarizeSalesMetrics(sales = []) {
  const validSales = (sales ?? []).filter((sale) => normalizeStatus(sale?.statut, '') === 'valide');
  const revenue = validSales.reduce((sum, sale) => sum + SAFE_NUMBER(sale?.montant_final), 0);
  const salesCount = validSales.length;
  const averageBasket = salesCount ? revenue / salesCount : 0;
  const productsSold = validSales.reduce((sum, sale) => sum + SAFE_NUMBER(sale?.total_quantite ?? 0), 0);

  return {
    revenue,
    salesCount,
    averageBasket,
    productsSold,
    totalDiscount: validSales.reduce((sum, sale) => sum + SAFE_NUMBER(sale?.remise), 0)
  };
}

export async function getSalesReport(period = 'month', customStart = null, customEnd = null) {
  if (!supabase) {
    return {
      sales: [],
      revenue: 0,
      salesCount: 0,
      averageBasket: 0,
      productsSold: 0,
      totalDiscount: 0,
      period,
      start: null,
      end: null,
      costOfGoodsSold: 0
    };
  }

  const window = getDateWindowForPeriod(period, new Date(), customStart, customEnd);
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .gte('date_vente', window.start.toISOString())
    .lte('date_vente', window.end.toISOString())
    .eq('statut', 'valide')
    .order('date_vente', { ascending: true, nullsLast: true });

  if (error) throw error;

  const sales = data ?? [];
  const saleIds = sales.map((sale) => sale.id);
  const items = saleIds.length
    ? (await supabase
        .from('sale_items')
        .select('sale_id, product_id, quantite, sous_total, prix_unitaire')
        .in('sale_id', saleIds)).data ?? []
    : [];

  const productIds = [...new Set(items.map((item) => item.product_id).filter(Boolean))];
  const productMap = productIds.length
    ? Object.fromEntries(
        ((await supabase.from('products').select('id, prix_achat').in('id', productIds)).data ?? []).map((product) => [String(product.id), product])
      )
    : {};

  const costOfGoodsSold = items.reduce((sum, item) => {
    const product = productMap[String(item.product_id)];
    const quantity = SAFE_NUMBER(item.quantite);
    const unitCost = SAFE_NUMBER(product?.prix_achat);
    return sum + quantity * unitCost;
  }, 0);

  const productsSold = items.reduce((sum, item) => sum + SAFE_NUMBER(item.quantite), 0);
  const totalRevenue = sales.reduce((sum, sale) => sum + SAFE_NUMBER(sale.montant_final), 0);
  const salesCount = sales.length;

  return {
    sales,
    revenue: totalRevenue,
    salesCount,
    averageBasket: salesCount ? totalRevenue / salesCount : 0,
    productsSold,
    totalDiscount: sales.reduce((sum, sale) => sum + SAFE_NUMBER(sale.remise), 0),
    period,
    start: window.start,
    end: window.end,
    costOfGoodsSold
  };
}

export async function getSalesByDay(period = 'month', customStart = null, customEnd = null) {
  if (!supabase) {
    return [];
  }

  const window = getDateWindowForPeriod(period, new Date(), customStart, customEnd);
  const { data, error } = await supabase
    .from('sales')
    .select('id, date_vente, montant_final, statut')
    .gte('date_vente', window.start.toISOString())
    .lte('date_vente', window.end.toISOString())
    .eq('statut', 'valide')
    .order('date_vente', { ascending: true, nullsLast: true });

  if (error) throw error;

  const sales = data ?? [];
  const bucketKey = window.end.getTime() - window.start.getTime() > 90 * 24 * 60 * 60 * 1000 ? 'month' : 'day';
  const grouped = new Map();

  for (const sale of sales) {
    const dateObject = new Date(sale.date_vente);
    const label = bucketKey === 'month'
      ? dateObject.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
      : dateObject.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

    const key = bucketKey === 'month'
      ? `${dateObject.getFullYear()}-${String(dateObject.getMonth() + 1).padStart(2, '0')}`
      : dateObject.toISOString().slice(0, 10);

    const existing = grouped.get(key) ?? { label, salesCount: 0, revenue: 0 };
    existing.salesCount += 1;
    existing.revenue += SAFE_NUMBER(sale.montant_final);
    grouped.set(key, existing);
  }

  return Array.from(grouped.values()).map((entry) => ({
    label: entry.label,
    salesCount: entry.salesCount,
    revenue: entry.revenue
  }));
}

export async function getTopSellingProducts(period = 'month', customStart = null, customEnd = null) {
  if (!supabase) {
    return [];
  }

  const window = getDateWindowForPeriod(period, new Date(), customStart, customEnd);
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('id')
    .gte('date_vente', window.start.toISOString())
    .lte('date_vente', window.end.toISOString())
    .eq('statut', 'valide');

  if (salesError) throw salesError;

  const saleIds = (sales ?? []).map((sale) => sale.id);
  if (!saleIds.length) {
    return [];
  }

  const { data: items, error: itemsError } = await supabase
    .from('sale_items')
    .select('product_id, quantite, sous_total')
    .in('sale_id', saleIds);

  if (itemsError) throw itemsError;

  const productIds = [...new Set((items ?? []).map((item) => item.product_id).filter(Boolean))];
  const productMap = productIds.length
    ? Object.fromEntries(
        ((await supabase.from('products').select('id, nom').in('id', productIds)).data ?? []).map((product) => [String(product.id), product])
      )
    : {};

  const aggregated = new Map();

  for (const item of items ?? []) {
    const product = productMap[String(item.product_id)];
    if (!product) continue;

    const existing = aggregated.get(String(item.product_id)) ?? {
      product: product.nom,
      quantity: 0,
      revenue: 0,
      salesCount: 0
    };

    existing.quantity += SAFE_NUMBER(item.quantite);
    existing.revenue += SAFE_NUMBER(item.sous_total);
    existing.salesCount += 1;
    aggregated.set(String(item.product_id), existing);
  }

  return Array.from(aggregated.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)
    .map((entry) => ({
      product: entry.product,
      quantity: entry.quantity,
      revenue: entry.revenue,
      salesCount: entry.salesCount
    }));
}

export async function getSalesByCategory(period = 'month', customStart = null, customEnd = null) {
  if (!supabase) {
    return [];
  }

  const window = getDateWindowForPeriod(period, new Date(), customStart, customEnd);
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('id')
    .gte('date_vente', window.start.toISOString())
    .lte('date_vente', window.end.toISOString())
    .eq('statut', 'valide');

  if (salesError) throw salesError;

  const saleIds = (sales ?? []).map((sale) => sale.id);
  if (!saleIds.length) {
    return [];
  }

  const { data: items, error: itemsError } = await supabase
    .from('sale_items')
    .select('product_id, quantite, sous_total')
    .in('sale_id', saleIds);

  if (itemsError) throw itemsError;

  const productIds = [...new Set((items ?? []).map((item) => item.product_id).filter(Boolean))];
  const productMap = productIds.length
    ? Object.fromEntries(
        ((await supabase.from('products').select('id, category_id').in('id', productIds)).data ?? []).map((product) => [String(product.id), product])
      )
    : {};

  const categoryIds = [...new Set(Object.values(productMap).map((product) => product.category_id).filter(Boolean))];
  const categoryMap = categoryIds.length
    ? Object.fromEntries(
        ((await supabase.from('categories').select('id, nom').in('id', categoryIds)).data ?? []).map((category) => [String(category.id), category])
      )
    : {};

  const aggregated = new Map();

  for (const item of items ?? []) {
    const product = productMap[String(item.product_id)];
    if (!product) continue;

    const category = categoryMap[String(product.category_id)] ?? { nom: 'Non classé' };
    const entry = aggregated.get(category.nom) ?? { category: category.nom, quantity: 0, revenue: 0 };
    entry.quantity += SAFE_NUMBER(item.quantite);
    entry.revenue += SAFE_NUMBER(item.sous_total);
    aggregated.set(category.nom, entry);
  }

  return Array.from(aggregated.values()).sort((a, b) => b.revenue - a.revenue);
}

export async function getPaymentMethodsReport(period = 'month', customStart = null, customEnd = null) {
  if (!supabase) {
    return [];
  }

  const window = getDateWindowForPeriod(period, new Date(), customStart, customEnd);
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .gte('date_paiement', window.start.toISOString())
    .lte('date_paiement', window.end.toISOString())
    .order('date_paiement', { ascending: true, nullsLast: true });

  if (error) throw error;

  const totals = new Map();

  for (const payment of data ?? []) {
    const mode = String(payment.mode_paiement ?? 'autres').trim().toLowerCase();
    const key = mode || 'autres';
    const entry = totals.get(key) ?? { mode: key, count: 0, total: 0 };
    entry.count += 1;
    entry.total += SAFE_NUMBER(payment.montant);
    totals.set(key, entry);
  }

  return Array.from(totals.values()).map((entry) => ({
    mode: entry.mode,
    total: entry.total,
    count: entry.count
  }));
}

export async function getPurchasesReport(period = 'month', customStart = null, customEnd = null) {
  if (!supabase) {
    return {
      purchases: [],
      purchaseCount: 0,
      totalAmount: 0,
      suppliersCount: 0,
      byPeriod: []
    };
  }

  const window = getDateWindowForPeriod(period, new Date(), customStart, customEnd);
  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .gte('date_achat', window.start.toISOString())
    .lte('date_achat', window.end.toISOString())
    .order('date_achat', { ascending: true, nullsLast: true });

  if (error) throw error;

  const purchases = (data ?? []).filter((purchase) => normalizeStatus(purchase?.statut, '') !== 'annule');
  const supplierIds = [...new Set(purchases.map((purchase) => purchase.supplier_id).filter(Boolean))];

  const supplierMap = supplierIds.length
    ? Object.fromEntries(
        ((await supabase.from('suppliers').select('id, nom').in('id', supplierIds)).data ?? []).map((supplier) => [String(supplier.id), supplier])
      )
    : {};

  const purchaseCount = purchases.length;
  const totalAmount = purchases.reduce((sum, purchase) => sum + SAFE_NUMBER(purchase.montant_total), 0);
  const suppliersCount = new Set(purchases.map((purchase) => String(purchase.supplier_id)).filter(Boolean)).size;

  const byPeriod = new Map();
  for (const purchase of purchases) {
    const date = new Date(purchase.date_achat);
    const key = date.toISOString().slice(0, 10);
    const existing = byPeriod.get(key) ?? { label: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), value: 0 };
    existing.value += SAFE_NUMBER(purchase.montant_total);
    byPeriod.set(key, existing);
  }

  return {
    purchases,
    purchaseCount,
    totalAmount,
    suppliersCount,
    supplierMap,
    byPeriod: Array.from(byPeriod.values())
  };
}

export async function getStockReport() {
  if (!supabase) {
    return {
      totalProducts: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      stockValue: 0,
      products: [],
      restockProducts: []
    };
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('nom', { ascending: true, nullsLast: true });

  if (error) throw error;

  const products = data ?? [];
  const totalProducts = products.length;
  const lowStockCount = products.filter((product) => SAFE_NUMBER(product.stock_actuel) <= SAFE_NUMBER(product.stock_minimum)).length;
  const outOfStockCount = products.filter((product) => SAFE_NUMBER(product.stock_actuel) <= 0).length;
  const stockValue = products.reduce((sum, product) => sum + SAFE_NUMBER(product.stock_actuel) * SAFE_NUMBER(product.prix_achat), 0);

  const supplierIds = [...new Set(products.map((product) => product.supplier_id).filter(Boolean))];
  const supplierMap = supplierIds.length
    ? Object.fromEntries(
        ((await supabase.from('suppliers').select('id, nom').in('id', supplierIds)).data ?? []).map((supplier) => [String(supplier.id), supplier])
      )
    : {};

  const restockProducts = products
    .filter((product) => SAFE_NUMBER(product.stock_actuel) <= SAFE_NUMBER(product.stock_minimum))
    .map((product) => ({
      product: product.nom,
      stockActuel: SAFE_NUMBER(product.stock_actuel),
      stockMinimum: SAFE_NUMBER(product.stock_minimum),
      ecart: Math.max(0, SAFE_NUMBER(product.stock_minimum) - SAFE_NUMBER(product.stock_actuel)),
      fournisseur: supplierMap[String(product.supplier_id)]?.nom || '—'
    }))
    .sort((a, b) => b.ecart - a.ecart);

  return {
    totalProducts,
    lowStockCount,
    outOfStockCount,
    stockValue,
    products,
    restockProducts
  };
}

export async function getDashboardMetrics(period = 'month', customStart = null, customEnd = null) {
  const [salesReport, purchasesReport, stockReport] = await Promise.all([
    getSalesReport(period, customStart, customEnd),
    getPurchasesReport(period, customStart, customEnd),
    getStockReport()
  ]);

  return {
    revenue: salesReport.revenue,
    salesCount: salesReport.salesCount,
    averageBasket: salesReport.averageBasket,
    purchasesCount: purchasesReport.purchaseCount,
    totalPurchases: purchasesReport.totalAmount,
    estimatedMargin: Math.max(0, salesReport.revenue - salesReport.costOfGoodsSold),
    productsSold: salesReport.productsSold,
    totalProducts: stockReport.totalProducts,
    lowStockCount: stockReport.lowStockCount,
    outOfStockCount: stockReport.outOfStockCount,
    stockValue: stockReport.stockValue,
    salesReport,
    purchasesReport,
    stockReport
  };
}
