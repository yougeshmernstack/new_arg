import Image from "next/image";
import Link from "next/link";
import { brand } from "@/data/brand";

export function Footer() {
  return (
    <>
      <footer className="site-footer">
        <div>
          <Link className="brand footer-brand" href="/">
            <span className="brand-logo brand-logo-lg">
              <Image src={brand.logo} alt={brand.name} width={200} height={200} />
            </span>
          </Link>
          <p>{brand.about}</p>
        </div>
        <div>
          <h3>Shop</h3>
          <Link href="/products">Wellness products</Link>
          <Link href="/packages">Wellness packages</Link>
          <Link href="/cart">Cart</Link>
        </div>
        <div>
          <h3>Company</h3>
          <Link href="/about">About us</Link>
          <Link href="/contact">Contact us</Link>
          <Link href="/legal">Legal documents</Link>
        </div>
        <div>
          <h3>Contact</h3>
          <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>
          <a href={`tel:${brand.contact.phone.replace(/\s/g, "")}`}>{brand.contact.phone}</a>
          <span>{brand.contact.website}</span>
          <span>{brand.contact.hours}</span>
        </div>
      </footer>
      <div className="footer-bar">
        <div className="footer-bar-inner">
          {brand.features.map((feature) => (
            <span key={feature.label}>{feature.label}</span>
          ))}
          <span className="footer-bar-tagline">Live Well. Drink Well. Be Well.</span>
        </div>
      </div>
    </>
  );
}
