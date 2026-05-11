import { Coffee, Loader2, LockKeyhole, LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { readAdminSession, saveAdminSession } from "../auth/adminSession";
import BearCoffeeLogo from "../components/BearCoffeeLogo";

function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "admin@noffelo.local", password: "" });
  const [status, setStatus] = useState({ type: "idle" });
  const redirectTo = location.state?.from || "/admin";

  useEffect(() => {
    if (readAdminSession()) {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, redirectTo]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ type: "loading" });

    try {
      const data = await api.login(form);
      saveAdminSession(data.user, data.expiresAt);
      navigate(redirectTo, { replace: true });
    } catch (_error) {
      setStatus({ type: "error", message: "Login failed. Check the admin email and password." });
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <div className="brand-mark admin-brand">
          <BearCoffeeLogo />
          <span>
            <strong>NOFFELO</strong>
            <small>Staff portal</small>
          </span>
        </div>
        <div>
          <span className="section-kicker">
            <LockKeyhole size={17} />
            Authorized staff only
          </span>
          <h1>NOFFELO back office</h1>
          <p>Sign in to review table requests, update menu items, and keep service ready for the day.</p>
        </div>

        <form className="reservation-form single" onSubmit={handleSubmit}>
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={updateField} required />
          </label>
          <label>
            Password
            <input name="password" type="password" value={form.password} onChange={updateField} required minLength={6} />
          </label>
          {status.type === "error" ? <p className="form-error">{status.message}</p> : null}
          <button className="button primary" type="submit" disabled={status.type === "loading"}>
            {status.type === "loading" ? <Loader2 className="spin" size={18} /> : <LogIn size={18} />}
            Login
          </button>
        </form>
      </section>
      <aside className="admin-login-art">
        <Coffee size={28} />
        <strong>Service starts here</strong>
        <span>Reservations, menu updates, and guest notes stay in one private workspace.</span>
      </aside>
    </main>
  );
}

export default AdminLogin;
