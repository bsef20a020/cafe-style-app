import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { readAdminSession, saveAdminSession } from "../auth/adminSession";

function ProtectedAdminRoute({ children }) {
  const location = useLocation();
  const [state, setState] = useState(() => ({
    checking: !readAdminSession(),
    allowed: Boolean(readAdminSession())
  }));

  useEffect(() => {
    let active = true;

    async function verifyCookieSession() {
      if (readAdminSession()) {
        setState({ checking: false, allowed: true });
        return;
      }

      try {
        const data = await api.getAdminMe();
        if (!active) return;
        saveAdminSession(data.user, data.expiresAt);
        setState({ checking: false, allowed: true });
      } catch (_error) {
        if (active) {
          setState({ checking: false, allowed: false });
        }
      }
    }

    verifyCookieSession();
    return () => {
      active = false;
    };
  }, []);

  if (state.checking) {
    return (
      <main className="admin-dashboard">
        <section className="admin-content">
          <div className="loading-row">Checking staff session</div>
        </section>
      </main>
    );
  }

  if (!state.allowed) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default ProtectedAdminRoute;
