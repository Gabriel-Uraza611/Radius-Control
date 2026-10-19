import { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { CATEGORY_COLOR, CATEGORY_LABEL, type Incident } from '../types';

export default function IncidentMarker({ incident }: { incident: Incident }) {
    const color = CATEGORY_COLOR[incident.category];
    const size = 24 + Math.min(incident.reportCount - 1, 4) * 4;

    const icon = useMemo(
        () =>
            L.divIcon({
                className: '',
                html: `<div class="pin" style="background:${color};width:${size}px;height:${size}px">${incident.reportCount > 1 ? incident.reportCount : ''
                    }</div>`,
                iconSize: [size, size],
                iconAnchor: [size / 2, size / 2]
            }),
        [color, size, incident.reportCount]
    );

    return (
        <Marker position={[incident.lat, incident.lng]} icon={icon}>
            <Popup>
                <div className="info">
                    <strong style={{ color }}>{CATEGORY_LABEL[incident.category]}</strong>
                    <p>{incident.description || 'Sin descripción'}</p>
                    <small>
                        {incident.reportCount} {incident.reportCount === 1 ? 'reporte' : 'reportes'} ·{' '}
                        {new Date(incident.lastReportedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </small>
                </div>
            </Popup>
        </Marker>
    );
}