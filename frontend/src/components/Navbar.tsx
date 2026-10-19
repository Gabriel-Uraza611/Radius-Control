import { useAuth } from '../auth/AuthContext';
import { USE_MOCK } from '../config';

export default function Navbar() {
    const { user, logout } = useAuth();
    return (
        <header className="navbar">
            <div className="brand">
                Radius Control {USE_MOCK && <span className="badge">DEMO</span>}
            </div>
            <div className="nav-right">
                <span>{user?.name}</span>
                <button className="btn btn-ghost" onClick={logout}>
                    Salir
                </button>
            </div>
        </header>
    );
}