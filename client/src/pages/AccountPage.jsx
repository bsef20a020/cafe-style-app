import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  Coffee,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  Loader2,
  LogOut,
  Minus,
  Plus,
  ReceiptText,
  Save,
  ShoppingBag,
  Trash2,
  UserRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useCustomerAuth } from "../auth/CustomerAuthContext";
import { useCart } from "../cart/CartContext";

const formatter = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0
});

function AccountPage() {
  const { user, logout, updateProfile } = useCustomerAuth();
  const { cart, cartCount, cartTotal, changeQuantity, removeItem, clearCart } = useCart();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("overview");
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    profileImage: user?.profileImage || ""
  });
  const [profileStatus, setProfileStatus] = useState({ type: "idle", message: "" });
  const [state, setState] = useState({
    loading: true,
    error: "",
    orders: [],
    reservations: []
  });

  useEffect(() => {
    setProfileForm({
      name: user?.name || "",
      phone: user?.phone || "",
      profileImage: user?.profileImage || ""
    });
  }, [user]);

  const initials = useMemo(() => {
    return (user?.name || "N")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user?.name]);

  useEffect(() => {
    let active = true;

    Promise.all([api.getAccountOrders(), api.getAccountReservations()])
      .then(([orderData, reservationData]) => {
        if (!active) return;
        setState({
          loading: false,
          error: "",
          orders: orderData.orders || [],
          reservations: reservationData.reservations || []
        });
      })
      .catch(() => {
        if (!active) return;
        setState((current) => ({
          ...current,
          loading: false,
          error: "Account history could not be loaded. Please refresh the page."
        }));
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  function updateProfileField(event) {
    const { name, value } = event.target;
    setProfileStatus({ type: "idle", message: "" });
    setProfileForm((current) => ({ ...current, [name]: value }));
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setProfileStatus({ type: "loading", message: "" });

    try {
      await updateProfile(profileForm);
      setProfileStatus({ type: "success", message: "Profile updated." });
    } catch (error) {
      const detail = error?.details ? Object.values(error.details).flat().find(Boolean) : "";
      setProfileStatus({ type: "error", message: detail || "Profile could not be updated." });
    }
  }

  const recentOrder = state.orders[0];
  const recentReservation = state.reservations[0];

  return (
    <section className="page-section account-page">
      <div className="account-shell">
        <aside className="customer-sidebar" aria-label="Customer account navigation">
          <div className="customer-sidebar-profile">
            <AccountAvatar user={user} initials={initials} />
            <div>
              <strong>{user?.name}</strong>
              <span>{user?.email}</span>
            </div>
          </div>

          <nav className="customer-sidebar-nav">
            <button className={activeSection === "overview" ? "active" : ""} type="button" onClick={() => setActiveSection("overview")}>
              <LayoutDashboard size={18} />
              Overview
            </button>
            <button className={activeSection === "profile" ? "active" : ""} type="button" onClick={() => setActiveSection("profile")}>
              <UserRound size={18} />
              Profile
            </button>
            <button className={activeSection === "cart" ? "active" : ""} type="button" onClick={() => setActiveSection("cart")}>
              <ShoppingBag size={18} />
              Cart
              {cartCount ? <span className="sidebar-count">{cartCount}</span> : null}
            </button>
            <button className={activeSection === "orders" ? "active" : ""} type="button" onClick={() => setActiveSection("orders")}>
              <ReceiptText size={18} />
              My Orders
            </button>
            <button className={activeSection === "reservations" ? "active" : ""} type="button" onClick={() => setActiveSection("reservations")}>
              <CalendarCheck size={18} />
              My Reservations
            </button>
            <Link to="/menu">
              <Coffee size={18} />
              Order Food
            </Link>
            <Link to="/reserve">
              <CalendarCheck size={18} />
              Reserve Table
            </Link>
          </nav>

          <button className="customer-sidebar-logout" type="button" onClick={handleLogout}>
            <LogOut size={18} />
            Logout
          </button>
        </aside>

        <div className="account-content">
          <div className="account-header">
            <div>
              <span className="section-kicker">
                <UserRound size={17} />
                Customer account
              </span>
              <h1>{accountTitle(activeSection)}</h1>
              <p>
                {user?.name} · {user?.phone}
              </p>
            </div>
          </div>

          {state.loading ? (
            <div className="loading-row">
              <Loader2 className="spin" size={20} />
              Loading account history
            </div>
          ) : null}

          {state.error ? <p className="form-error">{state.error}</p> : null}

          {activeSection === "overview" ? (
            <div className="account-overview">
              <div className="account-stats">
                <SummaryStat label="Orders" value={state.orders.length} icon={<ReceiptText size={20} />} />
                <SummaryStat label="Reservations" value={state.reservations.length} icon={<CalendarCheck size={20} />} />
                <SummaryStat label="Cart Items" value={cartCount} icon={<ShoppingBag size={20} />} />
              </div>

              <div className="account-grid">
                <HistoryPanel title="Latest Order" icon={<ReceiptText size={20} />} action={<Link className="button compact-button" to="/menu">Order Food</Link>}>
                  {recentOrder ? <OrderItem order={recentOrder} /> : <EmptyHistory icon={<History size={20} />} title="No account orders yet" text="Orders placed while logged in will appear here." />}
                </HistoryPanel>

                <HistoryPanel title="Latest Reservation" icon={<CalendarCheck size={20} />} action={<Link className="button compact-button" to="/reserve">Reserve Table</Link>}>
                  {recentReservation ? (
                    <ReservationItem reservation={recentReservation} />
                  ) : (
                    <EmptyHistory icon={<History size={20} />} title="No account reservations yet" text="Reservations sent while logged in will appear here." />
                  )}
                </HistoryPanel>
              </div>
            </div>
          ) : null}

          {activeSection === "profile" ? (
            <section className="history-panel profile-panel">
              <div className="history-panel-heading">
                <h2>
                  <UserRound size={20} />
                  Profile
                </h2>
              </div>
              <form className="profile-form" onSubmit={handleProfileSubmit}>
                <div className="profile-photo-preview">
                  <AccountAvatar user={{ ...user, profileImage: profileForm.profileImage }} initials={initials} />
                  <span>
                    <ImageIcon size={17} />
                    Profile photo
                  </span>
                </div>
                <label>
                  Name
                  <input name="name" value={profileForm.name} onChange={updateProfileField} required minLength={2} />
                </label>
                <label>
                  Phone
                  <input name="phone" value={profileForm.phone} onChange={updateProfileField} required minLength={7} />
                </label>
                <label>
                  Email
                  <input value={user?.email || ""} readOnly />
                </label>
                <label className="wide">
                  Profile photo URL
                  <input name="profileImage" value={profileForm.profileImage} onChange={updateProfileField} placeholder="https://example.com/photo.jpg" />
                </label>

                {profileStatus.type === "success" ? (
                  <div className="success-state compact-state wide" role="status">
                    <CheckCircle2 size={20} />
                    <p>{profileStatus.message}</p>
                  </div>
                ) : null}

                {profileStatus.type === "error" ? (
                  <div className="admin-notice error wide" role="alert">
                    <AlertCircle size={18} />
                    <span>{profileStatus.message}</span>
                  </div>
                ) : null}

                <button className="button primary wide" type="submit" disabled={profileStatus.type === "loading"}>
                  {profileStatus.type === "loading" ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                  Save profile
                </button>
              </form>
            </section>
          ) : null}

          {activeSection === "cart" ? (
            <HistoryPanel title="Cart" icon={<ShoppingBag size={20} />} action={<Link className="button compact-button" to="/menu">Add items</Link>}>
              {!cart.length ? (
                <EmptyHistory icon={<ShoppingBag size={20} />} title="Your cart is empty" text="Add menu items and they will appear here." />
              ) : (
                <>
                  <div className="account-cart-list">
                    {cart.map((item) => (
                      <CartItem item={item} key={item._id} onChangeQuantity={changeQuantity} onRemove={removeItem} />
                    ))}
                  </div>
                  <div className="account-cart-footer">
                    <button className="button ghost" type="button" onClick={clearCart}>
                      <Trash2 size={18} />
                      Clear cart
                    </button>
                    <div>
                      <span>Subtotal</span>
                      <strong>{formatter.format(cartTotal)}</strong>
                    </div>
                    <Link className="button primary" to="/menu#checkout">
                      Checkout
                    </Link>
                  </div>
                </>
              )}
            </HistoryPanel>
          ) : null}

          {activeSection === "orders" ? (
            <HistoryPanel title="My Orders" icon={<ReceiptText size={20} />} action={<Link className="button compact-button" to="/menu">Order Food</Link>}>
              {!state.loading && !state.orders.length ? <EmptyHistory icon={<History size={20} />} title="No account orders yet" text="Orders placed while logged in will appear here." /> : null}
              <div className="history-list">
                {state.orders.map((order) => (
                  <OrderItem order={order} key={order._id} />
                ))}
              </div>
            </HistoryPanel>
          ) : null}

          {activeSection === "reservations" ? (
            <HistoryPanel title="My Reservations" icon={<CalendarCheck size={20} />} action={<Link className="button compact-button" to="/reserve">Reserve Table</Link>}>
              {!state.loading && !state.reservations.length ? (
                <EmptyHistory icon={<History size={20} />} title="No account reservations yet" text="Reservations sent while logged in will appear here." />
              ) : null}
              <div className="history-list">
                {state.reservations.map((reservation) => (
                  <ReservationItem reservation={reservation} key={reservation._id} />
                ))}
              </div>
            </HistoryPanel>
          ) : null}

        </div>
      </div>
    </section>
  );
}

function accountTitle(section) {
  if (section === "profile") return "Profile";
  if (section === "cart") return "Cart";
  if (section === "orders") return "My Orders";
  if (section === "reservations") return "My Reservations";
  return "Overview";
}

function AccountAvatar({ user, initials }) {
  if (user?.profileImage) {
    return (
      <div className="account-avatar has-image">
        <img src={user.profileImage} alt="" />
      </div>
    );
  }

  return (
    <div className="account-avatar" aria-hidden="true">
      {initials}
    </div>
  );
}

function SummaryStat({ label, value, icon }) {
  return (
    <article className="account-stat">
      {icon}
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </article>
  );
}

function HistoryPanel({ title, icon, action, children }) {
  return (
    <section className="history-panel">
      <div className="history-panel-heading">
        <h2>
          {icon}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function OrderItem({ order }) {
  return (
    <Link className="history-item" to={`/orders/${order.reference}`}>
      <div>
        <strong>{order.reference}</strong>
        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
      </div>
      <div>
        <strong>{formatter.format(order.total || 0)}</strong>
        <span>
          {order.status} · {order.paymentStatus}
        </span>
      </div>
    </Link>
  );
}

function ReservationItem({ reservation }) {
  return (
    <article className="history-item">
      <div>
        <strong>{reservation.reference}</strong>
        <span>
          {reservation.date} · {reservation.time}
        </span>
      </div>
      <div>
        <strong>{reservation.guests} guests</strong>
        <span>{reservation.status}</span>
      </div>
    </article>
  );
}

function CartItem({ item, onChangeQuantity, onRemove }) {
  return (
    <article className="account-cart-item">
      <div>
        <strong>{item.name}</strong>
        <span>{formatter.format(item.price)} each</span>
      </div>
      <div className="quantity-control" aria-label={`${item.name} quantity`}>
        <button type="button" onClick={() => onChangeQuantity(item._id, -1)} aria-label={`Decrease ${item.name}`}>
          <Minus size={15} />
        </button>
        <span>{item.quantity}</span>
        <button type="button" onClick={() => onChangeQuantity(item._id, 1)} aria-label={`Increase ${item.name}`}>
          <Plus size={15} />
        </button>
      </div>
      <strong>{formatter.format(Number(item.price || 0) * item.quantity)}</strong>
      <button className="icon-button danger" type="button" onClick={() => onRemove(item._id)} aria-label={`Remove ${item.name}`}>
        <Trash2 size={16} />
      </button>
    </article>
  );
}

function EmptyHistory({ icon, title, text }) {
  return (
    <div className="empty-history">
      {icon}
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

export default AccountPage;
