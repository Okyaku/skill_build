import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const didInitializeRef = useRef<boolean>(false);

  const syncSession = useCallback((nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
  }, []);

  const refreshSession = useCallback(async (): Promise<void> => {
    if (didInitializeRef.current) {
      return;
    }

    didInitializeRef.current = true;

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.warn('[AuthContext] getSession error:', error.message);
    }

    const currentSession = data.session ?? null;
    syncSession(currentSession);
    setLoading(false);
  }, [syncSession]);

  const signOut = useCallback(async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[AuthContext] signOut error:', error);
    } else {
      syncSession(null);
    }
  }, [syncSession]);

  useEffect(() => {
    void refreshSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      syncSession(nextSession);
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [refreshSession, syncSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      loading,
      refreshSession,
      signOut,
    }),
    [session, user, loading, refreshSession, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
