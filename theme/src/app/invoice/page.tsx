import type { Metadata } from 'next';
import { brand as fallbackBrand } from '@/data/brand';
import InvoiceLookupClient from './InvoiceLookupClient';

export const metadata: Metadata = {
  title: `Check Invoice | ${fallbackBrand.name}`,
  description: 'Look up and download an invoice using your invoice number.',
};

export default function InvoicePage() {
  return <InvoiceLookupClient />;
}
