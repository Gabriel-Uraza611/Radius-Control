import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authApi from '../api/authApi';
import { getToken, setToken } from '../api/http';
import { UNAUTHORIZED_EVENT } from '../config';
import type { LoginRequest, RegisterRequest, User } from '../types';

interface AuthState {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (req: LoginRequest) => Promise<void>;
    register: (req: RegisterRequest) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setTokenState] = useState<string | null>(getToken());
    const [loading, setLoading] = useState<boolean>(!!getToken());

    const logout = useCallback(() => {
        setToken(null);
        setTokenState(null);
        setUser(null);
    }, []);

    useEffect(() => {
        const stored = getToken();
        if (!stored) {
            setLoading(false);
            return;
        }
        authApi
            .me()
            .then((u) => setUser(u))
            .catch(() => logout())
            .finally(() => setLoading(false));
    }, [logout]);

    useEffect(() => {
        const handler = () => logout();
        window.addEventListener(UNAUTHORIZED_EVENT, handler);
        return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler);
    }, [logout]);

    const applySession = (res: { token: string; user: User }) => {
        setToken(res.token);
        setTokenState(res.token);
        setUser(res.user);
    };

    const login = useCallback(async (req: LoginRequest) => {
        applySession(await authApi.login(req));
    }, []);

    const register = useCallback(async (req: RegisterRequest) => {
        applySession(await authApi.register(req));
    }, []);

    const value = useMemo(
        () => ({ user, token, loading, login, register, logout }),
        [user, token, loading, login, register, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
    return ctx;
}