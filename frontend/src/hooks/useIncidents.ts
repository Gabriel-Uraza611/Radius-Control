import { useEffect, useState } from 'react';
import { getActiveIncidents } from '../api/alertApi';
import { subscribeIncidents } from '../realtime/stompClient';
import type { Incident, IncidentEvent } from '../types';

export function useIncidents() {
    const [byId, setById] = useState<Record<string, Incident>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        getActiveIncidents()
            .then((list) => {
                if (cancelled) return;
                setById((prev) => {
                    const next = { ...prev };
                    list.forEach((i) => {
                        next[i.id] = i;
                    });
                    return next;
                });
            })
            .catch((e: Error) => {
                if (!cancelled) setError(e.message);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        const unsubscribe = subscribeIncidents((event: IncidentEvent) => {
            setById((prev) => ({ ...prev, [event.incident.id]: event.incident }));
        });

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, []);

    return { incidents: Object.values(byId), loading, error };
}