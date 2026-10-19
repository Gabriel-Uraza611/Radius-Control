import { TOKEN_KEY, UNAUTHORIZED_EVENT } from '../config';

export const getToken = (): string | null => {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
};

export const setToken = (token: string | null) => {
    try {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);
    } catch {
        /* noop */
    }
};

export class ApiException extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

export async function http<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> | undefined)
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`/api${path}`, { ...options, headers });

    if (res.status === 401) {
        window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }

    if (!res.ok) {
        let message = 'Error de servidor';
        try {
            const body = await res.json();
            message = body.message ?? message;
        } catch {
            /* noop */
        }
        throw new ApiException(res.status, message);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
}