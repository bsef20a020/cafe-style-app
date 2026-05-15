import { AlertCircle, Banknote, CheckCircle2, Coffee, CreditCard, Loader2, Minus, Plus, Search, ShoppingBag, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useCustomerAuth } from "../auth/CustomerAuthContext";
import { useCart } from "../cart/CartContext";
import MenuCard from "../components/MenuCard";
import { fallbackMenu } from "../data/menuFallback";

const formatter = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0
});

const emptyCheckout = {
  name: "",
  phone: "",
  email: "",
  fulfillmentType: "pickup",
  address: "",
  requestedDate: "",
  requestedTime: "",
  instructions: "",
  paymentMethod: "cod"
};

function MenuPage() {
  const { user } = useCustomerAuth();
  const { cart, cartCount, cartTotal, addToCart: addCartItem, changeQuantity, removeItem, clearCart } = useCart();
  const [state, setState] = useState({
    items: fallbackMenu.items,
    categories: fallbackMenu.categories,
    loading: true,
    error: ""
  });
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [checkout, setCheckout] = useState(emptyCheckout);
  const [orderState, setOrderState] = useState({ type: "idle", message: "", order: null, payment: null });

  useEffect(() => {
    if (!user) return;

    setCheckout((current) => ({
      ...current,
      name: current.name || user.name || "",
      phone: current.phone || user.phone || "",
      email: current.email || user.email || ""
    }));
  }, [user]);

  useEffect(() => {
    api
      .getMenu()
      .then((data) =>
        setState({
          items: data.items || [],
          categories: data.categories || [],
          loading: false,
          error: ""
        })
      )
      .catch(() =>
        setState({
          items: fallbackMenu.items,
          categories: fallbackMenu.categories,
          loading: false,
          error: "Showing a saved menu while the live menu refreshes."
        })
      );
  }, []);

  const filtered = useMemo(() => {
    return state.items.filter((item) => {
      const categoryMatch = category === "all" || item.category === category;
      const haystack = `${item.name} ${item.description} ${(item.tags || []).join(" ")}`.toLowerCase();
      return categoryMatch && haystack.includes(search.toLowerCase());
    });
  }, [state.items, category, search]);

  function addToCart(item) {
    setOrderState({ type: "idle", message: "", order: null, payment: null });
    addCartItem(item);
  }

  function updateCheckoutField(event) {
    const { name, value } = event.target;
    setCheckout((current) => ({ ...current, [name]: value }));
  }

  async function submitOrder(event) {
    event.preventDefault();

    if (!cart.length) {
      setOrderState({ type: "error", message: "Add at least one menu item before checkout.", order: null, payment: null });
      return;
    }

    setOrderState({ type: "loading", message: "", order: null, payment: null });

    try {
      const data = await api.createOrder({
        customer: {
          name: checkout.name,
          phone: checkout.phone,
          email: checkout.email
        },
        fulfillment: {
          type: checkout.fulfillmentType,
          address: checkout.address,
          requestedDate: checkout.requestedDate,
          requestedTime: checkout.requestedTime,
          instructions: checkout.instructions
        },
        paymentMethod: checkout.paymentMethod,
        items: cart.map((item) => ({
          menuItemId: item._id,
          quantity: item.quantity
        })),
        source: "website"
      });

      if (data.payment?.checkoutUrl) {
        window.location.assign(data.payment.checkoutUrl);
        return;
      }

      clearCart();
      setOrderState({
        type: "success",
        message: data.payment?.message || "Order placed successfully.",
        order: data.order,
        payment: data.payment
      });
    } catch (error) {
      const detail = error?.details ? Object.values(error.details).flat().find(Boolean) : "";
      setOrderState({
        type: "error",
        message: detail || "Order could not be placed. Please check your cart and contact details.",
        order: null,
        payment: null
      });
    }
  }

  return (
    <section className="page-section">
      <div className="page-intro">
        <span className="section-kicker">
          <Coffee size={17} />
          Dynamic menu
        </span>
        <h1>Menu that can move with the cafe.</h1>
        <p>Browse available items, add favorites to your cart, and checkout for pickup or delivery.</p>
      </div>

      <div className="menu-toolbar">
        <div className="search-box">
          <Search size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search drinks, desserts, tags" />
        </div>
        <div className="tabs" role="tablist" aria-label="Menu categories">
          <button className={category === "all" ? "active" : ""} onClick={() => setCategory("all")} type="button">
            All
          </button>
          {state.categories.map((item) => (
            <button className={category === item ? "active" : ""} onClick={() => setCategory(item)} type="button" key={item}>
              {item}
            </button>
          ))}
        </div>
      </div>

      {cartCount ? (
        <div className="cart-strip">
          <span>
            <ShoppingBag size={18} />
            {cartCount} items · {formatter.format(cartTotal)}
          </span>
          <a className="button compact-button" href="#checkout">
            Checkout
          </a>
        </div>
      ) : null}

      {state.loading ? (
        <div className="loading-row">
          <Loader2 className="spin" size={20} />
          Loading menu
        </div>
      ) : null}
      {state.error ? <p className="form-error">{state.error}</p> : null}

      <div className="menu-grid">
        {filtered.map((item) => (
          <MenuCard key={item._id} item={item} onAddToCart={addToCart} />
        ))}
      </div>

      {!state.loading && !filtered.length ? <p className="empty-state">No menu items match this view.</p> : null}

      <section className="checkout-section" id="checkout">
        <div className="section-heading compact-heading">
          <div>
            <span className="section-kicker">
              <ShoppingBag size={17} />
              Online order
            </span>
            <h2>Checkout</h2>
          </div>
        </div>

        {orderState.type === "success" && orderState.order ? (
          <div className="success-state order-success">
            <CheckCircle2 size={22} />
            <div>
              <strong>Order received: {orderState.order.reference}</strong>
              <p>
                Total {formatter.format(orderState.order.total)} · Payment {orderState.order.paymentStatus}
              </p>
              {orderState.message ? <p>{orderState.message}</p> : null}
              <Link className="button compact-button" to={`/orders/${orderState.order.reference}`}>
                View order
              </Link>
            </div>
          </div>
        ) : null}

        {orderState.type === "error" ? (
          <div className="admin-notice error" role="alert">
            <AlertCircle size={18} />
            <span>{orderState.message}</span>
          </div>
        ) : null}

        <div className="checkout-grid">
          <div className="cart-panel">
            <h3>Your cart</h3>
            {cart.length ? (
              <div className="cart-items">
                {cart.map((item) => (
                  <article className="cart-item" key={item._id}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>{formatter.format(item.price)} each</span>
                    </div>
                    <div className="quantity-control" aria-label={`${item.name} quantity`}>
                      <button type="button" onClick={() => changeQuantity(item._id, -1)} aria-label={`Decrease ${item.name}`}>
                        <Minus size={15} />
                      </button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => changeQuantity(item._id, 1)} aria-label={`Increase ${item.name}`}>
                        <Plus size={15} />
                      </button>
                    </div>
                    <strong>{formatter.format(Number(item.price || 0) * item.quantity)}</strong>
                    <button className="icon-button danger" type="button" onClick={() => removeItem(item._id)} aria-label={`Remove ${item.name}`}>
                      <Trash2 size={16} />
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-state">Your cart is empty.</p>
            )}
            <div className="cart-total">
              <span>Subtotal</span>
              <strong>{formatter.format(cartTotal)}</strong>
            </div>
          </div>

          <form className="checkout-form" onSubmit={submitOrder}>
            <label>
              Name
              <input name="name" value={checkout.name} onChange={updateCheckoutField} required />
            </label>
            <label>
              Phone
              <input name="phone" value={checkout.phone} onChange={updateCheckoutField} required />
            </label>
            <label>
              Email
              <input name="email" type="email" value={checkout.email} onChange={updateCheckoutField} required={checkout.paymentMethod === "card"} />
            </label>
            <label>
              Fulfillment
              <select name="fulfillmentType" value={checkout.fulfillmentType} onChange={updateCheckoutField}>
                <option value="pickup">Pickup</option>
                <option value="delivery">Delivery</option>
              </select>
            </label>
            {checkout.fulfillmentType === "delivery" ? (
              <label className="wide">
                Delivery address
                <input name="address" value={checkout.address} onChange={updateCheckoutField} required />
              </label>
            ) : null}
            <label>
              Requested date
              <input name="requestedDate" type="date" value={checkout.requestedDate} onChange={updateCheckoutField} />
            </label>
            <label>
              Requested time
              <input name="requestedTime" type="time" value={checkout.requestedTime} onChange={updateCheckoutField} />
            </label>
            <label className="wide">
              Notes
              <textarea name="instructions" rows="3" value={checkout.instructions} onChange={updateCheckoutField} placeholder="Allergies, delivery instructions, or timing notes" />
            </label>
            <div className="payment-options wide" role="radiogroup" aria-label="Payment method">
              <label className={checkout.paymentMethod === "cod" ? "payment-option active" : "payment-option"}>
                <input name="paymentMethod" type="radio" value="cod" checked={checkout.paymentMethod === "cod"} onChange={updateCheckoutField} />
                <Banknote size={18} />
                Cash on delivery
              </label>
              <label className={checkout.paymentMethod === "card" ? "payment-option active" : "payment-option"}>
                <input name="paymentMethod" type="radio" value="card" checked={checkout.paymentMethod === "card"} onChange={updateCheckoutField} />
                <CreditCard size={18} />
                Online card
              </label>
            </div>
            <button className="button primary wide" type="submit" disabled={orderState.type === "loading" || !cart.length}>
              {orderState.type === "loading" ? <Loader2 className="spin" size={18} /> : <ShoppingBag size={18} />}
              Place order
            </button>
          </form>
        </div>
      </section>
    </section>
  );
}

export default MenuPage;
