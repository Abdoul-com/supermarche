import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getDateWindowForPeriod,
  normalizeStatus,
  summarizeSalesMetrics
} from './reportsService.js';

test('getDateWindowForPeriod uses the current date for today', () => {
  const now = new Date('2026-09-17T12:00:00Z');
  const window = getDateWindowForPeriod('today', now);
  const expectedStart = new Date(now);
  const expectedEnd = new Date(now);

  expectedStart.setHours(0, 0, 0, 0);
  expectedEnd.setHours(23, 59, 59, 999);

  assert.equal(window.start.getTime(), expectedStart.getTime());
  assert.equal(window.end.getTime(), expectedEnd.getTime());
});

test('normalizeStatus accepts valid and cancelled sale statuses', () => {
  assert.equal(normalizeStatus('valide'), 'valide');
  assert.equal(normalizeStatus('annulé'), 'annule');
  assert.equal(normalizeStatus('pending'), 'pending');
});

test('summarizeSalesMetrics computes the main KPIs', () => {
  const summary = summarizeSalesMetrics([
    { montant_final: 30000, statut: 'valide' },
    { montant_final: 15000, statut: 'valide' },
    { montant_final: 8000, statut: 'annule' }
  ]);

  assert.equal(summary.salesCount, 2);
  assert.equal(summary.revenue, 45000);
  assert.equal(summary.averageBasket, 22500);
});
