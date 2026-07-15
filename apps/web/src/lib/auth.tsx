"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AuthResponse, PublicUser } from "@workout/shared";
import { apiFetch, getToken, setToken } from "./api";

interface AuthState {
  user: PublicUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  // O token so existe no localStorage, entao a sessao nao da pra resolver no
  // servidor: comeca em loading e resolve depois da montagem.
  useEffect(() => {
    let cancelado = false;

    async function restaurarSessao(): Promise<void> {
      if (getToken()) {
        try {
          const me = await apiFetch<PublicUser>("/auth/me");
          if (!cancelado) setUser(me);
        } catch {
          // Token expirado ou invalido: descarta e segue deslogado.
          setToken(null);
        }
      }
      if (!cancelado) setLoading(false);
    }

    void restaurarSessao();
    // Sem isto, desmontar no meio do /auth/me faria setState em componente morto.
    return () => {
      cancelado = true;
    };
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const res = await apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(res.token);
    setUser(res.user);
  }

  async function register(
    email: string,
    password: string,
    name: string,
  ): Promise<void> {
    const res = await apiFetch<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name: name || null }),
    });
    setToken(res.token);
    setUser(res.user);
  }

  function logout(): void {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}
