import { CalendarCheck, History, Loader2, LogOut, ReceiptText, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useCustomerAuth } from "../auth/CustomerAuthContext";

const formatter = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0
});

function AccountPage() {
  const { user, logout } = useCustomerAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({
    loading: true,
    error: "",
    orders: [],
    reservations: []
  });

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

  return (
    <section className="page-section account-page">
      <div className="account-header">
        <div className="account-avatar" aria-hidden="true">
          {initials}
        </div>
        <div>
          <span className="section-kicker">
            <UserRound size={17} />
            Customer account
          </span>
          <h1>{user?.name}</h1>
          <p>
            {user?.email} · {user?.phone}
          </p>
        </div>
        <button className="button ghost" type="button" onClick={handleLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </div>

      {state.loading ? (
        <div className="loading-row">
          <Loader2 className="spin" size={20} />
          Loading account history
        </div>
      ) : null}

      {state.error ? <p className="form-error">{state.error}</p> : null}

      <div className="account-grid">
        <section className="history-panel">
          <div className="history-panel-heading">
            <h2>
              <ReceiptText size={20} />
              Orders
            </h2>
            <Link className="button compact-button" to="/menu">
              Order again
            </Link>
          </div>

          {!state.loading && !state.orders.length ? (
            <EmptyHistory icon={<History size={20} />} title="No account orders yet" text="Orders placed while logged in will appear here." />
          ) : null}

          <div className="history-list">
            {state.orders.map((order) => (
              <Link className="history-item" to={`/orders/${order.reference}`} key={order._id}>
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
            ))}
          </div>
        </section>

        <section className="history-panel">
          <div className="history-panel-heading">
            <h2>
              <CalendarCheck size={20} />
              Reservations
            </h2>
            <Link className="button compact-button" to="/reserve">
              Reserve
            </Link>
          </div>

          {!state.loading && !state.reservations.length ? (
            <EmptyHistory icon={<History size={20} />} title="No account reservations yet" text="Reservations sent while logged in will appear here." />
          ) : null}

          <div className="history-list">
            {state.reservations.map((reservation) => (
              <article className="history-item" key={reservation._id}>
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
            ))}
          </div>
        </section>
      </div>
    </section>
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
