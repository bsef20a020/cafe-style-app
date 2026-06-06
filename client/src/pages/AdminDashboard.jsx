import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  Coffee,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LogOut,
  PackageCheck,
  Plus,
  RefreshCcw,
  Save,
  Search,
  X,
  Trash2
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { clearAdminSession } from "../auth/adminSession";
import AdminChatWidget from "../components/AdminChatWidget";
import BearCoffeeLogo from "../components/BearCoffeeLogo";
import {
  latestHistoryEntry,
  orderOptionsFor,
  orderStatusOptions,
  paymentOptionsFor,
  reservationOptionsFor,
  reservationStatusOptions
} from "../utils/adminTransitions";
import { imageAtWidth, imageUrlIssue } from "../utils/imageUrls";

const emptyMenuForm = {
  name: "",
  category: "Coffee",
  description: "",
  price: "",
  currency: "PKR",
  image: "",
  alt: "",
  tags: "",
  featured: false,
  available: true,
  sortOrder: ""
};

const pageSize = 10;

function menuItemToForm(item) {
  return {
    name: item.name || "",
    category: item.category || "Coffee",
    description: item.description || "",
    price: item.price ?? "",
    currency: item.currency || "PKR",
    image: item.image || "",
    alt: item.alt || "",
    tags: (item.tags || []).join(", "),
    featured: Boolean(item.featured),
    available: Boolean(item.available),
    sortOrder: item.sortOrder ?? ""
  };
}

function buildMenuPayload(form) {
  const payload = {
    name: form.name.trim(),
    category: form.category.trim(),
    description: form.description.trim(),
    price: Number(form.price),
    currency: (form.currency || "PKR").trim(),
    image: form.image.trim(),
    alt: form.alt.trim(),
    tags: form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    featured: Boolean(form.featured),
    available: Boolean(form.available)
  };

  if (String(form.sortOrder).trim()) {
    payload.sortOrder = Number(form.sortOrder);
  }

  return payload;
}

function actionErrorMessage(error, fallback) {
  if (error?.details) {
    const firstIssue = Object.entries(error.details).find(([, messages]) => messages?.length);
    if (firstIssue) {
      const [field, messages] = firstIssue;
      return `${field}: ${messages[0]}`;
    }
  }

  return fallback;
}

