import { Client } from '@stomp/stompjs';
import { USE_MOCK } from '../config';
import { mockServer } from '../mock/mockServer';
import type { IncidentEvent } from '../types';
import { getToken } from '../api/http';

export function subscribeIncidents(callback: (event: IncidentEvent) => void): () => void {
    if (USE_MOCK) {
        return mockServer.subscribe(callback);
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const client = new Client({
        brokerURL: `${protocol}://${window.location.host}/ws`,
        connectHeaders: { Authorization: `Bearer ${getToken() ?? ''}` },
        reconnectDelay: 3000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        onConnect: () => {
            client.subscribe('/topic/incidents', (msg) => {
                try {
                    callback(JSON.parse(msg.body) as IncidentEvent);
                } catch {
                    /* noop */
                }
            });
        }
    });

    client.activate();

    return () => {
        void client.deactivate();
    };
}