import { USE_MOCK } from '../config';
import { mockServer } from '../mock/mockServer';
import type { CreateAlertRequest, CreateAlertResponse, Incident } from '../types';
import { getToken, http } from './http';

export const createAlert = (req: CreateAlertRequest): Promise<CreateAlertResponse> =>
    USE_MOCK
        ? mockServer.createAlert(getToken(), req)
        : http<CreateAlertResponse>('/alerts', { method: 'POST', body: JSON.stringify(req) });

export const getActiveIncidents = (): Promise<Incident[]> =>
    USE_MOCK ? mockServer.getActiveIncidents() : http<Incident[]>('/incidents/active');