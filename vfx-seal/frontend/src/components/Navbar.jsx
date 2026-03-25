import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { FiBell, FiSettings } from "react-icons/fi";
import EditProfileModal from "./EditProfileModal";
import ConfirmModal from "./ConfirmModal";
import api from "../api/client";

export default function Navbar() {
  const { user, logout, isAdmin, updateProfile } = useAuth();
  const { notifications, unreadCount, markAllRead, markRead } =
    useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const notifRef = useRef(null);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate("/login");
  };

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  // Close notification panel on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case "CONTACT_REPLY":
        return "Reply";
      case "FEEDBACK_APPROVED":
        return "Approved";
      case "FEEDBACK_REJECTED":
        return "Rejected";
      case "NEW_CONTACT":
        return "Contact";
      case "NEW_FEEDBACK":
        return "Feedback";
      default:
        return "Notice";
    }
  };

  const getNotificationLink = (notification) => {
    const relatedId = notification?.relatedId;
    const link =
      typeof notification?.link === "string" ? notification.link : "";
    const genericAdmin =
      link === "/admin" || link === "/admin/" || link === "/admin?";

    if (isAdmin && relatedId) {
      if (
        (notification?.type === "NEW_CONTACT" ||
          notification?.type === "CONTACT_REPLY") &&
        (genericAdmin ||
          (link.startsWith("/admin") && !link.includes("messageId=")))
      ) {
        return `/admin?tab=messages&messageId=${relatedId}`;
      }

      if (
        [
          "NEW_FEEDBACK",
          "FLAGGED_FEEDBACK",
          "FEEDBACK_APPROVED",
          "FEEDBACK_REJECTED",
          "FEEDBACK_REMOVED",
        ].includes(notification?.type) &&
        (genericAdmin ||
          (link.startsWith("/admin") && !link.includes("feedbackId=")))
      ) {
        return `/admin?tab=feedbacks&feedbackId=${relatedId}`;
      }
    }

    if (link) return link;

    switch (notification?.type) {
      case "CONTACT_REPLY":
        return "/messages";
      case "NEW_CONTACT":
        return isAdmin ? "/admin" : "/messages";
      case "FEEDBACK_APPROVED":
      case "FEEDBACK_REJECTED":
      case "NEW_FEEDBACK":
        return isAdmin ? "/admin" : "/vendors";
      case "AUDIT_REQUEST_UPDATE":
      case "VENDOR_VERIFICATION_UPDATE":
        return "/messages";
      default:
        return isAdmin ? "/admin" : "/";
    }
  };

  const handleNotificationClick = async (notification) => {
    const relatedId = notification?.relatedId;
    const isMessageType = ["NEW_CONTACT", "CONTACT_REPLY", "SYSTEM"].includes(
      notification?.type,
    );

    try {
      if (!notification?.read) {
        await markRead(notification._id);
      }

      if (relatedId && isMessageType) {
        if (isAdmin) {
          await api.patch(`/contact/admin/messages/${relatedId}/read`);
        } else {
          await api.patch(`/contact/my-messages/${relatedId}/read`);
        }
      }
    } catch (error) {
      console.error("Notification mark read failed:", error);
    } finally {
      setNotifOpen(false);
      navigate(getNotificationLink(notification));
    }
  };

  return (
    <>
      <nav className="navbar" id="main-navbar">
        <div className="navbar-inner">
          <Link to={isAdmin ? "/" : "/"} className="navbar-brand">
            VFX <span className="accent">Seal</span>
          </Link>

          <div className="navbar-links">
            {isAdmin ? (
              <>
                <Link
                  to="/"
                  className={location.pathname === "/" ? "active" : ""}
                >
                  Home
                </Link>
                <Link
                  to="/admin"
                  className={isActive("/admin") ? "active" : ""}
                >
                  Dashboard
                </Link>
                <Link
                  to="/vendors"
                  className={isActive("/vendors") ? "active" : ""}
                >
                  Vendors
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/"
                  className={location.pathname === "/" ? "active" : ""}
                >
                  Home
                </Link>
                <Link
                  to="/vendors"
                  className={isActive("/vendors") ? "active" : ""}
                >
                  Vendor Directory
                </Link>
                <Link
                  to="/messages"
                  className={isActive("/messages") ? "active" : ""}
                >
                  My Messages
                </Link>
              </>
            )}
            <Link
              to="/contact"
              className={isActive("/contact") ? "active" : ""}
            >
              Contact
            </Link>
          </div>

          <div className="navbar-user">
            {/* Notification Bell */}
            <div className="notif-wrapper" ref={notifRef}>
              <button
                className="notif-bell"
                onClick={() => setNotifOpen(!notifOpen)}
                id="notif-bell-btn"
              >
                <FiBell size={22} />
                {unreadCount > 0 && (
                  <span className="notif-badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="notif-panel">
                  <div className="notif-panel-header">
                    <h4>Notifications</h4>
                    {unreadCount > 0 && (
                      <button className="notif-mark-read" onClick={markAllRead}>
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="notif-panel-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">No notifications yet</div>
                    ) : (
                      notifications.slice(0, 20).map((n) => (
                        <div
                          key={n._id}
                          className={`notif-item ${n.read ? "" : "unread"}`}
                          onClick={() => handleNotificationClick(n)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleNotificationClick(n);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          title="Open notification"
                        >
                          <span className="notif-item-icon">
                            {getNotifIcon(n.type)}
                          </span>
                          <div className="notif-item-content">
                            <div className="notif-item-title">{n.title}</div>
                            <div className="notif-item-msg">{n.message}</div>
                            <div className="notif-item-time">
                              {formatTimeAgo(n.createdAt)}
                            </div>
                          </div>
                          {!n.read && <span className="notif-dot" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="navbar-user-info">
              <div className="navbar-user-name">{user?.name}</div>
              <div className="navbar-user-role">
                {isAdmin ? "Administrator" : user?.company}
              </div>
            </div>
            <div className="navbar-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setEditProfileOpen(true)}
                id="edit-profile-btn"
                title="Edit Profile"
              >
                <FiSettings className="button-icon" />
                Edit Profile
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleLogoutClick}
                id="logout-btn"
              >
                Logout
              </button>
            </div>
          </div>

          <button
            className="navbar-hamburger"
            onClick={() => setMobileOpen(true)}
            id="mobile-menu-btn"
          >
            ☰
          </button>
        </div>
      </nav>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div
          className="mobile-nav-overlay open"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className={`mobile-nav ${mobileOpen ? "open" : ""}`}>
        <button
          className="mobile-nav-close"
          onClick={() => setMobileOpen(false)}
        >
          ✕
        </button>
        <div className="navbar-user-info" style={{ marginBottom: "16px" }}>
          <div className="navbar-user-name">{user?.name}</div>
          <div className="navbar-user-role">
            {isAdmin ? "Administrator" : user?.company}
          </div>
        </div>
        <Link
          to="/"
          onClick={() => setMobileOpen(false)}
          className={location.pathname === "/" ? "active" : ""}
        >
          Home
        </Link>
        {isAdmin && (
          <Link
            to="/admin"
            onClick={() => setMobileOpen(false)}
            className={isActive("/admin") ? "active" : ""}
          >
            Dashboard
          </Link>
        )}
        <Link
          to="/vendors"
          onClick={() => setMobileOpen(false)}
          className={isActive("/vendors") ? "active" : ""}
        >
          Vendors
        </Link>
        {!isAdmin && (
          <Link
            to="/messages"
            onClick={() => setMobileOpen(false)}
            className={isActive("/messages") ? "active" : ""}
          >
            My Messages
          </Link>
        )}
        <Link
          to="/contact"
          onClick={() => setMobileOpen(false)}
          className={isActive("/contact") ? "active" : ""}
        >
          Contact
        </Link>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleLogoutClick();
          }}
          style={{ color: "var(--danger)", marginTop: "auto" }}
        >
          Logout
        </a>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        user={user}
        onProfileUpdate={updateProfile}
      />

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Confirm Logout"
        message="Are you sure you want to sign out?"
        cancelLabel="Cancel"
        confirmLabel="Confirm"
        isDangerous={false}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}
