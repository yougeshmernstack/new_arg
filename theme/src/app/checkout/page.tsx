import Link from "next/link";
import { packages } from "@/data/commerce";

export default function CheckoutPage() {
  const subtotal = packages[0].price + packages[1].price;
  const discount = 0;
  const total = subtotal - discount;

  return (
    <>
      <section className="page-hero compact-hero">
        <p className="eyebrow">Checkout</p>
        <h1>Complete your order</h1>
        <p>Static checkout template with shipping details, payment placeholder, and order review.</p>
      </section>

      <section className="section checkout-layout">
        <form className="checkout-form">
          <div className="form-section">
            <h2>Shipping details</h2>
            <div className="form-grid">
              <label>
                Full name
                <input placeholder="Your name" />
              </label>
              <label>
                Phone
                <input placeholder="+91 98765 43210" />
              </label>
              <label className="full">
                Address
                <input placeholder="House number, street, area" />
              </label>
              <label>
                City
                <input placeholder="City" />
              </label>
              <label>
                Pincode
                <input placeholder="302001" />
              </label>
            </div>
          </div>

          <div className="form-section">
            <h2>Payment method</h2>
            <div className="payment-options">
              <label>
                <input name="payment" type="radio" defaultChecked />
                Cash on delivery
              </label>
              <label>
                <input name="payment" type="radio" />
                UPI / Cards placeholder
              </label>
            </div>
          </div>
        </form>

        <aside className="summary-card">
          <h2>Order review</h2>
          <div className="summary-product">
            <span>{packages[0].name}</span>
            <strong>Rs. {packages[0].price}</strong>
          </div>
          <div className="summary-product">
            <span>{packages[1].name}</span>
            <strong>Rs. {packages[1].price}</strong>
          </div>
          <div className="summary-line">
            <span>Subtotal</span>
            <strong>Rs. {subtotal.toLocaleString("en-IN")}</strong>
          </div>
          <div className="summary-line">
            <span>Coupon</span>
            <strong>Rs. {discount}</strong>
          </div>
          <div className="summary-line total">
            <span>Payable</span>
            <strong>Rs. {total.toLocaleString("en-IN")}</strong>
          </div>
          <button className="button" type="button">
            Place static order
          </button>
          <Link className="text-link centered" href="/cart">
            Back to cart
          </Link>
        </aside>
      </section>
    </>
  );
}
