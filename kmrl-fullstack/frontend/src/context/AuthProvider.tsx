import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AdminCredentials, AdminUser } from "@/types";
import { useServices } from "./ServicesProvider";
import { logAuthEvent } from "@/lib/logger";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: AdminUser | null;
  token: string | null;
  status: AuthStatus;
  error: string | null;
  isAuthenticated: boolean;
  login: (credentials: AdminCredentials) => Promise<void>;
  signup: (credentials: AdminCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { auth } = useServices();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    auth
      .refresh()
      .then((response) => {
        if (!mounted) return;
        if (response) {
          setUser(response.user);
          setToken(response.token);
          setStatus("authenticated");
        } else {
          setStatus("unauthenticated");
        }
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("unauthenticated");
      });
    return () => {
      mounted = false;
    };
  }, [auth]);

  const handleSuccess = (response: { user: AdminUser; token: string }) => {
    setUser(response.user);
    setToken(response.token);
    setStatus("authenticated");
    setError(null);
  };

  const login = async (credentials: AdminCredentials) => {
    setStatus("loading");
    setError(null);
    const response = await auth.login(credentials);
    handleSuccess(response);
  };

  const signup = async (credentials: AdminCredentials) => {
    setStatus("loading");
    setError(null);
    const response = await auth.signup(credentials);
    handleSuccess(response);
  };

  const logout = async () => {
    await auth.logout();
    setUser(null);
    setToken(null);
    setStatus("unauthenticated");
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      status,
      error,
      isAuthenticated: status === "authenticated",
      login: async (credentials) => {
        try {
          logAuthEvent("Login attempt", { email: credentials.email });
          await login(credentials);
          logAuthEvent("Login successful", { email: credentials.email });
        } catch (err) {
          setStatus("unauthenticated");
          const errorMsg = err instanceof Error ? err.message : "Unable to login";
          setError(errorMsg);
          logAuthEvent("Login failed", { email: credentials.email, error: errorMsg });
          throw err;
        }
      },
      signup: async (credentials) => {
        try {
          logAuthEvent("Signup attempt", { email: credentials.email });
          await signup(credentials);
          logAuthEvent("Signup successful", { email: credentials.email });
        } catch (err) {
          setStatus("unauthenticated");
          const errorMsg = err instanceof Error ? err.message : "Unable to signup";
          setError(errorMsg);
          logAuthEvent("Signup failed", { email: credentials.email, error: errorMsg });
          throw err;
        }
      },
      logout: async () => {
        try {
          logAuthEvent("Logout", { user: user?.email });
          await logout();
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Unable to logout";
          setError(errorMsg);
          logAuthEvent("Logout failed", { error: errorMsg });
          throw err;
        }
      },
    }),
    [user, token, status, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
