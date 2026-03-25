import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { io } from "socket.io-client";
import api from "../api/client";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { token, isLoggedIn } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef(null);

  // Fetch notifications from server
  const fetchNotifications = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error("Fetch notifications error:", err);
    }
  }, [isLoggedIn]);

  // Connect socket when logged in
  useEffect(() => {
    if (!isLoggedIn || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();

    // Connect Socket.io with auth token
    const socket = io("/", {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("🔌 Socket connected");
    });

    socket.on("notification", (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [isLoggedIn, token, fetchNotifications]);

  const markAllRead = async () => {
    let hadUnread = false;
    setNotifications((prev) => {
      hadUnread = prev.some((n) => !n.read);
      return prev.map((n) => (n.read ? n : { ...n, read: true }));
    });
    if (hadUnread) setUnreadCount(0);

    try {
      await api.patch("/notifications/read-all");
    } catch (err) {
      console.error("Mark all read error:", err);
      fetchNotifications();
      throw err;
    }
  };

  const markRead = async (id) => {
    let wasUnread = false;

    setNotifications((prev) =>
      prev.map((n) => {
        if (n._id !== id) return n;
        if (!n.read) {
          wasUnread = true;
          return { ...n, read: true };
        }
        return n;
      }),
    );

    if (wasUnread) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await api.patch(`/notifications/${id}/read`);
    } catch (err) {
      console.error("Mark read error:", err);

      if (wasUnread) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, read: false } : n)),
        );
        setUnreadCount((prev) => prev + 1);
      }

      fetchNotifications();
      throw err;
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        fetchNotifications,
        markAllRead,
        markRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within NotificationProvider",
    );
  return ctx;
};
