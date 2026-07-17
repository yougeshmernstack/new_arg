import type { Metadata } from "next";
import { brand } from "@/data/brand";

export const metadata: Metadata = {
  title: `Contact Us | ${brand.name}`,
  description: `Get in touch with ${brand.name} for orders, support, and wellness product enquiries.`
};

export default function ContactPage() {
  return (
    <>
      <section className="page-hero company-hero">
        <p className="eyebrow">Contact us</p>
        <h1>We&apos;re here to help</h1>
        <p>
          Reach out for product enquiries, order support, or partnership opportunities. {brand.contact.supportNote}
        </p>
      </section>

      <section className="section contact-layout">
        <div className="contact-details">
          <h2>Get in touch</h2>
          <div className="contact-list">
            <article>
              <span className="contact-label">Phone</span>
              <a href={`tel:${brand.contact.phone.replace(/\s/g, "")}`}>{brand.contact.phone}</a>
            </article>
            <article>
              <span className="contact-label">Email</span>
              <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>
            </article>
            <article>
              <span className="contact-label">Website</span>
              <span>{brand.contact.website}</span>
            </article>
            <article>
              <span className="contact-label">Address</span>
              <span>{brand.contact.address}</span>
            </article>
            <article>
              <span className="contact-label">Business hours</span>
              <span>{brand.contact.hours}</span>
            </article>
          </div>

          <div className="assurance-mini">
            {brand.assurances.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <form className="contact-form">
          <h2>Send a message</h2>
          <div className="form-grid">
            <label>
              Full name
              <input type="text" name="name" placeholder="Your name" />
            </label>
            <label>
              Phone
              <input type="tel" name="phone" placeholder="+91 98765 43210" />
            </label>
            <label className="full">
              Email
              <input type="email" name="email" placeholder="you@example.com" />
            </label>
            <label className="full">
              Subject
              <input type="text" name="subject" placeholder="Order enquiry, product question..." />
            </label>
            <label className="full">
              Message
              <textarea name="message" rows={5} placeholder="How can we help you?" />
            </label>
          </div>
          <button className="button" type="submit">
            Send message
          </button>
        </form>
      </section>
    </>
  );
}
