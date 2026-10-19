import type {
    AuthResponse,
    CreateAlertRequest,
    CreateAlertResponse,
    Incident,
    IncidentEvent,
    LoginRequest,
    RegisterRequest,
    User
} from '../types';

const RADIUS_METERS = 150;
const WINDOW_MINUTES = 30;
const USERS_KEY = 'rc_mock_users';

interface StoredUser extends User {
    password: string;
}

interface MockIncident extends Incident {
    reporters: Set<string>;
}

type Listener = (e: IncidentEvent) => void;

const listeners = new Set<Listener>();

const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();

const incidents: MockIncident[] = [
    {
        id: 'inc-1',
        category: 'ROBBERY',
        lat: 4.0852,
        lng: -76.1948,
        reportCount: 3,
        lastReportedAt: minutesAgo(8),
        description: 'Hurto de celular cerca al parque',
        reporters: new Set(['seed-a', 'seed-b', 'seed-c'])
    },
    {
        id: 'inc-2',
        category: 'SUSPICIOUS',
        lat: 4.0821,
        lng: -76.1987,
        reportCount: 1,
        lastReportedAt: minutesAgo(45),
        description: 'Persona merodeando vehículos',
        reporters: new Set(['seed-a'])
    },
    {
        id: 'inc-3',
        category: 'VANDALISM',
        lat: 4.0879,
        lng: -76.1921,
        reportCount: 2,
        lastReportedAt: minutesAgo(120),
        description: 'Daños en mobiliario público',
        reporters: new Set(['seed-b', 'seed-c'])
    },
    {
        id: 'inc-4',
        category: 'ASSAULT',
        lat: 4.0798,
        lng: -76.2012,
        reportCount: 1,
        lastReportedAt: minutesAgo(300),
        description: 'Riña en vía pública',
        reporters: new Set(['seed-c'])
    }
];

const delay = <T>(value: T, ms = 300) => new Promise<T>((res) => setTimeout(() => res(value), ms));

const readUsers = (): StoredUser[] => {
    try {
        const raw = localStorage.getItem(USERS_KEY);
        if (raw) return JSON.parse(raw) as StoredUser[];
    } catch {
        /* noop */
    }
    return [{ id: 'u-demo', name: 'Usuario Demo', email: 'demo@radius.com', password: '123456' }];
};

const writeUsers = (users: StoredUser[]) => {
    try {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch {
        /* noop */
    }
};

const toPublic = (u: StoredUser): User => ({ id: u.id, name: u.name, email: u.email });

const toDto = (i: MockIncident): Incident => ({
    id: i.id,
    category: i.category,
    lat: i.lat,
    lng: i.lng,
    reportCount: i.reportCount,
    lastReportedAt: i.lastReportedAt,
    description: i.description
});

const distanceMeters = (aLat: number, aLng: number, bLat: number, bLng: number) => {
    const R = 6371000;
    const rad = (d: number) => (d * Math.PI) / 180;
    const dLat = rad(bLat - aLat);
    const dLng = rad(bLng - aLng);
    const h =
        Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
};

const userIdFromToken = (token: string | null) => (token && token.startsWith('mock-') ? token.slice(5) : null);

const emit = (e: IncidentEvent) => listeners.forEach((l) => l(e));

export const mockServer = {
    async register(req: RegisterRequest): Promise<AuthResponse> {
        const users = readUsers();
        if (users.some((u) => u.email.toLowerCase() === req.email.toLowerCase())) {
            throw new Error('El correo ya está registrado');
        }
        const user: StoredUser = { id: 'u-' + Date.now(), name: req.name, email: req.email, password: req.password };
        users.push(user);
        writeUsers(users);
        return delay({ token: 'mock-' + user.id, user: toPublic(user) });
    },

    async login(req: LoginRequest): Promise<AuthResponse> {
        const user = readUsers().find(
            (u) => u.email.toLowerCase() === req.email.toLowerCase() && u.password === req.password
        );
        if (!user) throw new Error('Credenciales inválidas');
        return delay({ token: 'mock-' + user.id, user: toPublic(user) });
    },

    async me(token: string | null): Promise<User> {
        const id = userIdFromToken(token);
        const user = readUsers().find((u) => u.id === id);
        if (!user) throw new Error('Sesión inválida');
        return delay(toPublic(user), 150);
    },

    async getActiveIncidents(): Promise<Incident[]> {
        const limit = Date.now() - 24 * 3600 * 1000;
        return delay(
            incidents.filter((i) => new Date(i.lastReportedAt).getTime() >= limit).map(toDto),
            200
        );
    },

    async createAlert(token: string | null, req: CreateAlertRequest): Promise<CreateAlertResponse> {
        const userId = userIdFromToken(token) ?? 'anon';
        const now = Date.now();
        const candidates = incidents
            .filter(
                (i) =>
                    i.category === req.category &&
                    now - new Date(i.lastReportedAt).getTime() <= WINDOW_MINUTES * 60000 &&
                    !i.reporters.has(userId)
            )
            .map((i) => ({ i, d: distanceMeters(i.lat, i.lng, req.lat, req.lng) }))
            .filter((c) => c.d <= RADIUS_METERS)
            .sort((a, b) => a.d - b.d);

        if (candidates.length > 0) {
            const inc = candidates[0].i;
            const n = inc.reportCount;
            inc.lat = (inc.lat * n + req.lat) / (n + 1);
            inc.lng = (inc.lng * n + req.lng) / (n + 1);
            inc.reportCount = n + 1;
            inc.lastReportedAt = new Date().toISOString();
            inc.reporters.add(userId);
            const dto = toDto(inc);
            setTimeout(() => emit({ type: 'INCIDENT_UPDATED', incident: dto }), 100);
            return delay({ incident: dto, merged: true });
        }

        const inc: MockIncident = {
            id: 'inc-' + now,
            category: req.category,
            lat: req.lat,
            lng: req.lng,
            reportCount: 1,
            lastReportedAt: new Date().toISOString(),
            description: req.description,
            reporters: new Set([userId])
        };
        incidents.push(inc);
        const dto = toDto(inc);
        setTimeout(() => emit({ type: 'INCIDENT_CREATED', incident: dto }), 100);
        return delay({ incident: dto, merged: false });
    },

    subscribe(cb: Listener): () => void {
        listeners.add(cb);
        return () => {
            listeners.delete(cb);
        };
    }
};