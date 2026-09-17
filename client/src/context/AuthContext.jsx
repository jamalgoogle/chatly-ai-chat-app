import { createContext, useContext, useState, useCallback } from "react";
import api from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("chatapp_user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("chatapp_token", data.token);
    localStorage.setItem("chatapp_user", JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  const signup = useCallback(async (username, email, password) => {
    const { data } = await api.post("/auth/signup", { username, email, password });
    localStorage.setItem("chatapp_token", data.token);
    localStorage.setItem("chatapp_user", JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("chatapp_token");
    localStorage.removeItem("chatapp_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
