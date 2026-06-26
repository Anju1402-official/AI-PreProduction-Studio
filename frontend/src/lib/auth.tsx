import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  api,
  ApiError,
  clearToken,
  getToken,
  onUnauthorized,
  setToken,
  type PlanType,
  type User,
} from "@/lib/api";

interface AuthContextValue {
  user: User | null;
  /** True only during the initial session check on first load. */
  isInitializing: boolean;
  /** True while a login/signup request is in flight. */
  isSubmitting: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, planType: PlanType) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // True only until the first session check resolves — avoids flashing the
  // login page before we've had a chance to validate a stored token.
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await api.auth.me();
      setUser(me);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearToken();
      }
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await refreshUser();
      if (mounted) setIsInitializing(false);
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global 401 handler: any API call that gets a 401 logs the user out
  // immediately, regardless of which page triggered it.
  useEffect(() => {
    return onUnauthorized(() => {
      setUser(null);
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsSubmitting(true);
    try {
      const { access_token } = await api.auth.login({ email, password });
      setToken(access_token);
      const me = await api.auth.me();
      setUser(me);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const signup = useCallback(
    async (name: string, email: string, password: string, planType: PlanType) => {
      setIsSubmitting(true);
      try {
        await api.auth.signup({ name, email, password, plan_type: planType });
        // Signup doesn't return a token by itself — log in right after.
        const { access_token } = await api.auth.login({ email, password });
        setToken(access_token);
        const me = await api.auth.me();
        setUser(me);
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isInitializing,
      isSubmitting,
      isAuthenticated: !!user,
      login,
      signup,
      logout,
      refreshUser,
    }),
    [user, isInitializing, isSubmitting, login, signup, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
