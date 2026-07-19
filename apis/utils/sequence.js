const mongoose = require('mongoose');

// Reuse the existing Counter model registered in MODALS/Counter.js
require('../MODALS/Counter');

const Counter = mongoose.model('Counter');

/**
 * Atomically increment and return the next sequence for a key.
 * Starts at 1 for new keys (commerce document numbers).
 */
async function getNextSequence(key) {
  const result = await Counter.findOneAndUpdate(
    { ID: key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return result.seq;
}

/**
 * Generate yearly padded document numbers.
 * Example: ORD-2026-000001, INV-2026-000001
 */
async function getYearlyDocumentNumber(prefix) {
  const year = new Date().getFullYear();
  const key = `${prefix}_${year}`;
  const seq = await getNextSequence(key);
  const padded = String(seq).padStart(6, '0');
  return `${prefix}-${year}-${padded}`;
}

async function getNextOrderNumber() {
  return getYearlyDocumentNumber('ORD');
}

async function getNextInvoiceNumber() {
  return getYearlyDocumentNumber('INV');
}

module.exports = {
  getNextSequence,
  getYearlyDocumentNumber,
  getNextOrderNumber,
  getNextInvoiceNumber
};
