const mongoose = require('mongoose');

const legalDocumentSchema = new mongoose.Schema({
  documentId: { type: Number, unique: true },
  slug: { type: String, required: true, unique: true, trim: true },
  title: { type: String, required: true, trim: true },
  summary: { type: String, default: '' },
  fileUrl: { type: String, default: '' },
  sortOrder: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  created_by: { type: Number, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

legalDocumentSchema.index({ status: 1, sortOrder: 1 });

legalDocumentSchema.pre('save', async function (next) {
  try {
    if (!this.documentId) {
      const latest = await this.constructor.findOne({}, {}, { sort: { documentId: -1 } });
      this.documentId = latest ? latest.documentId + 1 : 1;
    }
    this.updated_at = new Date();
    if (this.slug) {
      this.slug = String(this.slug)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
    next();
  } catch (error) {
    next(error);
  }
});

const LegalDocument = mongoose.model('LegalDocument', legalDocumentSchema);
module.exports = LegalDocument;
