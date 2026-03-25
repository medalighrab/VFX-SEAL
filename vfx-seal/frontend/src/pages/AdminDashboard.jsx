import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";
import {
  FiAward,
  FiCircle,
  FiStar,
  FiCheck,
  FiFileText,
  FiHome,
  FiPackage,
  FiMail,
  FiX,
  FiSlash,
  FiTrash2,
  FiEdit,
} from "react-icons/fi";
import { FaTrophy } from "react-icons/fa";
import EditStudioModal from "../components/EditStudioModal";
import ConfirmModal from "../components/ConfirmModal";

const BADGE_ICONS = {
  Gold: <FaTrophy className="badge-icon gold" />,
  Silver: <FiAward className="badge-icon silver" />,
  Bronze: <FiCircle className="badge-icon bronze" />,
  None: "—",
};

const PLACEHOLDER_LINKEDIN_URL = "https://www.linkedin.com/in/YOUR-LINKEDIN";
const ADMIN_LIST_PAGE_SIZE = 10;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("studios");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState("");
  const [feedbackFilter, setFeedbackFilter] = useState("PENDING");
  const [messageFilter, setMessageFilter] = useState("");
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState("");
  const [highlightedFeedbackId, setHighlightedFeedbackId] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState([]);
  const selectAllRecipientsRef = useRef(null);
  const [composeForm, setComposeForm] = useState({ subject: "", message: "" });
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectNote, setRejectNote] = useState({});
  const [replyText, setReplyText] = useState({});
  const [editStudioModalOpen, setEditStudioModalOpen] = useState(false);
  const [selectedStudio, setSelectedStudio] = useState(null);
  const [deleteMessageTarget, setDeleteMessageTarget] = useState(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [studioSearch, setStudioSearch] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [feedbackSearch, setFeedbackSearch] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [studioPage, setStudioPage] = useState(1);
  const [vendorPage, setVendorPage] = useState(1);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [messagePage, setMessagePage] = useState(1);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [confirmBlockUser, setConfirmBlockUser] = useState(null);
  const [confirmEditUser, setConfirmEditUser] = useState(null);
  const [confirmDeleteVendor, setConfirmDeleteVendor] = useState(null);

  const getMessagesEndpoint = () => {
    const params = messageFilter ? `?status=${messageFilter}` : "";
    return `/contact/admin/messages${params}`;
  };

  const syncAdminMessageState = async (preferredMessageId = null) => {
    const [statsRes, messagesRes] = await Promise.all([
      api.get("/admin/stats"),
      api.get(getMessagesEndpoint()),
    ]);

    const nextMessages = messagesRes.data?.messages || [];
    const nextUnreadFromMessages = messagesRes.data?.unreadCount ?? 0;
    const nextUnreadFromStats = statsRes.data?.newMessages;
    const nextUnread =
      typeof nextUnreadFromStats === "number"
        ? nextUnreadFromStats
        : nextUnreadFromMessages;

    setStats({
      ...statsRes.data,
      newMessages: nextUnread,
    });
    setMessages(nextMessages);
    setAdminUnreadCount(nextUnread);
    setSelectedMessageIds((prev) =>
      prev.filter((id) => nextMessages.some((message) => message._id === id)),
    );

    if (nextMessages.length === 0) {
      setSelectedMessage(null);
      return;
    }

    setSelectedMessage((prev) => {
      if (preferredMessageId) {
        return (
          nextMessages.find((item) => item._id === preferredMessageId) ||
          nextMessages[0]
        );
      }

      if (prev?._id) {
        return (
          nextMessages.find((item) => item._id === prev._id) || nextMessages[0]
        );
      }

      return nextMessages[0];
    });
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    const messageId = params.get("messageId");
    const feedbackId = params.get("feedbackId");

    if (tab && ["studios", "vendors", "feedbacks", "messages"].includes(tab)) {
      setActiveTab(tab);
    } else if (messageId) {
      setActiveTab("messages");
    } else if (feedbackId) {
      setActiveTab("feedbacks");
    }

    if (messageId) {
      setMessageFilter("");
      setHighlightedMessageId(messageId);
    }

    if (feedbackId) {
      setFeedbackFilter("ALL");
      setHighlightedFeedbackId(feedbackId);
    }
  }, [location.search]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes] = await Promise.all([api.get("/admin/stats")]);
      setStats(statsRes.data);
      setAdminUnreadCount(statsRes.data?.newMessages || 0);

      if (activeTab === "studios") {
        const params = userFilter ? `?status=${userFilter}` : "";
        const { data } = await api.get(`/admin/users${params}`);
        setUsers(data.users);
      } else if (activeTab === "vendors") {
        const { data } = await api.get("/odoo/vendors", {
          params: { page: 1, limit: 100 },
        });
        setVendors(data.vendors || []);
      } else if (activeTab === "feedbacks") {
        const { data } = await api.get(
          `/feedbacks/admin/pending?status=${feedbackFilter || "PENDING"}`,
        );
        setFeedbacks(data.feedbacks);
      } else if (activeTab === "messages") {
        const params = messageFilter ? `?status=${messageFilter}` : "";
        const { data } = await api.get(`/contact/admin/messages${params}`);
        setMessages(data.messages);
        setAdminUnreadCount(data.unreadCount || 0);
        setSelectedMessageIds((prev) =>
          prev.filter((id) =>
            (data.messages || []).some((message) => message._id === id),
          ),
        );
        if (data.messages?.length > 0) {
          setSelectedMessage((prev) =>
            prev
              ? data.messages.find((item) => item._id === prev._id) ||
                data.messages[0]
              : data.messages[0],
          );
        } else {
          setSelectedMessage(null);
        }
      }
    } catch (err) {
      console.error("Admin fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "studios") {
      const fetchUsers = async () => {
        const params = userFilter ? `?status=${userFilter}` : "";
        const { data } = await api.get(`/admin/users${params}`);
        setUsers(data.users);
      };
      fetchUsers();
    }
  }, [userFilter]);

  useEffect(() => {
    if (activeTab === "feedbacks") {
      const fetchFeedbacks = async () => {
        const { data } = await api.get(
          `/feedbacks/admin/pending?status=${feedbackFilter || "PENDING"}`,
        );
        setFeedbacks(data.feedbacks);
      };
      fetchFeedbacks();
    }
  }, [feedbackFilter]);

  useEffect(() => {
    if (activeTab === "messages") {
      const fetchMessages = async () => {
        const params = messageFilter ? `?status=${messageFilter}` : "";
        const { data } = await api.get(`/contact/admin/messages${params}`);
        setMessages(data.messages);
        setAdminUnreadCount(data.unreadCount || 0);
        setSelectedMessageIds((prev) =>
          prev.filter((id) =>
            (data.messages || []).some((message) => message._id === id),
          ),
        );
        if (data.messages?.length > 0) {
          setSelectedMessage((prev) =>
            prev
              ? data.messages.find((item) => item._id === prev._id) ||
                data.messages[0]
              : data.messages[0],
          );
        } else {
          setSelectedMessage(null);
        }
      };
      fetchMessages();
    }
  }, [messageFilter]);

  useEffect(() => {
    const markSelectedAsRead = async () => {
      if (!selectedMessage?._id || !selectedMessage?.unreadForAdmin) return;

      try {
        await api.patch(`/contact/admin/messages/${selectedMessage._id}/read`);
        await syncAdminMessageState(selectedMessage._id);
      } catch (err) {
        console.error("Mark admin message read error:", err);
      }
    };

    markSelectedAsRead();
  }, [selectedMessage?._id, selectedMessage?.unreadForAdmin]);

  useEffect(() => {
    if (
      activeTab !== "messages" ||
      !highlightedMessageId ||
      messages.length === 0
    ) {
      return;
    }

    const searchTerm = messageSearch.trim().toLowerCase();
    const sourceMessages = !searchTerm
      ? messages
      : messages.filter((msg) =>
          [
            msg.studioName,
            msg.studioEmail,
            msg.recipientName,
            msg.recipientEmail,
            msg.subject,
            msg.message,
            msg.status,
          ]
            .map((value) => String(value || "").toLowerCase())
            .some((value) => value.includes(searchTerm)),
        );

    const matchIndex = sourceMessages.findIndex(
      (item) => item._id === highlightedMessageId,
    );
    if (matchIndex !== -1) {
      const pageForMessage = Math.floor(matchIndex / ADMIN_LIST_PAGE_SIZE) + 1;
      setMessagePage(pageForMessage);

      const match = sourceMessages[matchIndex];
      setSelectedMessage(match);

      requestAnimationFrame(() => {
        const element = document.getElementById(
          `admin-message-${highlightedMessageId}`,
        );
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    }

    const timer = setTimeout(() => setHighlightedMessageId(""), 3500);
    return () => clearTimeout(timer);
  }, [activeTab, highlightedMessageId, messages, messageSearch]);

  useEffect(() => {
    if (
      activeTab !== "feedbacks" ||
      !highlightedFeedbackId ||
      feedbacks.length === 0
    ) {
      return;
    }

    const element = document.getElementById(
      `admin-feedback-${highlightedFeedbackId}`,
    );
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const timer = setTimeout(() => setHighlightedFeedbackId(""), 3500);
    return () => clearTimeout(timer);
  }, [activeTab, highlightedFeedbackId, feedbacks]);

  useEffect(() => {
    if (activeTab === "messages" && composeOpen) {
      const fetchRecipients = async () => {
        try {
          const q = recipientSearch.trim();
          const endpoint = q
            ? `/contact/admin/recipients?q=${encodeURIComponent(q)}`
            : "/contact/admin/recipients";
          const { data } = await api.get(endpoint);
          setRecipients(data.users || []);
        } catch (err) {
          console.error("Recipients fetch error:", err);
        }
      };
      fetchRecipients();
    }
  }, [activeTab, composeOpen, recipientSearch]);

  const handleUserAction = async (userId, action) => {
    // Show confirmation for block action
    if (action === "block") {
      setConfirmBlockUser(userId);
      return;
    }

    // Execute immediately for other actions
    await executeUserAction(userId, action);
  };

  const executeUserAction = async (userId, action) => {
    setActionLoading(`${userId}-${action}`);
    try {
      const { data } = await api.patch(`/admin/users/${userId}/${action}`);
      await fetchData();

      if (
        data?.message &&
        action === "approve" &&
        data.emailDelivered === false
      ) {
        alert(data.message);
      }
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} user`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteVendor = async (vendorId) => {
    setConfirmDeleteVendor(vendorId);
  };

  const executeDeleteVendor = async (vendorId) => {
    setActionLoading(`${vendorId}-delete`);
    try {
      await api.delete(`/vendors/${vendorId}`);
      await fetchData();
      setConfirmDeleteVendor(null);
    } catch (err) {
      alert("Failed to delete vendor");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId) => {
    setConfirmDeleteUser(userId);
  };

  const executeDeleteUser = async (userId) => {
    setActionLoading(`${userId}-delete`);
    try {
      await api.delete(`/admin/users/${userId}/delete`);
      await fetchData();
      setConfirmDeleteUser(null);
    } catch (err) {
      alert("Failed to delete studio");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditStudio = (studio) => {
    setConfirmEditUser(studio);
  };

  const executeEditStudio = (studio) => {
    setSelectedStudio(studio);
    setEditStudioModalOpen(true);
    setConfirmEditUser(null);
  };

  const handleStudioUpdate = (updatedStudio) => {
    setUsers(
      users.map((user) =>
        user._id === updatedStudio._id ? updatedStudio : user,
      ),
    );
    setEditStudioModalOpen(false);
    setSelectedStudio(null);
  };

  const handleDeleteMessage = async (messageId) => {
    setDeleteMessageTarget(messageId);
  };

  const confirmDeleteMessage = async () => {
    if (!deleteMessageTarget) return;

    const messageId = deleteMessageTarget;
    setActionLoading(`${messageId}-delete`);
    try {
      await api.delete(`/contact/admin/messages/${messageId}`);
      await fetchData();
      setDeleteMessageTarget(null);
    } catch (err) {
      alert("Failed to delete message");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleMessageSelection = (messageId) => {
    setSelectedMessageIds((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId],
    );
  };

  const handleDeleteSelectedMessages = async () => {
    if (selectedMessageIds.length === 0) return;

    const confirmed = window.confirm(
      `Delete ${selectedMessageIds.length} selected message(s)?`,
    );
    if (!confirmed) return;

    setActionLoading("messages-batch-delete");
    try {
      await api.delete("/contact/admin/messages/batch-delete", {
        data: { ids: selectedMessageIds },
      });

      const deletedSet = new Set(selectedMessageIds);
      setMessages((prev) =>
        prev.filter((message) => !deletedSet.has(message._id)),
      );
      setSelectedMessageIds([]);
      setSelectedMessage((prev) => {
        if (!prev || deletedSet.has(prev._id)) return null;
        return prev;
      });
      await fetchData();
    } catch (err) {
      alert("Failed to delete selected messages");
    } finally {
      setActionLoading(null);
    }
  };

  const handleComposeRecipientToggle = (userId) => {
    setSelectedRecipientIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const visibleRecipientIds = recipients.map((recipient) => recipient._id);
  const selectedVisibleCount = visibleRecipientIds.filter((id) =>
    selectedRecipientIds.includes(id),
  ).length;
  const allVisibleSelected =
    visibleRecipientIds.length > 0 &&
    selectedVisibleCount === visibleRecipientIds.length;
  const someVisibleSelected =
    selectedVisibleCount > 0 &&
    selectedVisibleCount < visibleRecipientIds.length;

  useEffect(() => {
    if (selectAllRecipientsRef.current) {
      selectAllRecipientsRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected, recipients, selectedRecipientIds]);

  const handleToggleSelectAllRecipients = () => {
    if (visibleRecipientIds.length === 0) return;

    setSelectedRecipientIds((prev) => {
      if (allVisibleSelected) {
        return prev.filter((id) => !visibleRecipientIds.includes(id));
      }

      const merged = new Set([...prev, ...visibleRecipientIds]);
      return Array.from(merged);
    });
  };

  const handleSendNewMessage = async () => {
    if (selectedRecipientIds.length === 0) {
      alert("Please select at least one recipient");
      return;
    }
    if (!composeForm.subject.trim() || !composeForm.message.trim()) {
      alert("Please provide subject and message");
      return;
    }

    setActionLoading("compose-send");
    try {
      await api.post("/contact/admin/send", {
        recipientIds: selectedRecipientIds,
        subject: composeForm.subject,
        message: composeForm.message,
      });

      setComposeOpen(false);
      setSelectedRecipientIds([]);
      setComposeForm({ subject: "", message: "" });
      setRecipientSearch("");
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send message");
    } finally {
      setActionLoading(null);
    }
  };

  const handleFeedbackAction = async (id, action) => {
    setActionLoading(`${id}-${action}`);
    try {
      let body = {};
      let endpoint = `/feedbacks/${id}/${action}`;
      let method = "PATCH";

      if (action === "reject") {
        body = { adminNote: rejectNote[id] || "" };
      } else if (action === "delete") {
        method = "DELETE";
        endpoint = `/feedbacks/${id}/delete`;
      }

      if (method === "DELETE") {
        await api.delete(endpoint);
      } else {
        await api.patch(endpoint, body);
      }

      await fetchData();
      setRejectNote((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
    } catch (err) {
      alert(`Failed to ${action} feedback`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReply = async (id) => {
    const reply = replyText[id];
    if (!reply?.trim()) {
      alert("Please enter a reply");
      return;
    }
    setActionLoading(`${id}-reply`);
    try {
      await api.post(`/contact/admin/reply/${id}`, { reply });
      await fetchData();
      setReplyText((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
    } catch (err) {
      alert("Failed to send reply");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAllMessagesRead = async () => {
    if (adminUnreadCount === 0) return;

    try {
      await api.patch("/contact/admin/messages/read-all");
      await syncAdminMessageState(selectedMessage?._id || null);
    } catch (err) {
      console.error("Mark all admin messages read error:", err);
    }
  };

  const getAdminMessageBadge = (message) => {
    return message?.unreadForAdmin
      ? { label: "NEW", className: "new" }
      : { label: "READ", className: "closed" };
  };

  const badgeClass = (badge) => (badge || "none").toLowerCase();
  const renderStars = (rating) => (
    <span className="stars stars-sm">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={`star ${s <= rating ? "filled" : ""}`}>
          ★
        </span>
      ))}
    </span>
  );

  const paginateList = (items, page) => {
    const totalPages = Math.max(
      1,
      Math.ceil(items.length / ADMIN_LIST_PAGE_SIZE),
    );
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * ADMIN_LIST_PAGE_SIZE;
    return {
      items: items.slice(start, start + ADMIN_LIST_PAGE_SIZE),
      totalPages,
      currentPage: safePage,
    };
  };

  const normalizedStudioSearch = studioSearch.trim().toLowerCase();
  const normalizedVendorSearch = vendorSearch.trim().toLowerCase();
  const normalizedFeedbackSearch = feedbackSearch.trim().toLowerCase();
  const normalizedMessageSearch = messageSearch.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    if (!normalizedStudioSearch) return users;
    return users.filter((user) =>
      [user.name, user.company, user.email, user.country, user.status]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(normalizedStudioSearch)),
    );
  }, [users, normalizedStudioSearch]);

  const filteredVendors = useMemo(() => {
    if (!normalizedVendorSearch) return vendors;
    return vendors.filter((vendor) =>
      [
        vendor.name,
        vendor.country,
        vendor.size,
        vendor.badgeVOE,
        vendor.shortDescription,
      ]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(normalizedVendorSearch)),
    );
  }, [vendors, normalizedVendorSearch]);

  const filteredFeedbacks = useMemo(() => {
    if (!normalizedFeedbackSearch) return feedbacks;
    return feedbacks.filter((fb) =>
      [
        fb.studioName,
        fb.vendorId?.name,
        fb.status,
        fb.message,
        fb.adminNote,
        fb.flagReason,
      ]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(normalizedFeedbackSearch)),
    );
  }, [feedbacks, normalizedFeedbackSearch]);

  const filteredMessages = useMemo(() => {
    if (!normalizedMessageSearch) return messages;
    return messages.filter((msg) =>
      [
        msg.studioName,
        msg.studioEmail,
        msg.recipientName,
        msg.recipientEmail,
        msg.subject,
        msg.message,
        msg.status,
      ]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(normalizedMessageSearch)),
    );
  }, [messages, normalizedMessageSearch]);

  const studioPagination = useMemo(
    () => paginateList(filteredUsers, studioPage),
    [filteredUsers, studioPage],
  );
  const vendorPagination = useMemo(
    () => paginateList(filteredVendors, vendorPage),
    [filteredVendors, vendorPage],
  );
  const feedbackPagination = useMemo(
    () => paginateList(filteredFeedbacks, feedbackPage),
    [filteredFeedbacks, feedbackPage],
  );
  const messagePagination = useMemo(
    () => paginateList(filteredMessages, messagePage),
    [filteredMessages, messagePage],
  );

  useEffect(() => {
    setStudioPage(1);
  }, [studioSearch, userFilter]);

  useEffect(() => {
    setVendorPage(1);
  }, [vendorSearch]);

  useEffect(() => {
    setFeedbackPage(1);
  }, [feedbackSearch, feedbackFilter]);

  useEffect(() => {
    setMessagePage(1);
  }, [messageSearch, messageFilter]);

  useEffect(() => {
    if (activeTab !== "messages") return;
    if (messagePagination.currentPage !== messagePage) {
      setMessagePage(messagePagination.currentPage);
    }
  }, [activeTab, messagePagination.currentPage, messagePage]);

  useEffect(() => {
    if (activeTab !== "messages") return;
    if (filteredMessages.length === 0) {
      setSelectedMessage(null);
      return;
    }

    setSelectedMessage((prev) => {
      if (prev && filteredMessages.some((item) => item._id === prev._id)) {
        return prev;
      }
      return filteredMessages[0];
    });
  }, [activeTab, filteredMessages]);

  const renderPagination = (pagination, onChangePage, idPrefix) => {
    if (pagination.totalPages <= 1) return null;

    return (
      <div
        style={{
          marginTop: "var(--space-md)",
          display: "flex",
          gap: "var(--space-sm)",
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onChangePage(pagination.currentPage - 1)}
          disabled={pagination.currentPage <= 1}
          id={`${idPrefix}-prev`}
        >
          Previous
        </button>
        <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Page {pagination.currentPage} / {pagination.totalPages}
        </span>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onChangePage(pagination.currentPage + 1)}
          disabled={pagination.currentPage >= pagination.totalPages}
          id={`${idPrefix}-next`}
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="admin-dashboard-page">
      <div className="page-wrapper admin-dashboard-content">
        <div className="container">
          <h1 className="slide-up" style={{ marginBottom: "var(--space-lg)" }}>
            Admin Dashboard
          </h1>

          {/* Stats */}
          {stats && (
            <div className="admin-stats fade-in">
              <div className="stat-card">
                <div className="stat-card-value">{stats.totalStudios}</div>
                <div className="stat-card-label">Total Studios</div>
              </div>
              <div className="stat-card">
                <div
                  className="stat-card-value"
                  style={{ color: "var(--warning)" }}
                >
                  {stats.pendingStudios}
                </div>
                <div className="stat-card-label">Pending Approval</div>
              </div>
              <div className="stat-card">
                <div
                  className="stat-card-value"
                  style={{ color: "var(--success)" }}
                >
                  {stats.approvedStudios}
                </div>
                <div className="stat-card-label">Approved</div>
              </div>
              <div className="stat-card">
                <div
                  className="stat-card-value"
                  style={{ color: "var(--info)" }}
                >
                  {stats.totalVendors}
                </div>
                <div className="stat-card-label">Vendors</div>
              </div>
              <div className="stat-card">
                <div
                  className="stat-card-value"
                  style={{ color: "var(--accent)" }}
                >
                  {stats.pendingFeedbacks}
                </div>
                <div className="stat-card-label">Pending Feedbacks</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value" style={{ color: "#f97316" }}>
                  {adminUnreadCount}
                </div>
                <div className="stat-card-label">New Messages</div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="admin-tabs">
            <button
              className={`admin-tab ${activeTab === "studios" ? "active" : ""}`}
              onClick={() => setActiveTab("studios")}
              id="tab-studios"
            >
              <FiHome className="tab-icon" />
              Studios
            </button>
            <button
              className={`admin-tab ${activeTab === "vendors" ? "active" : ""}`}
              onClick={() => setActiveTab("vendors")}
              id="tab-vendors"
            >
              <FiPackage className="tab-icon" />
              Vendors
            </button>
            <button
              className={`admin-tab ${activeTab === "feedbacks" ? "active" : ""}`}
              onClick={() => setActiveTab("feedbacks")}
              id="tab-feedbacks"
            >
              <FiStar className="tab-icon" />
              Feedbacks{" "}
              {stats?.pendingFeedbacks > 0 && (
                <span className="tab-badge">{stats.pendingFeedbacks}</span>
              )}
            </button>
            <button
              className={`admin-tab ${activeTab === "messages" ? "active" : ""}`}
              onClick={() => setActiveTab("messages")}
              id="tab-messages"
            >
              <FiMail className="tab-icon" />
              Messages{" "}
              {adminUnreadCount > 0 && (
                <span className="tab-badge">{adminUnreadCount}</span>
              )}
            </button>
          </div>

          {/* Studios Tab */}
          {activeTab === "studios" && (
            <div className="fade-in">
              <div
                style={{
                  display: "flex",
                  gap: "var(--space-sm)",
                  marginBottom: "var(--space-md)",
                  flexWrap: "wrap",
                }}
              >
                {["", "PENDING", "APPROVED", "REJECTED"].map((f) => (
                  <button
                    key={f}
                    className={`btn btn-sm ${userFilter === f ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setUserFilter(f)}
                    id={`filter-${f || "all"}`}
                  >
                    {f || "All"}
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: "var(--space-md)" }}>
                <label className="form-label" htmlFor="studios-search-input">
                  Search Studios
                </label>
                <input
                  id="studios-search-input"
                  className="form-input"
                  placeholder="Search by name, company, email, country, status"
                  value={studioSearch}
                  onChange={(e) => setStudioSearch(e.target.value)}
                />
              </div>

              {loading ? (
                <div className="loading">
                  <div className="spinner" />
                </div>
              ) : (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Company</th>
                        <th>Email</th>
                        <th>Country</th>
                        <th>Status</th>
                        <th>Registered</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td
                            colSpan="7"
                            style={{
                              textAlign: "center",
                              padding: "40px",
                              color: "var(--text-muted)",
                            }}
                          >
                            No studios found
                          </td>
                        </tr>
                      ) : (
                        studioPagination.items.map((user) => (
                          <tr key={user._id}>
                            <td
                              style={{
                                fontWeight: 600,
                                color: "var(--text-primary)",
                              }}
                            >
                              {user.name}
                            </td>
                            <td>{user.company}</td>
                            <td>
                              <div className="admin-email-linkedin-block">
                                <div>{user.email}</div>
                                <a
                                  href={PLACEHOLDER_LINKEDIN_URL}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="admin-linkedin-inline"
                                >
                                  LinkedIn
                                </a>
                              </div>
                            </td>
                            <td>{user.country}</td>
                            <td>
                              <span
                                className={`status-badge ${user.status.toLowerCase()}`}
                              >
                                {user.status}
                              </span>
                            </td>
                            <td>
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td>
                              <div className="admin-actions">
                                {user.status === "PENDING" && (
                                  <>
                                    <button
                                      className="btn btn-success btn-sm"
                                      onClick={() =>
                                        handleUserAction(user._id, "approve")
                                      }
                                      disabled={
                                        actionLoading === `${user._id}-approve`
                                      }
                                      id={`approve-${user._id}`}
                                    >
                                      {actionLoading ===
                                      `${user._id}-approve` ? (
                                        "..."
                                      ) : (
                                        <>
                                          <FiCheck
                                            size={14}
                                            style={{ marginRight: "4px" }}
                                          />
                                          Approve
                                        </>
                                      )}
                                    </button>
                                    <button
                                      className="btn btn-danger btn-sm"
                                      onClick={() =>
                                        handleUserAction(user._id, "reject")
                                      }
                                      disabled={
                                        actionLoading === `${user._id}-reject`
                                      }
                                      id={`reject-${user._id}`}
                                    >
                                      <FiX className="button-icon" />
                                      Reject
                                    </button>
                                  </>
                                )}
                                {user.status === "APPROVED" && (
                                  <button
                                    className="btn btn-warning btn-sm"
                                    onClick={() =>
                                      handleUserAction(user._id, "block")
                                    }
                                    disabled={
                                      actionLoading === `${user._id}-block`
                                    }
                                    id={`block-${user._id}`}
                                  >
                                    <FiSlash className="button-icon" />
                                    Block
                                  </button>
                                )}
                                {user.status === "REJECTED" && (
                                  <button
                                    className="btn btn-success btn-sm"
                                    onClick={() =>
                                      handleUserAction(user._id, "approve")
                                    }
                                    disabled={
                                      actionLoading === `${user._id}-approve`
                                    }
                                    id={`approve-${user._id}`}
                                  >
                                    <FiCheck className="button-icon" />
                                    Re-Approve
                                  </button>
                                )}
                                {/* Always available edit and delete buttons */}
                                <button
                                  className="btn btn-info btn-sm"
                                  onClick={() => handleEditStudio(user)}
                                  id={`edit-user-${user._id}`}
                                  title="Edit Studio Profile"
                                >
                                  <FiEdit className="button-icon" />
                                  Edit
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleDeleteUser(user._id)}
                                  disabled={
                                    actionLoading === `${user._id}-delete`
                                  }
                                  id={`delete-user-${user._id}`}
                                >
                                  {actionLoading === `${user._id}-delete` ? (
                                    "..."
                                  ) : (
                                    <>
                                      <FiTrash2 className="button-icon" />
                                      Delete
                                    </>
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {!loading &&
                renderPagination(
                  studioPagination,
                  setStudioPage,
                  "studios-pagination",
                )}
            </div>
          )}

          {/* Vendors Tab */}
          {activeTab === "vendors" && (
            <div className="fade-in">
              <div
                style={{
                  marginBottom: "var(--space-md)",
                  display: "grid",
                  gap: "var(--space-sm)",
                }}
              >
                <button
                  className="btn btn-primary"
                  onClick={() => navigate("/admin/vendors/new")}
                  id="add-vendor-btn"
                >
                  + Add Vendor
                </button>

                <div>
                  <label className="form-label" htmlFor="vendors-search-input">
                    Search Vendors
                  </label>
                  <input
                    id="vendors-search-input"
                    className="form-input"
                    placeholder="Search by name, country, size, badge"
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                  />
                </div>
              </div>

              {loading ? (
                <div className="loading">
                  <div className="spinner" />
                </div>
              ) : (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Country</th>
                        <th>Size</th>
                        <th>Badge</th>
                        <th>Score</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVendors.length === 0 ? (
                        <tr>
                          <td
                            colSpan="6"
                            style={{
                              textAlign: "center",
                              padding: "40px",
                              color: "var(--text-muted)",
                            }}
                          >
                            No vendors yet
                          </td>
                        </tr>
                      ) : (
                        vendorPagination.items.map((vendor) => (
                          <tr key={vendor._id}>
                            <td
                              style={{
                                fontWeight: 600,
                                color: "var(--text-primary)",
                              }}
                            >
                              {vendor.name}
                            </td>
                            <td>{vendor.country}</td>
                            <td>{vendor.size}</td>
                            <td>
                              <span
                                className={`voe-badge ${badgeClass(vendor.badgeVOE)}`}
                                style={{ fontSize: "0.7rem" }}
                              >
                                {BADGE_ICONS[vendor.badgeVOE]} {vendor.badgeVOE}
                              </span>
                            </td>
                            <td>{vendor.globalScore?.toFixed(1)}</td>
                            <td>
                              <div className="admin-actions">
                                {vendor.source === "odoo" ? (
                                  <span style={{ color: "var(--text-muted)" }}>
                                    —
                                  </span>
                                ) : (
                                  <>
                                    <button
                                      className="btn btn-secondary btn-sm"
                                      onClick={() =>
                                        navigate(
                                          `/admin/vendors/${vendor._id}/edit`,
                                        )
                                      }
                                      id={`edit-${vendor._id}`}
                                    >
                                      ✏ Edit
                                    </button>
                                    <button
                                      className="btn btn-danger btn-sm"
                                      onClick={() =>
                                        handleDeleteVendor(vendor._id)
                                      }
                                      id={`delete-${vendor._id}`}
                                    >
                                      🗑
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {!loading &&
                renderPagination(
                  vendorPagination,
                  setVendorPage,
                  "vendors-pagination",
                )}
            </div>
          )}

          {/* Feedbacks Tab */}
          {activeTab === "feedbacks" && (
            <div className="fade-in">
              <div
                style={{
                  display: "flex",
                  gap: "var(--space-sm)",
                  marginBottom: "var(--space-md)",
                  flexWrap: "wrap",
                }}
              >
                {["PENDING", "APPROVED", "REJECTED", "ALL"].map((f) => (
                  <button
                    key={f}
                    className={`btn btn-sm ${feedbackFilter === f ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setFeedbackFilter(f)}
                    id={`filter-fb-${f.toLowerCase()}`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: "var(--space-md)" }}>
                <label className="form-label" htmlFor="feedbacks-search-input">
                  Search Feedbacks
                </label>
                <input
                  id="feedbacks-search-input"
                  className="form-input"
                  placeholder="Search by studio, vendor, status, message"
                  value={feedbackSearch}
                  onChange={(e) => setFeedbackSearch(e.target.value)}
                />
              </div>

              {loading ? (
                <div className="loading">
                  <div className="spinner" />
                </div>
              ) : filteredFeedbacks.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"></div>
                  <h3>No feedbacks found</h3>
                </div>
              ) : (
                <div className="admin-feedback-list">
                  {feedbackPagination.items.map((fb) => (
                    <div
                      className={`admin-feedback-card ${fb.isFlagged ? "admin-feedback-flagged" : ""} ${highlightedFeedbackId === fb._id ? "admin-item-highlight" : ""}`}
                      key={fb._id}
                      id={`admin-feedback-${fb._id}`}
                    >
                      <div className="admin-feedback-header">
                        <div>
                          <div className="admin-feedback-studio">
                            {fb.studioName}
                          </div>
                          <div className="admin-feedback-vendor">
                            → {fb.vendorId?.name || "Unknown Vendor"}
                          </div>
                          <div className="admin-feedback-date">
                            {new Date(fb.createdAt).toLocaleDateString()}
                          </div>
                          {fb.isFlagged && (
                            <div className="admin-feedback-flag-info">
                              🚩 <strong>Flagged:</strong> {fb.flagReason}
                            </div>
                          )}
                        </div>
                        <div className="admin-feedback-right">
                          {renderStars(fb.rating)}
                          <span
                            className={`status-badge ${fb.status.toLowerCase()}`}
                          >
                            {fb.status}
                          </span>
                          {fb.isFlagged && (
                            <span className="status-badge flagged">
                              FLAGGED
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="admin-feedback-message">{fb.message}</p>
                      {fb.adminNote && (
                        <div className="admin-feedback-note">
                          <strong>Admin note:</strong> {fb.adminNote}
                        </div>
                      )}
                      <div className="admin-feedback-actions">
                        {fb.status === "PENDING" && (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() =>
                                handleFeedbackAction(fb._id, "approve")
                              }
                              disabled={actionLoading === `${fb._id}-approve`}
                            >
                              {actionLoading === `${fb._id}-approve` ? (
                                "..."
                              ) : (
                                <>
                                  <FiCheck className="button-icon" />
                                  Approve
                                </>
                              )}
                            </button>
                            <div className="admin-feedback-reject-group">
                              <input
                                className="form-input"
                                placeholder="Admin note (optional)"
                                value={rejectNote[fb._id] || ""}
                                onChange={(e) =>
                                  setRejectNote((prev) => ({
                                    ...prev,
                                    [fb._id]: e.target.value,
                                  }))
                                }
                                style={{ fontSize: "0.8rem" }}
                              />
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() =>
                                  handleFeedbackAction(fb._id, "reject")
                                }
                                disabled={actionLoading === `${fb._id}-reject`}
                              >
                                <FiX className="button-icon" />
                                Reject
                              </button>
                            </div>
                          </>
                        )}
                        {fb.isFlagged && fb.moderationStatus !== "deleted" && (
                          <button
                            className="btn btn-warning btn-sm"
                            onClick={() =>
                              handleFeedbackAction(fb._id, "unflag")
                            }
                            disabled={actionLoading === `${fb._id}-unflag`}
                          >
                            🚩 Unflag
                          </button>
                        )}
                        {/* Always available delete button */}
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleFeedbackAction(fb._id, "delete")}
                          disabled={actionLoading === `${fb._id}-delete`}
                          id={`delete-feedback-${fb._id}`}
                        >
                          {actionLoading === `${fb._id}-delete` ? "..." : "🗑"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading &&
                renderPagination(
                  feedbackPagination,
                  setFeedbackPage,
                  "feedbacks-pagination",
                )}
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === "messages" && (
            <div className="fade-in">
              <div className="admin-messages-toolbar">
                {["", "NEW", "REPLIED", "CLOSED"].map((f) => (
                  <button
                    key={f}
                    className={`btn btn-sm ${messageFilter === f ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setMessageFilter(f)}
                    id={`filter-msg-${f || "all"}`}
                  >
                    {f || "All"}
                  </button>
                ))}

                {adminUnreadCount > 0 && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleMarkAllMessagesRead}
                    id="mark-all-messages-read-btn"
                  >
                    Mark all as read
                  </button>
                )}

                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setComposeOpen(true)}
                  id="compose-message-btn"
                  style={{ marginLeft: "auto" }}
                >
                  New Message
                </button>

                {selectedMessageIds.length > 0 && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={handleDeleteSelectedMessages}
                    disabled={actionLoading === "messages-batch-delete"}
                    id="delete-selected-messages-btn"
                  >
                    {actionLoading === "messages-batch-delete"
                      ? "Deleting..."
                      : `Delete Selected (${selectedMessageIds.length})`}
                  </button>
                )}
              </div>

              <div style={{ marginBottom: "var(--space-md)" }}>
                <label className="form-label" htmlFor="messages-search-input">
                  Search Messages
                </label>
                <input
                  id="messages-search-input"
                  className="form-input"
                  placeholder="Search by sender, email, subject, or message"
                  value={messageSearch}
                  onChange={(e) => setMessageSearch(e.target.value)}
                />
              </div>

              {loading ? (
                <div className="loading">
                  <div className="spinner" />
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📩</div>
                  <h3>No messages found</h3>
                </div>
              ) : (
                <div className="admin-messages-layout">
                  <div className="admin-messages-list admin-messages-list-pane">
                    {messagePagination.items.map((msg) =>
                      (() => {
                        const badge = getAdminMessageBadge(msg);
                        return (
                          <button
                            type="button"
                            className={`admin-message-card admin-message-selectable ${selectedMessage?._id === msg._id ? "selected" : ""} ${selectedMessageIds.includes(msg._id) ? "message-card-selected" : ""} ${highlightedMessageId === msg._id ? "admin-item-highlight" : ""}`}
                            key={msg._id}
                            onClick={() => setSelectedMessage(msg)}
                            id={`admin-message-${msg._id}`}
                          >
                            <div
                              className="message-select-box"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                id={`checkbox-${msg._id}`}
                                checked={selectedMessageIds.includes(msg._id)}
                                onChange={() =>
                                  handleToggleMessageSelection(msg._id)
                                }
                                aria-label={`Select message ${msg.subject}`}
                                className="message-checkbox"
                              />
                              <label
                                htmlFor={`checkbox-${msg._id}`}
                                className="message-checkbox-label"
                                aria-hidden="true"
                              />
                            </div>
                            <div className="admin-message-header">
                              <div>
                                <div className="admin-message-studio">
                                  {msg.direction === "OUTBOUND"
                                    ? `To: ${msg.recipientName || msg.studioName}`
                                    : msg.studioName}
                                </div>
                                <div className="admin-message-email">
                                  {msg.direction === "OUTBOUND"
                                    ? msg.recipientEmail || msg.studioEmail
                                    : msg.studioEmail}
                                </div>
                                <div className="admin-message-date">
                                  {new Date(msg.createdAt).toLocaleString()}
                                </div>
                              </div>
                              <span
                                className={`status-badge ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            </div>
                            <div className="admin-message-subject">
                              {msg.subject}
                            </div>
                            <p className="admin-message-body admin-message-body-truncate">
                              {msg.message}
                            </p>
                          </button>
                        );
                      })(),
                    )}
                  </div>

                  {selectedMessage &&
                    (() => {
                      const selectedBadge =
                        getAdminMessageBadge(selectedMessage);
                      return (
                        <div className="admin-message-card admin-message-detail-pane">
                          <div className="admin-message-header">
                            <div>
                              <div className="admin-message-studio">
                                {selectedMessage.direction === "OUTBOUND"
                                  ? `Recipient: ${selectedMessage.recipientName || selectedMessage.studioName}`
                                  : `Sender: ${selectedMessage.studioName}`}
                              </div>
                              <div className="admin-message-email">
                                {selectedMessage.direction === "OUTBOUND"
                                  ? selectedMessage.recipientEmail ||
                                    selectedMessage.studioEmail
                                  : selectedMessage.studioEmail}
                              </div>
                              <div className="admin-message-date">
                                Created{" "}
                                {new Date(
                                  selectedMessage.createdAt,
                                ).toLocaleString()}
                              </div>
                            </div>
                            <span
                              className={`status-badge ${selectedBadge.className}`}
                            >
                              {selectedBadge.label}
                            </span>
                          </div>

                          <div className="admin-message-subject">
                            <FiFileText
                              size={16}
                              style={{ marginRight: "8px" }}
                            />
                            {selectedMessage.subject}
                          </div>

                          <p className="admin-message-body">
                            {selectedMessage.message}
                          </p>

                          {selectedMessage.adminReply && (
                            <div className="admin-message-reply">
                              <strong>Your reply:</strong>
                              <p>{selectedMessage.adminReply}</p>
                              <small>
                                Replied{" "}
                                {new Date(
                                  selectedMessage.repliedAt,
                                ).toLocaleString()}
                              </small>
                            </div>
                          )}

                          {selectedMessage.direction !== "OUTBOUND" &&
                            selectedMessage.status === "NEW" && (
                              <div className="admin-message-reply-form">
                                <textarea
                                  className="form-input form-textarea"
                                  placeholder="Type your reply..."
                                  rows="4"
                                  value={replyText[selectedMessage._id] || ""}
                                  onChange={(e) =>
                                    setReplyText((prev) => ({
                                      ...prev,
                                      [selectedMessage._id]: e.target.value,
                                    }))
                                  }
                                />
                                <div className="admin-message-actions">
                                  <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() =>
                                      handleReply(selectedMessage._id)
                                    }
                                    disabled={
                                      actionLoading ===
                                      `${selectedMessage._id}-reply`
                                    }
                                  >
                                    {actionLoading ===
                                    `${selectedMessage._id}-reply`
                                      ? "Sending..."
                                      : "Send Reply"}
                                  </button>
                                </div>
                              </div>
                            )}

                          <div
                            className="admin-message-actions"
                            style={{ marginTop: "var(--space-sm)" }}
                          >
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() =>
                                handleDeleteMessage(selectedMessage._id)
                              }
                              disabled={
                                actionLoading ===
                                `${selectedMessage._id}-delete`
                              }
                              id={`delete-message-${selectedMessage._id}`}
                            >
                              {actionLoading === `${selectedMessage._id}-delete`
                                ? "..."
                                : "Delete"}
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                </div>
              )}

              {!loading &&
                renderPagination(
                  messagePagination,
                  setMessagePage,
                  "messages-pagination",
                )}

              {composeOpen && (
                <div
                  className="modal-overlay"
                  onClick={() => setComposeOpen(false)}
                >
                  <div
                    className="modal-content compose-message-modal"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="modal-close"
                      onClick={() => setComposeOpen(false)}
                    >
                      ✕
                    </button>
                    <div className="modal-header">
                      <h2>New Message</h2>
                      <p>Send a message directly to one or multiple studios.</p>
                    </div>

                    <div className="modal-body">
                      <div className="form-group">
                        <label className="form-label">Search recipients</label>
                        <input
                          className="form-input"
                          placeholder="Search by name, email, or company"
                          value={recipientSearch}
                          onChange={(e) => setRecipientSearch(e.target.value)}
                        />
                      </div>

                      <div className="compose-recipient-list">
                        <label className="compose-recipient-select-all">
                          <input
                            ref={selectAllRecipientsRef}
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={handleToggleSelectAllRecipients}
                          />
                          <span>
                            Select All Recipients{" "}
                            <span className="compose-recipient-count">
                              ({visibleRecipientIds.length} visible)
                            </span>
                          </span>
                        </label>

                        {recipients.length === 0 ? (
                          <div className="messages-empty">
                            No recipients found.
                          </div>
                        ) : (
                          recipients.map((recipient) => (
                            <label
                              key={recipient._id}
                              className="compose-recipient-item"
                            >
                              <input
                                type="checkbox"
                                checked={selectedRecipientIds.includes(
                                  recipient._id,
                                )}
                                onChange={() =>
                                  handleComposeRecipientToggle(recipient._id)
                                }
                              />
                              <div>
                                <div className="admin-message-studio">
                                  {recipient.name}
                                </div>
                                <div className="admin-message-email">
                                  {recipient.email} • {recipient.company}
                                </div>
                              </div>
                            </label>
                          ))
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Subject</label>
                        <input
                          className="form-input"
                          value={composeForm.subject}
                          onChange={(e) =>
                            setComposeForm((prev) => ({
                              ...prev,
                              subject: e.target.value,
                            }))
                          }
                          maxLength={200}
                          placeholder="Message subject"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Message</label>
                        <textarea
                          className="form-input form-textarea"
                          rows="5"
                          value={composeForm.message}
                          onChange={(e) =>
                            setComposeForm((prev) => ({
                              ...prev,
                              message: e.target.value,
                            }))
                          }
                          maxLength={5000}
                          placeholder="Type your message"
                        />
                      </div>

                      <div className="modal-actions">
                        <button
                          className="btn btn-secondary"
                          onClick={() => setComposeOpen(false)}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={handleSendNewMessage}
                          disabled={actionLoading === "compose-send"}
                        >
                          {actionLoading === "compose-send"
                            ? "Sending..."
                            : "Send Message"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="home-footer">
        <div className="container">
          <div className="footer-inner">
            <div className="footer-brand">
              VFX <span className="accent">Seal</span>
            </div>
            <div className="footer-links">
              <Link to="/">Home</Link>
              <Link to="/contact">Contact</Link>
            </div>
            <div className="footer-copy">
              <div className="footer-copyright">
                © The Seal - All rights reserved
              </div>
              <div className="footer-legal">
                <Link to="/terms" className="footer-legal-link">
                  Terms & Conditions
                </Link>
                <span className="footer-separator">•</span>
                <Link to="/privacy-policy" className="footer-legal-link">
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Edit Studio Modal */}
      <EditStudioModal
        isOpen={editStudioModalOpen}
        onClose={() => {
          setEditStudioModalOpen(false);
          setSelectedStudio(null);
        }}
        studio={selectedStudio}
        onStudioUpdate={handleStudioUpdate}
      />

      <ConfirmModal
        isOpen={Boolean(deleteMessageTarget)}
        title="Delete Message"
        message="Are you sure you want to delete this message?"
        cancelLabel="Cancel"
        confirmLabel="Delete"
        loading={
          !!deleteMessageTarget &&
          actionLoading === `${deleteMessageTarget}-delete`
        }
        onCancel={() => {
          if (
            deleteMessageTarget &&
            actionLoading === `${deleteMessageTarget}-delete`
          ) {
            return;
          }
          setDeleteMessageTarget(null);
        }}
        onConfirm={confirmDeleteMessage}
      />

      {/* Confirm Block User Modal */}
      <ConfirmModal
        isOpen={confirmBlockUser !== null}
        title="Block Studio"
        message="Are you sure you want to block this studio? They will not be able to access their account or post new content."
        cancelLabel="Cancel"
        confirmLabel="Block"
        isDangerous={true}
        loading={
          confirmBlockUser && actionLoading === `${confirmBlockUser}-block`
        }
        onCancel={() => setConfirmBlockUser(null)}
        onConfirm={async () => {
          if (confirmBlockUser) {
            await executeUserAction(confirmBlockUser, "block");
            setConfirmBlockUser(null);
          }
        }}
      />

      {/* Confirm Delete User Modal */}
      <ConfirmModal
        isOpen={confirmDeleteUser !== null}
        title="Delete Studio"
        message="Are you sure you want to permanently delete this studio account? This action cannot be undone and all associated data will be removed."
        cancelLabel="Cancel"
        confirmLabel="Delete Studio"
        isDangerous={true}
        loading={
          confirmDeleteUser && actionLoading === `${confirmDeleteUser}-delete`
        }
        onCancel={() => setConfirmDeleteUser(null)}
        onConfirm={async () => {
          if (confirmDeleteUser) {
            await executeDeleteUser(confirmDeleteUser);
          }
        }}
      />

      {/* Confirm Edit User Modal */}
      <ConfirmModal
        isOpen={confirmEditUser !== null}
        title="Edit Studio Profile"
        message="You are about to edit this studio's profile. All changes will be saved immediately."
        cancelLabel="Cancel"
        confirmLabel="Edit"
        isDangerous={false}
        onCancel={() => setConfirmEditUser(null)}
        onConfirm={() => {
          if (confirmEditUser) {
            executeEditStudio(confirmEditUser);
          }
        }}
      />

      {/* Confirm Delete Vendor Modal */}
      <ConfirmModal
        isOpen={confirmDeleteVendor !== null}
        title="Delete Vendor"
        message="Are you sure you want to permanently delete this vendor? This action cannot be undone."
        cancelLabel="Cancel"
        confirmLabel="Delete Vendor"
        isDangerous={true}
        loading={
          confirmDeleteVendor &&
          actionLoading === `${confirmDeleteVendor}-delete`
        }
        onCancel={() => setConfirmDeleteVendor(null)}
        onConfirm={async () => {
          if (confirmDeleteVendor) {
            await executeDeleteVendor(confirmDeleteVendor);
          }
        }}
      />
    </div>
  );
}
