const WebsiteContent = require('../../MODALS/WebsiteContent');
const LegalDocument = require('../../MODALS/LegalDocument');
const DashboardBanner = require('../../MODALS/DashboardBanner');
const { BANNER_WIDTH, BANNER_HEIGHT } = require('../../MODALS/DashboardBanner');
const AuditService = require('../../SERVICES/AuditService');
const { errorLogger } = require('../../utils/logger');
const { INTERNAL_SERVER_ERROR } = require('../../utils/errorMessages');
const { REQUEST_SUCCESS: OK } = require('../../utils/successMessages');

function normalizeFounders(input) {
  const list = Array.isArray(input) ? input.slice(0, 2) : [];
  while (list.length < 2) {
    list.push({ name: '', role: '', bio: '', photoUrl: '' });
  }
  return list.map((f) => ({
    name: f?.name || '',
    role: f?.role || '',
    bio: f?.bio || '',
    photoUrl: f?.photoUrl || ''
  }));
}

function normalizeTestimonials(input) {
  const list = Array.isArray(input) ? input : [];
  return list
    .map((t, i) => {
      const ratingRaw = Number(t?.rating);
      const rating = Number.isFinite(ratingRaw)
        ? Math.min(5, Math.max(1, Math.round(ratingRaw)))
        : 5;
      const sortRaw = Number(t?.sortOrder);
      return {
        name: String(t?.name || '').trim(),
        location: String(t?.location || '').trim(),
        quote: String(t?.quote || '').trim(),
        rating,
        photoUrl: String(t?.photoUrl || '').trim(),
        status: t?.status === 'inactive' ? 'inactive' : 'active',
        sortOrder: Number.isFinite(sortRaw) ? sortRaw : i,
        ...(t?._id ? { _id: t._id } : {})
      };
    })
    .filter((t) => t.name || t.quote);
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

class WEBSITE_ADMIN {
  async getWebsiteContent(req, res) {
    try {
      const doc = await WebsiteContent.getOrCreate();
      const CompanyInfo = require('../../MODALS/CompanyInfo');
      let company = await CompanyInfo.findOne({});
      if (!company) company = await new CompanyInfo().save();

      const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
      plain.invoiceTax = {
        gst_number: company.taxInfo?.gst || '',
        pan: company.taxInfo?.pan || '',
        gst_percent: Number(company.taxInfo?.gst_percent) || 0
      };
      return res.status(200).json({ status: 200, message: 'Website content fetched.', data: plain });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async updateWebsiteContent(req, res) {
    try {
      const doc = await WebsiteContent.getOrCreate();
      const body = req.body || {};

      const stringFields = [
        'name', 'shortName', 'tagline', 'motto', 'slogan', 'subSlogan',
        'description', 'about', 'vision', 'mission', 'commitment',
        'howItWasBuilt', 'logo', 'heroImage'
      ];
      for (const key of stringFields) {
        if (body[key] !== undefined) doc[key] = String(body[key] ?? '');
      }

      if (Array.isArray(body.aboutExtended)) doc.aboutExtended = body.aboutExtended.map(String);
      if (Array.isArray(body.assurances)) doc.assurances = body.assurances.map(String);
      if (Array.isArray(body.benefits)) doc.benefits = body.benefits.map(String);
      if (Array.isArray(body.values)) doc.values = body.values;
      if (Array.isArray(body.offerings)) doc.offerings = body.offerings;
      if (Array.isArray(body.pillars)) doc.pillars = body.pillars;
      if (Array.isArray(body.features)) doc.features = body.features;
      if (body.contact && typeof body.contact === 'object') {
        doc.contact = { ...(doc.contact?.toObject?.() || doc.contact || {}), ...body.contact };
      }
      if (body.founders !== undefined) {
        doc.founders = normalizeFounders(body.founders);
      }

      if (body.testimonials !== undefined) {
        doc.testimonials = normalizeTestimonials(body.testimonials);
      }

      if (body.homeStoryEnabled !== undefined) {
        doc.homeStoryEnabled = Boolean(body.homeStoryEnabled);
      }

      if (body.socialLinks && typeof body.socialLinks === 'object') {
        const prev = doc.socialLinks?.toObject?.() || doc.socialLinks || {};
        const next = { ...prev };
        for (const key of ['facebook', 'instagram', 'youtube', 'twitter', 'linkedin', 'google', 'whatsapp']) {
          if (body.socialLinks[key] !== undefined) {
            next[key] = String(body.socialLinks[key] || '').trim();
          }
        }
        doc.socialLinks = next;
      }

      if (Array.isArray(body.heroSlides)) {
        doc.heroSlides = body.heroSlides
          .filter((s) => s && String(s.imageUrl || '').trim())
          .map((s, i) => ({
            imageUrl: String(s.imageUrl || '').trim(),
            linkUrl: String(s.linkUrl || '').trim(),
            title: String(s.title || '').trim(),
            sortOrder: Number.isFinite(Number(s.sortOrder)) ? Number(s.sortOrder) : i,
            status: s.status === 'inactive' ? 'inactive' : 'active',
            ...(s._id ? { _id: s._id } : {})
          }));
        // Keep legacy single-image field in sync with first active slide
        const firstActive = doc.heroSlides.find((s) => s.status === 'active') || doc.heroSlides[0];
        if (body.heroImage === undefined) {
          doc.heroImage = firstActive?.imageUrl || '';
        }
      }

      await doc.save();

      // Invoice tax settings live on CompanyInfo
      let invoiceTax = null;
      if (body.invoiceTax && typeof body.invoiceTax === 'object') {
        const CompanyInfo = require('../../MODALS/CompanyInfo');
        let company = await CompanyInfo.findOne({});
        if (!company) company = new CompanyInfo();

        const gstNumber = body.invoiceTax.gst_number !== undefined
          ? String(body.invoiceTax.gst_number || '').trim().toUpperCase()
          : undefined;
        const pan = body.invoiceTax.pan !== undefined
          ? String(body.invoiceTax.pan || '').trim().toUpperCase()
          : undefined;
        const pctRaw = body.invoiceTax.gst_percent !== undefined
          ? Number(body.invoiceTax.gst_percent)
          : undefined;

        company.set('taxInfo.gst', gstNumber !== undefined
          ? gstNumber
          : (company.taxInfo?.gst || ''));
        company.set('taxInfo.pan', pan !== undefined
          ? pan
          : (company.taxInfo?.pan || ''));
        if (pctRaw !== undefined) {
          company.set(
            'taxInfo.gst_percent',
            Number.isFinite(pctRaw) && pctRaw >= 0 ? pctRaw : 0
          );
        }

        // Keep company contact/name aligned with brand page for invoices
        if (body.name) company.companyName = String(body.name).trim();
        if (body.contact?.phone !== undefined) {
          company.set('contactInfo.phone', String(body.contact.phone || '').trim());
        }
        if (body.contact?.email !== undefined) {
          company.set('contactInfo.email', String(body.contact.email || '').trim());
        }
        if (body.contact?.website !== undefined) {
          company.set('contactInfo.website', String(body.contact.website || '').trim());
        }
        if (body.contact?.address !== undefined) {
          company.set('address.street', String(body.contact.address || '').trim());
        }

        company.markModified('taxInfo');
        company.markModified('contactInfo');
        company.markModified('address');
        await company.save();

        // Reload to confirm persistence
        const saved = await CompanyInfo.findById(company._id).lean();
        invoiceTax = {
          gst_number: saved?.taxInfo?.gst || '',
          pan: saved?.taxInfo?.pan || '',
          gst_percent: Number(saved?.taxInfo?.gst_percent) || 0
        };
      }

      await AuditService.log({
        actor_uid: req.user?.uid,
        actor_role: req.user?.role || 'admin',
        action: 'UPDATE_WEBSITE_CONTENT',
        target_type: 'website_content',
        target_id: doc._id,
        ip: req.ip,
        meta: { name: doc.name, invoiceTax }
      });

      const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
      if (invoiceTax) plain.invoiceTax = invoiceTax;

      return res.status(200).json({ ...OK, message: 'Website content updated.', data: plain });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async uploadWebsiteMedia(req, res) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ code: 400, message: 'No file uploaded.' });
      }
      const url = `/uploads/website/${file.filename}`;
      return res.status(200).json({
        ...OK,
        message: 'Website media uploaded.',
        data: { url }
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async getLegalDocuments(req, res) {
    try {
      const status = req.query.status;
      const filter = {};
      if (status === 'active' || status === 'inactive') filter.status = status;
      const list = await LegalDocument.find(filter).sort({ sortOrder: 1, created_at: -1 });
      return res.status(200).json({ status: 200, message: 'Legal documents fetched.', data: list });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async getLegalDocument(req, res) {
    try {
      const documentId = Number(req.query.documentId || req.params.documentId);
      if (!documentId) {
        return res.status(400).json({ code: 400, message: 'documentId is required.' });
      }
      const doc = await LegalDocument.findOne({ documentId });
      if (!doc) {
        return res.status(404).json({ code: 404, message: 'Legal document not found.' });
      }
      return res.status(200).json({ status: 200, message: 'Legal document fetched.', data: doc });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async createLegalDocument(req, res) {
    try {
      const { title, slug, summary, fileUrl, sortOrder, status } = req.body || {};
      if (!title) {
        return res.status(400).json({ code: 400, message: 'title is required.' });
      }
      const finalSlug = slugify(slug || title);
      if (!finalSlug) {
        return res.status(400).json({ code: 400, message: 'Valid slug is required.' });
      }
      const exists = await LegalDocument.findOne({ slug: finalSlug });
      if (exists) {
        return res.status(400).json({ code: 400, message: 'Slug already exists.' });
      }

      const doc = await LegalDocument.create({
        title: String(title).trim(),
        slug: finalSlug,
        summary: summary || '',
        fileUrl: fileUrl || '',
        sortOrder: Number(sortOrder) || 0,
        status: status === 'inactive' ? 'inactive' : 'active',
        created_by: req.user?.uid || null
      });

      await AuditService.log({
        actor_uid: req.user?.uid,
        actor_role: req.user?.role || 'admin',
        action: 'CREATE_LEGAL_DOCUMENT',
        target_type: 'legal_document',
        target_id: doc.documentId,
        ip: req.ip,
        meta: { slug: doc.slug, title: doc.title }
      });

      return res.status(201).json({ ...OK, message: 'Legal document created.', data: doc });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async updateLegalDocument(req, res) {
    try {
      const documentId = Number(req.body.documentId || req.params.documentId);
      if (!documentId) {
        return res.status(400).json({ code: 400, message: 'documentId is required.' });
      }
      const doc = await LegalDocument.findOne({ documentId });
      if (!doc) {
        return res.status(404).json({ code: 404, message: 'Legal document not found.' });
      }

      const { title, slug, summary, fileUrl, sortOrder, status } = req.body || {};
      if (title !== undefined) doc.title = String(title).trim();
      if (slug !== undefined) {
        const finalSlug = slugify(slug);
        if (!finalSlug) {
          return res.status(400).json({ code: 400, message: 'Valid slug is required.' });
        }
        const exists = await LegalDocument.findOne({ slug: finalSlug, documentId: { $ne: documentId } });
        if (exists) {
          return res.status(400).json({ code: 400, message: 'Slug already exists.' });
        }
        doc.slug = finalSlug;
      }
      if (summary !== undefined) doc.summary = String(summary);
      if (fileUrl !== undefined) doc.fileUrl = String(fileUrl);
      if (sortOrder !== undefined) doc.sortOrder = Number(sortOrder) || 0;
      if (status !== undefined) doc.status = status === 'inactive' ? 'inactive' : 'active';

      await doc.save();

      await AuditService.log({
        actor_uid: req.user?.uid,
        actor_role: req.user?.role || 'admin',
        action: 'UPDATE_LEGAL_DOCUMENT',
        target_type: 'legal_document',
        target_id: doc.documentId,
        ip: req.ip,
        meta: { slug: doc.slug, title: doc.title }
      });

      return res.status(200).json({ ...OK, message: 'Legal document updated.', data: doc });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async toggleLegalDocumentStatus(req, res) {
    try {
      const documentId = Number(req.body.documentId);
      if (!documentId) {
        return res.status(400).json({ code: 400, message: 'documentId is required.' });
      }
      const doc = await LegalDocument.findOne({ documentId });
      if (!doc) {
        return res.status(404).json({ code: 404, message: 'Legal document not found.' });
      }
      doc.status = doc.status === 'active' ? 'inactive' : 'active';
      await doc.save();
      return res.status(200).json({ ...OK, message: 'Legal document status updated.', data: doc });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async uploadLegalPdf(req, res) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ code: 400, message: 'No PDF uploaded.' });
      }
      const url = `/uploads/legal/${file.filename}`;
      return res.status(200).json({
        ...OK,
        message: 'Legal PDF uploaded.',
        data: { url }
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async getDashboardBanners(req, res) {
    try {
      const { status } = req.query;
      const filter = {};
      if (status === 'active' || status === 'inactive') filter.status = status;
      const list = await DashboardBanner.find(filter).sort({ sortOrder: 1, created_at: -1 });
      return res.status(200).json({
        status: 200,
        message: 'Dashboard banners fetched.',
        data: list,
        meta: { width: BANNER_WIDTH, height: BANNER_HEIGHT }
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async createDashboardBanner(req, res) {
    try {
      const { title, imageUrl, linkUrl, sortOrder, status } = req.body || {};
      if (!imageUrl || !String(imageUrl).trim()) {
        return res.status(400).json({ code: 400, message: 'Banner image is required.' });
      }

      const doc = await DashboardBanner.create({
        title: title || '',
        imageUrl: String(imageUrl).trim(),
        linkUrl: linkUrl || '',
        sortOrder: Number(sortOrder) || 0,
        status: status === 'inactive' ? 'inactive' : 'active',
        created_by: req.user?.uid || null
      });

      await AuditService.log({
        actor_uid: req.user?.uid,
        actor_role: req.user?.role || 'admin',
        action: 'CREATE_DASHBOARD_BANNER',
        target_type: 'dashboard_banner',
        target_id: doc.bannerId,
        ip: req.ip,
        meta: { title: doc.title }
      }).catch(() => {});

      return res.status(200).json({
        ...OK,
        message: 'Dashboard banner created.',
        data: doc,
        meta: { width: BANNER_WIDTH, height: BANNER_HEIGHT }
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async updateDashboardBanner(req, res) {
    try {
      const { bannerId, title, imageUrl, linkUrl, sortOrder, status } = req.body || {};
      const id = Number(bannerId);
      if (!id) {
        return res.status(400).json({ code: 400, message: 'bannerId is required.' });
      }

      const doc = await DashboardBanner.findOne({ bannerId: id });
      if (!doc) {
        return res.status(404).json({ code: 404, message: 'Banner not found.' });
      }

      if (title !== undefined) doc.title = title || '';
      if (imageUrl !== undefined) {
        if (!String(imageUrl).trim()) {
          return res.status(400).json({ code: 400, message: 'Banner image is required.' });
        }
        doc.imageUrl = String(imageUrl).trim();
      }
      if (linkUrl !== undefined) doc.linkUrl = linkUrl || '';
      if (sortOrder !== undefined) doc.sortOrder = Number(sortOrder) || 0;
      if (status === 'active' || status === 'inactive') doc.status = status;

      await doc.save();

      await AuditService.log({
        actor_uid: req.user?.uid,
        actor_role: req.user?.role || 'admin',
        action: 'UPDATE_DASHBOARD_BANNER',
        target_type: 'dashboard_banner',
        target_id: doc.bannerId,
        ip: req.ip,
        meta: { title: doc.title }
      }).catch(() => {});

      return res.status(200).json({
        ...OK,
        message: 'Dashboard banner updated.',
        data: doc,
        meta: { width: BANNER_WIDTH, height: BANNER_HEIGHT }
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async toggleDashboardBannerStatus(req, res) {
    try {
      const bannerId = Number(req.body?.bannerId);
      if (!bannerId) {
        return res.status(400).json({ code: 400, message: 'bannerId is required.' });
      }
      const doc = await DashboardBanner.findOne({ bannerId });
      if (!doc) {
        return res.status(404).json({ code: 404, message: 'Banner not found.' });
      }
      doc.status = doc.status === 'active' ? 'inactive' : 'active';
      await doc.save();
      return res.status(200).json({
        ...OK,
        message: `Banner ${doc.status}.`,
        data: doc
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async uploadDashboardBanner(req, res) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ code: 400, message: 'No banner image uploaded.' });
      }
      const url = `/uploads/banners/${file.filename}`;
      return res.status(200).json({
        ...OK,
        message: 'Banner image uploaded.',
        data: { url },
        meta: { width: BANNER_WIDTH, height: BANNER_HEIGHT }
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }
}

const WebsiteAdmin = new WEBSITE_ADMIN();
module.exports = WebsiteAdmin;
