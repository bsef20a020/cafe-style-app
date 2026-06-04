import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { api } from "./api/client";
import { clearAdminSession } from "./auth/adminSession";
import { CustomerAuthProvider, useCustomerAuth } from "./auth/CustomerAuthContext";
import { CartProvider } from "./cart/CartContext";
import ChatWidget from "./components/ChatWidget";
import Footer from "./components/Footer";
import Navigation from "./components/Navigation";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import SeoMeta from "./components/SeoMeta";
import AccountPage from "./pages/AccountPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import FAQPage from "./pages/FAQPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import MenuPage from "./pages/MenuPage";
import NotFoundPage from "./pages/NotFoundPage";
import OrderStatusPage from "./pages/OrderStatusPage";
import OurStoryPage from "./pages/OurStoryPage";
import ReservePage from "./pages/ReservePage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { getSeoForPath } from "./seo/siteMeta";
import SignupPage from "./pages/SignupPage";

function ScrollAndTrack() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      window.setTimeout(() => {
        document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    api.trackEvent({ type: "page_view", path: location.pathname });
  }, [location.hash, location.pathname]);

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

function RouteSeo() {
  const location = useLocation();
  const meta = getSeoForPath(location.pathname);

  return <SeoMeta {...meta} />;
}

function App() {
  return (
    <>
      <ScrollAndTrack />
      <AdminUnauthorizedListener />
      <CustomerAuthProvider>
        <CartProvider>
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
            path="/faq"
            element={
              <SiteFrame>
                <FAQPage />
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
        </CartProvider>
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
      <ChatWidget />
    </div>
  );
}

export default App;
