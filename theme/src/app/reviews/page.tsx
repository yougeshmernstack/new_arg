import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { brand as fallbackBrand } from "@/data/brand";
import { testimonials as fallbackTestimonials } from "@/data/commerce";
import { getSiteBrand } from "@/lib/siteContent";

export const metadata: Metadata = {
  title: `Reviews & Testimonials | ${fallbackBrand.name}`,
  description: `What customers say about ${fallbackBrand.name} — real reviews and wellness testimonials.`,
};

function Stars({ rating }: { rating: number }) {
  const filled = Math.round(rating);
  return (
    <div className="review-stars" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < filled ? "is-on" : undefined} aria-hidden="true">
          ★
        </span>
      ))}
    </div>
  );
}

export default async function ReviewsPage() {
  const brand = await getSiteBrand();
  const fromCms = brand.testimonials;
  const reviews =
    fromCms.length > 0
      ? fromCms
      : fallbackTestimonials.map((t, i) => ({
          id: `fallback-${i}`,
          name: t.name,
          location: t.location,
          quote: t.quote,
          rating: t.rating,
          photoUrl: "",
        }));

  return (
    <>
      <section className="page-hero company-hero">
        <p className="eyebrow">Customer voices</p>
        <h1>Reviews &amp; Testimonials</h1>
        <p>
          Real experiences from people who trust {brand.name} for everyday wellness — fresh taste,
          clean ingredients, and routines that stick.
        </p>
      </section>

      <section className="section reviews-page">
        {reviews.length === 0 ? (
          <div className="reviews-empty">
            <p>No reviews published yet. Check back soon.</p>
            <Link className="text-link" href="/contact">
              Share your experience
            </Link>
          </div>
        ) : (
          <div className="reviews-grid">
            {reviews.map((item) => (
              <article key={item.id} className="review-card">
                <Stars rating={item.rating} />
                <blockquote>
                  <p>{item.quote}</p>
                </blockquote>
                <footer className="review-author">
                  {item.photoUrl ? (
                    <span className="review-avatar">
                      <Image
                        src={item.photoUrl}
                        alt=""
                        width={48}
                        height={48}
                        unoptimized={item.photoUrl.startsWith("http")}
                      />
                    </span>
                  ) : (
                    <span className="review-avatar review-avatar-fallback" aria-hidden="true">
                      {(item.name || "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="review-author-meta">
                    <strong>{item.name}</strong>
                    {item.location ? <span>{item.location}</span> : null}
                  </span>
                </footer>
              </article>
            ))}
          </div>
        )}

        <div className="reviews-cta">
          <p>Tried our products? We&apos;d love to hear from you.</p>
          <Link className="footer-cta" href="/contact">
            Contact us
          </Link>
        </div>
      </section>
    </>
  );
}
