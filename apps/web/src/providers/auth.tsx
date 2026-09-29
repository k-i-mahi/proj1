import type { AuthResponse, LoginInput, RegisterInput, User } from '@civita/shared';
import { isStaff } from '@civita/shared';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, onSessionChange, refreshSession, setSession } from '@/lib/api';
import { keys } from '@/lib/query-client';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: Status;
  user: User | null;
  isStaff: boolean;
  isAdmin: boolean;
  login: (input: LoginInput) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUserState] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onSessionChange((session) => {
      setUserState(session?.user ?? null);
      setStatus(session ? 'authenticated' : 'anonymous');
    });
    // Restore the session from the refresh cookie on first load.
    void refreshSession();
    return () => {
      unsubscribe();
    };
  }, []);

  const afterIdentityChange = useCallback(() => {
    // Viewer-specific fields (upvoted, following, internal notes) depend on who is signed in.
    queryClient.removeQueries({ queryKey: keys.notifications.all });
    void queryClient.invalidateQueries();
  }, [queryClient]);

  const login = useCallback(
    async (input: LoginInput) => {
      const session = await api.post<AuthResponse>('/auth/login', input);
      setSession(session);
      afterIdentityChange();
      return session.user;
    },
    [afterIdentityChange],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const session = await api.post<AuthResponse>('/auth/register', input);
      setSession(session);
      afterIdentityChange();
      return session.user;
    },
    [afterIdentityChange],
  );

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => undefined);
    setSession(null);
    afterIdentityChange();
  }, [afterIdentityChange]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isStaff: isStaff(user?.role),
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      setUser: setUserState,
    }),
    [status, user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
