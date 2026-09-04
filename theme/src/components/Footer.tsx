import Image from "next/image";
import Link from "next/link";
import { getSiteBrand } from "@/lib/siteContent";

const SOCIAL = [
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "youtube", label: "YouTube" },
  { key: "twitter", label: "X" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "google", label: "Google" },
  { key: "whatsapp", label: "WhatsApp" },
] as const;

function SocialIcon({ name }: { name: (typeof SOCIAL)[number]["key"] }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 16,
    height: 16,
    fill: "currentColor",
    "aria-hidden": true as const,
  };

  switch (name) {
    case "facebook":
      return (
        <svg {...common}>
          <path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H9v3h2v7h3v-7h2.6L17 11h-3V9z" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...common}>
          <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 4.5A4.5 4.5 0 1 0 16.5 12 4.5 4.5 0 0 0 12 7.5zm5.2-.9a1.1 1.1 0 1 0 1.1 1.1 1.1 1.1 0 0 0-1.1-1.1zM12 9.5A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5z" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common}>
          <path d="M23 12.2s0-3.2-.4-4.7c-.2-.9-.9-1.6-1.8-1.8C19.2 5.3 12 5.3 12 5.3s-7.2 0-8.8.4c-.9.2-1.6.9-1.8 1.8C1 9 1 12.2 1 12.2s0 3.2.4 4.7c.2.9.9 1.6 1.8 1.8 1.6.4 8.8.4 8.8.4s7.2 0 8.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.5.4-4.7.4-4.7zM9.8 15.5v-6.6l6 3.3-6 3.3z" />
        </svg>
      );
    case "twitter":
      return (
        <svg {...common}>
          <path d="M18.2 3H21l-6.5 7.4L22 21h-6.2l-4.4-5.7L6 21H3.2l7-7.9L2 3h6.3l4 5.2L18.2 3zm-1.1 16.2h1.7L7 4.7H5.2l11.9 14.5z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg {...common}>
          <path d="M6.5 9H3.7v11.3h2.8V9zM5.1 3.5A1.6 1.6 0 1 0 5.1 6.7 1.6 1.6 0 0 0 5.1 3.5zM20.3 20.3h-2.8v-5.5c0-1.5-.5-2.5-1.8-2.5-1 0-1.5.7-1.8 1.3-.1.2-.1.6-.1.9v5.8H11V9h2.7v1.5c.5-.8 1.5-1.8 3.4-1.8 2.4 0 4.2 1.6 4.2 5v6.6z" />
        </svg>
      );
    case "google":
      return (
        <svg {...common}>
          <path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" />
          <path d="M12 22c2.7 0 5-.9 6.7-2.4l-3.2-2.5c-.9.6-2.1 1-3.5 1a6.1 6.1 0 0 1-5.7-4.2H3v2.6A10 10 0 0 0 12 22z" />
          <path d="M6.3 13.9A6 6 0 0 1 6 12c0-.7.1-1.3.3-1.9V7.5H3A10 10 0 0 0 2 12c0 1.6.4 3.1 1 4.5l3.3-2.6z" />
          <path d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.9 9.9 0 0 0 12 2 10 10 0 0 0 3 7.5l3.3 2.6A6.1 6.1 0 0 1 12 5.9z" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg {...common}>
          <path d="M20.5 3.5A10 10 0 0 0 3.4 17.6L2 22l4.5-1.2A10 10 0 0 0 22 12a9.9 9.9 0 0 0-1.5-8.5zM12 20a8 8 0 0 1-4.1-1.1l-.3-.2-2.6.7.7-2.5-.2-.3A8 8 0 1 1 12 20zm4.4-5.9c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.7.9-.3.2-.5.1a6.6 6.6 0 0 1-1.9-1.2 7.3 7.3 0 0 1-1.3-1.7c-.1-.3 0-.4.1-.5l.4-.4.2-.3a.5.5 0 0 0 0-.5l-.8-1.9c-.2-.5-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5 5 0 0 0 1.1 2.7 11.5 11.5 0 0 0 4.4 3.9 5 5 0 0 0 2.9.8 2.5 2.5 0 0 0 1.7-.8 2.1 2.1 0 0 0 .4-1.3c0-.2-.2-.3-.4-.4z" />
        </svg>
      );
    default:
      return null;
  }
}

