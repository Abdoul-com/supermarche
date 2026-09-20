import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSaleSummary, validateCartItem } from './salesService.js';

test('validateCartItem blocks invalid quantities and stock issues', () => {
  const result = validateCartItem({
    product: { nom: 'Riz', stock_actuel: 10, statut: true, prix_vente: 1500 },
    quantity: 12,
    remise: 200
  });

  assert.equal(result.valid, false);
  assert.match(result.message, /stock/i);
});

test('buildSaleSummary calculates subtotal, discount and total', () => {
  const summary = buildSaleSummary([
    { prix_vente: 1500, quantity: 2, remise: 200 },
    { prix_vente: 3000, quantity: 1, remise: 0 }
  ]);

  assert.equal(summary.sousTotal, 6000);
  assert.equal(summary.remise, 200);
  assert.equal(summary.total, 5800);
});
