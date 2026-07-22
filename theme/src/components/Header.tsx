import { SiteHeader } from '@/components/SiteHeader';
import { getSiteBrand } from '@/lib/siteContent';

export async function Header() {
  const brand = await getSiteBrand();
  return <SiteHeader brandName={brand.name} brandLogo={brand.logo} />;
}
