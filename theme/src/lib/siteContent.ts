import { brand as fallbackBrand } from '@/data/brand';
import { mediaUrl, themeApi, type SiteContent } from '@/lib/themeApi';

export type HeroSlide = {
  id: string;
  imageUrl: string;
  linkUrl: string;
  title: string;
};

export type ThemeBrand = {
  name: string;
  shortName: string;
  tagline: string;
  motto: string;
  slogan: string;
  subSlogan: string;
  description: string;
  about: string;
  aboutExtended: string[];
  vision: string;
  mission: string;
  commitment: string;
  howItWasBuilt: string;
  values: { label: string; description: string }[];
  offerings: { title: string; description: string }[];
  pillars: { label: string; description: string }[];
  features: { label: string; description: string }[];
  assurances: string[];
  benefits: string[];
  contact: {
    phone: string;
    email: string;
    website: string;
    hours: string;
    address: string;
    supportNote: string;
  };
  founders: { name: string; role: string; bio: string; photoUrl: string }[];
  logo: string;
  heroImage: string;
  heroSlides: HeroSlide[];
};

function resolveMedia(path?: string | null, fallback = ''): string {
  if (!path) return fallback;
  if (/^https?:\/\//i.test(path)) return path;
  // Theme public assets (Next.js /public) — keep as-is
  if (path.startsWith('/') && !path.startsWith('/uploads/')) return path;
  return mediaUrl(path) || fallback;
}

export function mapSiteContent(data?: SiteContent | null): ThemeBrand {
  const src: Partial<SiteContent> = data || {};
  return {
    name: src.name || fallbackBrand.name,
    shortName: src.shortName || fallbackBrand.shortName,
    tagline: src.tagline || fallbackBrand.tagline,
    motto: src.motto || fallbackBrand.motto,
    slogan: src.slogan || fallbackBrand.slogan,
    subSlogan: src.subSlogan || fallbackBrand.subSlogan,
    description: src.description || fallbackBrand.description,
    about: src.about || fallbackBrand.about,
    aboutExtended:
      src.aboutExtended?.length ? src.aboutExtended : fallbackBrand.aboutExtended,
    vision: src.vision || fallbackBrand.vision,
    mission: src.mission || fallbackBrand.mission,
    commitment: src.commitment || fallbackBrand.commitment,
    howItWasBuilt: src.howItWasBuilt || '',
    values: src.values?.length ? src.values : fallbackBrand.values,
    offerings: src.offerings?.length ? src.offerings : fallbackBrand.offerings,
    pillars: src.pillars?.length ? src.pillars : fallbackBrand.pillars,
    features: src.features?.length ? src.features : fallbackBrand.features,
    assurances: src.assurances?.length ? src.assurances : fallbackBrand.assurances,
    benefits: src.benefits?.length ? src.benefits : fallbackBrand.benefits,
    contact: {
      phone: src.contact?.phone || fallbackBrand.contact.phone,
      email: src.contact?.email || fallbackBrand.contact.email,
      website: src.contact?.website || fallbackBrand.contact.website,
      hours: src.contact?.hours || fallbackBrand.contact.hours,
      address: src.contact?.address || fallbackBrand.contact.address,
      supportNote: src.contact?.supportNote || fallbackBrand.contact.supportNote,
    },
    founders: (src.founders || [])
      .filter((f) => f?.name)
      .map((f) => ({
        name: f.name || '',
        role: f.role || '',
        bio: f.bio || '',
        photoUrl: resolveMedia(f.photoUrl),
      })),
    logo: resolveMedia(src.logo, fallbackBrand.logo) || fallbackBrand.logo,
    heroImage: resolveMedia(src.heroImage, fallbackBrand.heroImage) || fallbackBrand.heroImage,
    heroSlides: (() => {
      const raw = Array.isArray(src.heroSlides) ? src.heroSlides : [];
      const mapped = raw
        .filter((s) => s?.imageUrl && s.status !== 'inactive')
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map((s, i) => ({
          id: String(s._id || `${s.imageUrl}-${i}`),
          imageUrl: resolveMedia(s.imageUrl) || '',
          linkUrl: (s.linkUrl || '').trim(),
          title: (s.title || '').trim(),
        }))
        .filter((s) => s.imageUrl);
      if (mapped.length > 0) return mapped;
      const fallback = resolveMedia(src.heroImage, fallbackBrand.heroImage) || fallbackBrand.heroImage;
      return fallback ? [{ id: 'default', imageUrl: fallback, linkUrl: '', title: '' }] : [];
    })(),
  };
}

export async function getSiteBrand(): Promise<ThemeBrand> {
  try {
    const res = await themeApi.getSiteContent();
    return mapSiteContent(res?.data);
  } catch {
    return mapSiteContent(null);
  }
}
