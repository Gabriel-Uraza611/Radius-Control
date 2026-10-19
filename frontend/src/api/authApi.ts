import { USE_MOCK } from '../config';
import { mockServer } from '../mock/mockServer';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../types';
import { getToken, http } from './http';

export const register = (req: RegisterRequest): Promise<AuthResponse> =>
    USE_MOCK
        ? mockServer.register(req)
        : http<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(req) });

export const login = (req: LoginRequest): Promise<AuthResponse> =>
    USE_MOCK
        ? mockServer.login(req)
        : http<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(req) });

export const me = (): Promise<User> =>
    USE_MOCK ? mockServer.me(getToken()) : http<User>('/auth/me');