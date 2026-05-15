import { AlertCircle, Eye, EyeOff, LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCustomerAuth } from "../auth/CustomerAuthContext";

function LoginPage() {
  const { user, login } = useCustomerAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/account";
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState({ type: "idle", message: "" });

  useEffect(() => {
    if (user) {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, redirectTo, user]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ type: "loading", message: "" });

    try {
      await login(form);
      navigate(redirectTo, { replace: true });
    } catch (_error) {
      setStatus({ type: "error", message: "Login failed. Check your email and password." });
    }
  }

  return (
    <section className="page-section auth-layout">
      <div className="page-intro auth-intro">
        <span className="section-kicker">
          <LogIn size={17} />
          Customer login
        </span>
        <h1>Welcome back to NOFFELO.</h1>
        <p>Sign in to keep your order and reservation history in one place.</p>
      </div>

      <form className="auth-card" onSubmit={handleSubmit}>
        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={updateField} required autoComplete="email" />
        </label>
        <label>
          <span className="auth-label-row">
            <span>Password</span>
            <Link to="/forgot-password">Forgot password?</Link>
          </span>
          <span className="password-input-wrap">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={updateField}
              required
              autoComplete="current-password"
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>

        {status.type === "error" ? (
          <div className="admin-notice error" role="alert">
            <AlertCircle size={18} />
            <span>{status.message}</span>
          </div>
        ) : null}

        <button className="button primary wide" type="submit" disabled={status.type === "loading"}>
          <LogIn size={18} />
          {status.type === "loading" ? "Signing in" : "Sign in"}
        </button>

        <p className="auth-switch">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </form>
    </section>
  );
}

export default LoginPage;
