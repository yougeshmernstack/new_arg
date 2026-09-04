const mongoose = require('mongoose');

const labelDescSchema = new mongoose.Schema({
  label: { type: String, default: '' },
  description: { type: String, default: '' }
}, { _id: false });

const offeringSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  description: { type: String, default: '' }
}, { _id: false });

const founderSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  role: { type: String, default: '' },
  bio: { type: String, default: '' },
  photoUrl: { type: String, default: '' }
}, { _id: false });

const testimonialSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  location: { type: String, default: '' },
  quote: { type: String, default: '' },
  rating: { type: Number, default: 5, min: 1, max: 5 },
  photoUrl: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  sortOrder: { type: Number, default: 0 }
}, { _id: true });

const contactSchema = new mongoose.Schema({
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  website: { type: String, default: '' },
  hours: { type: String, default: '' },
  address: { type: String, default: '' },
  supportNote: { type: String, default: '' }
}, { _id: false });

const heroSlideSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true, default: '' },
  linkUrl: { type: String, default: '' },
  title: { type: String, default: '' },
  sortOrder: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { _id: true });

const websiteContentSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true },
  name: { type: String, default: 'Arogya Greenlife' },
  shortName: { type: String, default: 'AG' },
  tagline: { type: String, default: '' },
  motto: { type: String, default: '' },
  slogan: { type: String, default: '' },
  subSlogan: { type: String, default: '' },
  description: { type: String, default: '' },
  about: { type: String, default: '' },
  aboutExtended: { type: [String], default: [] },
  vision: { type: String, default: '' },
  mission: { type: String, default: '' },
  commitment: { type: String, default: '' },
  howItWasBuilt: { type: String, default: '' },
  values: { type: [labelDescSchema], default: [] },
  offerings: { type: [offeringSchema], default: [] },
  pillars: { type: [labelDescSchema], default: [] },
  features: { type: [labelDescSchema], default: [] },
  assurances: { type: [String], default: [] },
  benefits: { type: [String], default: [] },
  contact: { type: contactSchema, default: () => ({}) },
  founders: {
    type: [founderSchema],
    default: () => [
      { name: '', role: '', bio: '', photoUrl: '' },
      { name: '', role: '', bio: '', photoUrl: '' }
    ],
    validate: {
      validator(v) {
        return Array.isArray(v) && v.length <= 2;
      },
      message: 'At most 2 founders allowed.'
    }
  },
  testimonials: { type: [testimonialSchema], default: [] },
  logo: { type: String, default: '' },
  heroImage: { type: String, default: '' },
  heroSlides: { type: [heroSlideSchema], default: [] },
  /** Homepage “Why … / motto / pillars” block visibility */
  homeStoryEnabled: { type: Boolean, default: true },
  socialLinks: {
    type: new mongoose.Schema({
      facebook: { type: String, default: '' },
      instagram: { type: String, default: '' },
      youtube: { type: String, default: '' },
      twitter: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      google: { type: String, default: '' },
      whatsapp: { type: String, default: '' }
    }, { _id: false }),
    default: () => ({})
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

websiteContentSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  if (Array.isArray(this.founders) && this.founders.length > 2) {
    this.founders = this.founders.slice(0, 2);
  }
  next();
});

websiteContentSchema.statics.getOrCreate = async function getOrCreate() {
  let doc = await this.findOne({ key: 'default' });
  if (!doc) {
    doc = await this.create({ key: 'default' });
  }
  return doc;
};

const WebsiteContent = mongoose.model('WebsiteContent', websiteContentSchema);
module.exports = WebsiteContent;
