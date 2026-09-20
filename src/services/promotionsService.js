import { supabase } from './supabase.js';

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value ?? fallback);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export function calculatePromotionalPrice(price, type = 'percentage', value = 0) {
  const basePrice = toNumber(price, 0);
  if (basePrice <= 0) return 0;

  const discountValue = toNumber(value, 0);

  if (type === 'fixed') {
    return Math.max(basePrice - discountValue, 0);
  }

  const safePercentage = Math.min(Math.max(discountValue, 0), 100);
  return Math.max(basePrice * (1 - safePercentage / 100), 0);
}

export function getPromotionStatus(dateDebut, dateFin, active = true) {
  if (active === false) {
    return 'desactive';
  }

  const startDate = toDate(dateDebut);
  const endDate = toDate(dateFin);
  const now = new Date();

  if (startDate && now < startDate) {
    return 'a_venir';
  }

  if (endDate && now > endDate) {
    return 'expiree';
  }

  if (startDate && now >= startDate && (!endDate || now <= endDate)) {
    return 'active';
  }

  if (!startDate && endDate && now <= endDate) {
    return 'active';
  }

  if (!startDate && !endDate) {
    return 'active';
  }

  return 'active';
}

export async function getPromotions() {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false, nullsLast: true });

    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error('Error loading promotions:', error);
    return [];
  }
}

export async function getPromotionById(id) {
  if (!supabase || !id) return null;

  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function createPromotion(data = {}) {
  if (!supabase) {
    throw new Error('Supabase n’est pas configuré.');
  }

  const payload = {
    nom: String(data.nom ?? '').trim(),
    product_id: Number(data.product_id ?? data.productId ?? 0),
    prix_promotionnel: toNumber(data.prix_promotionnel ?? data.prix_promo ?? data.promo_price ?? 0, 0),
    date_debut: data.date_debut ?? null,
    date_fin: data.date_fin ?? null,
    statut: data.statut !== undefined ? Boolean(data.statut) : true
  };

  if (!payload.nom) {
    throw new Error('Le nom de la promotion est obligatoire.');
  }

  if (!payload.product_id) {
    throw new Error('Le produit est obligatoire.');
  }

  if (payload.prix_promotionnel <= 0) {
    throw new Error('Le prix promotionnel doit être strictement positif.');
  }

  if (payload.date_debut && payload.date_fin && new Date(payload.date_fin) < new Date(payload.date_debut)) {
    throw new Error('La date de fin doit être supérieure ou égale à la date de début.');
  }

  const { data: created, error } = await supabase
    .from('promotions')
    .insert(payload)
    .select();

  if (error) throw error;
  return created?.[0] ?? null;
}

export async function updatePromotion(id, data = {}) {
  if (!supabase || !id) {
    throw new Error('Identifiant de promotion invalide.');
  }

  const payload = {
    nom: String(data.nom ?? '').trim(),
    product_id: Number(data.product_id ?? data.productId ?? 0),
    prix_promotionnel: toNumber(data.prix_promotionnel ?? data.prix_promo ?? data.promo_price ?? 0, 0),
    date_debut: data.date_debut ?? null,
    date_fin: data.date_fin ?? null,
    statut: data.statut !== undefined ? Boolean(data.statut) : true
  };

  if (!payload.nom) {
    throw new Error('Le nom de la promotion est obligatoire.');
  }

  if (!payload.product_id) {
    throw new Error('Le produit est obligatoire.');
  }

  if (payload.prix_promotionnel <= 0) {
    throw new Error('Le prix promotionnel doit être strictement positif.');
  }

  if (payload.date_debut && payload.date_fin && new Date(payload.date_fin) < new Date(payload.date_debut)) {
    throw new Error('La date de fin doit être supérieure ou égale à la date de début.');
  }

  const { data: updated, error } = await supabase
    .from('promotions')
    .update(payload)
    .eq('id', id)
    .select();

  if (error) throw error;
  return updated?.[0] ?? null;
}

export async function activatePromotion(id) {
  if (!supabase || !id) {
    throw new Error('Identifiant de promotion invalide.');
  }

  const { data, error } = await supabase
    .from('promotions')
    .update({ statut: true })
    .eq('id', id)
    .select();

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function deactivatePromotion(id) {
  if (!supabase || !id) {
    throw new Error('Identifiant de promotion invalide.');
  }

  const { data, error } = await supabase
    .from('promotions')
    .update({ statut: false })
    .eq('id', id)
    .select();

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getActivePromotionForProduct(productId) {
  if (!supabase || !productId) {
    return null;
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('product_id', Number(productId))
    .eq('statut', true)
    .lte('date_debut', now)
    .gte('date_fin', now)
    .order('date_debut', { ascending: true, nullsLast: true })
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}
