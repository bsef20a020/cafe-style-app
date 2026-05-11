import { AlertCircle, KeyRound } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCustomerAuth } from "../auth/CustomerAuthContext";

function ResetPasswordPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { resetPassword } = useCustomerAuth();
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [status, setStatus] = useState({ type: "idle", message: "" });

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (form.password !== form.confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match." });
      return;
    }

    setStatus({ type: "loading", message: "" });

    try {
      await resetPassword({ token, password: form.password });
      navigate("/account", { replace: true });
    } catch (error) {
      const detail = error?.details ? Object.values(error.details).flat().find(Boolean) : "";
      setStatus({ type: "error", message: detail || "Reset link is invalid or expired. Request a new link." });
    }
  }

  return (
    <section className="page-section auth-layout">
      <div className="page-intro auth-intro">
        <span className="section-kicker">
          <KeyRound size={17} />
          New password
        </span>
        <h1>Choose a new password.</h1>
        <p>Your reset link can be used once and expires quickly for safety.</p>
      </div>

      <form className="auth-card" onSubmit={handleSubmit}>
        <label>
          New password
          <input name="password" type="password" value={form.password} onChange={updateField} required minLength={8} autoComplete="new-password" />
        </label>
        <label>
          Confirm password
          <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={updateField} required minLength={8} autoComplete="new-password" />
        </label>

        {status.type === "error" ? (
          <div className="admin-notice error" role="alert">
            <AlertCircle size={18} />
            <span>{status.message}</span>
          </div>
        ) : null}

        <button className="button primary wide" type="submit" disabled={status.type === "loading"}>
          <KeyRound size={18} />
          {status.type === "loading" ? "Saving password" : "Save new password"}
        </button>

        <div className="auth-links">
          <Link to="/forgot-password">Request a new link</Link>
        </div>
      </form>
    </section>
  );
}

export default ResetPasswordPage;
