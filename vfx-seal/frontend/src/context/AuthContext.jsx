import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("vfxseal_token");
    const savedUser = localStorage.getItem("vfxseal_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem("vfxseal_token", data.token);
    localStorage.setItem("vfxseal_user", JSON.stringify(data.user));
    return data.user;
  };

  const register = async (formData) => {
    const { data } = await api.post("/auth/register", formData);
    return data;
  };

  const loginWithApprovalToken = async (approvalToken) => {
    const { data } = await api.post(`/auth/approval-login/${approvalToken}`);
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem("vfxseal_token", data.token);
    localStorage.setItem("vfxseal_user", JSON.stringify(data.user));
    return data.user;
  };

  const forgotPassword = async (email) => {
    const { data } = await api.post("/auth/forgot-password", { email });
    return data;
  };

  const resetPassword = async (token, password, confirmPassword) => {
    const { data } = await api.post(`/auth/reset-password/${token}`, {
      password,
      confirmPassword,
    });

    // Auto-login after successful password reset
    if (data.token && data.user) {
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("vfxseal_token", data.token);
      localStorage.setItem("vfxseal_user", JSON.stringify(data.user));
    }

    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("vfxseal_token");
    localStorage.removeItem("vfxseal_user");
  };

  const refreshUser = async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      localStorage.setItem("vfxseal_user", JSON.stringify(data.user));
    } catch {
      logout();
    }
  };

  const updateProfile = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem("vfxseal_user", JSON.stringify(updatedUser));
  };

  const isAdmin = user?.role === "ADMIN";
  const isApproved = user?.status === "APPROVED";
  const isLoggedIn = !!token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        loginWithApprovalToken,
        register,
        forgotPassword,
        resetPassword,
        logout,
        refreshUser,
        updateProfile,
        isAdmin,
        isApproved,
        isLoggedIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
