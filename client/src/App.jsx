import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { api } from "./api/client";
import { clearAdminSession } from "./auth/adminSession";
import { CustomerAuthProvider, useCustomerAuth } from "./auth/CustomerAuthContext";
import Footer from "./components/Footer";
import Navigation from "./components/Navigation";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import SeoMeta from "./components/SeoMeta";
import AccountPage from "./pages/AccountPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import MenuPage from "./pages/MenuPage";
import NotFoundPage from "./pages/NotFoundPage";
import OrderStatusPage from "./pages/OrderStatusPage";
import OurStoryPage from "./pages/OurStoryPage";
import ReservePage from "./pages/ReservePage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SignupPage from "./pages/SignupPage";

function ScrollAndTrack() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    api.trackEvent({ type: "page_view", path: location.pathname });
  }, [location.pathname]);

  return null;
}

function AdminUnauthorizedListener() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    function handleUnauthorized() {
      clearAdminSession();
      if (location.pathname.startsWith("/admin") && location.pathname !== "/admin/login") {
        navigate("/admin/login", { replace: true });
      }
    }

    window.addEventListener("noffelo:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("noffelo:unauthorized", handleUnauthorized);
  }, [location.pathname, navigate]);

  return null;
}

function CustomerUnauthorizedListener() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    function handleUnauthorized() {
      if (location.pathname.startsWith("/account")) {
        navigate("/login", { replace: true, state: { from: location.pathname } });
      }
    }

    window.addEventListener("noffelo:customer-unauthorized", handleUnauthorized);
    return () => window.removeEventListener("noffelo:customer-unauthorized", handleUnauthorized);
  }, [location.pathname, navigate]);

  return null;
}

const routeMeta = {
  "/": {
    title: "NOFFELO — Cafe & Evening Lounge",
    description: "NOFFELO is a premium cafe and evening lounge for slow coffee, refined desserts, and easy reservations."
  },
  "/menu": {
    title: "Menu — NOFFELO",
    description: "Explore NOFFELO drinks, desserts, bakery items, and evening lounge signatures."
  },
  "/our-story": {
    title: "Our Story — NOFFELO",
    description: "Discover the cafe-by-day and lounge-by-evening rhythm behind NOFFELO."
  },
  "/reserve": {
    title: "Reserve a Table — NOFFELO",
    description: "Request a NOFFELO table with business-hour slots, booking reference, and WhatsApp follow-up."
  },
  "/login": {
    title: "Customer Login — NOFFELO",
    description: "Sign in to your NOFFELO customer account."
  },
  "/signup": {
    title: "Create Account — NOFFELO",
    description: "Create a NOFFELO customer account for faster checkout and reservations."
  },
  "/forgot-password": {
    title: "Reset Password — NOFFELO",
    description: "Request a secure password reset link for your NOFFELO customer account."
  },
  "/reset-password": {
    title: "Choose New Password — NOFFELO",
    description: "Set a new password for your NOFFELO customer account."
  },
  "/account": {
    title: "Account — NOFFELO",
    description: "View your NOFFELO orders, reservations, and customer details."
  },
  "/orders": {
    title: "Order Status — NOFFELO",
    description: "Track your NOFFELO online order status and payment state."
  },
  "/admin/login": {
    title: "Staff Login — NOFFELO",
    description: "Authorized NOFFELO staff portal."
  },
  "/admin": {
    title: "Admin Dashboard — NOFFELO",
    description: "NOFFELO private operations dashboard."
  }
};

function RouteSeo() {
  const location = useLocation();
  const meta =
    routeMeta[location.pathname] ||
    (location.pathname.startsWith("/orders/") ? routeMeta["/orders"] : null) ||
    (location.pathname.startsWith("/reset-password/") ? routeMeta["/reset-password"] : null) || {
      title: "NOFFELO",
      description: "NOFFELO cafe and evening lounge."
    };

  return <SeoMeta {...meta} path={location.pathname} />;
}

function App() {
  return (
    <>
      <ScrollAndTrack />
      <AdminUnauthorizedListener />
      <CustomerAuthProvider>
        <CustomerUnauthorizedListener />
        <RouteSeo />
        <Routes>
          <Route
            path="/"
            element={
              <SiteFrame>
                <HomePage />
              </SiteFrame>
            }
          />
          <Route
            path="/menu"
            element={
              <SiteFrame>
                <MenuPage />
              </SiteFrame>
            }
          />
          <Route
            path="/our-story"
            element={
              <SiteFrame>
                <OurStoryPage />
              </SiteFrame>
            }
          />
          <Route
            path="/reserve"
            element={
              <SiteFrame>
                <ReservePage />
              </SiteFrame>
            }
          />
          <Route
            path="/login"
            element={
              <SiteFrame>
                <LoginPage />
              </SiteFrame>
            }
          />
          <Route
            path="/signup"
            element={
              <SiteFrame>
                <SignupPage />
              </SiteFrame>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <SiteFrame>
                <ForgotPasswordPage />
              </SiteFrame>
            }
          />
          <Route
            path="/reset-password/:token"
            element={
              <SiteFrame>
                <ResetPasswordPage />
              </SiteFrame>
            }
          />
          <Route
            path="/account"
            element={
              <SiteFrame>
                <ProtectedCustomerRoute>
                  <AccountPage />
                </ProtectedCustomerRoute>
              </SiteFrame>
            }
          />
          <Route
            path="/orders/:reference"
            element={
              <SiteFrame>
                <OrderStatusPage />
              </SiteFrame>
            }
          />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute>
                <AdminDashboard />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="*"
            element={
              <SiteFrame>
                <NotFoundPage />
              </SiteFrame>
            }
          />
        </Routes>
      </CustomerAuthProvider>
    </>
  );
}

function ProtectedCustomerRoute({ children }) {
  const location = useLocation();
  const { user, loading } = useCustomerAuth();

  if (loading) {
    return <div className="loading-row">Checking account session</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

function SiteFrame({ children }) {
  return (
    <div className="site-shell">
      <Navigation />
      <main>{children}</main>
      <Footer />
    </div>
  );
}

export default App;
