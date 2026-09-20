import test from 'node:test';
import assert from 'node:assert/strict';

import { calculatePromotionalPrice, getPromotionStatus } from './promotionsService.js';

test('calculatePromotionalPrice handles percentage discounts', () => {
  assert.equal(calculatePromotionalPrice(10000, 'percentage', 20), 8000);
  assert.equal(calculatePromotionalPrice(5000, 'percentage', 10), 4500);
});

test('calculatePromotionalPrice handles fixed discounts and never goes negative', () => {
  assert.equal(calculatePromotionalPrice(10000, 'fixed', 1500), 8500);
  assert.equal(calculatePromotionalPrice(500, 'fixed', 1000), 0);
});

test('getPromotionStatus resolves upcoming, active and expired dates', () => {
  const now = new Date();
  const before = new Date(now.getTime() + 86400000).toISOString();
  const duringStart = new Date(now.getTime() - 86400000).toISOString();
  const duringEnd = new Date(now.getTime() + 86400000).toISOString();
  const expired = new Date(now.getTime() - 172800000).toISOString();

  assert.equal(getPromotionStatus(before, duringEnd), 'a_venir');
  assert.equal(getPromotionStatus(duringStart, duringEnd), 'active');
  assert.equal(getPromotionStatus(expired, duringStart), 'expiree');
});
