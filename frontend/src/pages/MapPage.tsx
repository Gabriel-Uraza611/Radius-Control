import { useState } from 'react';
import CreateAlertModal from '../components/CreateAlertModal';
import MapView from '../components/MapView';
import Navbar from '../components/Navbar';
import { useIncidents } from '../hooks/useIncidents';

export default function MapPage() {
    const { incidents, loading, error } = useIncidents();
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

    return (
        <div className="page">
            <Navbar />
            <main className="map-wrap">
                <MapView incidents={incidents} pending={coords} onMapClick={(lat, lng) => setCoords({ lat, lng })} />
                {loading && <div className="toast">Cargando incidentes...</div>}
                {error && <div className="toast toast-error">{error}</div>}
                {!coords && !loading && <div className="hint">Haz clic en el mapa para crear una alerta</div>}
            </main>
            {coords && <CreateAlertModal coords={coords} onClose={() => setCoords(null)} />}
        </div>
    );
}