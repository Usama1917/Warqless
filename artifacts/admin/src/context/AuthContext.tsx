import React, { createContext, useContext, useState } from "react";
import { AdminUser, AdminRole } from "@/data/mockData";

interface AuthContextType {
  user: AdminUser | null;
  login: (email: string, password: string, role: AdminRole) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const MOCK_CREDENTIALS = [
  { email: "admin@warqless.com", password: "admin123", role: "admin" as AdminRole, name: "Karim Mansour", id: "admin1" },
  { email: "publisher@darmaref.eg", password: "pub123", role: "publisher" as AdminRole, name: "Dar Al-Ma'aref", id: "pub1", publisherId: "p1" },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);

  const login = (email: string, password: string, role: AdminRole): boolean => {
    const match = MOCK_CREDENTIALS.find(
      (c) => c.email === email && c.password === password && c.role === role
    );
    if (match) {
      setUser({ id: match.id, name: match.name, email: match.email, role: match.role, publisherId: match.publisherId });
      return true;
    }
    return false;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
