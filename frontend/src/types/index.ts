export type Category = 'ROBBERY' | 'ASSAULT' | 'SUSPICIOUS' | 'VANDALISM' | 'OTHER';

export const CATEGORIES: Category[] = ['ROBBERY', 'ASSAULT', 'SUSPICIOUS', 'VANDALISM', 'OTHER'];

export const CATEGORY_LABEL: Record<Category, string> = {
    ROBBERY: 'Robo',
    ASSAULT: 'Agresión',
    SUSPICIOUS: 'Sospechoso',
    VANDALISM: 'Vandalismo',
    OTHER: 'Otro'
};

export const CATEGORY_COLOR: Record<Category, string> = {
    ROBBERY: '#dc2626',
    ASSAULT: '#9333ea',
    SUSPICIOUS: '#f59e0b',
    VANDALISM: '#2563eb',
    OTHER: '#6b7280'
};

export interface User {
    id: string;
    name: string;
    email: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
}

export interface Incident {
    id: string;
    category: Category;
    lat: number;
    lng: number;
    reportCount: number;
    lastReportedAt: string;
    description: string;
}

export interface IncidentEvent {
    type: 'INCIDENT_CREATED' | 'INCIDENT_UPDATED';
    incident: Incident;
}

export interface CreateAlertRequest {
    category: Category;
    description: string;
    lat: number;
    lng: number;
}

export interface CreateAlertResponse {
    incident: Incident;
    merged: boolean;
}