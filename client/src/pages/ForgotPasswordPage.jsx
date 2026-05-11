import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ type: "idle", message: "" });

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ type: "loading", message: "" });

    try {
      const data = await api.forgotCustomerPassword({ email });
      setStatus({ type: "success", message: data.message });
    } catch (_error) {
      setStatus({ type: "error", message: "Password reset could not be started. Please try again." });
    }
  }

  return (
    <section className="page-section auth-layout">
      <div className="page-intro auth-intro">
        <span className="section-kicker">
          <KeyRound size={17} />
          Password reset
        </span>
        <h1>Reset your password.</h1>
        <p>Enter your account email and we will send a secure reset link.</p>
      </div>

      <form className="auth-card" onSubmit={handleSubmit}>
        <label>
          Email
          <input name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
        </label>

        {status.type === "success" ? (
          <div className="success-state compact-state" role="status">
            <CheckCircle2 size={20} />
            <p>{status.message}</p>
          </div>
        ) : null}

        {status.type === "error" ? (
          <div className="admin-notice error" role="alert">
            <AlertCircle size={18} />
            <span>{status.message}</span>
          </div>
        ) : null}

        <button className="button primary wide" type="submit" disabled={status.type === "loading"}>
          <KeyRound size={18} />
          {status.type === "loading" ? "Sending link" : "Send reset link"}
        </button>

        <div className="auth-links">
          <Link to="/login">Back to login</Link>
        </div>
      </form>
    </section>
  );
}

export default ForgotPasswordPage;
