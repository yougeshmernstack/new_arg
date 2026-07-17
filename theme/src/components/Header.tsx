import Image from "next/image";
import Link from "next/link";
import { brand } from "@/data/brand";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/packages", label: "Packages" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" }
];

export function Header() {
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <span className="brand-logo">
          <Image
            src={brand.logo}
            alt={brand.name}
            width={160}
            height={160}
            priority
          />
        </span>
      </Link>
      <nav aria-label="Primary navigation">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="header-actions">
        <Link className="header-link" href="/cart">
          Cart
        </Link>
        <Link className="button button-small" href="/checkout">
          Checkout
        </Link>
      </div>
    </header>
  );
}