function AdminDashboard() {
  const navigate = useNavigate();
  const [state, setState] = useState({
    reservations: [],
    orders: [],
    menu: [],
    analytics: null,
    loading: true,
    error: ""
  });
  const [menuForm, setMenuForm] = useState(emptyMenuForm);
  const [editForm, setEditForm] = useState(emptyMenuForm);
  const [editingItemId, setEditingItemId] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState("");
  const [notice, setNotice] = useState({ type: "idle", message: "" });
  const [busy, setBusy] = useState({ reservationId: "", orderId: "", menuId: "", menuAction: "" });
  const [saving, setSaving] = useState(false);
  const [reservationSearch, setReservationSearch] = useState("");
  const [reservationStatus, setReservationStatus] = useState("all");
  const [reservationPage, setReservationPage] = useState(1);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("all");
  const [menuSearch, setMenuSearch] = useState("");
  const [menuCategory, setMenuCategory] = useState("all");
  const [menuAvailability, setMenuAvailability] = useState("all");
  const [lastSynced, setLastSynced] = useState(null);
  const [syncLabel, setSyncLabel] = useState("");
  const syncTimer = useRef(null);

  const loadAdminData = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));

    try {
      const [reservations, orders, menu, analytics] = await Promise.all([
        api.getAdminReservations(),
        api.getAdminOrders(),
        api.getAdminMenu(),
        api.getAnalytics()
      ]);

      setState({
        reservations: reservations.reservations || [],
        orders: orders.orders || [],
        menu: menu.items || [],
        analytics,
        loading: false,
        error: ""
      });
      setConfirmDeleteId("");
      setLastSynced(new Date());
    } catch (error) {
      if (error.status === 401) {
        clearAdminSession();
        navigate("/admin/login");
        return;
      }
      setState((current) => ({ ...current, loading: false, error: "Admin data could not be loaded." }));
    }
  }, [navigate]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Background polling — silently refresh orders & reservations every 60 s
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const [reservations, orders] = await Promise.all([
          api.getAdminReservations(),
          api.getAdminOrders()
        ]);
        setState((current) => ({
          ...current,
          reservations: reservations.reservations || current.reservations,
          orders: orders.orders || current.orders
        }));
        setLastSynced(new Date());
      } catch {
        // silent — stale data is still usable; network errors shown on manual refresh
      }
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Keep "Updated Xs ago" label fresh every 10 s
  useEffect(() => {
    function tick() {
      if (!lastSynced) { setSyncLabel(""); return; }
      const diff = Math.floor((Date.now() - lastSynced.getTime()) / 1000);
      if (diff < 5)  { setSyncLabel("Updated just now"); return; }
      if (diff < 60) { setSyncLabel(`Updated ${diff}s ago`); return; }
      setSyncLabel(`Updated ${Math.floor(diff / 60)}m ago`);
    }
    tick();
    syncTimer.current = setInterval(tick, 10_000);
    return () => clearInterval(syncTimer.current);
  }, [lastSynced]);

  const metrics = useMemo(
    () => ({
      reservations: state.reservations.length,
      pendingReservations: state.reservations.filter((item) => item.status === "new").length,
      orders: state.orders.length,
      pendingOrders: state.orders.filter((item) => item.status === "new").length,
      menuItems: state.menu.length,
      availableMenuItems: state.menu.filter((item) => item.available).length
    }),
    [state.menu, state.orders, state.reservations]
  );

  const filteredReservations = useMemo(() => {
    const query = reservationSearch.trim().toLowerCase();
    return state.reservations.filter((reservation) => {
      const matchesStatus = reservationStatus === "all" || reservation.status === reservationStatus;
      const matchesQuery =
        !query ||
        `${reservation.name} ${reservation.reference} ${reservation.phone} ${reservation.date} ${reservation.time} ${reservation.occasion || ""}`
          .toLowerCase()
          .includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [reservationSearch, reservationStatus, state.reservations]);

  const reservationPageCount = Math.max(1, Math.ceil(filteredReservations.length / pageSize));
  const visibleReservations = filteredReservations.slice((reservationPage - 1) * pageSize, reservationPage * pageSize);

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    return state.orders.filter((order) => {
      const matchesStatus = orderStatus === "all" || order.status === orderStatus;
      const itemNames = (order.items || []).map((item) => item.name).join(" ");
      const matchesQuery =
        !query ||
        `${order.reference} ${order.customer?.name || ""} ${order.customer?.phone || ""} ${order.paymentMethod} ${order.paymentStatus} ${itemNames}`
          .toLowerCase()
          .includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [orderSearch, orderStatus, state.orders]);

  const menuCategories = useMemo(
    () => Array.from(new Set(state.menu.map((item) => item.category).filter(Boolean))).sort(),
    [state.menu]
  );
  const menuFormImageIssue = imageUrlIssue(menuForm.image);
  const editFormImageIssue = imageUrlIssue(editForm.image);

  const filteredMenu = useMemo(() => {
    const query = menuSearch.trim().toLowerCase();
    return state.menu.filter((item) => {
      const matchesCategory = menuCategory === "all" || item.category === menuCategory;
      const matchesAvailability =
        menuAvailability === "all" ||
        (menuAvailability === "available" && item.available) ||
        (menuAvailability === "hidden" && !item.available);
      const matchesQuery =
        !query || `${item.name} ${item.category} ${item.description} ${(item.tags || []).join(" ")}`.toLowerCase().includes(query);
      return matchesCategory && matchesAvailability && matchesQuery;
    });
  }, [menuAvailability, menuCategory, menuSearch, state.menu]);

  useEffect(() => {
    setReservationPage(1);
  }, [reservationSearch, reservationStatus]);

  useEffect(() => {
    setReservationPage((current) => Math.min(current, reservationPageCount));
  }, [reservationPageCount]);

  async function logout() {
    await api.logout();
    clearAdminSession();
    navigate("/admin/login");
  }

  function handleAuthFailure(error) {
    if (error.status !== 401) return false;

    clearAdminSession();
    navigate("/admin/login");
    return true;
  }

  async function updateStatus(id, status) {
    setNotice({ type: "idle", message: "" });
    setBusy((current) => ({ ...current, reservationId: id }));

    try {
      const data = await api.updateReservation(id, { status });
      setState((current) => ({
        ...current,
        reservations: current.reservations.map((item) => (item._id === id ? data.reservation : item))
      }));
      setNotice({ type: "success", message: "Reservation status updated." });
    } catch (error) {
      if (!handleAuthFailure(error)) {
        setNotice({ type: "error", message: actionErrorMessage(error, "Reservation status could not be updated.") });
      }
    } finally {
      setBusy((current) => (current.reservationId === id ? { ...current, reservationId: "" } : current));
    }
  }

  async function updateOrder(id, body) {
    setNotice({ type: "idle", message: "" });
    setBusy((current) => ({ ...current, orderId: id }));

    try {
      const data = await api.updateOrder(id, body);
      setState((current) => ({
        ...current,
        orders: current.orders.map((item) => (item._id === id ? data.order : item))
      }));
      setNotice({ type: "success", message: "Order updated." });
    } catch (error) {
      if (!handleAuthFailure(error)) {
        setNotice({ type: "error", message: actionErrorMessage(error, "Order could not be updated.") });
      }
    } finally {
      setBusy((current) => (current.orderId === id ? { ...current, orderId: "" } : current));
    }
  }

  function updateMenuField(event) {
    const { name, value, type, checked } = event.target;
    setMenuForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  function updateEditField(event) {
    const { name, value, type, checked } = event.target;
    setEditForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  async function addMenuItem(event) {
    event.preventDefault();
    setNotice({ type: "idle", message: "" });
    setSaving(true);

    try {
      const payload = buildMenuPayload(menuForm);
      const data = await api.createMenuItem(payload);
      setState((current) => ({ ...current, menu: [...current.menu, data.item] }));
      setMenuForm(emptyMenuForm);
      setNotice({ type: "success", message: "Menu item added." });
    } catch (error) {
      if (!handleAuthFailure(error)) {
        setNotice({ type: "error", message: actionErrorMessage(error, "Menu item could not be added.") });
      }
    } finally {
      setSaving(false);
    }
  }

  function startMenuEdit(item) {
    setConfirmDeleteId("");
    setEditingItemId(item._id);
    setEditForm(menuItemToForm(item));
    setNotice({ type: "idle", message: "" });
  }

  function cancelMenuEdit() {
    setEditingItemId("");
    setEditForm(emptyMenuForm);
  }

  async function saveMenuItem(event, id) {
    event.preventDefault();
    setNotice({ type: "idle", message: "" });
    setBusy({ reservationId: "", orderId: "", menuId: id, menuAction: "saving" });

    try {
      const data = await api.updateMenuItem(id, buildMenuPayload(editForm));
      setState((current) => ({
        ...current,
        menu: current.menu.map((item) => (item._id === id ? data.item : item))
      }));
      setEditingItemId("");
      setEditForm(emptyMenuForm);
      setNotice({ type: "success", message: "Menu item saved." });
    } catch (error) {
      if (!handleAuthFailure(error)) {
        setNotice({ type: "error", message: actionErrorMessage(error, "Menu item could not be saved.") });
      }
    } finally {
      setBusy((current) => (current.menuId === id ? { ...current, menuId: "", menuAction: "" } : current));
    }
  }

  async function toggleMenuAvailability(item) {
    setNotice({ type: "idle", message: "" });
    setBusy({ reservationId: "", orderId: "", menuId: item._id, menuAction: "availability" });

    try {
      const data = await api.updateMenuItem(item._id, { available: !item.available });
      setState((current) => ({
        ...current,
        menu: current.menu.map((menuItem) => (menuItem._id === item._id ? data.item : menuItem))
      }));
      setNotice({ type: "success", message: item.available ? "Menu item hidden." : "Menu item published." });
    } catch (error) {
      if (!handleAuthFailure(error)) {
        setNotice({ type: "error", message: actionErrorMessage(error, "Menu availability could not be updated.") });
      }
    } finally {
      setBusy((current) => (current.menuId === item._id ? { ...current, menuId: "", menuAction: "" } : current));
    }
  }

  async function deleteMenuItem(id) {
    if (confirmDeleteId !== id) {
      setEditingItemId("");
      setConfirmDeleteId(id);
      setNotice({ type: "idle", message: "" });
      return;
    }

    setNotice({ type: "idle", message: "" });
    setBusy({ reservationId: "", orderId: "", menuId: id, menuAction: "deleting" });

    try {
      await api.deleteMenuItem(id);
      setState((current) => ({ ...current, menu: current.menu.filter((item) => item._id !== id) }));
      setConfirmDeleteId("");
      setNotice({ type: "success", message: "Menu item deleted." });
    } catch (error) {
      if (!handleAuthFailure(error)) {
        setNotice({ type: "error", message: actionErrorMessage(error, "Menu item could not be deleted.") });
      }
    } finally {
      setBusy((current) => (current.menuId === id ? { ...current, menuId: "", menuAction: "" } : current));
    }
  }

  return (
    <main className="admin-dashboard">
      <aside className="admin-sidebar">
        <Link to="/" className="brand-mark">
          <BearCoffeeLogo />
          <span>
            <strong>NOFFELO</strong>
            <small>Admin</small>
          </span>
        </Link>
        <nav>
          <a href="#overview">
            <BarChart3 size={18} />
            Overview
          </a>
          <a href="#reservations">
            <CheckCircle2 size={18} />
            Reservations
            {metrics.pendingReservations > 0 && (
              <span className="admin-nav-badge">{metrics.pendingReservations}</span>
            )}
          </a>
          <a href="#orders">
            <PackageCheck size={18} />
            Orders
            {metrics.pendingOrders > 0 && (
              <span className="admin-nav-badge">{metrics.pendingOrders}</span>
            )}
          </a>
          <a href="#menu-admin">
            <Coffee size={18} />
            Menu
          </a>
        </nav>
        <button className="button ghost" type="button" onClick={logout}>
          <LogOut size={18} />
          Logout
        </button>
      </aside>

      <section className="admin-content">
        <div className="admin-header" id="overview">
          <div>
            <span className="section-kicker">Live operations</span>
            <h1>Orders, reservations, and menu control</h1>
          </div>
          <div className="admin-header-refresh">
            {syncLabel && !state.loading && (
              <span className="sync-label">
                <Clock size={13} />
                {syncLabel}
              </span>
            )}
            <button className="button compact-button" type="button" onClick={loadAdminData} disabled={state.loading}>
              {state.loading ? <Loader2 className="spin" size={16} /> : <RefreshCcw size={16} />}
              Refresh
            </button>
          </div>
        </div>

        {notice.message ? (
          <div className={`admin-notice ${notice.type}`} role={notice.type === "error" ? "alert" : "status"} aria-live="polite">
            {notice.type === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{notice.message}</span>
          </div>
        ) : null}

        {state.loading ? (
          <div className="loading-row">
            <Loader2 className="spin" size={20} />
            Loading dashboard
          </div>
        ) : null}
        {state.error ? <p className="form-error">{state.error}</p> : null}

        <div className="metric-grid">
          <Metric label="Reservations" value={metrics.reservations} />
          <Metric label="New requests" value={metrics.pendingReservations} />
          <Metric label="Orders" value={metrics.orders} />
          <Metric label="New orders" value={metrics.pendingOrders} />
          <Metric label="Menu items" value={metrics.menuItems} />
          <Metric label="Available" value={metrics.availableMenuItems} />
        </div>

        <section className="admin-section" id="reservations">
          <div className="section-heading compact-heading">
            <div>
              <span className="section-kicker">Guest pipeline</span>
              <h2>Reservations</h2>
            </div>
          </div>
          <div className="admin-toolbar">
            <label className="admin-search">
              <Search size={17} />
              <input
                value={reservationSearch}
                onChange={(event) => setReservationSearch(event.target.value)}
                placeholder="Search guest, phone, reference"
              />
            </label>
            <select value={reservationStatus} onChange={(event) => setReservationStatus(event.target.value)} aria-label="Filter reservations by status">
              <option value="all">All statuses</option>
              {reservationStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="admin-result-count">{filteredReservations.length} reservations</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>Visit</th>
                  <th>Contact</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleReservations.map((reservation) => {
                  const options = reservationOptionsFor(reservation.status);
                  const isBusy = busy.reservationId === reservation._id;
                  return (
                    <tr key={reservation._id}>
                      <td>
                        <strong>{reservation.name}</strong>
                        <span>{reservation.reference}</span>
                      </td>
                      <td>
                        {reservation.date} · {reservation.time}
                        <span>{reservation.guests} guests</span>
                      </td>
                      <td>
                        {reservation.phone}
                        <span>{reservation.occasion || "General visit"}</span>
                      </td>
                      <td>
                        <select
                          value={reservation.status}
                          onChange={(event) => updateStatus(reservation._id, event.target.value)}
                          disabled={isBusy || options.length <= 1}
                          aria-busy={isBusy}
                        >
                          {options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        {isBusy ? <span className="row-action-note">Saving...</span> : null}
                        <StatusHistory history={reservation.statusHistory} field="status" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="pagination-row">
            <button
              className="icon-button"
              type="button"
              onClick={() => setReservationPage((current) => Math.max(1, current - 1))}
              disabled={reservationPage === 1}
              aria-label="Previous reservations page"
            >
              <ChevronLeft size={17} />
            </button>
            <span>
              Page {reservationPage} of {reservationPageCount}
            </span>
            <button
              className="icon-button"
              type="button"
              onClick={() => setReservationPage((current) => Math.min(reservationPageCount, current + 1))}
              disabled={reservationPage === reservationPageCount}
              aria-label="Next reservations page"
            >
              <ChevronRight size={17} />
            </button>
          </div>
          {!filteredReservations.length && !state.loading ? <p className="empty-state">No reservations match this view.</p> : null}
        </section>

        <section className="admin-section" id="orders">
          <div className="section-heading compact-heading">
            <div>
              <span className="section-kicker">Kitchen queue</span>
              <h2>Orders</h2>
            </div>
          </div>
          <div className="admin-toolbar">
            <label className="admin-search">
              <Search size={17} />
              <input value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} placeholder="Search order, guest, phone, item" />
            </label>
            <select value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)} aria-label="Filter orders by status">
              <option value="all">All statuses</option>
              {orderStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="admin-result-count">{filteredOrders.length} orders</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Items</th>
                  <th>Fulfillment</th>
                  <th>Payment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const orderBusy = busy.orderId === order._id;
                  const statusChoices = orderOptionsFor(order.status);
                  const paymentChoices = paymentOptionsFor(order.paymentStatus);
                  return (
                    <tr key={order._id}>
                      <td>
                        <strong>{order.reference}</strong>
                        <span>
                          {order.customer?.name} · {order.customer?.phone}
                        </span>
                      </td>
                      <td>
                        {(order.items || []).map((item) => `${item.quantity}x ${item.name}`).join(", ")}
                        <span>
                          {order.currency || "PKR"} {order.total}
                        </span>
                      </td>
                      <td>
                        {order.fulfillment?.type || "pickup"}
                        <span>{order.fulfillment?.address || order.fulfillment?.requestedTime || "Cafe pickup"}</span>
                      </td>
                      <td>
                        <select
                          value={order.paymentStatus}
                          onChange={(event) => updateOrder(order._id, { paymentStatus: event.target.value })}
                          disabled={orderBusy || paymentChoices.length <= 1}
                          aria-label={`Update payment for ${order.reference}`}
                        >
                          {paymentChoices.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <span>{order.paymentMethod === "cod" ? "COD" : "Online card"}</span>
                        <StatusHistory history={order.statusHistory} field="paymentStatus" />
                      </td>
                      <td>
                        <select
                          value={order.status}
                          onChange={(event) => updateOrder(order._id, { status: event.target.value })}
                          disabled={orderBusy || statusChoices.length <= 1}
                          aria-busy={orderBusy}
                        >
                          {statusChoices.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        {orderBusy ? <span className="row-action-note">Saving...</span> : null}
                        <StatusHistory history={order.statusHistory} field="status" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!filteredOrders.length && !state.loading ? <p className="empty-state">No orders match this view.</p> : null}
        </section>

        <section className="admin-section" id="menu-admin">
          <div className="section-heading compact-heading">
            <div>
              <span className="section-kicker">Menu control</span>
              <h2>Items</h2>
            </div>
          </div>

          <form className="menu-admin-form" onSubmit={addMenuItem}>
            <input name="name" value={menuForm.name} onChange={updateMenuField} placeholder="Item name" required />
            <input name="category" value={menuForm.category} onChange={updateMenuField} placeholder="Category" required />
            <input name="price" type="number" value={menuForm.price} onChange={updateMenuField} placeholder="Price" required min="0" />
            <input name="currency" value={menuForm.currency} onChange={updateMenuField} placeholder="Currency" required />
            <input name="sortOrder" type="number" value={menuForm.sortOrder} onChange={updateMenuField} placeholder="Sort order" />
            <label className="wide field-stack">
              <input name="image" value={menuForm.image} onChange={updateMenuField} placeholder="Image URL" />
              {menuFormImageIssue ? <span className="field-help unavailable">{menuFormImageIssue}</span> : null}
            </label>
            <input name="alt" value={menuForm.alt} onChange={updateMenuField} placeholder="Image alt text" />
            <input className="wide" name="description" value={menuForm.description} onChange={updateMenuField} placeholder="Description" required />
            <input name="tags" value={menuForm.tags} onChange={updateMenuField} placeholder="Tags, comma separated" />
            <label className="check-label">
              <input name="featured" type="checkbox" checked={menuForm.featured} onChange={updateMenuField} />
              Featured
            </label>
            <label className="check-label">
              <input name="available" type="checkbox" checked={menuForm.available} onChange={updateMenuField} />
              Available
            </label>
            <button className="button primary" type="submit" disabled={saving}>
              {saving ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
              Add item
            </button>
          </form>

          <div className="admin-toolbar">
            <label className="admin-search">
              <Search size={17} />
              <input value={menuSearch} onChange={(event) => setMenuSearch(event.target.value)} placeholder="Search menu items" />
            </label>
            <select value={menuCategory} onChange={(event) => setMenuCategory(event.target.value)} aria-label="Filter menu by category">
              <option value="all">All categories</option>
              {menuCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select value={menuAvailability} onChange={(event) => setMenuAvailability(event.target.value)} aria-label="Filter menu by availability">
              <option value="all">All visibility</option>
              <option value="available">Available</option>
              <option value="hidden">Hidden</option>
            </select>
            <span className="admin-result-count">{filteredMenu.length} items</span>
          </div>

          <div className="admin-menu-list">
            {filteredMenu.map((item) => {
              const isEditing = editingItemId === item._id;
              const isBusy = busy.menuId === item._id;
              const isDeleting = isBusy && busy.menuAction === "deleting";
              const isSavingEdit = isBusy && busy.menuAction === "saving";
              const isAvailabilityBusy = isBusy && busy.menuAction === "availability";
              const isConfirmingDelete = confirmDeleteId === item._id;

              if (isEditing) {
                return (
                  <form className="admin-menu-item admin-menu-edit" key={item._id} onSubmit={(event) => saveMenuItem(event, item._id)}>
                    <AdminMenuImage item={editForm} />
                    <div className="admin-menu-edit-fields">
                      <input name="name" value={editForm.name} onChange={updateEditField} placeholder="Item name" required />
                      <input name="category" value={editForm.category} onChange={updateEditField} placeholder="Category" required />
                      <input name="price" type="number" value={editForm.price} onChange={updateEditField} placeholder="Price" required min="0" />
                      <input name="currency" value={editForm.currency} onChange={updateEditField} placeholder="Currency" required />
                      <input name="sortOrder" type="number" value={editForm.sortOrder} onChange={updateEditField} placeholder="Sort order" />
                      <label className="wide field-stack">
                        <input name="image" value={editForm.image} onChange={updateEditField} placeholder="Image URL" />
                        {editFormImageIssue ? <span className="field-help unavailable">{editFormImageIssue}</span> : null}
                      </label>
                      <input name="alt" value={editForm.alt} onChange={updateEditField} placeholder="Image alt text" />
                      <input className="wide" name="description" value={editForm.description} onChange={updateEditField} placeholder="Description" required />
                      <input name="tags" value={editForm.tags} onChange={updateEditField} placeholder="Tags, comma separated" />
                      <label className="check-label">
                        <input name="featured" type="checkbox" checked={editForm.featured} onChange={updateEditField} />
                        Featured
                      </label>
                      <label className="check-label">
                        <input name="available" type="checkbox" checked={editForm.available} onChange={updateEditField} />
                        Available
                      </label>
                    </div>
                    <div className="admin-menu-edit-actions">
                      <button className="button primary compact-button" type="submit" disabled={isSavingEdit}>
                        {isSavingEdit ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                        Save
                      </button>
                      <button className="button ghost compact-button" type="button" onClick={cancelMenuEdit} disabled={isSavingEdit}>
                        <X size={16} />
                        Cancel
                      </button>
                    </div>
                  </form>
                );
              }

              return (
                <article className={isConfirmingDelete ? "admin-menu-item is-confirming" : "admin-menu-item"} key={item._id}>
                  <AdminMenuImage item={item} />
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {item.category} · {item.currency || "PKR"} {item.price}
                    </span>
                  </div>
                  <div className="admin-menu-actions">
                    <button
                      className={item.available ? "status-pill live" : "status-pill"}
                      type="button"
                      onClick={() => toggleMenuAvailability(item)}
                      disabled={isBusy}
                    >
                      {isAvailabilityBusy ? <Loader2 className="spin" size={14} /> : null}
                      {item.available ? "Available" : "Hidden"}
                    </button>
                    <button className="icon-button" type="button" onClick={() => startMenuEdit(item)} disabled={isBusy} aria-label={`Edit ${item.name}`}>
                      <Edit3 size={17} />
                    </button>
                    {isConfirmingDelete ? (
                      <>
                        <button className="button danger-button compact-button" type="button" onClick={() => deleteMenuItem(item._id)} disabled={isDeleting}>
                          {isDeleting ? <Loader2 className="spin" size={16} /> : <Trash2 size={16} />}
                          Confirm delete
                        </button>
                        <button className="icon-button" type="button" onClick={() => setConfirmDeleteId("")} disabled={isDeleting} aria-label="Cancel delete">
                          <X size={17} />
                        </button>
                      </>
                    ) : (
                      <button className="icon-button danger" type="button" onClick={() => deleteMenuItem(item._id)} disabled={isBusy} aria-label={`Delete ${item.name}`}>
                        <Trash2 size={17} />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {!filteredMenu.length && !state.loading ? <p className="empty-state">No menu items match this view.</p> : null}
        </section>
      </section>
      <AdminChatWidget />
    </main>
  );
}

function Metric({ label, value }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function StatusHistory({ history, field }) {
  const latest = latestHistoryEntry(history, field);

  if (!latest) {
    return null;
  }

  const actor = latest.changedByName ? ` by ${latest.changedByName}` : "";
  const changedAt = latest.changedAt ? new Date(latest.changedAt).toLocaleString() : "";

  return (
    <span className="row-action-note">
      Last: {latest.from} to {latest.to}
      {actor}
      {changedAt ? `, ${changedAt}` : ""}
    </span>
  );
}

function AdminMenuImage({ item }) {
  const [failed, setFailed] = useState(false);
  const issue = imageUrlIssue(item.image);
  const showImage = item.image && !issue && !failed;

  useEffect(() => {
    setFailed(false);
  }, [item.image]);

  if (showImage) {
    return (
      <img
        src={imageAtWidth(item.image, 320)}
        alt={item.alt || item.name || "Menu item preview"}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className={`admin-menu-thumb ${adminThumbVisualClass(item.category)}`}>
      <span>{issue ? "Use direct image URL" : "No image"}</span>
    </div>
  );
}

function adminThumbVisualClass(category) {
  return `visual-${String(category || "default").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export default AdminDashboard;