export async function Footer() {
  const brand = await getSiteBrand();
  const socialItems = SOCIAL.filter((item) => brand.socialLinks?.[item.key]?.trim());
  const year = new Date().getFullYear();
  const companyName = brand.name || "Arogya Greenlife";
  const phoneHref = brand.contact.phone ? `tel:${brand.contact.phone.replace(/\s/g, "")}` : undefined;
  const websiteHref = brand.contact.website
    ? /^https?:\/\//i.test(brand.contact.website)
      ? brand.contact.website
      : `https://${brand.contact.website}`
    : undefined;

  return (
    <footer className="site-footer-wrap">
      <div className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand-panel">
            <Link className="footer-brand" href="/">
              <span className="footer-logo">
                <Image
                  src={brand.logo}
                  alt={companyName}
                  width={200}
                  height={200}
                  unoptimized={brand.logo.startsWith("http")}
                />
              </span>
              <span className="footer-brand-copy">
                <strong className="footer-company-name">{companyName}</strong>
                <span className="footer-brand-kicker">Natural wellness</span>
              </span>
            </Link>

            {socialItems.length > 0 ? (
              <div className="footer-social" aria-label="Social media">
                {socialItems.map((item) => (
                  <a
                    key={item.key}
                    className={`footer-social-link is-${item.key}`}
                    href={brand.socialLinks[item.key]}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={item.label}
                    title={item.label}
                  >
                    <SocialIcon name={item.key} />
                  </a>
                ))}
              </div>
            ) : null}

            <Link className="footer-cta" href="/contact">
              Talk to us
            </Link>
          </div>

          <div className="footer-grid">
            <nav className="footer-nav-col" aria-label="Shop">
              <h3>Shop</h3>
              <Link href="/products">All products</Link>
              <Link href="/packages">Wellness packages</Link>
              <Link href="/shop">Live shop</Link>
              <Link href="/shop/cart">Cart</Link>
              <Link href="/checkout">Checkout</Link>
            </nav>

            <nav className="footer-nav-col" aria-label="Company">
              <h3>Company</h3>
              <Link href="/">Home</Link>
              <Link href="/about">About us</Link>
              <Link href="/reviews">Reviews &amp; Testimonials</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/legal">Legal</Link>
              <Link href="/packages">Packages</Link>
            </nav>

            <nav className="footer-nav-col" aria-label="Account">
              <h3>Account</h3>
              <Link href="/login">Sign in</Link>
              <Link href="/signup">Create account</Link>
              <Link href="/shop/orders">My orders</Link>
              <Link href="/account/change-password">Change password</Link>
            </nav>

            <div className="footer-nav-col footer-contact-col">
              <h3>Contact</h3>
              {brand.contact.email ? (
                <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>
              ) : null}
              {brand.contact.phone && phoneHref ? (
                <a href={phoneHref}>{brand.contact.phone}</a>
              ) : null}
              {brand.contact.website && websiteHref ? (
                <a href={websiteHref} target="_blank" rel="noreferrer">
                  {brand.contact.website.replace(/^https?:\/\//i, "").replace(/\/$/, "")}
                </a>
              ) : null}
              {brand.contact.hours ? <span>{brand.contact.hours}</span> : null}
              {brand.contact.address ? (
                <span className="footer-address">{brand.contact.address}</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bar">
        <div className="footer-bar-inner">
          <p className="footer-copyright">
            © {year} <strong>{companyName}</strong>. All rights reserved.
          </p>
          <nav className="footer-bar-links" aria-label="Footer legal">
            <Link href="/legal">Legal</Link>
            <Link href="/reviews">Reviews</Link>
            <Link href="/contact">Support</Link>
            <Link href="/about">About</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
