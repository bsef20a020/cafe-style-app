import { AlertCircle, CheckCircle2, CreditCard, Loader2, PackageCheck, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api/client";

const formatter = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0
});

function OrderStatusPage() {
  const { reference } = useParams();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState({ loading: true, error: "", order: null });

  useEffect(() => {
    const request =
      searchParams.get("payment") === "success"
        ? api.refreshOrderPayment(reference)
        : api.getOrder(reference);

    request
      .then((data) => setState({ loading: false, error: "", order: data.order }))
      .catch(() => setState({ loading: false, error: "Order could not be loaded.", order: null }));
  }, [reference, searchParams]);

  return (
    <section className="page-section order-status-page">
      <div className="page-intro">
        <span className="section-kicker">
          <PackageCheck size={17} />
          Order status
        </span>
        <h1>{reference}</h1>
        <p>Track your order, payment, and pickup or delivery details.</p>
      </div>

      {state.loading ? (
        <div className="loading-row">
          <Loader2 className="spin" size={20} />
          Loading order
        </div>
      ) : null}

      {state.error ? (
        <div className="admin-notice error" role="alert">
          <AlertCircle size={18} />
          <span>{state.error}</span>
        </div>
      ) : null}

      {state.order ? (
        <div className="order-status-card">
          <div className="order-status-header">
            <div>
              <span className="section-kicker">
                <ShoppingBag size={17} />
                {state.order.status}
              </span>
              <h2>{formatter.format(state.order.total)}</h2>
            </div>
            <span className={state.order.paymentStatus === "paid" ? "status-pill live" : "status-pill"}>
              <CreditCard size={14} />
              {state.order.paymentMethod === "cod" ? "COD" : "Card"} · {state.order.paymentStatus}
            </span>
          </div>

          <div className="order-detail-grid">
            <div>
              <span>Customer</span>
              <strong>{state.order.customer.name}</strong>
              <small>{state.order.customer.phone}</small>
            </div>
            <div>
              <span>Fulfillment</span>
              <strong>{state.order.fulfillment.type}</strong>
              <small>{state.order.fulfillment.address || "Cafe pickup"}</small>
            </div>
            <div>
              <span>Requested</span>
              <strong>{state.order.fulfillment.requestedDate || "ASAP"}</strong>
              <small>{state.order.fulfillment.requestedTime || "Next available"}</small>
            </div>
          </div>

          <div className="cart-items">
            {state.order.items.map((item) => (
              <article className="cart-item" key={`${item.menuItem}-${item.name}`}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.quantity} x {formatter.format(item.unitPrice)}</span>
                </div>
                <strong>{formatter.format(item.lineTotal)}</strong>
              </article>
            ))}
          </div>

          {searchParams.get("payment") === "success" ? (
            <div className="admin-notice success" role="status">
              <CheckCircle2 size={18} />
              <span>Payment return received. If your bank approved the payment, this page will show paid after refresh.</span>
            </div>
          ) : null}

          <Link className="button compact-button" to="/menu">
            Back to menu
          </Link>
        </div>
      ) : null}
    </section>
  );
}

export default OrderStatusPage;
