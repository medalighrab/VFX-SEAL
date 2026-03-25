import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import ScrollToTop from "./components/ScrollToTop";
import VantaNetBackground from "./components/VantaNetBackground";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import PendingPage from "./pages/PendingPage";
import ApprovalAccessPage from "./pages/ApprovalAccessPage";
import VendorsPage from "./pages/VendorsPage";
import VendorDetailPage from "./pages/VendorDetailPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminVendorForm from "./pages/AdminVendorForm";
import ContactPage from "./pages/ContactPage";
import MyMessagesPage from "./pages/MyMessagesPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";

function ProtectedRoute({
  children,
  requireApproval = false,
  adminOnly = false,
}) {
  const { isLoggedIn, isApproved, isAdmin, loading } = useAuth();

  if (loading)
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/vendors" replace />;
  if (requireApproval && !isAdmin && !isApproved)
    return <Navigate to="/pending" replace />;

  return children;
}

export default function App() {
  const location = useLocation();
  const { isLoggedIn, isApproved, isAdmin, loading } = useAuth();
  const hideAnimatedBackground = location.pathname.startsWith("/vendors");

  if (loading)
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );

  return (
    <>
      {/* ScrollToTop component for handling route navigation scroll behavior */}
      <ScrollToTop />

      {/* Vanta.NET animated background */}
      {!hideAnimatedBackground && <VantaNetBackground />}

      {/* Show Navbar only when logged in — ContactPage has its own public nav */}
      {isLoggedIn && <Navbar />}
      <Routes>
        {/* Home Page — always public */}
        <Route path="/" element={<HomePage />} />

        {/* Contact — always public */}
        <Route path="/contact" element={<ContactPage />} />
        {/* Legal Pages — always public */}
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        {/* Public auth pages */}
        <Route
          path="/login"
          element={
            isLoggedIn ? (
              isAdmin ? (
                <Navigate to="/admin" replace />
              ) : isApproved ? (
                <Navigate to="/vendors" replace />
              ) : (
                <Navigate to="/pending" replace />
              )
            ) : (
              <LoginPage />
            )
          }
        />
        <Route
          path="/register"
          element={
            isLoggedIn ? <Navigate to="/vendors" replace /> : <RegisterPage />
          }
        />

        <Route
          path="/approval-access/:token"
          element={<ApprovalAccessPage />}
        />

        {/* Password Reset Routes - Public */}
        <Route
          path="/forgot-password"
          element={
            isLoggedIn ? (
              <Navigate to="/vendors" replace />
            ) : (
              <ForgotPasswordPage />
            )
          }
        />
        <Route
          path="/reset-password/:token"
          element={
            isLoggedIn ? (
              <Navigate to="/vendors" replace />
            ) : (
              <ResetPasswordPage />
            )
          }
        />

        {/* Pending */}
        <Route
          path="/pending"
          element={
            <ProtectedRoute>
              <PendingPage />
            </ProtectedRoute>
          }
        />

        {/* Protected — requires approval */}
        <Route
          path="/vendors"
          element={
            <ProtectedRoute requireApproval>
              <VendorsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendors/:slug"
          element={
            <ProtectedRoute requireApproval>
              <VendorDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute requireApproval>
              <MyMessagesPage />
            </ProtectedRoute>
          }
        />

        {/* Admin only */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/vendors/new"
          element={
            <ProtectedRoute adminOnly>
              <AdminVendorForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/vendors/:id/edit"
          element={
            <ProtectedRoute adminOnly>
              <AdminVendorForm />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route
          path="*"
          element={
            <Navigate
              to={isLoggedIn ? (isAdmin ? "/admin" : "/") : "/"}
              replace
            />
          }
        />
      </Routes>
    </>
  );
}
