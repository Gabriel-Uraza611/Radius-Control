import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_CENTER } from '../config';
import type { Incident } from '../types';
import IncidentMarker from './IncidentMarker';

interface Props {
    incidents: Incident[];
    pending: { lat: number; lng: number } | null;
    onMapClick: (lat: number, lng: number) => void;
}

const pendingIcon = L.divIcon({
    className: '',
    html: '<div class="pin" style="background:#111827"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng.lat, e.latlng.lng);
        }
    });
    return null;
}

export default function MapView({ incidents, pending, onMapClick }: Props) {
    return (
        <MapContainer center={MAP_CENTER} zoom={15} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickHandler onMapClick={onMapClick} />
            {incidents.map((i) => (
                <IncidentMarker key={i.id} incident={i} />
            ))}
            {pending && <Marker position={[pending.lat, pending.lng]} icon={pendingIcon} />}
        </MapContainer>
    );
}