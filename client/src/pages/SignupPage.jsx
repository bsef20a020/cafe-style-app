import { AlertCircle, Eye, EyeOff, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCustomerAuth } from "../auth/CustomerAuthContext";

function firstError(error) {
  return error?.details ? Object.values(error.details).flat().find(Boolean) : "";
}

function SignupPage() {
  const { user, signup } = useCustomerAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState({ type: "idle", message: "" });

  useEffect(() => {
    if (user) {
      navigate("/account", { replace: true });
    }
  }, [navigate, user]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ type: "loading", message: "" });

    try {
      await signup(form);
      navigate("/account", { replace: true });
    } catch (error) {
      setStatus({
        type: "error",
        message: firstError(error) || "Account could not be created. Please check your details."
      });
    }
  }

  return (
    <section className="page-section auth-layout">
      <div className="page-intro auth-intro">
        <span className="section-kicker">
          <UserPlus size={17} />
          Customer account
        </span>
        <h1>Create your NOFFELO account.</h1>
        <p>Use one account for faster checkout, reservations, and personal history.</p>
      </div>

      <form className="auth-card" onSubmit={handleSubmit}>
        <label>
          Name
          <input name="name" value={form.name} onChange={updateField} required minLength={2} autoComplete="name" />
        </label>
        <label>
          Phone
          <input name="phone" value={form.phone} onChange={updateField} required minLength={7} autoComplete="tel" />
        </label>
        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={updateField} required autoComplete="email" />
        </label>
        <label>
          Password
          <span className="password-input-wrap">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={updateField}
              required
              minLength={8}
              autoComplete="new-password"
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
          <UserPlus size={18} />
          {status.type === "loading" ? "Creating account" : "Create account"}
        </button>

        <div className="auth-links">
          <span>Already have an account?</span>
          <Link to="/login">Sign in</Link>
        </div>
      </form>
    </section>
  );
}

export default SignupPage;
