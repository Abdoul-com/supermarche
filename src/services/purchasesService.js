import { supabase } from './supabase.js';

const normalizeNumber = (value) => {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const normalizeText = (value) => String(value ?? '').trim();

export function resolvePurchaseStatus(status, mode = 'pending') {
  const input = normalizeText(status).toLowerCase().replace(/[_\s-]+/g, '');
  const pendingStatuses = ['enattente', 'pending', 'attente'];
  const receivedStatuses = ['receptionne', 'recu', 'reçu', 'valide', 'valide'];
  const cancelledStatuses = ['annule', 'annulé', 'cancelled', 'canceled'];

  if (!input) {
    return mode === 'received' ? 'valide' : mode === 'cancelled' ? 'annule' : 'En attente';
  }

  if (pendingStatuses.includes(input)) {
    return 'En attente';
  }

  if (receivedStatuses.includes(input)) {
    return 'valide';
  }

  if (cancelledStatuses.includes(input)) {
    return 'annule';
  }

  return mode === 'received' ? 'valide' : mode === 'cancelled' ? 'annule' : 'En attente';
}

export async function getPurchases() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .order('date_achat', { ascending: false, nullsLast: true });

  if (error) throw error;
  return data ?? [];
}

export async function getPurchaseById(id) {
  if (!supabase || !id) {
    return null;
  }

  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function getPurchaseItems(purchaseId) {
  if (!supabase || !purchaseId) {
    return [];
  }

  const { data, error } = await supabase
    .from('purchase_items')
    .select('*')
    .eq('purchase_id', purchaseId)
    .order('id', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createPurchase(payload = {}) {
  if (!supabase) {
    throw new Error('Supabase n’est pas configuré.');
  }

  const supplierId = Number(payload.supplier_id ?? payload.fournisseur_id ?? 0);
  if (!supplierId) {
    throw new Error('Le fournisseur est obligatoire.');
  }

  const purchaseTotal = normalizeNumber(payload.montant_total ?? 0);
  if (purchaseTotal < 0) {
    throw new Error('Le montant total de l’achat est invalide.');
  }

  const createdAt = payload.date_achat || new Date().toISOString();
  const status = resolvePurchaseStatus(payload.statut, 'pending');
  const notes = normalizeText(payload.notes || payload.commentaire || '');

  const { data, error } = await supabase
    .from('purchases')
    .insert({
      supplier_id: supplierId,
      user_id: payload.user_id ?? 1,
      numero_facture: normalizeText(payload.numero_facture || `ACH-${Date.now()}`),
      date_achat: createdAt,
      montant_total: purchaseTotal,
      statut: status,
      notes: notes || null
    })
    .select();

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function updatePurchase(id, payload = {}) {
  if (!supabase || !id) {
    throw new Error('Identifiant d’achat invalide.');
  }

  const supplierId = Number(payload.supplier_id ?? payload.fournisseur_id ?? 0);
  if (!supplierId) {
    throw new Error('Le fournisseur est obligatoire.');
  }

  const purchaseTotal = normalizeNumber(payload.montant_total ?? 0);
  const createdAt = payload.date_achat || new Date().toISOString();
  const status = resolvePurchaseStatus(payload.statut, 'pending');
  const notes = normalizeText(payload.notes || payload.commentaire || '');

  const { data, error } = await supabase
    .from('purchases')
    .update({
      supplier_id: supplierId,
      user_id: payload.user_id ?? 1,
      numero_facture: normalizeText(payload.numero_facture || `ACH-${Date.now()}`),
      date_achat: createdAt,
      montant_total: purchaseTotal,
      statut: status,
      notes: notes || null
    })
    .eq('id', id)
    .select();

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function createPurchaseItems(purchaseId, items = []) {
  if (!supabase || !purchaseId) {
    throw new Error('Achat invalide pour l’ajout des lignes.');
  }

  const validItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!validItems.length) {
    return [];
  }

  const rows = validItems.map((item) => {
    const productId = Number(item.product_id ?? item.productId ?? 0);
    const quantity = normalizeNumber(item.quantite ?? item.quantity ?? 0);
    const unitPrice = normalizeNumber(item.prix_unitaire ?? item.unitPrice ?? 0);
    const subtotal = normalizeNumber(item.sous_total ?? item.subtotal ?? quantity * unitPrice);

    if (!productId) {
      throw new Error('Une ligne achat ne contient pas de produit valide.');
    }

    if (quantity <= 0) {
      throw new Error('Une quantité doit être supérieure à 0 pour chaque produit.');
    }

    return {
      purchase_id: purchaseId,
      product_id: productId,
      quantite: quantity,
      prix_unitaire: unitPrice,
      sous_total: subtotal
    };
  });

  const { data, error } = await supabase.from('purchase_items').insert(rows).select();
  if (error) throw error;
  return data ?? [];
}

export async function replacePurchaseItems(purchaseId, items = []) {
  if (!supabase || !purchaseId) {
    throw new Error('Achat invalide pour la mise à jour des lignes.');
  }

  const { error: deleteError } = await supabase.from('purchase_items').delete().eq('purchase_id', purchaseId);
  if (deleteError) throw deleteError;
  return createPurchaseItems(purchaseId, items);
}

export async function receivePurchase(purchaseId, options = {}) {
  if (!supabase || !purchaseId) {
    throw new Error('Identifiant d’achat invalide.');
  }

  const purchase = await getPurchaseById(purchaseId);
  if (!purchase) {
    throw new Error('Achat introuvable.');
  }

  const currentStatus = normalizeText(purchase.statut || '').toLowerCase();
  const receivedStatus = resolvePurchaseStatus('valide', 'received');
  const alreadyReceived = currentStatus.includes('reception') || currentStatus.includes('recu') || currentStatus.includes('valide');
  if (alreadyReceived) {
    throw new Error('Cet achat a déjà été réceptionné.');
  }

  const items = await getPurchaseItems(purchaseId);
  if (!items.length) {
    throw new Error('Aucun produit n’a été enregistré dans cet achat.');
  }

  const previousProductStocks = [];

  try {
    for (const item of items) {
      const productId = Number(item.product_id ?? 0);
      const quantity = normalizeNumber(item.quantite ?? item.quantity ?? 0);
      if (!productId || quantity <= 0) continue;

      const { data: currentProduct, error: productError } = await supabase
        .from('products')
        .select('id, stock_actuel, nom')
        .eq('id', productId)
        .maybeSingle();

      if (productError) throw productError;
      if (!currentProduct) {
        throw new Error('Un produit lié à l’achat est introuvable.');
      }

      const stockAvant = normalizeNumber(currentProduct.stock_actuel ?? 0);
      const stockApres = stockAvant + quantity;
      previousProductStocks.push({ productId, previousStock: stockAvant });

      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_actuel: stockApres })
        .eq('id', productId);

      if (updateError) throw updateError;

      const { error: movementError } = await supabase.from('stock_movements').insert({
        product_id: productId,
        user_id: purchase.user_id ?? 1,
        type: 'ENTREE',
        quantite: quantity,
        stock_avant: stockAvant,
        stock_apres: stockApres,
        reference_type: 'purchase',
        reference_id: purchaseId,
        motif: options.motif || 'Réception d’un achat fournisseur',
        created_at: new Date().toISOString()
      });

      if (movementError) throw movementError;
    }

    const { data, error } = await supabase
      .from('purchases')
      .update({ statut: receivedStatus, notes: purchase.notes || options.notes || null })
      .eq('id', purchaseId)
      .select();

    if (error) throw error;
    return data?.[0] ?? purchase;
  } catch (error) {
    for (const entry of previousProductStocks) {
      await supabase.from('products').update({ stock_actuel: entry.previousStock }).eq('id', entry.productId);
    }
    throw error;
  }
}

export async function cancelPurchase(purchaseId) {
  if (!supabase || !purchaseId) {
    throw new Error('Identifiant d’achat invalide.');
  }

  const purchase = await getPurchaseById(purchaseId);
  if (!purchase) {
    throw new Error('Achat introuvable.');
  }

  const currentStatus = normalizeText(purchase.statut || '').toLowerCase();
  const alreadyReceived = currentStatus.includes('reception') || currentStatus.includes('recu') || currentStatus.includes('valide');
  if (alreadyReceived) {
    throw new Error('Un achat réceptionné ne peut pas être annulé.');
  }

  const cancelledStatus = resolvePurchaseStatus('annule', 'cancelled');
  const { data, error } = await supabase
    .from('purchases')
    .update({ statut: cancelledStatus })
    .eq('id', purchaseId)
    .select();

  if (error) throw error;
  return data?.[0] ?? null;
}
