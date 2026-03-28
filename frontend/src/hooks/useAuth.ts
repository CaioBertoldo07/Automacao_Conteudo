import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { TokenResponse } from "@/types";

export function useAuth() {
  const navigate = useNavigate();

  const saveSession = useCallback((data: TokenResponse) => {
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data.user));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/login");
  }, [navigate]);

  const isAuthenticated = !!localStorage.getItem("access_token");

  const getUser = () => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  };

  return { saveSession, logout, isAuthenticated, getUser };
}
