import Link from "next/link";
import { packages } from "@/data/commerce";

const cartItems = [
  {
    name: packages[0].name,
    type: "3 wellness juices",
    price: packages[0].price,
    quantity: 1
  },
  {
    name: packages[2].name,
    type: "2 cold-pressed juices",
    price: packages[2].price,
    quantity: 1
  }
];

export default function CartPage() {
  const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const discount = 0;
  const shipping = subtotal > 999 ? 0 : 99;
  const total = subtotal - discount + shipping;

  return (
    <>
      <section className="page-hero compact-hero">
        <p className="eyebrow">Shopping cart</p>
        <h1>Review your wellness order</h1>
        <p>Review your Arogya Greenlife products, apply coupons, and proceed to checkout.</p>
      </section>

      <section className="section cart-layout">
        <div className="cart-list">
          {cartItems.map((item) => (
            <article className="cart-row" key={item.name}>
              <div className="cart-thumb">{item.type}</div>
              <div>
                <h2>{item.name}</h2>
                <p>{item.type}</p>
              </div>
              <div className="quantity-row">
                <button type="button">-</button>
                <span>{item.quantity}</span>
                <button type="button">+</button>
              </div>
              <strong>Rs. {(item.price * item.quantity).toLocaleString("en-IN")}</strong>
            </article>
          ))}
        </div>

        <aside className="summary-card">
          <h2>Order summary</h2>
          <div className="summary-row">
            <span>Subtotal</span>
            <strong>Rs. {subtotal.toLocaleString("en-IN")}</strong>
          </div>
          <div className="summary-row">
            <span>Discount</span>
            <strong>- Rs. {discount.toLocaleString("en-IN")}</strong>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <strong>{shipping === 0 ? "Free" : `Rs. ${shipping}`}</strong>
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <strong>Rs. {total.toLocaleString("en-IN")}</strong>
          </div>
          <label className="coupon-field">
            Coupon code
            <input type="text" placeholder="Enter code" />
          </label>
          <Link className="button" href="/checkout">
            Proceed to checkout
          </Link>
        </aside>
      </section>
    </>
  );
}
